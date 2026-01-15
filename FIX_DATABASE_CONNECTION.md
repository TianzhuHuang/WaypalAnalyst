# 修复生产环境数据库连接超时问题

## 问题描述

从日志中看到 `CONNECT_TIMEOUT` 错误，无法连接到数据库 `34.17.114.173:5432`。

## 根本原因

Cloud Run 无法直接通过公共 IP 连接到 Cloud SQL 实例。需要使用以下方式之一：

1. **Unix Socket 连接**（推荐）
2. **Cloud SQL Proxy**
3. **私有 IP 连接**（需要 VPC 配置）

## 解决方案

### 方案一：使用 Unix Socket 连接（推荐，最简单）

Cloud SQL 提供了 Unix socket 连接方式，这是 Cloud Run 推荐的方式。

#### 1. 修改 DATABASE_URL 格式

在 Cloud Run 环境变量中，将 `DATABASE_URL` 从：
```
postgresql://waypal_user:User@123@34.17.114.173:5432/waypal_db
```

改为：
```
postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db
```

**格式说明**：
- `host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- 不需要 IP 地址和端口
- Cloud Run 会自动处理 socket 连接

#### 2. 在 Cloud Run 中设置环境变量

```bash
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --set-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"
```

#### 3. 确保 Cloud Run 服务账号有权限

Cloud Run 的服务账号需要 Cloud SQL Client 权限：

```bash
# 获取 Cloud Run 服务账号
SERVICE_ACCOUNT=$(gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.serviceAccountName)")

# 如果没有设置，使用默认的
if [ -z "$SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

# 授予 Cloud SQL Client 权限
gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

### 方案二：使用 Cloud SQL Proxy（如果方案一不行）

如果 Unix socket 连接不工作，可以使用 Cloud SQL Proxy。

#### 1. 在 Cloud Run 中添加 Cloud SQL 连接

```bash
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --add-cloudsql-instances=waypal-473104:europe-west12:waypalhotel-db
```

#### 2. 修改 DATABASE_URL

使用 `127.0.0.1` 作为主机（Cloud SQL Proxy 会在本地监听）：

```
postgresql://waypal_user:User@123@127.0.0.1:5432/waypal_db
```

### 方案三：使用私有 IP（需要 VPC）

如果数据库配置了私有 IP，需要：

1. 确保 Cloud Run 连接到 VPC
2. 使用私有 IP 地址

## 验证步骤

### 1. 检查当前配置

```bash
# 查看当前环境变量
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"

# 查看 Cloud SQL 连接配置
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].cloudSqlInstances)"
```

### 2. 查看日志确认连接

部署后，查看日志：

```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50 | grep -i "database\|connect\|timeout"
```

**期望看到**：
- 没有 `CONNECT_TIMEOUT` 错误
- 数据库查询成功

**如果仍然看到错误**：
- 检查服务账号权限
- 检查 Cloud SQL 实例名称是否正确
- 检查 DATABASE_URL 格式

## 快速修复命令（方案一）

```bash
# 1. 授予权限
PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

# 2. 更新 DATABASE_URL（使用 Unix socket）
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"
```

## 注意事项

1. **实例名称格式**：`PROJECT_ID:REGION:INSTANCE_NAME`
   - 确保使用正确的格式
   - 检查 Cloud SQL 实例的实际名称和区域

2. **密码中的特殊字符**：如果密码包含特殊字符，需要进行 URL 编码
   - `@` → `%40`
   - `#` → `%23`
   - `&` → `%26`
   - 等等

3. **测试连接**：部署后，等待 1-2 分钟，然后测试创建 Thread，查看是否还有连接超时错误

## 如果仍然失败

1. **检查 Cloud SQL 实例状态**：
   ```bash
   gcloud sql instances describe waypalhotel-db
   ```

2. **检查网络配置**：
   - 确保 Cloud SQL 实例允许来自 Cloud Run 的连接
   - 检查防火墙规则

3. **查看详细错误日志**：
   ```bash
   gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep -A 10 -B 10 "timeout\|error\|database"
   ```
