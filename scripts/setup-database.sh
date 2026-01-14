#!/bin/bash

# Cloud SQL 连接信息
PROJECT_ID="waypal-473104"
REGION="europe-west1"
INSTANCE_NAME="waypalhotel-db"
DB_NAME="waypal_db"
DB_USER="waypal_user"
DB_PASSWORD="User@123"

# 连接名称
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

echo "=========================================="
echo "WayPal Database Setup Script"
echo "=========================================="
echo ""
echo "连接信息："
echo "  项目ID: ${PROJECT_ID}"
echo "  区域: ${REGION}"
echo "  实例名称: ${INSTANCE_NAME}"
echo "  数据库名: ${DB_NAME}"
echo "  用户名: ${DB_USER}"
echo ""
echo "=========================================="
echo ""

# 检查是否安装了 Cloud SQL Proxy
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "⚠️  Cloud SQL Proxy 未安装"
    echo ""
    echo "请选择连接方式："
    echo "1. 使用 Cloud SQL Proxy（推荐，更安全）"
    echo "2. 使用公共 IP 连接（需要配置授权网络）"
    echo ""
    read -p "请输入选项 (1 或 2): " choice
    
    if [ "$choice" = "1" ]; then
        echo ""
        echo "📥 安装 Cloud SQL Proxy..."
        echo ""
        echo "macOS (Apple Silicon):"
        echo "curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64"
        echo "chmod +x cloud-sql-proxy"
        echo ""
        echo "macOS (Intel):"
        echo "curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
        echo "chmod +x cloud-sql-proxy"
        echo ""
        echo "安装完成后，在另一个终端运行："
        echo "./cloud-sql-proxy ${CONNECTION_NAME}"
        echo ""
        echo "然后重新运行此脚本"
        exit 1
    fi
fi

# 检查 Cloud SQL Proxy 是否运行
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "⚠️  无法连接到 localhost:5432"
    echo ""
    echo "请确保 Cloud SQL Proxy 正在运行："
    echo "  ./cloud-sql-proxy ${CONNECTION_NAME}"
    echo ""
    echo "或者使用公共 IP 连接（需要在 Cloud SQL 控制台配置授权网络）"
    exit 1
fi

echo "✅ 数据库连接检查通过"
echo ""

# 创建数据库
echo "📝 创建数据库 ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -p 5432 -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "数据库可能已存在，跳过创建"

# 执行迁移
echo ""
echo "📝 执行数据库迁移..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" -f drizzle/0000_initial_schema.sql

echo ""
echo "✅ 数据库设置完成！"
echo ""
echo "连接字符串（用于 .env.local）："
echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}\""
echo ""
