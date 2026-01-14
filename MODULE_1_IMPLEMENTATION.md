# 模块一：基础设施（Brain & Memory）- 实施文档

## 概述

本模块实现用户身份系统、对话持久化、上下文记忆功能，为后续 AI Agent 功能打下基础。

**技术栈**：
- 数据库：Google Cloud SQL (PostgreSQL)
- ORM：Drizzle ORM
- 认证：NextAuth.js v5 + Google OAuth
- 状态管理：Zustand
- 图标：Lucide React

---

## Step 1: 创建实施文档

本文档记录每个步骤的详细说明、验收标准和问题排查指南。

---

## Step 2: Google Cloud SQL 设置指导

### 2.1 创建 Cloud SQL PostgreSQL 实例

1. **登录 Google Cloud Console**
   - 访问：https://console.cloud.google.com/
   - 选择或创建项目

2. **创建 Cloud SQL 实例**
   - 导航到：SQL → 创建实例
   - 选择：PostgreSQL
   - 版本：PostgreSQL 15（推荐）或 14
   - 实例 ID：`waypal-db`（或自定义）
   - 区域：选择与 Cloud Run 相同的区域（如 `asia-east1`）

3. **配置实例**
   - **机器类型**：开发环境选择 `db-f1-micro` 或 `db-g1-small`
   - **存储**：SSD，至少 20GB
   - **备份**：启用自动备份（可选，开发环境可关闭）
   - **高可用性**：开发环境关闭

4. **创建数据库**
   - 实例创建完成后，点击实例名称
   - 进入"数据库"标签页
   - 创建数据库：`waypal_db`

5. **创建用户**
   - 进入"用户"标签页
   - 添加用户：`waypal_user`
   - 设置密码（保存好，后续需要）

### 2.2 配置网络和授权

**开发环境（本地）**：

1. **获取实例连接名称**
   - 格式：`PROJECT_ID:REGION:INSTANCE_NAME`
   - 例如：`waypal-project:asia-east1:waypal-db`

2. **选项 A：使用 Cloud SQL Proxy（推荐）**
   ```bash
   # 下载 Cloud SQL Proxy
   curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64
   chmod +x cloud-sql-proxy
   
   # 启动代理（在另一个终端）
   ./cloud-sql-proxy PROJECT_ID:REGION:INSTANCE_NAME
   
   # 连接字符串（使用 localhost）
   DATABASE_URL="postgresql://waypal_user:password@localhost:5432/waypal_db"
   ```

3. **选项 B：使用 IP 连接**
   - 在 Cloud SQL 实例设置中启用"公共 IP"
   - 添加授权网络：`0.0.0.0/0`（仅开发环境）
   - 连接字符串：
     ```
     DATABASE_URL="postgresql://waypal_user:password@CLOUD_SQL_IP:5432/waypal_db?sslmode=require"
     ```

**生产环境（Cloud Run）**：
- 使用 Unix Socket 连接（自动配置）
- 连接字符串：
  ```
  DATABASE_URL="postgresql://waypal_user:password@/waypal_db?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
  ```

### 2.3 验证连接

使用 `psql` 或数据库客户端工具测试连接：

```bash
# 使用 Cloud SQL Proxy
psql "postgresql://waypal_user:password@localhost:5432/waypal_db"

# 或使用 IP（如果配置了）
psql "postgresql://waypal_user:password@CLOUD_SQL_IP:5432/waypal_db?sslmode=require"
```

---

## Step 3: 安装依赖

执行以下命令安装所需依赖：

```bash
npm install drizzle-orm drizzle-kit postgres @types/pg
npm install next-auth@beta
npm install zustand
npm install date-fns
```

**依赖说明**：
- `drizzle-orm`：类型安全的 ORM
- `drizzle-kit`：数据库迁移工具
- `postgres`：PostgreSQL 驱动
- `next-auth@beta`：NextAuth.js v5（支持 App Router）
- `zustand`：轻量级状态管理
- `date-fns`：日期格式化工具

---

## Step 4: 数据库 Schema 定义

创建 `lib/db/schema.ts` 文件，定义所有数据表结构。

**关键点**：
- 使用 Drizzle ORM 的类型安全 API
- 定义 Relations 以便关联查询
- 导出 TypeScript 类型供代码使用

---

## Step 5: Drizzle 配置

创建数据库连接配置和迁移工具配置。

**关键点**：
- 使用连接池避免频繁创建连接
- 配置迁移工具以便后续更新 Schema

---

## Step 6: 数据库迁移

执行数据库迁移，创建表结构。

**步骤**：
1. 生成迁移文件：`npx drizzle-kit generate:pg`
2. 查看生成的 SQL 文件
3. 在 Cloud SQL Console 执行 SQL 脚本
4. 验证表结构创建成功

---

## Step 7: NextAuth.js 认证系统

配置 Google OAuth 认证。

**关键点**：
- 自动创建用户（signIn callback）
- 在 session 中添加 user.id
- 配置认证页面路由

---

## Step 8: 认证 UI 组件

创建登录按钮和认证 Hook。

**关键点**：
- 使用 Lucide React 图标
- 显示用户头像和名称
- 提供便捷的认证状态 Hook

---

## Step 9-10: Thread 和 Messages API

创建 Thread 和 Messages 的 CRUD API。

**关键点**：
- 所有 API 必须验证用户身份
- Thread 操作必须验证所有权
- 自动更新 Thread 的 updatedAt

---

## Step 11: Thread 管理 Hooks

创建便于前端使用的 Hooks。

**关键点**：
- 封装 API 调用逻辑
- 提供类型安全的接口
- 处理错误和加载状态

---

## Step 12: 侧边栏升级

更新侧边栏组件，显示对话历史。

**关键点**：
- 使用 date-fns 格式化时间
- 高亮当前 Thread
- 实现 Thread 切换功能

---

## Step 13: 集成到 WaypalApp

将 Thread 功能集成到主应用组件。

**关键点**：
- 比价完成后自动创建 Thread
- 保存所有消息到数据库
- 加载历史 Thread 时恢复对话

---

## Step 14: Profile API 和组件

实现用户资料管理功能。

**关键点**：
- 显示用户偏好设置
- 允许编辑 bed_preference、budget_level 等

---

## Step 15: 环境变量配置

配置所有必需的环境变量。

**必需变量**：
- `DATABASE_URL`：数据库连接字符串
- `NEXTAUTH_URL`：应用 URL
- `NEXTAUTH_SECRET`：NextAuth 密钥
- `GOOGLE_CLIENT_ID`：Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`：Google OAuth Client Secret

---

## Step 16: 测试与优化

进行端到端测试和性能优化。

**测试清单**：
- [ ] 认证流程测试
- [ ] Thread 创建和消息保存测试
- [ ] 侧边栏历史记录加载测试
- [ ] 对话恢复功能测试
- [ ] 性能测试（响应时间）
- [ ] 错误处理测试

---

## 验收标准

### 功能验收
- [ ] Google OAuth 登录正常工作
- [ ] 登录后自动创建用户记录
- [ ] 比价请求自动创建 Thread
- [ ] 消息实时保存到数据库
- [ ] 侧边栏显示 Thread 列表
- [ ] 点击历史 Thread 恢复对话
- [ ] 比价结果保存到 metadata
- [ ] 刷新页面后对话不丢失
- [ ] 个人资料可以查看和编辑

### 技术验收
- [ ] 数据库连接正常
- [ ] 所有 API 有身份验证
- [ ] Thread 所有权验证正确
- [ ] 错误处理完善
- [ ] TypeScript 类型完整
- [ ] 代码符合规范

### 性能验收
- [ ] Thread 列表加载 < 500ms
- [ ] 消息保存延迟 < 200ms
- [ ] 连接池配置合理
- [ ] 页面刷新恢复 < 1s

---

## 常见问题排查

### 问题 1: 数据库连接失败

**症状**：`Connection refused` 或 `timeout`

**排查步骤**：
1. 检查 `DATABASE_URL` 是否正确
2. 确认 Cloud SQL Proxy 是否运行（如果使用）
3. 检查网络授权设置
4. 验证用户密码是否正确

**解决方案**：
- 使用 Cloud SQL Proxy 连接
- 检查防火墙规则
- 验证 IP 白名单设置

### 问题 2: NextAuth 认证失败

**症状**：登录后跳转失败或 session 为空

**排查步骤**：
1. 检查 `NEXTAUTH_URL` 是否正确
2. 验证 Google OAuth 凭证
3. 检查回调 URL 配置
4. 查看浏览器控制台错误

**解决方案**：
- 确保 `NEXTAUTH_URL` 与当前域名一致
- 在 Google Cloud Console 配置正确的回调 URL
- 检查 `NEXTAUTH_SECRET` 是否设置

### 问题 3: Thread 创建失败

**症状**：比价后没有创建 Thread

**排查步骤**：
1. 检查用户是否已登录
2. 查看 API 响应错误
3. 验证数据库表是否存在
4. 检查外键约束

**解决方案**：
- 确保用户已登录
- 检查 profiles 表是否有用户记录
- 验证数据库迁移是否成功执行

### 问题 4: 消息保存失败

**症状**：消息没有保存到数据库

**排查步骤**：
1. 检查 Thread ID 是否存在
2. 验证消息格式是否正确
3. 查看数据库约束错误
4. 检查 API 权限

**解决方案**：
- 确保 Thread 已创建
- 验证消息 role 字段值正确（user/assistant/system）
- 检查数据库外键约束

---

## 测试清单

### 单元测试
- [ ] useAuth Hook 测试
- [ ] useThread Hook 测试
- [ ] useThreadList Hook 测试

### 集成测试
- [ ] 认证流程测试
- [ ] Thread API 测试
- [ ] Messages API 测试
- [ ] Profile API 测试

### 端到端测试
- [ ] 完整用户流程：登录 → 比价 → 对话 → 查看历史
- [ ] 对话恢复测试
- [ ] 多用户隔离测试

---

## 性能优化建议

1. **数据库连接池**
   - 最大连接数：10
   - 最小连接数：2
   - 连接超时：30秒

2. **查询优化**
   - Thread 列表使用索引（user_id, updated_at）
   - Messages 查询使用索引（thread_id, created_at）
   - 限制查询结果数量（最多 50 条）

3. **缓存策略**
   - Thread 列表可以缓存 30 秒
   - 用户 Profile 可以缓存 5 分钟

---

## 下一步

完成模块一后，可以开始：
- **模块二**：表格上下文感知（Context-Aware Chat）
- **模块三**：多媒体搜寻工具（Room Tour & UGC）
- **模块四**：数据可视化（Price Trend Analyzer）

---

## 更新日志

- 2024-01-XX：初始版本创建
