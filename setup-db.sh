#!/bin/bash

# WayPal 数据库设置脚本
# 使用方法: ./setup-db.sh

set -e

echo "=========================================="
echo "WayPal 数据库设置"
echo "=========================================="
echo ""

# 检查 gcloud 认证
echo "📋 检查 Google Cloud 认证..."
if ! gcloud auth application-default print-access-token > /dev/null 2>&1; then
    echo "⚠️  需要先进行 Google Cloud 认证"
    echo ""
    echo "请运行以下命令："
    echo "  gcloud auth application-default login"
    echo ""
    echo "然后重新运行此脚本"
    exit 1
fi
echo "✅ Google Cloud 认证通过"
echo ""

# 检查 psql
echo "📋 检查 PostgreSQL 客户端..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql 未安装"
    echo ""
    echo "请安装 PostgreSQL 客户端："
    echo "  brew install postgresql"
    echo ""
    echo "或者使用 Docker（如果已安装 Docker）："
    echo "  docker run -it --rm postgres psql -h host.docker.internal -p 5432 -U waypal_user -d waypal_db"
    echo ""
    exit 1
fi
echo "✅ PostgreSQL 客户端已安装"
echo ""

# 检查 Cloud SQL Proxy 是否运行
echo "📋 检查 Cloud SQL Proxy 连接..."
if ! PGPASSWORD="User@123" psql -h localhost -p 5432 -U waypal_user -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠️  无法连接到数据库"
    echo ""
    echo "请确保 Cloud SQL Proxy 正在运行："
    echo "  ./cloud-sql-proxy waypal-473104:europe-west1:waypalhotel-db"
    echo ""
    echo "在另一个终端窗口运行上述命令，然后重新运行此脚本"
    exit 1
fi
echo "✅ Cloud SQL Proxy 连接正常"
echo ""

# 创建数据库
echo "📝 创建数据库 waypal_db..."
PGPASSWORD="User@123" psql -h localhost -p 5432 -U waypal_user -d postgres -c "CREATE DATABASE waypal_db;" 2>/dev/null || echo "  数据库可能已存在，跳过创建"
echo "✅ 数据库创建完成"
echo ""

# 执行迁移
echo "📝 执行数据库迁移..."
PGPASSWORD="User@123" psql -h localhost -p 5432 -U waypal_user -d waypal_db -f drizzle/0000_initial_schema.sql
echo "✅ 数据库迁移完成"
echo ""

# 验证表结构
echo "📋 验证表结构..."
PGPASSWORD="User@123" psql -h localhost -p 5432 -U waypal_user -d waypal_db -c "\dt"
echo ""

echo "=========================================="
echo "✅ 数据库设置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 确保 .env.local 文件已配置（包含数据库连接和 Google OAuth）"
echo "2. 运行: npm run dev"
echo "3. 访问: http://localhost:3000"
echo ""
