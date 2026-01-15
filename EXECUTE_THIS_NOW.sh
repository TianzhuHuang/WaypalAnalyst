#!/bin/bash
# 立即执行此脚本来修复数据库连接

set -e

echo "=== 步骤 1: 授予 Cloud Run 服务账号权限 ==="
PROJECT_NUMBER=$(gcloud projects describe waypal-473104 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "服务账号: $SERVICE_ACCOUNT"

gcloud projects add-iam-policy-binding waypal-473104 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client" \
  --condition=None

echo -e "\n✅ 权限已授予\n"

echo "=== 步骤 2: 更新 DATABASE_URL 为 Unix Socket 格式 ==="
echo "当前配置："
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL

echo -e "\n更新为 Unix Socket 格式..."
gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://waypal_user:User@123@/waypal_db?host=/cloudsql/waypal-473104:europe-west12:waypalhotel-db"

echo -e "\n✅ DATABASE_URL 已更新\n"

echo "=== 步骤 3: 验证更新 ==="
echo "新的 DATABASE_URL："
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" | \
  grep DATABASE_URL

echo -e "\n✅ 配置已更新，等待部署完成（约 1-2 分钟）..."
echo "可以使用以下命令检查部署状态："
echo "  gcloud run services describe waypalanalyst --region=europe-west1 --format=\"value(status.conditions[0].status)\""
