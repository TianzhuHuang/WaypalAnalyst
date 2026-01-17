# 🔴 关键修复：Cloud SQL 连接配置

## 问题

- ✅ **userId 已正确获取**：`14ca3281-d057-4d4-98be-adf311c97cc9`
- ❌ **数据库连接失败**：`Error: connect ENOENT /cloudsql/waypal-473104:europe-west12:waypalhotel-db/.s.PGSQL.5432`
- ❌ **GET /api/threads 返回 500 错误**
- ❌ **POST /api/threads 返回 500 错误**

## 根本原因

**关键问题**：Cloud Run 服务没有配置 Cloud SQL 连接！

仅更新 `DATABASE_URL` 环境变量是不够的。Cloud Run 需要在服务配置中明确告诉它连接到哪个 Cloud SQL 实例，否则容器内不会创建 Unix Socket 文件。

## 修复方案

### 步骤 1：运行修复脚本

```bash
./FIX_CLOUDSQL_CONNECTION.sh
```

这个脚本会：
1. 添加 Cloud SQL 连接配置到 Cloud Run 服务
2. 验证配置是否正确

### 步骤 2：验证修复

等待 1-2 分钟后：

```bash
# 检查 Cloud SQL 连接配置
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])"

# 应该看到：
# waypal-473104:europe-west12:waypalhotel-db
```

### 步骤 3：测试

```bash
# 检查日志，确认没有 ENOENT 错误
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=20 | grep -E "ENOENT|Database connection|Thread created"
```

## 预期结果

修复后：
- ✅ 不再出现 `ENOENT` 错误
- ✅ `POST /api/threads` 成功创建 thread
- ✅ `GET /api/threads` 成功获取 threads 列表
- ✅ 左侧栏显示对话历史记录

## 技术说明

### Cloud Run + Cloud SQL 连接方式

Cloud Run 有两种方式连接 Cloud SQL：

1. **Unix Socket（推荐）**：
   - 需要在服务配置中添加 `--add-cloudsql-instances=INSTANCE_CONNECTION_NAME`
   - 在容器内，socket 文件路径为：`/cloudsql/INSTANCE_CONNECTION_NAME/.s.PGSQL.5432`
   - `DATABASE_URL` 使用格式：`postgresql://user:pass@/db?host=/cloudsql/INSTANCE_CONNECTION_NAME`

2. **私有 IP**：
   - 需要 VPC 连接
   - 使用 IP 地址连接

当前问题：虽然 `DATABASE_URL` 已配置为 Unix Socket 格式，但 Cloud Run 服务**没有配置 Cloud SQL 连接**，导致容器内不存在 `/cloudsql/` 目录，因此连接失败。

## 相关文件

- `FIX_CLOUDSQL_CONNECTION.sh` - 自动修复脚本
- `EXECUTE_THIS_NOW.sh` - 之前的修复脚本（已更新 DATABASE_URL）
