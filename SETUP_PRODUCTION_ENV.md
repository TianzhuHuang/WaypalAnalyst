# 生产环境变量配置指南

## ⚠️ 重要提示

**不要修改 `.env.local` 文件用于生产环境！**

`.env.local` 是本地开发环境专用的，应该保持 `localhost:3000`。

生产环境的环境变量需要在 **Google Cloud Run** 中配置。

## 📋 生产环境需要设置的环境变量

在 Google Cloud Run 控制台中，需要设置以下环境变量：

```bash
# Backend API
NEXT_PUBLIC_AGENT_BACKEND_URL=https://waypal-agent-backend-266509309806.asia-east1.run.app

# Database (Google Cloud SQL PostgreSQL)
# 替换为您的实际数据库连接字符串
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# NextAuth.js v5 (Authentication) - 生产环境 URL
# 使用 openssl rand -base64 32 生成强随机密钥
AUTH_SECRET=your-production-secret-key-here
AUTH_URL=https://hotel.waypal.ai
AUTH_TRUST_HOST=true

# Google OAuth
# 从 Google Cloud Console 获取您的 OAuth 凭据
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Node Environment
NODE_ENV=production
```

## 🔧 在 Google Cloud Console 中设置环境变量

### 方法 1: 通过 Web 控制台

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 进入 **Cloud Run** 服务
3. 点击您的服务名称（如 `waypalanalyst`）
4. 点击 **"EDIT & DEPLOY NEW REVISION"**
5. 在 **"Variables & Secrets"** 标签页中：
   - 点击 **"ADD VARIABLE"**
   - 逐个添加上述所有环境变量
6. 点击 **"DEPLOY"** 部署新版本

### 方法 2: 通过 gcloud 命令行

```bash
# 设置所有环境变量（替换为您的实际值）
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --set-env-vars="NEXT_PUBLIC_AGENT_BACKEND_URL=https://waypal-agent-backend-266509309806.asia-east1.run.app,\
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require,\
AUTH_SECRET=your-production-secret-key-here,\
AUTH_URL=https://hotel.waypal.ai,\
AUTH_TRUST_HOST=true,\
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com,\
GOOGLE_CLIENT_SECRET=your-google-client-secret,\
NODE_ENV=production"
```

## ✅ 验证配置

部署后，验证环境变量是否正确设置：

```bash
# 查看当前环境变量
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## 🔐 安全建议

1. **不要将敏感信息提交到 Git**：`.env.local` 已经在 `.gitignore` 中，不会被提交
2. **使用 Google Secret Manager**：对于生产环境，建议使用 Secret Manager 存储敏感信息（如数据库密码、OAuth 密钥）
3. **定期轮换密钥**：定期更新 `AUTH_SECRET` 和 OAuth 密钥

## 📝 本地开发 vs 生产环境

| 环境变量 | 本地开发 (.env.local) | 生产环境 (Cloud Run) |
|---------|---------------------|-------------------|
| `AUTH_URL` | `http://localhost:3000` | `https://hotel.waypal.ai` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://hotel.waypal.ai` |
| `DATABASE_URL` | 本地/开发数据库 | 生产数据库 |
| `AUTH_SECRET` | 开发密钥 | 生产密钥（建议不同） |

## 🚨 常见错误

**错误**：修改 `.env.local` 用于生产环境
**正确**：在 Google Cloud Run 中设置环境变量

**错误**：`AUTH_URL` 设置为 `http://hotel.waypal.ai`（缺少 `https://`）
**正确**：`AUTH_URL=https://hotel.waypal.ai`

**错误**：忘记在 Google Cloud Console 中添加回调 URL
**正确**：确保添加 `https://hotel.waypal.ai/api/auth/callback/google`
