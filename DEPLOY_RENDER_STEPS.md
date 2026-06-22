# Render 动态版部署步骤

这个项目已经准备好部署到 Render。部署后会得到一个公网链接，别人用手机流量也能打开，并且问答走 DeepSeek、图片生成走 Qwen-Image。

## 1. 上传到 GitHub

1. 打开 https://github.com/new
2. Repository name 填：

```text
moyun-calligraphy
```

3. 选择 Private 或 Public 都可以。
4. 创建后，打开项目文件夹：

```text
C:\Users\HUAWEI\Desktop\moyun-calligraphy
```

5. 在这个文件夹里打开命令行，运行 GitHub 页面给出的命令，通常是：

```bash
git init
git add .
git commit -m "Initial dynamic calligraphy platform"
git branch -M main
git remote add origin 你的GitHub仓库地址
git push -u origin main
```

注意：不要提交 `.env.local`，它已经被 `.gitignore` 忽略。

## 2. Render 导入项目

1. 打开 https://dashboard.render.com/
2. 登录后点 New
3. 选择 Web Service
4. 选择 GitHub 仓库 `moyun-calligraphy`
5. Render 会读取 `render.yaml`，如果没有自动读取，手动填写：

Build Command:

```text
npm install && npm run build
```

Start Command:

```text
npm run start -- --hostname 0.0.0.0 --port $PORT
```

## 3. 填环境变量

在 Render 的 Environment 页面添加：

```text
TEXT_MODEL_API_KEY=你的 DeepSeek Key
IMAGE_MODEL_API_KEY=你的 Qwen / DashScope Key
```

其他变量 `render.yaml` 已经预设：

```text
TEXT_MODEL_PROVIDER=deepseek
TEXT_MODEL_BASE_URL=https://api.deepseek.com
TEXT_MODEL_NAME=deepseek-chat
IMAGE_MODEL_PROVIDER=qwen
IMAGE_MODEL_BASE_URL=https://dashscope.aliyuncs.com/api/v1
IMAGE_MODEL_NAME=qwen-image-plus
```

## 4. 获取公网链接

部署完成后 Render 会给出：

```text
https://moyun-calligraphy.onrender.com
```

这个链接可以发给别人。

## 说明

- 问答和章法建议：DeepSeek
- 图片生成：Qwen-Image
- 作品历史：当前版本使用服务器本地 SQLite；Render 免费服务可能重启后丢失历史记录。正式长期版本建议接 Supabase / Neon。
- Qwen-Image 返回的图片链接大约保留 24 小时，正式产品建议转存到对象存储。
