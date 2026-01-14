# Mock 登录测试指南

## 概述

这个 Mock 登录方案用于本地测试，**不触发真实的 Google OAuth 跳转**。它直接操作数据库来创建/更新用户 profile，验证 Module One 的登录和用户创建功能。

## 测试目标

1. ✅ 验证系统能够自动在数据库中创建 profile 记录
2. ✅ 验证新用户 `test-user@gmail.com` 的登录流程
3. ✅ 验证数据库操作的正确性
4. ✅ 验证日志记录功能

## 前置条件

1. **环境变量配置**：确保 `.env.local` 包含：
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   AUTH_URL=http://localhost:3000
   AUTH_TRUST_HOST=true
   DATABASE_URL=your-database-connection-string
   ```

2. **数据库连接**：确保数据库可以连接（Cloud SQL Proxy 运行中，或使用公共 IP）

3. **开发服务器**：确保 `npm run dev` 正在运行

## 测试步骤

### 步骤 1: 访问测试页面

1. 启动开发服务器（如果未运行）：
   ```bash
   npm run dev
   ```

2. 访问测试页面：
   ```
   http://localhost:3000/test-login
   ```

### 步骤 2: 执行 Mock 登录

1. 点击 **"Mock Login (test-user@gmail.com)"** 按钮
2. 观察页面上的结果：
   - ✅ **成功**：显示绿色的 "Result" 区域，包含用户信息
   - ❌ **失败**：显示红色的 "Error" 区域，包含错误信息

### 步骤 3: 验证数据库操作

1. 点击 **"Check Database Profile"** 按钮
2. 查看返回的 profile 数据：
   - 应该包含 `test-user@gmail.com` 的用户信息
   - 应该包含自动生成的 `id` (UUID)
   - 应该包含 `fullName`、`email` 等字段

### 步骤 4: 检查日志

查看日志文件 `.cursor/debug.log`，应该看到：

```json
{"location":"app/api/auth/mock-login/route.ts:12","message":"Mock login API called",...}
{"location":"app/api/auth/mock-login/route.ts:20","message":"Checking if user exists",...}
{"location":"app/api/auth/mock-login/route.ts:30","message":"User query result",...}
{"location":"app/api/auth/mock-login/route.ts:36","message":"Creating new user profile",...}
{"location":"app/api/auth/mock-login/route.ts:50","message":"User created successfully",...}
```

## 预期结果

### 第一次运行（新用户）

1. **API 响应**：
   ```json
   {
     "success": true,
     "user": {
       "id": "uuid-here",
       "email": "test-user@gmail.com",
       "name": "Test User",
       "image": null
     },
     "message": "User created successfully"
   }
   ```

2. **数据库记录**：
   - `profiles` 表中应该有一条新记录
   - `email` = `test-user@gmail.com`
   - `full_name` = `Test User`
   - `id` 是自动生成的 UUID

### 第二次运行（已存在用户）

1. **API 响应**：
   ```json
   {
     "success": true,
     "user": {
       "id": "same-uuid-as-before",
       "email": "test-user@gmail.com",
       "name": "Test User",
       "image": null
     },
     "message": "User logged in successfully"
   }
   ```

2. **数据库记录**：
   - `profiles` 表中的记录被更新
   - `updated_at` 字段更新为当前时间

## 故障排查

### 错误 1: "Failed to mock login"

**可能原因**：
- 数据库连接失败
- 数据库表不存在
- 环境变量未正确设置

**解决方法**：
1. 检查 `DATABASE_URL` 是否正确
2. 确认 Cloud SQL Proxy 正在运行（如果使用）
3. 检查数据库表是否已创建（运行迁移）

### 错误 2: "Database connection error"

**可能原因**：
- Cloud SQL Proxy 未运行
- 数据库连接字符串错误
- 网络连接问题

**解决方法**：
1. 启动 Cloud SQL Proxy：
   ```bash
   ./cloud-sql-proxy waypal-473104:europe-west12:waypalhotel-db
   ```
2. 验证数据库连接：
   ```bash
   psql "postgresql://waypal_user:User@123@localhost:5432/waypal_db"
   ```

### 错误 3: 日志文件为空

**可能原因**：
- 日志服务未启动
- 日志路径错误

**解决方法**：
- 日志文件位置：`.cursor/debug.log`
- 如果文件不存在，会在第一次写入时自动创建

## 验证清单

完成测试后，确认：

- [ ] Mock 登录 API 成功返回用户信息
- [ ] 数据库中创建了 `test-user@gmail.com` 的 profile 记录
- [ ] 日志文件包含完整的操作流程
- [ ] 第二次登录时，用户信息被正确更新
- [ ] 没有触发真实的 Google OAuth 跳转

## 下一步

测试通过后，可以：

1. **清理测试数据**（可选）：
   ```sql
   DELETE FROM profiles WHERE email = 'test-user@gmail.com';
   ```

2. **继续开发**：Mock 登录验证了数据库操作的正确性，可以继续开发其他功能

3. **配置真实 OAuth**：当需要真实 Google 登录时，确保 Google Cloud Console 中配置了正确的回调 URL
