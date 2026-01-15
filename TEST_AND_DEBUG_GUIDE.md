# 生产环境测试和调试指南

## 测试步骤

### 1. 等待部署完成

```bash
# 检查 Cloud Build 状态（如果使用 Cloud Build）
gcloud builds list --limit=1

# 检查 Cloud Run 服务状态
gcloud run services describe waypalanalyst --region=europe-west1 --format="value(status.conditions[0].status)"
```

等待状态变为 `True`（通常需要 3-5 分钟）

### 2. 清除浏览器缓存

在浏览器中：
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 或者：Application > Storage > Clear site data

### 3. 测试流程

#### 步骤 A：登录测试
1. 访问 https://hotel.waypal.ai/
2. 点击登录按钮
3. 使用 Google 账号登录
4. 检查是否成功登录（右上角显示用户名）

#### 步骤 B：创建 Thread 测试
1. 在搜索框输入酒店名称（如"香港瑰丽酒店"）
2. 点击"全网查价格"
3. 观察：
   - 是否出现 401 或 500 错误
   - 左侧栏是否显示新的对话历史
   - 是否成功显示比价结果

#### 步骤 C：查看对话历史
1. 刷新页面
2. 检查左侧栏是否显示刚才创建的对话
3. 点击对话，检查是否能正确加载

### 4. 实时查看日志

在另一个终端窗口运行：

```bash
# 实时查看日志
gcloud run services logs tail waypalanalyst --region=europe-west1 | grep -E "\[Auth\]|\[API\]|\[DB\]|Session|Thread|Error|timeout"
```

## 调试命令

### 检查部署状态

```bash
# 查看最新的部署版本
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(status.latestReadyRevisionName,status.latestCreatedRevisionName)"

# 查看服务状态
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(status.conditions)"
```

### 查看最近的错误日志

```bash
# 查看最近的错误
gcloud run services logs read waypalanalyst \
  --region=europe-west1 \
  --limit=100 \
  --format="table(timestamp,textPayload)" | \
  grep -i "error\|timeout\|unauthorized\|500\|401"
```

### 查看认证相关日志

```bash
# 查看认证日志
gcloud run services logs read waypalanalyst \
  --region=europe-west1 \
  --limit=100 | \
  grep -E "\[Auth\]|Session callback|JWT callback|signIn"
```

### 查看 API 调用日志

```bash
# 查看 API 日志
gcloud run services logs read waypalanalyst \
  --region=europe-west1 \
  --limit=100 | \
  grep -E "\[API\]|POST /api/threads|GET /api/threads|Session status"
```

### 查看数据库连接日志

```bash
# 查看数据库相关日志
gcloud run services logs read waypalanalyst \
  --region=europe-west1 \
  --limit=100 | \
  grep -E "\[DB\]|Database|CONNECT_TIMEOUT|connection"
```

## 常见问题诊断

### 问题 1: 仍然出现 401 错误

**检查**：
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -A 10 "Unauthorized"
```

**可能原因**：
- Session callback 没有正确设置 `session.user.id`
- Token 中没有 `userId` 或 `sub`

**修复**：检查日志中的 `[Auth] Session callback` 输出

### 问题 2: 仍然出现 500 错误

**检查**：
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -A 10 "500\|Internal Server Error"
```

**可能原因**：
- 数据库连接仍然失败
- API 路由中的 fallback 逻辑失败

**修复**：检查日志中的错误详情

### 问题 3: 数据库连接超时

**检查**：
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep "CONNECT_TIMEOUT"
```

**如果仍然存在**：
1. 确认已更新 `DATABASE_URL` 为 Unix socket 格式
2. 确认已授予 Cloud SQL Client 权限
3. 确认 Cloud SQL 实例名称正确

**修复命令**：
```bash
# 检查 DATABASE_URL
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL

# 如果仍然是 IP 地址格式，需要更新为 Unix socket
```

### 问题 4: Thread 创建成功但历史不显示

**检查**：
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -E "Thread created|GET /api/threads"
```

**可能原因**：
- Thread 创建成功但查询失败
- 日期过滤问题（只显示最近 7 天）

## 快速诊断脚本

创建一个诊断脚本：

```bash
#!/bin/bash
echo "=== Cloud Run 服务状态 ==="
gcloud run services describe waypalanalyst --region=europe-west1 --format="value(status.conditions[0].status)"

echo -e "\n=== 最近 20 条错误日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep -i "error" | head -20

echo -e "\n=== 最近 10 条认证日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep "\[Auth\]" | tail -10

echo -e "\n=== 最近 10 条 API 日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep "\[API\]" | tail -10

echo -e "\n=== 数据库连接状态 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep -E "\[DB\]|CONNECT_TIMEOUT|Database connection" | tail -5
```

保存为 `debug.sh`，运行：
```bash
chmod +x debug.sh
./debug.sh
```

## 预期结果

### 成功的日志应该显示：

```
[Auth] Session callback: User ID from token.userId: xxx
或
[Auth] Session callback: User ID fetched from DB: xxx

[API] Session status: { hasSession: true, hasUser: true, hasUserId: true, userId: 'xxx', ... }

[API] Thread created successfully: thread_xxx

[DB] Database connection test successful
```

### 不应该看到：

```
CONNECT_TIMEOUT
userId: 'NONE'
[API] Unauthorized
500 Internal Server Error
```

## 如果问题仍然存在

1. **收集完整日志**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 > debug-logs.txt
   ```

2. **检查环境变量**：
   ```bash
   gcloud run services describe waypalanalyst \
     --region=europe-west1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```

3. **检查 Cloud SQL 连接**：
   ```bash
   gcloud sql instances describe waypalhotel-db
   ```

4. **查看详细错误**：
   - 浏览器控制台（F12 > Console）
   - Network 标签中的请求/响应详情
