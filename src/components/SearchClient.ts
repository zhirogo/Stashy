// 客户端搜索逻辑：读取 URL 查询参数，用 Fuse.js 过滤并渲染结果
import Fuse from 'fuse.js';

interface SearchResource {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
}

declare global {
  interface Window {
    __STASHY_DATA__?: { resources: SearchResource[] };
    __STASHY_BASE__?: string;
  }
}

/** 生成站内链接（带部署子路径前缀） */
function siteUrl(path: string): string {
  const base = (window.__STASHY_BASE__ || '').replace(/\/$/, '');
  return base + path;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c];
  });
}

export function initSearch(): void {
  const resources = window.__STASHY_DATA__?.resources || [];
  const q = new URLSearchParams(window.location.search).get('q') || '';

  // 更新标题与描述（服务端无法拿到查询参数，改由客户端填充）
  const title = document.getElementById('search-result-title');
  const desc = document.getElementById('search-result-desc');
  const resultsEl = document.getElementById('search-results');

  if (!resultsEl) return;

  const setTitle = (html: string) => {
    if (title) title.innerHTML = html;
  };
  const setDesc = (html: string) => {
    if (desc) desc.innerHTML = html;
  };
  if (title) {
    document.title = q ? `搜索：${q} · Stashy` : '搜索 · Stashy';
  }

  if (!q.trim()) {
    setTitle('搜索');
    setDesc('输入关键字，搜索收藏的标题、描述与标签。');
    resultsEl.innerHTML = `<div class="empty"><div class="big">🔍</div><p>在上方输入关键字开始搜索。</p></div>`;
    return;
  }

  setTitle(`搜索<span class="dim">：“${esc(q)}”</span>`);

  const fuse = new Fuse<SearchResource>(resources, {
    keys: ['title', 'description', 'tags'],
    threshold: 0.4,
    ignoreLocation: true,
  });
  const results = fuse.search(q.trim()).map((r) => r.item);

  setDesc(`共找到 <strong>${results.length}</strong> 条相关收藏`);

  if (!results.length) {
    resultsEl.innerHTML = `<div class="empty"><div class="big">🔍</div><p>没有找到与“${esc(q)}”相关的收藏。</p></div>`;
    return;
  }

  resultsEl.innerHTML = results
    .map((r) => {
      const domain = (() => {
        try {
          return new URL(r.url).hostname.replace(/^www\./, '');
        } catch {
          return r.url;
        }
      })();
      return `
      <article class="card">
        <div class="card-top">
          ${r.category ? `<a class="card-domain" href="${siteUrl(`/category/${esc(r.category)}`)}" title="${esc(r.category)}"><span class="dot"></span>${esc(r.category)}</a>` : `<span class="card-domain"><span class="dot"></span>${esc(domain)}</span>`}
        </div>
        <a class="card-title-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
          <h3 class="card-title">${esc(r.title)}</h3>
        </a>
        ${r.description ? `<p class="card-desc">${esc(r.description)}</p>` : ''}
        <div class="card-meta">
          <div class="card-tags">
            ${(r.tags || []).slice(0, 4).map((t) => `<a class="tag" href="${siteUrl(`/tag/${esc(t)}`)}">${esc(t)}</a>`).join('')}
          </div>
          <span class="card-date">${esc((r.created_at || '').slice(0, 10))}</span>
        </div>
      </article>`;
    })
    .join('');
}
