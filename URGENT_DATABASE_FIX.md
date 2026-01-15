# ⚠️ 紧急：数据库连接修复

## 当前状态

从日志确认：
- ❌ **数据库连接仍然超时**：`CONNECT_TIMEOUT 34.17.114.173:5432`
- ✅ Session callback 正在使用 `token.sub` 作为 fallback（这是好的）
- ❌ 但 API 路由仍然需要数据库连接来创建 Thread

## 立即执行以下命令

### 步骤 1：确认 Cloud SQL 实例信息

```bash
gcloud sql instances list
```

记录：
- 实例名称（如 `waypalhotel-db`）
- 区域（如 `europe-west12`）
- 项目 ID（如 `waypal-473104`）

### 步骤 2：授予 Cloud Run 服务账号权限

```bash
# 获取项目编号
PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")

# 获取服务账号
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# 授予 Cloud SQL Client 权限
gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

### 步骤 3：更新 DATABASE_URL 为 Unix Socket 格式

**重要**：请先确认实例名称和区域，然后运行：

```bash
# 格式：postgresql://用户名:密码@/数据库名?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"
```

**如果区域或实例名称不同，请修改上面的命令**

### 步骤 4：验证更新

```bash
# 检查 DATABASE_URL 是否已更新
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL
```

**应该看到**：
```
DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db
```

**不应该看到**：
```
DATABASE_URL=postgresql://waypal_user:User@123@34.17.114.173:5432/waypal_db
```

### 步骤 5：等待部署完成

```bash
# 查看部署状态
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(status.conditions[0].status)"
```

等待返回 `True`（通常 1-2 分钟）

### 步骤 6：测试

```bash
# 查看日志，确认没有 CONNECT_TIMEOUT
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=20 | grep -E "CONNECT_TIMEOUT|Database connection|\[DB\]"
```

**期望看到**：
- `[DB] Database connection test successful`
- 没有 `CONNECT_TIMEOUT` 错误

## 如果 Unix Socket 不工作，使用 Cloud SQL Proxy

### 替代方案：Cloud SQL Proxy

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

## 验证清单

- [ ] 已确认 Cloud SQL 实例名称和区域
- [ ] 已授予 Cloud Run 服务账号 `roles/cloudsql.client` 权限
- [ ] 已更新 `DATABASE_URL` 为 Unix socket 或 Cloud SQL Proxy 格式
- [ ] 已等待部署完成（1-2 分钟）
- [ ] 日志中不再出现 `CONNECT_TIMEOUT` 错误
- [ ] 可以成功创建 Thread（不再出现 500 错误）

## 快速诊断

运行以下命令检查当前配置：

```bash
echo "=== 当前 DATABASE_URL ==="
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL

echo -e "\n=== Cloud SQL 实例列表 ==="
gcloud sql instances list

echo -e "\n=== 服务账号权限 ==="
gcloud projects get-iam-policy waypal-473104 \
  --flatten="bindings[].members" \
  --filter="bindings.members:*compute*" \
  --format="table(bindings.role)" | \
  grep cloudsql
```
