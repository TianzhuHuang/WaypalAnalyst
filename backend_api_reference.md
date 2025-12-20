## 后端接口与数据说明（中文版）

本文档用于向前端说明当前后端接口、返回结构以及集成 Google Hotels（SerpAPI）+ LuxTrip 报价的流程。

### 1. HTTP 接口

> 线上 Cloud Run Base URL：`https://waypal-agent-backend-266509309806.asia-east1.run.app`
>
> 前端调用注意：本服务 **只接受 JSON body**（不要用 `?user_id=...&message_text=...` 这种 query 方式，否则会返回 `422 Unprocessable Entity`）。

#### `POST /agent/message`

**URL**

`POST https://waypal-agent-backend-266509309806.asia-east1.run.app/agent/message`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | string | ✅ | 用户唯一 ID，用于读取/保存会话状态 |
| `message_text` | string | ✅ | 用户输入文本 |
| `timestamp` | ISO datetime | ❌ | 不传则后端取当前时间，前端若能提供更准确的时间戳更好 |
| `channel` | string | ❌ | 例如 `web`、`wechat` |
| `force_dispatch` | bool | ❌ | 设为 true 可跳过缓冲立即处理 |

**请求示例（Postman / fetch）**

```json
{
  "user_id": "test_user_001",
  "message_text": "上海文华东方，12月15入住，12月18退房，2位成人",
  "channel": "web",
  "force_dispatch": true
}
```

**响应**

```json
{
  "status": "buffered" | "processed",
  "reply": "string | null",         // status=processed 时返回完整回复（JSON 字符串）
  "reply_type": "clarification" | "evaluation" | "general" | null,
  "aggregated_count": 3
}
```

**`status=buffered` 的含义（非常重要）**

后端有「消息缓冲/防抖」机制：收到消息后会先写入缓冲窗口，在窗口结束时才触发一次 pipeline 处理。

- `buffered`：消息已入缓冲，但**本次请求不会立即返回 reply**。
- `processed`：本次请求触发了缓冲窗口的 flush，并返回了 `reply` 与 `reply_type`。

前端建议策略：
- 需要“点发送立刻出结果”的交互：请求里带 `force_dispatch=true`。
- 需要“连续输入多条合并处理”的交互：不带 `force_dispatch`，并在用户停止输入后调用 `/agent/flush`。

#### `POST /agent/flush`

强制刷新某用户的缓冲消息，入参 `{ "user_id": "xxx" }`，响应结构与 `/agent/message` 一致。

**URL**

`POST https://waypal-agent-backend-266509309806.asia-east1.run.app/agent/flush`

**请求示例**

```json
{
  "user_id": "test_user_001"
}
```

### 2. reply 内容（JSON）

`status=processed` 时，`reply` 字段是一个 JSON 字符串，请务必在前端 `JSON.parse` 后渲染；同时配合 `reply_type` 判断展示样式：

- `clarification`：提示用户补充信息（UI 可以高亮必填项）
- `evaluation`：此时 `reply` 即价格表/策略 JSON，需要渲染比价卡和分析文案
- `general`：普通聊天回复

#### `reply_type = evaluation`（价格比价/策略）

后端会返回一个严格的结构化 JSON（用于驱动前端表格/卡片 UI），核心字段如下（示意）：

```jsonc
{
  "hotel_name": "Grand Hyatt Shanghai",
  "hotel_name_cn": "上海君悦大酒店",
  "room_name": "Deluxe City View Room",
  "room_name_cn": "豪华城景房",
  "checkin_date": "2025-12-12",
  "checkout_date": "2025-12-13",
  "nights": 1,
  "guests": 2,
  "table_rows": [
    {
      "platform": "LuxTrip",
      "platformLogo": "",
      "isBest": true,
      "rateInfo": {
        "totalPrice": 13644,
        "totalPriceDisplay": "¥13,644",
        "nightlyPrice": 4548,
        "nightlyPriceDisplay": "¥4,548/night",
        "currencyCode": "CNY"
      },
      "perks": {
        "breakfastInclude": true,
        "breakfastDetail": "每日双人早餐",
        "pointsAccumulatable": {
          "is_accumulatable": true,
          "points": 500,
          "pointsInfo": "可累积酒店会员积分",
          "pointsMultiple": 1.5
        },
        "vipBenefits": ["$100 USD dining credit"],
        "perksValue": "价值约¥1,200"
      },
      "policy": {
        "cancellationPolicy": "free_cancellation",
        "cancellationDetails": "2025-12-11 18:00",
        "paymentPolicy": "online_payment",
        "guaranteeType": "PREPAID",
        "canUserPrepay": true
      },
      "websiteUrl": "https://luxtrip.com.cn/hotel/booking"
    }
  ],
  "deep_analysis": {
    "price": "Concise price comparison.",
    "perks": "Concise perk comparison.",
    "cancellation": "Concise cancellation/refund comparison."
  }
}
```

说明：
- `table_rows` 为前端“比价表格/卡片”主数据源；`isBest` 只能有一个为 `true`。
- `platformLogo` 若未知传空字符串。
- `currencyCode` 当前默认 `CNY`，如未来支持多币种会扩展。

#### `reply_type = clarification`（追问补全信息）

该类型用于参数不全时的追问，当前为简单 JSON：

```json
{
  "text": "还缺入住/离店日期与人数，请问是哪一年？成人几位？",
  "missing_fields": ["check_in", "check_out", "adults"]
}
```

#### `reply_type = general`（普通聊天）

该类型为普通对话回复，格式：

```json
{
  "text": "你好，我可以帮你比价并给出最优预订策略。"
}
```

> ⚠️ 切记不要把 `reply` 当纯文本直接显示。

### 3. 后端 offer bundle（内部结构）

执行 `_run_queries_and_evaluate` 时后端会汇总：

```python
{
  "luxtrip": List[Offer],
  "ota_official": [],
  "google_hotels": {
      "property_token": "...",
      "name": "...",
      "location": "...",
      "gl": "us",
      "direct_hit": true/false,
      "search_information": {...},
      "prices": {
          "official": {...},
          "otas": [...],
          "raw_prices": [...]
      },
      "price_offers": [
          {
              "source_type": "official" | "ota",
              "source": "Agoda",
              "logo": "...",
              "total_rate": {
                  "extracted_lowest": 5713.4,
                  "extracted_before_taxes_fees": 4900.0
              },
              "free_cancellation": true,
              "free_cancellation_until": { "date": "Dec 14", "time": "6:00 PM" }
          },
          ...
      ]
  }
}
```

其中 `price_offers` 已经是扁平化的展示结构，适合前端直接渲染“官网 + 各 OTA 报价卡片”。`Offer`（LuxTrip）结构示例：

```json
{
  "platform": "LuxTrip",
  "room_type": "酷享房",
  "total_price": 4548.0,
  "avg_price_per_night": 1516.0,
  "taxes_and_fees": 215.8,
  "benefits": [ {"breakfast": "含早"} ],
  "cancellation_policy": "...",
  "checkin_date": "2026-01-05",
  "checkout_date": "2026-01-08"
}
```

### 4. 前端配合事项

1. **务必提供 `user_id`**：保持同一个用户跨多轮对话 ID 不变。
2. **日期必填**：若用户信息不全会触发后端追加追问，请在 UI 上展示后端的 `clarification_question`。
3. **解析后端 JSON**：无论是 `reply` 还是 `google_hotels.price_offers` 都是结构化数据，解析后再展示。
4. **错误提示**：若 `google_hotels` 或 `luxtrip` 返回 `{ "error": "..." }`，前端可提示“Google Hotels 查询失败，请稍后重试”等。
5. **force_dispatch 使用场景**：当用户点击“发送”希望立刻拿到回复（或补充关键信息要立即触发查询），建议附带 `force_dispatch=true`。
6. **缓冲模式推荐实现**：不带 `force_dispatch` 发送消息后（可能返回 `buffered`），前端在“用户停止输入 N 秒”后调用一次 `/agent/flush`，拿到最终 `processed` 的结果。

### 5. 环境变量

| 变量 | 说明 |
| --- | --- |
| `SERPAPI_API_KEY` | SerpAPI（Google Hotels）专用 key |
| `OPENAI_API_KEY`  | LLM（GPT）调用 key |
| `LUXTRIP_*`       | LuxTrip API 的认证信息（保持原配置即可） |

把 `.env` 放在项目根目录，`python-dotenv` already 自动加载。

### 6. 调试脚本

- `uv run python backend/app/scripts/test_full_pipeline.py`：输入用户意图 → 查看抽参结果 + 评估 JSON。
- `uv run python backend/app/scripts/test_serp_hotel_resolver.py`：验证模糊酒店名能否定位到 SerpAPI property token。
- `uv run python backend/app/scripts/test_serp_property_prices.py`：给定 property token 查看官网/OTA 价格。

这些脚本可辅助前端对齐期望返回值、定位问题。

### 7. Cloud Run 部署注意事项（必读）

当前实现可以跑通功能，但部署到 Cloud Run（多实例/弹性伸缩）前后，强烈建议按优先级逐步优化：

1. **会话状态与消息缓冲（高优先级）**  
   当前会话状态与 message buffering 逻辑如果是进程内存态，多实例会导致同一 `user_id` 状态丢失、乱序或重复追问。  
   建议迁移到共享存储（Redis/MemoryStore、Firestore 或 Cloud SQL），并实现并发写控制。

2. **SerpAPI 缓存（高优先级）**  
   当前 SerpAPI 缓存使用本地 SQLite 文件，在 Cloud Run 下每个实例各自一份且可能被重启清空，并发下还可能出现文件锁竞争。  
   建议迁移到 Redis/Cloud SQL，并加入 TTL（例如 brands 24h、properties 6h）与缓存键版本化。

3. **冷启动与资源占用（高优先级）**  
   `sentence-transformers` + FAISS 索引加载较重，Cloud Run 冷启动会慢且内存占用高。  
   建议：预热（min instances）、提高内存配额，或把 matcher 拆为独立服务。

4. **端到端延迟与超时（中高优先级）**  
   单次请求可能触发 OpenAI + SerpAPI + LuxTrip 多次网络调用。需并行化、设置超时/重试/降级，避免超时导致前端无响应。

5. **鉴权、限流与成本保护（高优先级）**  
   若公网开放且无鉴权，容易被滥用导致 SerpAPI/OpenAI 费用异常。  
   建议：JWT/自有 token、IP/用户级限流、CORS 白名单、日志审计。

6. **密钥与配置管理（高优先级）**  
   不建议依赖 `.env` 文件随镜像部署。Cloud Run 应使用 Secret Manager 注入环境变量，并区分 dev/staging/prod。

7. **可观测性（中优先级）**  
   建议补充 request_id、外部调用耗时与失败原因的结构化日志，并接入 Cloud Logging / Error Reporting / 指标告警。

8. **资源文件部署策略（中优先级）**  
   FAISS 索引与元数据文件需要明确打包/挂载方案（镜像内、Cloud Storage 拉取、或构建产物），否则线上可能找不到文件。

---

如需额外结构（例如前端希望渲染 `luxtrip_room_groups`），请给我们 issue，我们会在 bundle 中正式暴露，而不是依赖注释或未定义字段。
