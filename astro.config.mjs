import { defineConfig } from 'astro/config';

// 部署到 GitHub Pages 项目页时，构建前设置环境变量 BASE_PATH，
// 且大小写必须与仓库名完全一致（仓库名 Stashy → /Stashy/）。
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: 'https://stashy.example.com',
  base,
  // ignore：带不带尾部斜杠都能访问，避免 404 困扰
  trailingSlash: 'ignore',
});
