# 生产环境配置指南

## Google OAuth 生产环境配置

### 1. 更新 Google Cloud Console 配置

在生产环境部署前，需要在 Google Cloud Console 中添加生产环境的回调 URL：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 找到您的 OAuth 2.0 Client ID
3. 在 **"Authorized redirect URIs"** 中添加生产环境的回调 URL：
   ```
   https://your-production-domain.com/api/auth/callback/google
   ```
   例如：`https://hotel.waypal.ai/api/auth/callback/google`

4. 在 **"Authorized JavaScript origins"** 中添加生产环境的域名：
   ```
   https://your-production-domain.com
   ```
   例如：`https://hotel.waypal.ai`

### 2. 环境变量配置

在生产环境（Google Cloud Run）中，需要设置以下环境变量：

```bash
# Backend API
NEXT_PUBLIC_AGENT_BACKEND_URL=https://waypal-agent-backend-266509309806.asia-east1.run.app

# Database (Google Cloud SQL PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth.js v5 (Authentication)
AUTH_SECRET=your-production-secret-key-here
AUTH_URL=https://your-production-domain.com
AUTH_TRUST_HOST=true

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**重要提示**：
- `AUTH_URL` 必须设置为生产环境的完整 URL（包括 `https://`）
- `AUTH_SECRET` 应该使用强随机字符串（可以使用 `openssl rand -base64 32` 生成）
- 确保所有环境变量都已正确设置

### 3. Google Cloud Run 环境变量设置

在 Google Cloud Console 中：

1. 进入 **Cloud Run** 服务
2. 点击您的服务名称
3. 点击 **"EDIT & DEPLOY NEW REVISION"**
4. 在 **"Variables & Secrets"** 标签页中添加所有环境变量
5. 点击 **"DEPLOY"** 部署新版本

### 4. 验证配置

部署后，验证以下内容：

1. **检查回调 URL**：
   ```bash
   curl https://your-production-domain.com/api/auth/providers
   ```
   确认返回的 `callbackUrl` 与 Google Cloud Console 中的配置一致

2. **测试登录流程**：
   - 访问生产环境网站
   - 点击 "Google 登录" 按钮
   - 确认能够成功跳转到 Google 登录页面
   - 完成登录后，确认能够成功返回应用

### 5. 常见问题

**Q: 生产环境仍然出现 Configuration 错误？**
A: 检查：
- Google Cloud Console 中的回调 URL 是否包含生产域名
- `AUTH_URL` 环境变量是否设置为生产域名
- 配置更改是否已生效（可能需要等待几分钟）

**Q: 登录后无法返回应用？**
A: 检查：
- Google Cloud Console 中的回调 URL 是否完全匹配
- `AUTH_URL` 环境变量是否正确设置
- 浏览器控制台是否有错误信息

## 数据库迁移

如果生产环境数据库尚未创建表结构，需要运行迁移：

```bash
# 使用 Drizzle Kit 生成迁移（如果还没有）
npm run drizzle-kit generate

# 在生产环境运行迁移
npm run drizzle-kit push
```

或者直接在数据库中执行 `drizzle/0000_initial_schema.sql` 文件。
