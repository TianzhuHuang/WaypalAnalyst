# 本地环境 Google 登录问题排查指南

## 🔍 为什么生产环境可以，本地环境不行？

生产环境和本地环境的主要区别在于：

1. **Google Cloud Console 回调 URL 配置**
2. **环境变量设置**
3. **数据库连接**
4. **NextAuth v5 的信任主机设置**

## ✅ 检查清单

### 1. Google Cloud Console 回调 URL 配置

**问题**：Google Cloud Console 中可能只配置了生产环境的回调 URL，没有配置本地环境的。

**解决步骤**：

1. 访问 [Google Cloud Console - OAuth 2.0 客户端 ID](https://console.cloud.google.com/apis/credentials)
2. 找到您的 OAuth 2.0 Client ID
3. 点击编辑
4. 在 **"Authorized redirect URIs"** 中，确保添加了：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. 在 **"Authorized JavaScript origins"** 中，确保添加了：
   ```
   http://localhost:3000
   ```
6. 点击 **"保存"**

**重要**：配置更改可能需要几分钟才能生效。

### 2. 本地环境变量检查

确保您的 `.env.local` 文件包含以下变量：

```bash
# NextAuth 配置（本地开发）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# 或者使用 NextAuth v5 的新变量名
AUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret-key-here
AUTH_TRUST_HOST=true

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 数据库连接（本地开发）
DATABASE_URL=postgresql://username:password@host:port/database
```

**验证方法**：

```bash
# 检查环境变量是否加载
node -e "console.log('AUTH_URL:', process.env.AUTH_URL)"
node -e "console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set')"
```

### 3. AUTH_TRUST_HOST 设置

NextAuth v5 在本地开发时需要 `AUTH_TRUST_HOST=true`。

**检查**：
- 确保 `.env.local` 中有 `AUTH_TRUST_HOST=true`
- 或者在代码中已经设置了默认值（`src/lib/auth.ts` 中已有）

### 4. 数据库连接问题

如果数据库连接失败，登录回调中的用户创建/更新会失败。

**检查方法**：

1. 检查 Cloud SQL Proxy 是否运行：
   ```bash
   # 检查进程
   ps aux | grep cloud-sql-proxy
   ```

2. 测试数据库连接：
   ```bash
   psql "postgresql://waypal_user:User@123@localhost:5432/waypal_db"
   ```

3. 查看应用日志：
   ```bash
   # 启动开发服务器时查看控制台输出
   npm run dev
   # 查看是否有数据库连接错误
   ```

### 5. 浏览器控制台错误

打开浏览器开发者工具（F12），查看：

1. **Console 标签**：查看是否有 JavaScript 错误
2. **Network 标签**：查看 `/api/auth/callback/google` 请求的状态码和响应

**常见错误**：
- `401 Unauthorized`：OAuth 配置问题
- `500 Internal Server Error`：服务器端错误（可能是数据库连接问题）
- `Configuration` 错误：环境变量缺失或配置错误

### 6. Next.js 开发服务器重启

修改环境变量后，**必须重启开发服务器**：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

## 🔧 快速修复步骤

### 步骤 1：检查 Google Cloud Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 确认本地回调 URL 已添加：`http://localhost:3000/api/auth/callback/google`
3. 确认本地 JavaScript 源已添加：`http://localhost:3000`

### 步骤 2：检查 `.env.local`

确保文件包含：

```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
AUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=your-database-url
```

### 步骤 3：重启开发服务器

```bash
# 停止服务器
# Ctrl+C

# 清除 Next.js 缓存（可选）
rm -rf .next

# 重新启动
npm run dev
```

### 步骤 4：测试登录

1. 访问 `http://localhost:3000`
2. 点击 "Google 登录"
3. 查看浏览器控制台和服务器日志

## 🐛 常见错误及解决方案

### 错误 1: "Configuration" 错误

**原因**：环境变量缺失或 Google OAuth 配置不正确

**解决**：
- 检查 `.env.local` 中的所有变量
- 确认 Google Cloud Console 中的回调 URL 配置正确
- 重启开发服务器

### 错误 2: "redirect_uri_mismatch"

**原因**：Google Cloud Console 中的回调 URL 与请求不匹配

**解决**：
- 确保 Google Cloud Console 中有 `http://localhost:3000/api/auth/callback/google`
- 确保没有多余的斜杠或协议错误

### 错误 3: 数据库连接失败

**原因**：Cloud SQL Proxy 未运行或连接字符串错误

**解决**：
- 启动 Cloud SQL Proxy
- 检查 `DATABASE_URL` 是否正确
- 确认数据库用户权限

### 错误 4: 登录后无法返回应用

**原因**：`AUTH_URL` 配置错误或 `AUTH_TRUST_HOST` 未设置

**解决**：
- 确保 `.env.local` 中有 `AUTH_URL=http://localhost:3000`
- 确保有 `AUTH_TRUST_HOST=true`
- 重启开发服务器

## 📝 调试技巧

### 1. 启用详细日志

在 `src/lib/auth.ts` 中添加日志：

```typescript
console.log('AUTH_URL:', process.env.AUTH_URL);
console.log('AUTH_SECRET:', process.env.AUTH_SECRET ? 'Set' : 'Not Set');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set');
```

### 2. 检查 NextAuth 配置

访问 `http://localhost:3000/api/auth/providers` 查看配置是否正确。

### 3. 查看完整错误信息

在浏览器 Network 标签中，查看 `/api/auth/callback/google` 请求的完整响应。

## ✅ 验证清单

完成以上步骤后，验证：

- [ ] Google Cloud Console 中已添加本地回调 URL
- [ ] `.env.local` 中所有变量都已设置
- [ ] 开发服务器已重启
- [ ] Cloud SQL Proxy 正在运行（如果使用）
- [ ] 浏览器控制台没有错误
- [ ] 可以成功跳转到 Google 登录页面
- [ ] 登录后可以成功返回应用

## 🆘 仍然无法解决？

如果以上步骤都无法解决问题，请提供：

1. 浏览器控制台的完整错误信息
2. 服务器日志的完整输出
3. `.env.local` 的配置（隐藏敏感信息）
4. Google Cloud Console 中的回调 URL 列表截图
