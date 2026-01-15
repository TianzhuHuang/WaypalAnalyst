# 生产环境对话历史保存问题诊断指南

## 问题描述

生产环境无法自动保存对话历史，但本地环境可以正常工作。

## 已实施的改进

1. **增强的 API 日志记录**：
   - 在 `/api/threads/[threadId]/messages` 路由中添加了详细的日志
   - 记录认证状态、数据库连接状态、错误详情

2. **改进的错误处理**：
   - 前端错误捕获和日志记录
   - 更详细的错误信息返回

## 诊断步骤

### 1. 检查 Cloud Run 日志

查看最新的日志，查找以下关键信息：

```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100
```

**查找以下日志模式**：
- `[API] POST /api/threads/[threadId]/messages - Starting`
- `[API] Session status:`
- `[API] Database URL status:`
- `[API] Error saving message:`

### 2. 检查环境变量

确保以下环境变量已正确设置：

```bash
gcloud run services describe waypalanalyst --region=europe-west1 --format="value(spec.template.spec.containers[0].env)"
```

**必需的环境变量**：
- `DATABASE_URL` - 数据库连接字符串
- `AUTH_SECRET` - NextAuth 密钥
- `AUTH_URL` - 认证 URL（应该是 `https://hotel.waypal.ai`）
- `AUTH_TRUST_HOST` - 应该设置为 `true`
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `NODE_ENV` - 应该设置为 `production`

### 3. 检查浏览器控制台

在生产环境中打开浏览器开发者工具（F12），查看：

1. **Console 标签**：
   - 查找 `[useThreadQuery]` 开头的日志
   - 查找 `[WaypalApp]` 开头的日志
   - 查找任何错误信息

2. **Network 标签**：
   - 查找对 `/api/threads/[threadId]/messages` 的 POST 请求
   - 检查请求状态码：
     - `200` - 成功
     - `401` - 未授权（认证问题）
     - `403` - 禁止访问（权限问题）
     - `404` - Thread 不存在
     - `500` - 服务器错误（数据库连接或其他问题）
   - 查看响应内容，检查错误详情

### 4. 常见问题及解决方案

#### 问题 1: 401 Unauthorized

**症状**：日志显示 `[API] Unauthorized: No session or user ID`

**可能原因**：
- 用户未登录
- NextAuth session 未正确传递
- `AUTH_SECRET` 未设置或无效
- `AUTH_URL` 设置错误

**解决方案**：
1. 检查用户是否已登录（查看浏览器 Application > Cookies 中是否有 `next-auth.session-token`）
2. 验证 `AUTH_SECRET` 已设置且至少 32 字符
3. 验证 `AUTH_URL` 设置为 `https://hotel.waypal.ai`（与生产域名完全匹配）
4. 确保 `AUTH_TRUST_HOST=true`

#### 问题 2: 500 Database Connection Error

**症状**：日志显示 `Database connection failed` 或 `DATABASE_URL is not set`

**可能原因**：
- `DATABASE_URL` 环境变量未设置
- 数据库连接字符串格式错误
- 数据库防火墙规则阻止了 Cloud Run 的访问
- 数据库服务不可用

**解决方案**：
1. 检查 `DATABASE_URL` 是否已设置：
   ```bash
   gcloud run services describe waypalanalyst --region=europe-west1 --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL
   ```

2. 验证数据库连接字符串格式：
   ```
   postgresql://username:password@host:port/database
   ```

3. 检查数据库防火墙规则，确保允许 Cloud Run 访问：
   ```bash
   gcloud sql instances describe waypalhotel-db --format="value(settings.ipConfiguration.authorizedNetworks)"
   ```

4. 测试数据库连接（从 Cloud Run 容器内部）：
   - 查看 Cloud Run 日志中是否有数据库连接错误

#### 问题 3: 404 Thread Not Found

**症状**：日志显示 `Thread not found`

**可能原因**：
- Thread ID 不正确
- Thread 已被删除
- Thread 属于其他用户

**解决方案**：
1. 检查前端是否正确创建了 Thread
2. 查看浏览器 Network 标签，确认 Thread ID 是否正确传递
3. 检查数据库中是否存在该 Thread

#### 问题 4: 403 Forbidden

**症状**：日志显示 `Forbidden: Thread belongs to different user`

**可能原因**：
- Thread 属于其他用户
- Session 中的用户 ID 与 Thread 的用户 ID 不匹配

**解决方案**：
1. 检查用户是否使用了正确的账户登录
2. 验证 NextAuth session 中的用户 ID 是否正确

### 5. 实时调试

如果需要实时查看日志，可以使用：

```bash
# 实时查看日志
gcloud run services logs tail waypalanalyst --region=europe-west1

# 过滤特定日志
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep "\[API\]"
```

### 6. 测试步骤

1. **登录用户**：
   - 确保用户已通过 Google OAuth 登录
   - 检查浏览器 Cookies 中是否有 `next-auth.session-token`

2. **创建新对话**：
   - 输入酒店名称
   - 点击"全网查价格"
   - 检查是否创建了 Thread（查看 Network 标签中的 `/api/threads` POST 请求）

3. **发送消息**：
   - 在对话中输入消息
   - 检查 Network 标签中的 `/api/threads/[threadId]/messages` POST 请求
   - 查看响应状态码和内容

4. **检查保存结果**：
   - 刷新页面
   - 检查左侧栏是否显示对话历史
   - 点击历史对话，检查消息是否正确加载

### 7. 临时调试代码

如果问题仍然存在，可以在代码中添加更多调试信息：

在 `src/components/WaypalApp.tsx` 的 `handleSend` 函数开始处添加：

```typescript
console.log('[WaypalApp] handleSend called:', {
  hasThreadId: !!currentThreadId,
  threadId: currentThreadId,
  isAuthenticated,
  messageLength: text.length,
  session: await fetch('/api/auth/session').then(r => r.json()),
});
```

## 验证清单

- [ ] `DATABASE_URL` 已设置且格式正确
- [ ] `AUTH_SECRET` 已设置（至少 32 字符）
- [ ] `AUTH_URL` 设置为 `https://hotel.waypal.ai`
- [ ] `AUTH_TRUST_HOST` 设置为 `true`
- [ ] 数据库防火墙规则允许 Cloud Run 访问
- [ ] 用户已正确登录（有有效的 session token）
- [ ] Thread 创建成功（检查 `/api/threads` POST 响应）
- [ ] 消息保存 API 调用成功（检查 `/api/threads/[threadId]/messages` POST 响应）
- [ ] Cloud Run 日志中没有错误信息

## 下一步

如果按照以上步骤仍无法解决问题，请：

1. 收集以下信息：
   - Cloud Run 日志（最近 100 条）
   - 浏览器控制台错误
   - Network 标签中的请求/响应详情
   - 环境变量配置（隐藏敏感信息）

2. 检查是否有其他相关错误或警告

3. 验证本地环境是否仍然正常工作（确保问题仅存在于生产环境）
