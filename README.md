# 墨韵智创——AI辅助书法生成艺术平台

一个用于产教实践展示的 AI 书法网页 Demo。当前版本使用 mock 模型接口，覆盖书法知识问答、AI 作品生成、章法设计和历史作品管理。

## 技术栈

- 前端：Next.js / React
- 后端：Next.js Route Handlers
- 数据库：SQLite，使用 Node.js 内置 `node:sqlite`
- 图片生成：mock SVG，可下载，后续可替换为 GPT Image / FLUX / Stable Diffusion
- 文本模型预留：mock / DeepSeek / 千问 Qwen，采用 OpenAI 兼容接口适配层

## 安装运行

```bash
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:3000
```

Windows 也可以直接双击 `start-demo.bat`，它会启动本地服务并打开网页。服务启动后，也可以双击 `open-demo.url` 进入页面。

如果要让不同网络、手机流量下的人访问，优先双击 `公网分享链接-推荐.bat`。窗口里出现 `https://...trycloudflare.com` 开头的网址后，把该网址发给别人即可。该方式是临时公网隧道，演示期间不要关闭窗口。

备用方案是 `公网分享链接.bat`，它使用 localtunnel；如果打开链接时出现 Tunnel Password 页面，输入脚本窗口显示的密码。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。MVP 不配置也能运行。

```bash
TEXT_MODEL_PROVIDER=mock
TEXT_MODEL_API_KEY=
TEXT_MODEL_BASE_URL=
TEXT_MODEL_NAME=

# DeepSeek 示例
# TEXT_MODEL_PROVIDER=deepseek
# TEXT_MODEL_BASE_URL=https://api.deepseek.com
# TEXT_MODEL_NAME=deepseek-chat

# 千问 Qwen 示例，使用 DashScope OpenAI 兼容模式
# TEXT_MODEL_PROVIDER=qwen
# TEXT_MODEL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
# TEXT_MODEL_NAME=qwen-plus

IMAGE_MODEL_PROVIDER=mock
IMAGE_MODEL_API_KEY=
IMAGE_MODEL_BASE_URL=
IMAGE_MODEL_NAME=

DATABASE_PATH=./data/calligraphy.sqlite
```

## API 说明

### POST `/api/chat`

用于书法知识问答，已预留 DeepSeek / 千问 Qwen / GPT 一类 OpenAI 兼容文本模型。

请求：

```json
{
  "question": "初学楷书应该怎样选择碑帖？"
}
```

响应：

```json
{
  "provider": "mock",
  "answer": "..."
}
```

### POST `/api/generate-calligraphy`

用于生成书法作品图，当前返回 mock SVG 图片并保存生成记录。

请求：

```json
{
  "text": "厚德载物",
  "script": "楷书",
  "master": "颜真卿",
  "format": "中堂"
}
```

响应包含：

```json
{
  "provider": "mock",
  "prompt": "...",
  "imageUrl": "data:image/svg+xml;base64,...",
  "work": {}
}
```

### POST `/api/layout-advice`

用于生成章法设计建议。

请求：

```json
{
  "text": "厚德载物",
  "format": "中堂"
}
```

响应：

```json
{
  "provider": "mock",
  "advice": {
    "charSpacing": "...",
    "lineSpacing": "...",
    "signature": "...",
    "seal": "...",
    "overall": "..."
  }
}
```

### GET `/api/works`

获取最近 30 条生成记录，用于作品管理和历史作品展示。

## 真实模型接入位置

- 文本问答：`lib/model-providers.js` 中的 `answerCalligraphyQuestion(...)`，已预留 `deepseek` 和 `qwen`
- 图片生成：替换 `app/api/generate-calligraphy/route.js` 中的 `createMockArtworkSvg(...)`
- 章法建议：`lib/model-providers.js` 中的 `createLayoutAdvice(...)`，mock 之外会请求文本模型并解析 JSON
- 提示词组合：在 `lib/calligraphy.js` 的 `buildImagePrompt(...)` 中维护
- 数据库保存：`lib/db.js` 中的 `saveWork(...)` 和 `listWorks(...)`

## 项目结构

```text
app/
  api/
    chat/route.js
    generate-calligraphy/route.js
    layout-advice/route.js
    works/route.js
  globals.css
  layout.js
  page.js
lib/
  calligraphy.js
  db.js
  model-providers.js
```
