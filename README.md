# Stashy

个人网址收藏站 —— 集中管理你的网页收藏，并生成一个公开只读的展示网站。

![Astro](https://img.shields.io/badge/Astro-5.x-0C1222?logo=astro&logoColor=white)
![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=nodedotjs&logoColor=white)

## 功能特性

- **公开展示站**：纯静态网站（Astro），支持分类、标签、全文搜索，加载快、无服务器
- **本地管理应用**：浏览器中图形化管理收藏（增删改查、分类、标签、批量操作）
- **一键发布**：管理界面点击「发布」即可自动提交并推送，无需命令行
- **GitHub Pages 托管**：推送后自动构建部署，免费且带 CDN
- **数据自主可控**：所有收藏存于单个 JSON 文件，git 天然提供历史与备份

## 项目结构

```
stashy/
├── src/                    # 展示站源码（Astro）
│   ├── pages/              # 首页、分类、标签、搜索
│   ├── components/         # 收藏卡片等组件
│   ├── layouts/            # 布局
│   └── styles/             # 全局样式
├── public/                 # 静态资源
├── data/
│   └── resources.json      # 收藏数据（随仓库提交，部署时直接使用）
├── admin/                  # 本地管理应用（Node.js + Express）
├── .github/workflows/      # GitHub Pages 自动部署
└── package.json
```

## 技术栈

| 部分     | 技术                          |
| -------- | ----------------------------- |
| 展示站   | Astro + Fuse.js               |
| 管理端   | Node.js + Express（原生前端） |
| 数据     | `data/resources.json`         |
| 托管     | GitHub Pages（Actions 部署）  |

## 快速开始

环境要求：Node.js 18+、git

```bash
# 1. 克隆并安装依赖
git clone https://github.com/<你的用户名>/stashy.git
cd stashy
npm install

```

### 启动本地管理应用

```bash
npm run admin
```

打开 `http://localhost:3000`，即可管理你的收藏。

### 本地预览展示站

```bash
npm run dev
```

打开 `http://localhost:4321` 预览公开展示效果。

## 收藏数据

所有收藏存储于 `data/resources.json`（随仓库提交，部署后公网可见）。字段说明：

```json
{
  "resources": [
    {
      "id": "唯一ID（自动生成）",
      "title": "标题",
      "url": "https://example.com",
      "description": "一句话描述",
      "category": "技术/前端",
      "tags": ["react", "教程"],
      "created_at": "2026-08-15",
      "updated_at": "2026-08-15",
      "notes": ""
    }
  ]
}
```

- 分类使用 `/` 分隔实现树形层级（如 `技术/前端`）
- 标签为扁平数组，支持一资源多标签
- 可通过管理界面右上角「导出」随时备份为 JSON