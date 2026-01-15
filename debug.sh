#!/bin/bash
echo "=== Cloud Run 服务状态 ==="
gcloud run services describe waypalanalyst --region=europe-west1 --format="value(status.conditions[0].status)" 2>/dev/null || echo "无法获取服务状态"

echo -e "\n=== 最近 20 条错误日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 2>/dev/null | grep -i "error" | head -20 || echo "无错误日志"

echo -e "\n=== 最近 10 条认证日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 2>/dev/null | grep "\[Auth\]" | tail -10 || echo "无认证日志"

echo -e "\n=== 最近 10 条 API 日志 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 2>/dev/null | grep "\[API\]" | tail -10 || echo "无 API 日志"

echo -e "\n=== 数据库连接状态 ==="
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 2>/dev/null | grep -E "\[DB\]|CONNECT_TIMEOUT|Database connection" | tail -5 || echo "无数据库日志"
