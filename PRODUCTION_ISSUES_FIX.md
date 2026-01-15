# 生产环境问题修复指南

## 问题描述

1. **对话 Thread 没有保存到左侧栏，刷新页面也不显示**
2. **点击"全网查价格"按钮后，没有出现确认酒店名称和日期的回复文案**
3. **每次刷新页面都要重新登录**

## 根本原因

这些问题都是因为生产环境（Cloud Run）缺少必要的环境变量配置。

## 解决方案

### 1. 在 Google Cloud Run 中设置环境变量

需要在 Cloud Run 服务中设置以下环境变量：

#### 必需的环境变量：

```bash
# 数据库连接
DATABASE_URL=postgresql://waypal_user:User@123@<数据库IP>:5432/waypal_db

# NextAuth 配置
AUTH_SECRET=<生成一个随机字符串，至少32字符>
AUTH_URL=https://hotel.waypal.ai
AUTH_TRUST_HOST=true

# Google OAuth
GOOGLE_CLIENT_ID=<你的Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<你的Google OAuth Client Secret>

# Node 环境
NODE_ENV=production
```

### 2. 设置步骤

#### 方法一：通过 Google Cloud Console

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 导航到 **Cloud Run** > **waypalanalyst** 服务
3. 点击 **编辑和部署新版本** (Edit & Deploy New Revision)
4. 展开 **变量和密钥** (Variables & Secrets) 部分
5. 添加以下环境变量：
   - `DATABASE_URL`
   - `AUTH_SECRET` (生成：`openssl rand -base64 32`)
   - `AUTH_URL` = `https://hotel.waypal.ai`
   - `AUTH_TRUST_HOST` = `true`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NODE_ENV` = `production`
6. 点击 **部署** (Deploy)

#### 方法二：通过 gcloud CLI

```bash
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --set-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@<数据库IP>:5432/waypal_db" \
  --set-env-vars="AUTH_SECRET=<生成的随机字符串>" \
  --set-env-vars="AUTH_URL=https://hotel.waypal.ai" \
  --set-env-vars="AUTH_TRUST_HOST=true" \
  --set-env-vars="GOOGLE_CLIENT_ID=<你的Client ID>" \
  --set-env-vars="GOOGLE_CLIENT_SECRET=<你的Client Secret>" \
  --set-env-vars="NODE_ENV=production"
```

### 3. 生成 AUTH_SECRET

```bash
openssl rand -base64 32
```

### 4. 验证环境变量

部署后，检查 Cloud Run 日志，确保没有以下错误：
- `DATABASE_URL environment variable is not set`
- `AUTH_SECRET is required`
- `AUTH_URL is required`

### 5. 检查 Google OAuth 回调 URL

确保在 Google Cloud Console 的 OAuth 2.0 客户端配置中，已添加：
- `https://hotel.waypal.ai/api/auth/callback/google`

## 问题详细分析

### 问题 1: Thread 没有保存

**原因**：
- `DATABASE_URL` 未设置，导致数据库连接失败
- API 路由 `/api/threads` 返回 500 错误

**验证**：
- 打开浏览器开发者工具 > Network
- 查看 `/api/threads` 请求，检查响应状态码和错误信息

### 问题 2: 没有确认回复文案

**原因**：
- 用户未登录（`isAuthenticated` 为 false）
- `handleSend` 函数中的 `if (!isStarted)` 逻辑没有正确执行
- Thread 创建失败，导致欢迎消息没有保存

**验证**：
- 检查浏览器控制台是否有错误
- 检查 Network 标签中的 `/api/threads` POST 请求是否成功

### 问题 3: 每次刷新都要重新登录

**原因**：
- `AUTH_SECRET` 未设置或无效
- `AUTH_URL` 未设置或设置错误
- `AUTH_TRUST_HOST` 未设置为 `true`
- Cookie 设置问题（可能是域名或安全设置）

**验证**：
- 检查浏览器 Application > Cookies
- 查看是否有 `next-auth.session-token` cookie
- 检查 cookie 的 Domain 和 Secure 属性

## 调试步骤

1. **检查 Cloud Run 日志**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50
   ```

2. **检查环境变量**：
   ```bash
   gcloud run services describe waypalanalyst --region=europe-west1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. **测试数据库连接**：
   - 在 Cloud Run 日志中查找数据库连接错误
   - 确保数据库允许 Cloud Run 的 IP 访问

4. **测试 NextAuth**：
   - 访问 `https://hotel.waypal.ai/api/auth/signin`
   - 检查是否能正常显示登录页面

## 临时调试方案

如果需要快速调试，可以在代码中添加日志：

```typescript
// src/lib/db/index.ts
function getDb() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // ...
}
```

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthConfig = {
  // ...
  debug: process.env.NODE_ENV === 'production', // 在生产环境启用调试
  // ...
}
```

## 注意事项

1. **AUTH_SECRET** 必须是一个强随机字符串，至少 32 字符
2. **AUTH_URL** 必须与你的实际域名完全匹配（包括 https://）
3. **DATABASE_URL** 中的数据库 IP 必须是 Cloud SQL 的公共 IP 或私有 IP（如果使用 VPC 连接）
4. 确保数据库防火墙规则允许 Cloud Run 访问

## 验证清单

- [ ] DATABASE_URL 已设置
- [ ] AUTH_SECRET 已设置（至少 32 字符）
- [ ] AUTH_URL 已设置为 `https://hotel.waypal.ai`
- [ ] AUTH_TRUST_HOST 已设置为 `true`
- [ ] GOOGLE_CLIENT_ID 已设置
- [ ] GOOGLE_CLIENT_SECRET 已设置
- [ ] Google OAuth 回调 URL 已添加
- [ ] 数据库防火墙规则已配置
- [ ] Cloud Run 服务已重新部署
