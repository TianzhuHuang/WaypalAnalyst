#!/bin/bash
# 修复 Cloud SQL 连接 - 必须在 Cloud Run 服务中配置 Cloud SQL 连接

set -e

echo "=== 步骤 1: 添加 Cloud SQL 连接配置到 Cloud Run 服务 ==="
echo "实例连接名称: waypal-473104:europe-west12:waypalhotel-db"

gcloud run services update waypalanalyst \
  --region=europe-west1 \
  --add-cloudsql-instances=waypal-473104:europe-west12:waypalhotel-db

echo -e "\n✅ Cloud SQL 连接已配置\n"

echo "=== 步骤 2: 验证配置 ==="
echo "检查 Cloud SQL 连接配置："
gcloud run services describe waypalanalyst \
  --region=europe-west1 \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])"

echo -e "\n✅ 配置完成！等待部署完成（约 1-2 分钟）..."
echo "可以使用以下命令检查部署状态："
echo "  gcloud run services describe waypalanalyst --region=europe-west1 --format=\"value(status.conditions[0].status)\""
