# Waypal Hotel Expert - 项目描述

## 📋 项目概述

**Waypal Hotel Expert** 是一个基于 AI 的智能酒店比价与预订助手应用，帮助用户快速比较不同平台的酒店价格、礼遇和政策，并提供个性化的预订建议。

## 🎯 核心功能

### 1. **双模式交互系统**

#### 🏨 Expert Mode（订房专家模式）
- **结构化输入**：酒店名称、入住/退房日期、房型、人数等参数
- **智能比价**：自动调用 `/agent/compare` API，获取多平台（LuxTrip、官网、OTA）价格对比
- **比价表格**：展示总价、每晚价格、礼遇、取消政策等关键信息
- **模式锁定**：首次发送后自动锁定，确保对话上下文一致性

#### 💬 General Chat Mode（普通对话模式）
- **自由对话**：支持酒店相关问题的自然语言问答
- **智能识别**：自动识别用户意图（比价 vs 咨询），智能切换 API 端点
- **上下文理解**：基于当前对话历史理解用户追问

### 2. **智能意图识别**

- **自动分流**：检测用户输入是否为比价需求（酒店名称）还是咨询问题（"有没有健身房"、"多远"等）
- **API 路由**：
  - 比价需求 → `POST /agent/compare`（结构化参数）
  - 咨询问题 → `POST /agent/message`（自然语言）
- **响应类型处理**：根据后端返回的 `reply_type`（`evaluation` / `general` / `clarification`）动态渲染对应组件

### 3. **比价表格功能**

#### 数据展示
- **多平台对比**：LuxTrip、官网、OTA（Agoda、Booking.com 等）
- **价格信息**：总价、每晚价格、税费明细
- **礼遇展示**：
  - 🟢 **Perks（礼遇）**：含早、积分累积、VIP 权益等（绿色徽章）
  - 🟠 **Promotions（促销）**：限时优惠、住三付二等（橙色/琥珀色徽章）
- **政策信息**：取消政策（免费取消/条件取消/不可退）、付款方式
- **最佳推荐**：自动标记 "BEST VALUE" 标签

#### 交互功能
- **详情弹窗**：点击礼遇/促销徽章查看完整描述和有效期
- **跳转预订**：一键跳转到对应平台的预订页面
- **移动端优化**：表格自动转换为卡片式布局，适配小屏幕

### 4. **响应式设计**

- **桌面端**：侧边栏 + 主聊天窗口布局
- **移动端**：
  - 汉堡菜单（Hamburger Menu）控制侧边栏
  - 输入框自适应软键盘弹出
  - 比价表格卡片化展示
  - 无横向滚动，流畅体验

### 5. **对话历史管理**

- **侧边栏历史**：保存每次对话会话，支持快速切换
- **状态恢复**：点击历史记录自动恢复 Expert Mode 状态和比价结果
- **新对话**：一键重置，开始新的比价查询

### 6. **UI/UX 特性**

- **品牌标识**：Emerald Green (#00CD52) 主题色，青蛙图标（🐸）品牌形象
- **加载动画**：StepLoader 显示查询进度（"正在分析取消政策..."等）
- **粘性头部**：比价结果后，搜索参数固定在顶部（Sticky Header）
- **输入模式切换**：Expert Mode 和 Chat Mode 的标签式切换
- **视觉反馈**：不同模式下的输入框边框颜色变化

## 🏗️ 技术架构

### 前端技术栈
- **框架**：Next.js 16.1.0 (React 18+)
- **样式**：Tailwind CSS
- **动画**：Framer Motion
- **日期选择**：React DatePicker
- **图标**：Lucide React
- **类型安全**：TypeScript

### 后端集成
- **API 端点**：
  - `POST /agent/message` - 通用对话接口
  - `POST /agent/compare` - 结构化比价接口
- **响应格式**：JSON，包含 `reply_type` 和 `reply`（JSON 字符串）
- **数据解析**：支持多种价格字段格式的 fallback 逻辑

### 部署
- **容器化**：Docker + Dockerfile（多阶段构建）
- **云部署**：Google Cloud Run
- **CI/CD**：Google Cloud Build (`cloudbuild.yaml`)

## 📊 数据流程

```
用户输入
  ↓
意图识别（isQuestionOrGeneralQuery）
  ↓
┌─────────────────┬─────────────────┐
│  Expert Mode     │  General Chat   │
│  (比价需求)      │  (咨询问题)      │
└─────────────────┴─────────────────┘
  ↓                    ↓
/agent/compare    /agent/message
  ↓                    ↓
reply_type:       reply_type:
evaluation        general
  ↓                    ↓
EvaluationTable   ChatMessage
```

## 🎨 设计亮点

1. **智能模式切换**：根据用户输入自动判断使用哪个 API，无需手动切换
2. **上下文感知**：比价后自动切换到对话模式，方便用户追问
3. **数据容错性**：支持多种后端返回格式，确保价格数据正确显示
4. **移动优先**：完整的移动端适配，确保在任何设备上都有良好体验

## 🔄 用户流程示例

1. **首次使用**：
   - 打开页面 → 默认进入 Expert Mode
   - 输入酒店名称 → 选择日期/人数 → 发送
   - 显示比价表格 → 查看礼遇详情 → 点击预订

2. **继续对话**：
   - 比价结果出现后 → 输入框自动切换为 Chat Mode
   - 输入"这个酒店有没有健身房？" → 显示 AI 回答
   - 继续追问"价格含早吗？" → 基于上下文回答

3. **新查询**：
   - 点击"New Chat" → 重置为 Expert Mode
   - 开始新的比价查询

## 📝 项目文件结构

```
WaypalAnalyst/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 主页面（侧边栏 + 聊天窗口）
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── src/
│   ├── components/
│   │   ├── Analyst/       # 核心聊天组件
│   │   │   ├── Analyst.tsx              # 主逻辑组件
│   │   │   ├── EvaluationTable.tsx      # 比价表格
│   │   │   ├── AnalystDatePicker.tsx    # 日期选择器
│   │   │   ├── SummaryPill.tsx          # 摘要胶囊
│   │   │   └── StepLoader.tsx            # 加载动画
│   │   ├── Sidebar.tsx    # 侧边栏（历史记录）
│   │   └── Header.tsx     # 顶部导航
│   └── api/
│       └── agentApi.ts    # API 客户端（message/compare）
├── Dockerfile             # Docker 构建配置
├── cloudbuild.yaml        # Google Cloud Build 配置
└── README.md              # 项目说明
```

## 🚀 未来优化方向

1. **性能优化**：缓存比价结果，减少重复 API 调用
2. **功能扩展**：价格趋势图表、收藏酒店、价格提醒
3. **多语言支持**：完整的中英文切换
4. **用户体验**：语音输入、快捷回复建议、分享功能

---

**演示地址**：https://waypal-ai-luxury-hotel-assistant-279558140163.us-west1.run.app/  
**GitHub 仓库**：https://github.com/TianzhuHuang/WaypalAnalyst
