# CMS PSD

React 网页端 PSD 转 CMS 导入包工具。

## 网页端开发

```bash
npm install
npm run dev:server
npm run dev:web
```

打开终端输出的本地地址，拖入或选择 `.psd` 文件，点击“开始生成”。网页端会在浏览器内解析 PSD 并下载 ZIP，ZIP 内包含：

```txt
assets/
cms-page-config.json
theme.json
theme.md
```

勾选 debug 后会额外包含：

```txt
inspect/
import-notes.md
```

## 网页端构建

```bash
npm run build:web
```

构建产物在 `web-dist/`。

## Cloudflare Pages 部署

Cloudflare Pages 上使用 Pages Functions 提供 `/api/compress`，Tinify Key 只放在 Cloudflare 的环境变量/Secret 里。

Pages 项目配置：

```txt
Build command: npm run build:web
Build output directory: web-dist
Root directory: /
```

Production 环境变量：

```txt
TINIFY_API_KEY=你的 Tinify key
```

部署后访问：

```txt
https://你的域名/
https://你的域名/api/health
```

本地预览 Cloudflare Pages Functions：

```bash
npm run build:web
npx wrangler pages dev web-dist --binding TINIFY_API_KEY=你的 Tinify key
```

生产环境前端默认同源请求 `/api/compress`，不需要配置 `VITE_COMPRESS_API_BASE`。本地 Vite 开发默认请求 `http://127.0.0.1:8787/api/compress`，所以需要同时运行 `npm run dev:server`。

## 客户端方向

Electron 客户端相关代码暂时保留，后续再优化打包和本机目录输出能力：

```bash
npm run dev
npm run check
```
