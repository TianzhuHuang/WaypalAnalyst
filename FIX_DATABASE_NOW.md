# 🔴 立即修复数据库连接（必须执行）

## 当前问题

- ✅ **userId 已正确获取**：`fcbec171-7024-4d55-adb5-16991d96fbe7`
- ❌ **数据库连接失败**：`CONNECT_TIMEOUT 34.17.114.173:5432`
- ❌ **DATABASE_URL 仍然使用公共 IP**：`postgresql://waypal_user:User@123@34.17.114.173:5432/waypal_db?sslmode=require`

## 立即执行

### 方式 1：运行自动修复脚本（推荐）

```bash
./EXECUTE_THIS_NOW.sh
```

### 方式 2：手动执行命令

```bash
# 1. 授予 Cloud Run 服务账号权限
PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

# 2. 更新 DATABASE_URL 为 Unix Socket 格式
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"
```

## 验证修复

等待 1-2 分钟后，检查：

```bash
# 1. 检查 DATABASE_URL 是否已更新
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL

# 应该看到：
# DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db

# 不应该看到：
# DATABASE_URL=postgresql://waypal_user:User@123@34.17.114.173:5432/...
```

```bash
# 2. 检查日志，确认没有 CONNECT_TIMEOUT
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=20 | grep -E "CONNECT_TIMEOUT|Database connection|\[DB\]|Thread created|GET /api/threads"
```

## 修复后的预期结果

- ✅ 不再出现 `CONNECT_TIMEOUT` 错误
- ✅ `POST /api/threads` 成功创建 thread
- ✅ `GET /api/threads` 成功获取 threads 列表
- ✅ 左侧栏显示对话历史记录
