// Stashy 管理端前端逻辑

const api = {
  get: (url) => fetch(url).then((r) => r.json()),
  send: (url, method, body) =>
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json()),
};

const state = {
  resources: [],
  categories: [],
  tags: [],
  selected: new Set(),
};

const $ = (id) => document.getElementById(id);

/* ---------- 通用工具 ---------- */
function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast${isError ? ' error' : ''}`;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 2600);
}

function openModal(id) {
  $(id).hidden = false;
}
function closeModal(id) {
  $(id).hidden = true;
}

/* ---------- 视图切换 ---------- */
function switchView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  $('view-' + name).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  if (name === 'categories') renderCategories();
  if (name === 'tags') renderTags();
}

/* ---------- 渲染：资源列表 ---------- */
function getFilteredResources() {
  const q = $('search-input').value.trim().toLowerCase();
  const cat = $('filter-category').value;
  const tag = $('filter-tag').value;
  return state.resources.filter((r) => {
    if (q && ![r.title, r.description, r.notes, ...(r.tags || [])].join(' ').toLowerCase().includes(q)) return false;
    if (cat && r.category !== cat) return false;
    if (tag && !(r.tags || []).includes(tag)) return false;
    return true;
  });
}

function renderResources() {
  const list = getFilteredResources();
  $('result-count').textContent = `共 ${list.length} 条`;
  const wrap = $('resource-list');
  if (!list.length) {
    wrap.innerHTML = '<div style="color:var(--ink-faint);padding:30px;text-align:center">没有符合条件的收藏。</div>';
    return;
  }
  wrap.innerHTML = list
    .map(
      (r) => `
      <div class="resource-item" data-id="${r.id}">
        <label class="check"><input type="checkbox" class="row-check" value="${r.id}" ${state.selected.has(r.id) ? 'checked' : ''} /></label>
        <div class="body">
          <div class="title"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></div>
          <div class="meta">
            ${r.category ? `<span class="cat-chip">${esc(r.category)}</span> ` : ''}
            ${(r.tags || []).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join('')}
            ${esc(r.url)}
            <span style="color:var(--ink-faint)">· ${r.created_at}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" data-act="edit" data-id="${r.id}">编辑</button>
          <button class="btn btn-danger" data-act="del" data-id="${r.id}">删除</button>
        </div>
      </div>`
    )
    .join('');
  $('btn-batch-delete').disabled = state.selected.size === 0;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 表单弹窗 ---------- */
function fillCategoryOptions(selected) {
  const flat = flattenCategories(state.categories);
  $('f-category').innerHTML = '<option value="">未分类</option>' + flat
    .map((c) => `<option value="${esc(c.path)}" ${c.path === selected ? 'selected' : ''}>${'　'.repeat(c.level)}${esc(c.name)}</option>`)
    .join('');
}

function fillTagOptions(selected = []) {
  $('f-tags').innerHTML = state.tags
    .map((t) => `<option value="${esc(t.name)}" ${selected.includes(t.name) ? 'selected' : ''}>${esc(t.name)}</option>`)
    .join('');
}

function openForm(resource = null) {
  $('modal-title').textContent = resource ? '编辑收藏' : '新增收藏';
  $('f-id').value = resource?.id || '';
  $('f-title').value = resource?.title || '';
  $('f-url').value = resource?.url || '';
  $('f-description').value = resource?.description || '';
  $('f-notes').value = resource?.notes || '';
  fillCategoryOptions(resource?.category || '');
  fillTagOptions(resource?.tags || []);
  openModal('modal');
}

async function submitForm(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    title: $('f-title').value,
    url: $('f-url').value,
    description: $('f-description').value,
    notes: $('f-notes').value,
    category: $('f-category').value,
    tags: Array.from($('f-tags').selectedOptions).map((o) => o.value),
  };
  const result = id
    ? await api.send(`/api/resources/${id}`, 'PUT', payload)
    : await api.send('/api/resources', 'POST', payload);
  if (result.ok) {
    toast(id ? '已保存修改' : '已新增收藏');
    closeModal('modal');
    await loadResources();
  } else {
    toast(result.message || '保存失败', true);
  }
}

/* ---------- 分类管理 ---------- */
function flattenCategories(nodes, level = 0, out = []) {
  for (const n of nodes) {
    out.push({ ...n, level });
    flattenCategories(n.children, level + 1, out);
  }
  return out;
}

function renderCategories() {
  const flat = flattenCategories(state.categories);
  const counts = {};
  state.resources.forEach((r) => (counts[r.category] = (counts[r.category] || 0) + 1));
  $('category-list').innerHTML = flat.length
    ? flat
        .map(
          (c) => `
          <div class="category-item">
            <div>
              <span class="name" style="margin-left:${c.level * 18}px">${'└ '.repeat(c.level)}${esc(c.name)}</span>
              <span class="path">${esc(c.path)}</span>
            </div>
            <div class="actions" style="display:flex;gap:6px">
              <span style="color:var(--ink-faint);font-size:13px">${counts[c.path] || 0} 条</span>
            </div>
          </div>`
        )
        .join('')
    : '<div style="color:var(--ink-faint);padding:20px;text-align:center">暂无分类，可在收藏表单中填写分类（如：技术/前端）。</div>';
}

/* ---------- 标签管理 ---------- */
function renderTags() {
  $('tag-list').innerHTML = state.tags.length
    ? state.tags
        .map(
          (t) => `
          <div class="tag-item" data-name="${esc(t.name)}">
            <div><span class="tag-chip">${esc(t.name)}</span><span class="count">${t.count} 条</span></div>
            <div class="actions" style="display:flex;gap:6px">
              <button class="btn btn-ghost" data-act="rename">重命名</button>
              <button class="btn btn-ghost" data-act="merge">合并到…</button>
            </div>
          </div>`
        )
        .join('')
    : '<div style="color:var(--ink-faint);padding:20px;text-align:center">暂无标签。</div>';
}

/* ---------- 数据加载 ---------- */
async function loadResources() {
  const data = await api.get('/api/resources');
  if (data.ok) {
    state.resources = data.resources;
    renderResources();
  }
}

async function loadCategories(selected) {
  const data = await api.get('/api/categories');
  if (data.ok) {
    state.categories = data.categories;
    fillCategoryOptions(selected || '');
  }
}

async function loadTags() {
  const data = await api.get('/api/tags');
  if (data.ok) state.tags = data.tags;
}

async function loadAll() {
  await Promise.all([loadResources(), loadCategories(), loadTags()]);
  renderResources();
  fillCategoryOptions();
  fillTagOptions();
  renderTags();
}

async function refreshGitBadge() {
  const s = await api.get('/api/status');
  const badge = $('git-badge');
  if (!s.ok) {
    badge.textContent = '非 git 仓库';
    badge.className = 'git-badge warn';
  } else if (s.dirty) {
    badge.textContent = `${s.branch} · 有未发布更改`;
    badge.className = 'git-badge dirty';
  } else {
    badge.textContent = `${s.branch} · 已同步`;
    badge.className = 'git-badge ok';
  }
}

/* ---------- 发布 ---------- */
function openPublish() {
  const s = $('git-badge').textContent;
  $('publish-hint').textContent = s.includes('未发布') ? '检测到未发布的更改，点击确认将提交并推送。' : '当前没有检测到更改，确认将无操作。';
  $('publish-message').value = 'chore(data): 更新收藏';
  openModal('publish-modal');
}

async function doPublish() {
  const message = $('publish-message').value.trim() || 'chore(data): 更新收藏';
  const result = await api.send('/api/publish', 'POST', { message });
  if (result.ok) {
    toast(result.detail || '发布成功');
    closeModal('publish-modal');
    await refreshGitBadge();
    await loadAll();
  } else {
    toast(result.message || '发布失败', true);
  }
}

/* ---------- 简单操作弹窗（标签重命名/合并） ---------- */
let simpleAction = null;

function openSimple({ title, placeholder, value = '', action }) {
  simpleAction = action;
  $('simple-modal-title').textContent = title;
  $('simple-modal-field').innerHTML = `新名称<input id="simple-input" value="${esc(value)}" placeholder="${esc(placeholder)}" />`;
  openModal('simple-modal');
  setTimeout(() => $('simple-input').focus(), 0);
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  // 视图切换
  document.querySelectorAll('.nav-item').forEach((n) => n.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(n.dataset.view);
  }));

  // 新增/编辑
  $('btn-add').addEventListener('click', () => openForm());
  $('resource-form').addEventListener('submit', submitForm);
  $('modal-cancel').addEventListener('click', () => closeModal('modal'));

  // 列表事件委托
  $('resource-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') {
      const r = state.resources.find((x) => x.id === id);
      openForm(r);
    } else if (btn.dataset.act === 'del') {
      if (!confirm('确定删除这条收藏？')) return;
      const res = await api.send(`/api/resources/${id}`, 'DELETE');
      if (res.ok) {
        toast('已删除');
        state.selected.delete(id);
        await loadAll();
      }
    }
  });

  $('resource-list').addEventListener('change', (e) => {
    if (e.target.classList.contains('row-check')) {
      if (e.target.checked) state.selected.add(e.target.value);
      else state.selected.delete(e.target.value);
      $('btn-batch-delete').disabled = state.selected.size === 0;
    }
  });

  $('check-all').addEventListener('change', (e) => {
    getFilteredResources().forEach((r) => {
      if (e.target.checked) state.selected.add(r.id);
      else state.selected.delete(r.id);
    });
    renderResources();
  });

  $('btn-batch-delete').addEventListener('click', async () => {
    if (!state.selected.size || !confirm(`确定删除选中的 ${state.selected.size} 条收藏？`)) return;
    const res = await api.send('/api/resources/batch-delete', 'POST', { ids: [...state.selected] });
    if (res.ok) {
      toast(`已删除 ${res.deleted} 条`);
      state.selected.clear();
      $('check-all').checked = false;
      await loadAll();
    }
  });

  // 筛选
  $('search-input').addEventListener('input', renderResources);
  $('filter-category').addEventListener('change', renderResources);
  $('filter-tag').addEventListener('change', renderResources);
  $('btn-clear-filter').addEventListener('click', () => {
    $('search-input').value = '';
    $('filter-category').value = '';
    $('filter-tag').value = '';
    renderResources();
  });

  // 导出
  $('btn-export').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = '/api/download';
    a.download = 'stashy-export.json';
    a.click();
  });

  // 发布
  $('btn-publish').addEventListener('click', openPublish);
  $('publish-cancel').addEventListener('click', () => closeModal('publish-modal'));
  $('publish-confirm').addEventListener('click', doPublish);

  // 标签操作
  $('tag-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const item = btn.closest('.tag-item');
    const name = item.dataset.name;
    if (btn.dataset.act === 'rename') {
      openSimple({
        title: '重命名标签',
        placeholder: '新标签名',
        value: name,
        action: async (newName) => {
          if (!newName || newName === name) return;
          const res = await api.send('/api/tags', 'PUT', { oldName: name, newName });
          if (res.ok) { toast('标签已重命名'); await loadAll(); }
        },
      });
    } else if (btn.dataset.act === 'merge') {
      openSimple({
        title: `合并“${name}”到`,
        placeholder: '目标标签名',
        action: async (target) => {
          if (!target || target === name) return;
          const res = await api.send('/api/tags', 'PUT', { oldName: name, newName: target });
          if (res.ok) { toast('标签已合并'); await loadAll(); }
        },
      });
    }
  });

  // 简单弹窗
  $('simple-cancel').addEventListener('click', () => closeModal('simple-modal'));
  $('simple-confirm').addEventListener('click', async () => {
    const val = $('simple-input').value.trim();
    if (simpleAction) await simpleAction(val);
    closeModal('simple-modal');
  });

  // 点击遮罩关闭
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m) m.hidden = true;
  }));
}

/* ---------- 初始化 ---------- */
async function init() {
  bindEvents();
  await loadAll();
  await refreshGitBadge();
  // 刷新筛选下拉
  const flat = flattenCategories(state.categories);
  $('filter-category').innerHTML = '<option value="">全部分类</option>' + flat.map((c) => `<option value="${esc(c.path)}">${esc(c.path)}</option>`).join('');
  $('filter-tag').innerHTML = '<option value="">全部标签</option>' + state.tags.map((t) => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
}

init();
