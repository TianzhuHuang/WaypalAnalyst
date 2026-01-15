# 生产环境问题修复总结

## 问题诊断

从浏览器控制台和 Cloud Run 日志中发现两个关键问题：

### 1. 401 Unauthorized 错误
- **症状**：`POST /api/threads 401 (Unauthorized)`
- **原因**：`session.user.id` 为空，导致 API 路由返回 401
- **根本原因**：数据库连接超时，无法从数据库获取用户 ID

### 2. 数据库连接超时
- **症状**：`CONNECT_TIMEOUT` 错误，无法连接到 `34.17.114.173:5432`
- **原因**：Cloud Run 无法直接通过公共 IP 连接到 Cloud SQL

## 已实施的修复

### 1. 改进认证流程（`src/lib/auth.ts`）

#### a. 添加 JWT Callback
- 在 JWT token 中存储用户 ID
- 优先使用 signIn callback 中设置的 `user.id`
- 如果 signIn callback 失败，尝试从数据库查询

#### b. 改进 SignIn Callback
- 创建/更新用户后，将用户 ID 存储到 `user.id`
- 这样 JWT callback 可以直接使用，无需再次查询数据库

#### c. 改进 Session Callback
- 优先从 token 中获取用户 ID（最快，不依赖数据库）
- 如果 token 中没有，才尝试从数据库查询
- 即使数据库连接失败，也能从 token 中获取用户 ID

### 2. 改进数据库连接（`src/lib/db/index.ts`）

- 检测 Unix socket 连接（Cloud SQL 推荐方式）
- 增加连接超时时间（Unix socket 需要更长时间）
- 添加连接测试和详细日志

### 3. 创建修复文档

- `FIX_DATABASE_CONNECTION.md` - 数据库连接修复指南
- `PRODUCTION_FIX_SUMMARY.md` - 本文档

## 下一步操作

### 立即需要做的（关键）

#### 1. 修复数据库连接

**选项 A：使用 Unix Socket（推荐）**

```bash
# 1. 授予 Cloud Run 服务账号权限
PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

# 2. 更新 DATABASE_URL 使用 Unix socket
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"
```

**选项 B：使用 Cloud SQL Proxy**

```bash
# 1. 添加 Cloud SQL 实例连接
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --add-cloudsql-instances=waypal-473104:europe-west12:waypalhotel-db

# 2. 更新 DATABASE_URL 使用 127.0.0.1
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@127.0.0.1:5432/waypal_db"
```

#### 2. 验证环境变量

确保以下环境变量都已设置：

```bash
# 检查环境变量
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**必需的环境变量**：
- ✅ `AUTH_SECRET` - 已设置
- ✅ `AUTH_URL` - 应该是 `https://hotel.waypal.ai`
- ✅ `AUTH_TRUST_HOST` - 应该是 `true`
- ⚠️ `DATABASE_URL` - **需要修复为 Unix socket 或 Cloud SQL Proxy 格式**
- ✅ `GOOGLE_CLIENT_ID` - 应该已设置
- ✅ `GOOGLE_CLIENT_SECRET` - 应该已设置
- ✅ `NODE_ENV` - 应该是 `production`

### 3. 部署代码更改

```bash
# 提交并推送代码
git add -A
git commit -m "fix: 改进认证流程以处理数据库连接失败的情况"
git push origin main

# Cloud Build 会自动部署
```

### 4. 验证修复

部署后（等待 1-2 分钟）：

1. **清除浏览器缓存和 Cookies**
2. **重新登录**
3. **测试创建 Thread**：
   - 输入酒店名称
   - 点击"全网查价格"
   - 检查浏览器 Network 标签，确认 `/api/threads` POST 请求返回 200

4. **查看日志确认**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -E "\[Auth\]|\[API\]|Session status"
   ```

**期望看到的日志**：
```
[Auth] SignIn callback: Existing user ID: xxx
[Auth] JWT callback: User ID from signIn callback: xxx
[Auth] Session callback: User ID from token: xxx
[API] Session status: { hasSession: true, hasUser: true, hasUserId: true, ... }
[API] Thread created successfully: thread_xxx
```

## 预期效果

修复后，即使数据库连接暂时失败：

1. ✅ **认证仍然可以工作**：用户 ID 从 token 中获取，不依赖数据库
2. ✅ **可以创建 Thread**：因为 session 中有有效的用户 ID
3. ⚠️ **消息保存可能失败**：如果数据库连接失败，消息无法保存，但至少不会出现 401 错误

**最终目标**：修复数据库连接，确保所有功能正常工作。

## 如果仍然失败

1. **检查 Cloud SQL 实例名称**：
   ```bash
   gcloud sql instances list
   ```
   确认实例名称和区域是否正确

2. **检查服务账号权限**：
   ```bash
   gcloud projects get-iam-policy waypal-473104 \
     --flatten="bindings[].members" \
     --filter="bindings.members:*compute*" \
     --format="table(bindings.role)"
   ```

3. **查看详细错误日志**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100
   ```

## 相关文档

- `FIX_DATABASE_CONNECTION.md` - 数据库连接修复详细指南
- `QUICK_FIX_401_ERROR.md` - 401 错误快速修复指南
- `HOW_TO_VIEW_CLOUD_RUN_LOGS.md` - 如何查看 Cloud Run 日志
