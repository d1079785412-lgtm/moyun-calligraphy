# 动态版部署说明

本项目已经支持 DeepSeek 和千问 Qwen 的文本模型接口。先在本地跑通，再部署到线上平台。

## 本地配置真实模型

双击：

```text
setup-real-model.cmd
```

按提示选择：

```text
1 = DeepSeek
2 = Qwen / 通义千问
```

然后粘贴你的 API Key。脚本会生成 `.env.local`。

启动动态版：

```text
run-dynamic-local.cmd
```

## 线上环境变量

部署平台中需要填写：

```text
TEXT_MODEL_PROVIDER=deepseek
TEXT_MODEL_API_KEY=你的 DeepSeek Key
TEXT_MODEL_BASE_URL=https://api.deepseek.com
TEXT_MODEL_NAME=deepseek-chat
```

或千问：

```text
TEXT_MODEL_PROVIDER=qwen
TEXT_MODEL_API_KEY=你的 DashScope Key
TEXT_MODEL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
TEXT_MODEL_NAME=qwen-plus
```

图片生成使用千问 Qwen-Image：

```text
IMAGE_MODEL_PROVIDER=qwen
IMAGE_MODEL_API_KEY=你的 DashScope Key
IMAGE_MODEL_BASE_URL=https://dashscope.aliyuncs.com/api/v1
IMAGE_MODEL_NAME=qwen-image-plus
```

## Render 部署建议

如果不用 Vercel，可以用 Render 的 Web Service。

Build Command:

```text
npm install && npm run build
```

Start Command:

```text
npm run start -- --hostname 0.0.0.0 --port $PORT
```

Environment:

```text
NODE_VERSION=24
TEXT_MODEL_PROVIDER=deepseek 或 qwen
TEXT_MODEL_API_KEY=你的 Key
TEXT_MODEL_BASE_URL=对应接口地址
TEXT_MODEL_NAME=模型名
IMAGE_MODEL_PROVIDER=qwen
IMAGE_MODEL_API_KEY=你的 DashScope Key
IMAGE_MODEL_BASE_URL=https://dashscope.aliyuncs.com/api/v1
IMAGE_MODEL_NAME=qwen-image-plus
```

推荐组合：

```text
TEXT_MODEL_PROVIDER=deepseek
TEXT_MODEL_NAME=deepseek-chat

IMAGE_MODEL_PROVIDER=qwen
IMAGE_MODEL_NAME=qwen-image-plus
```

说明：当前作品历史记录本地用 SQLite；云端平台如果没有持久化磁盘，历史记录可能不是长期保存。正式版本建议换 Supabase / Neon 数据库。Qwen-Image 返回的图片 URL 是临时地址，官方文档说明会保留约 24 小时，正式产品应下载后转存到对象存储。
