export { getAllResources } from './data.js';

/** 从资源列表构建分类树（分类字符串以 / 分隔层级） */
export function buildCategoryTree(resources) {
  const root = [];
  const map = new Map(); // path -> node

  for (const r of resources) {
    const parts = (r.category || '')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    let path = '';

    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      let node = map.get(path);
      if (!node) {
        node = { name: part, path, children: [], count: 0 };
        map.set(path, node);
        const idx = path.lastIndexOf('/');
        if (idx === -1) {
          root.push(node);
        } else {
          map.get(path.slice(0, idx)).children.push(node);
        }
      }
      node.count += 1;
    }
  }
  return root;
}

/** 将分类树扁平化为数组（含所有层级） */
export function flattenCategories(tree, out = []) {
  for (const node of tree) {
    out.push(node);
    flattenCategories(node.children, out);
  }
  return out;
}

/** 聚合所有标签并计数，按数量降序、名称升序排列 */
export function aggregateTags(resources) {
  const map = new Map();
  for (const r of resources) {
    for (const tag of r.tags || []) {
      map.set(tag, (map.get(tag) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
}

/** 从 URL 提取域名（去掉 www. 前缀） */
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** 资源排序：latest 按收藏时间倒序，title 按标题拼音排序 */
export function sortResources(resources, sort = 'latest') {
  const arr = [...resources];
  if (sort === 'title') {
    arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'));
  } else {
    arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
  return arr;
}

/** 生成分类/标签的 URL slug */
export function slugify(s) {
  return encodeURIComponent(s);
}

/** 还原 slug 为原始字符串 */
export function unslug(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
