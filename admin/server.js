import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRouter } from './routes/api.js';
import { getStatus } from './lib/git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

// REST API
app.use('/api', createApiRouter());

// 启动时诊断 git 环境
app.get('/api/health', async (_req, res) => {
  const status = await getStatus();
  res.json(status);
});

// 管理端静态页面
app.use(express.static(path.join(__dirname, 'public')));

// 兜底：SPA 式路由回退到管理端首页
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Stashy 本地管理应用已启动`);
  console.log(`  ➜ 打开浏览器访问: http://localhost:${PORT}\n`);
});
