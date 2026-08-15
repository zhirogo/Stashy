import { Router } from 'express';
import {
  loadResources,
  saveResources,
  genId,
  today,
} from '../lib/store.js';
import { getStatus, publish } from '../lib/git.js';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const EXPORT_PATH = path.resolve(DATA_DIR, 'export.json');

/** 简单字段清洗与校验 */
function sanitize(body) {
  const r = {
    title: String(body.title || '').trim(),
    url: String(body.url || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    tags: Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    notes: String(body.notes || '').trim(),
  };
  if (!r.title) throw new Error('标题不能为空');
  if (!r.url) throw new Error('链接不能为空');
  try {
    new URL(r.url);
  } catch {
    throw new Error('链接格式不正确');
  }
  return r;
}

function error(res, err, status = 400) {
  res.status(status).json({ ok: false, message: err.message || '服务器错误' });
}

export function createApiRouter() {
  const router = Router();

  // 资源列表（支持筛选）
  router.get('/resources', async (req, res) => {
    try {
      const { q, category, tag } = req.query;
      let list = (await loadResources()).resources;
      if (q) {
        const kw = String(q).toLowerCase();
        list = list.filter((r) =>
          [r.title, r.description, r.notes, ...(r.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(kw)
        );
      }
      if (category) list = list.filter((r) => r.category === category);
      if (tag) list = list.filter((r) => (r.tags || []).includes(tag));
      res.json({ ok: true, resources: list });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 新增资源
  router.post('/resources', async (req, res) => {
    try {
      const data = await loadResources();
      const clean = sanitize(req.body);
      const now = today();
      const resource = {
        id: genId(),
        ...clean,
        created_at: now,
        updated_at: now,
      };
      data.resources.push(resource);
      await saveResources(data);
      res.status(201).json({ ok: true, resource });
    } catch (err) {
      error(res, err);
    }
  });

  // 编辑资源
  router.put('/resources/:id', async (req, res) => {
    try {
      const data = await loadResources();
      const idx = data.resources.findIndex((r) => r.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ ok: false, message: '资源不存在' });
      }
      const clean = sanitize(req.body);
      const resource = {
        ...data.resources[idx],
        ...clean,
        updated_at: today(),
      };
      data.resources[idx] = resource;
      await saveResources(data);
      res.json({ ok: true, resource });
    } catch (err) {
      error(res, err);
    }
  });

  // 删除资源
  router.delete('/resources/:id', async (req, res) => {
    try {
      const data = await loadResources();
      const next = data.resources.filter((r) => r.id !== req.params.id);
      if (next.length === data.resources.length) {
        return res.status(404).json({ ok: false, message: '资源不存在' });
      }
      data.resources = next;
      await saveResources(data);
      res.json({ ok: true });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 批量删除
  router.post('/resources/batch-delete', async (req, res) => {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      const data = await loadResources();
      data.resources = data.resources.filter((r) => !ids.includes(r.id));
      await saveResources(data);
      res.json({ ok: true, deleted: ids.length });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 分类树
  router.get('/categories', async (_req, res) => {
    try {
      const resources = (await loadResources()).resources;
      const map = new Map();
      const roots = [];
      for (const r of resources) {
        const parts = (r.category || '')
          .split('/')
          .map((s) => s.trim())
          .filter(Boolean);
        let pathStr = '';
        for (const part of parts) {
          pathStr = pathStr ? `${pathStr}/${part}` : part;
          let node = map.get(pathStr);
          if (!node) {
            node = { name: part, path: pathStr, children: [] };
            map.set(pathStr, node);
            const idx = pathStr.lastIndexOf('/');
            if (idx === -1) roots.push(node);
            else map.get(pathStr.slice(0, idx)).children.push(node);
          }
        }
      }
      res.json({ ok: true, categories: roots });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 标签列表（含计数）
  router.get('/tags', async (_req, res) => {
    try {
      const resources = (await loadResources()).resources;
      const map = new Map();
      for (const r of resources) {
        for (const t of r.tags || []) map.set(t, (map.get(t) || 0) + 1);
      }
      const tags = [...map.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
      res.json({ ok: true, tags });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 标签重命名/合并
  router.put('/tags', async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) return res.status(400).json({ ok: false, message: '参数不完整' });
      const data = await loadResources();
      for (const r of data.resources) {
        if (!r.tags) continue;
        if (r.tags.includes(oldName)) {
          r.tags = [...r.tags.filter((t) => t !== oldName), newName];
        }
      }
      await saveResources(data);
      res.json({ ok: true });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 导出数据
  router.get('/export', async (_req, res) => {
    try {
      const data = await loadResources();
      await writeFile(EXPORT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      res.json({ ok: true, path: EXPORT_PATH });
    } catch (err) {
      error(res, err, 500);
    }
  });

  // git 状态
  router.get('/status', async (_req, res) => {
    try {
      const status = await getStatus();
      res.json(status);
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 一键发布
  router.post('/publish', async (req, res) => {
    try {
      const message = String(req.body.message || 'chore(data): 更新收藏').trim();
      const result = await publish(message);
      res.json(result);
    } catch (err) {
      error(res, err, 500);
    }
  });

  // 导出文件的下载端点（复用导出目录，供浏览器下载）
  router.get('/download', async (_req, res) => {
    try {
      const data = await loadResources();
      res.attachment('stashy-export.json');
      res.send(JSON.stringify(data, null, 2));
    } catch (err) {
      error(res, err, 500);
    }
  });

  return router;
}

// 清理辅助：导出文件路径（便于外部引用）
export { EXPORT_PATH };
