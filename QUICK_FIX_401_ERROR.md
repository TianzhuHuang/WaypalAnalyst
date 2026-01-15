# 快速修复 401 Unauthorized 错误

## 问题描述

生产环境出现 `POST /api/threads 401 (Unauthorized)` 错误，导致无法创建对话历史。

## 根本原因

从错误信息看，问题出在 NextAuth 认证配置上。用户虽然在前端显示为已登录，但后端 API 无法获取到有效的 session。

## 立即检查清单

### 1. 检查环境变量（最重要）

在 Google Cloud Console 中检查以下环境变量是否已正确设置：

```bash
# 使用 gcloud CLI 检查
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**必需的环境变量**：

1. **AUTH_SECRET**（最关键）
   - 必须设置
   - 至少 32 字符
   - 生成命令：`openssl rand -base64 32`

2. **AUTH_URL**
   - 必须设置为：`https://hotel.waypal.ai`
   - 不能有尾部斜杠
   - 必须与生产域名完全匹配

3. **AUTH_TRUST_HOST**
   - 必须设置为：`true`（字符串，不是布尔值）

4. **GOOGLE_CLIENT_ID** 和 **GOOGLE_CLIENT_SECRET**
   - 必须设置
   - 来自 Google Cloud Console

5. **DATABASE_URL**
   - 必须设置
   - 格式：`postgresql://username:password@host:port/database`

### 2. 快速修复步骤

#### 方法一：通过 Google Cloud Console（推荐）

1. 访问：https://console.cloud.google.com/run/detail/europe-west1/waypalanalyst
2. 点击 **"编辑和部署新版本"**（Edit & Deploy New Revision）
3. 展开 **"变量和密钥"**（Variables & Secrets）
4. 检查并设置以下变量：

   ```
   AUTH_SECRET=<生成一个至少32字符的随机字符串>
   AUTH_URL=https://hotel.waypal.ai
   AUTH_TRUST_HOST=true
   DATABASE_URL=postgresql://waypal_user:User@123@<数据库IP>:5432/waypal_db
   GOOGLE_CLIENT_ID=<你的Client ID>
   GOOGLE_CLIENT_SECRET=<你的Client Secret>
   NODE_ENV=production
   ```

5. 点击 **"部署"**（Deploy）

#### 方法二：通过 gcloud CLI

```bash
# 生成 AUTH_SECRET
AUTH_SECRET=$(openssl rand -base64 32)
echo "Generated AUTH_SECRET: $AUTH_SECRET"

# 更新环境变量
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --set-env-vars="AUTH_SECRET=$AUTH_SECRET" \
  --set-env-vars="AUTH_URL=https://hotel.waypal.ai" \
  --set-env-vars="AUTH_TRUST_HOST=true" \
  --set-env-vars="NODE_ENV=production"
```

### 3. 验证修复

部署完成后：

1. **等待 1-2 分钟**让服务重新部署
2. **清除浏览器缓存和 Cookies**
   - 按 F12 打开开发者工具
   - Application > Storage > Clear site data
   - 或者使用无痕模式测试
3. **重新登录**
   - 访问 https://hotel.waypal.ai
   - 点击登录按钮
   - 使用 Google 账号登录
4. **测试创建对话**
   - 输入酒店名称
   - 点击"全网查价格"
   - 检查浏览器 Network 标签，确认 `/api/threads` POST 请求返回 200 而不是 401

### 4. 查看日志确认

```bash
# 查看最近的日志
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -E "\[API\]|\[Auth\]|Session status"

# 实时查看日志
gcloud run services logs tail waypalanalyst --region=europe-west1 | grep -E "\[API\]|\[Auth\]"
```

**期望看到的日志**：
```
[API] POST /api/threads - Starting
[API] Session status: { hasSession: true, hasUser: true, hasUserId: true, ... }
[API] Thread created successfully: thread_xxx
```

**如果仍然看到错误**：
```
[API] Unauthorized: No session or user ID
[Auth] No valid session found: { hasSession: false, ... }
```

## 常见问题

### Q: AUTH_SECRET 应该设置为什么值？

A: 使用以下命令生成一个随机字符串：
```bash
openssl rand -base64 32
```
这会生成一个 44 字符的 base64 编码字符串，完全安全。

### Q: AUTH_URL 应该设置为什么？

A: 必须设置为你的生产域名，包括 `https://`：
```
https://hotel.waypal.ai
```
**注意**：不能有尾部斜杠，不能是 `http://`，必须完全匹配。

### Q: 为什么本地可以但生产环境不行？

A: 本地环境可能：
- 使用了 `.env.local` 文件中的环境变量
- NextAuth 在 localhost 上自动信任主机
- 生产环境需要显式配置 `AUTH_URL` 和 `AUTH_TRUST_HOST`

### Q: 部署后仍然 401 怎么办？

1. **检查 Cookie 设置**：
   - 打开浏览器开发者工具 > Application > Cookies
   - 查看是否有 `next-auth.session-token` cookie
   - 检查 cookie 的 Domain 是否为 `.waypal.ai` 或 `hotel.waypal.ai`
   - 检查 Secure 标志是否为 true（HTTPS 必须）

2. **检查 Google OAuth 回调 URL**：
   - 访问 Google Cloud Console
   - API & Services > Credentials
   - 找到你的 OAuth 2.0 Client ID
   - 确保已添加授权重定向 URI：`https://hotel.waypal.ai/api/auth/callback/google`

3. **查看详细日志**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep -B 10 -A 10 "Unauthorized"
   ```

## 紧急回滚

如果修复后出现问题，可以快速回滚到上一个版本：

```bash
gcloud run services update-traffic waypalanalyst \
  --region=europe-west1 \
  --to-revisions=<previous-revision>=100
```

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
1. Cloud Run 日志（最近 100 条）
2. 浏览器控制台错误
3. Network 标签中的请求/响应详情
4. 环境变量配置（隐藏敏感信息）
