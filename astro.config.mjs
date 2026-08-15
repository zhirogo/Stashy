import { defineConfig } from 'astro/config';

// 部署到 GitHub Pages 子路径（如 https://user.github.io/stashy/）时，
// 构建前设置环境变量 BASE_PATH=/stashy/ 即可，默认按根路径部署。
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: 'https://stashy.example.com',
  base,
  // ignore：带不带尾部斜杠都能访问，避免 404 困扰
  trailingSlash: 'ignore',
});
