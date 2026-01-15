# 如何查看 Cloud Run 日志

## 方法一：使用 Google Cloud Console（Web 界面）

1. **打开 Google Cloud Console**
   - 访问：https://console.cloud.google.com/
   - 确保已选择正确的项目（waypal-473104）

2. **导航到 Cloud Run**
   - 在左侧菜单中，找到 **Cloud Run**（或搜索 "Cloud Run"）
   - 点击进入 Cloud Run 服务列表

3. **选择服务**
   - 找到服务名称：`waypalanalyst`
   - 点击服务名称进入详情页

4. **查看日志**
   - 在服务详情页顶部，点击 **"日志"**（Logs）标签
   - 或者直接访问：https://console.cloud.google.com/run/detail/europe-west1/waypalanalyst/logs

5. **过滤日志**
   - 在日志查看器的搜索框中，输入以下内容来过滤日志：
     ```
     [API]
     ```
   - 或者查找特定错误：
     ```
     [API] Unauthorized
     ```
   - 或者查找所有相关日志：
     ```
     [API] OR [useThreadQuery] OR [WaypalApp]
     ```

6. **查看实时日志**
   - 点击日志查看器右上角的 **"实时"**（Live）按钮
   - 这样可以看到实时产生的日志

## 方法二：使用 gcloud CLI（命令行）

### 安装 gcloud CLI（如果还没有安装）

1. **下载并安装**：
   ```bash
   # macOS
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # 或者使用 Homebrew
   brew install --cask google-cloud-sdk
   ```

2. **初始化**：
   ```bash
   gcloud init
   ```

3. **登录**：
   ```bash
   gcloud auth login
   ```

4. **设置项目**：
   ```bash
   gcloud config set project waypal-473104
   ```

### 查看日志命令

#### 1. 查看最近的日志（最后 50 条）
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=50
```

#### 2. 查看包含 `[API]` 的日志
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep "\[API\]"
```

#### 3. 实时查看日志（类似 tail -f）
```bash
gcloud run services logs tail waypalanalyst --region=europe-west1
```

#### 4. 查看特定时间段的日志
```bash
# 查看最近 1 小时的日志
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=500
```

#### 5. 查看包含错误信息的日志
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep -i "error\|unauthorized\|401"
```

#### 6. 查看所有相关日志（API、Thread、Message）
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=500 | grep -E "\[API\]|\[useThreadQuery\]|\[WaypalApp\]|Unauthorized|401"
```

### 导出日志到文件

```bash
# 导出到文件
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=500 > cloud-run-logs.txt

# 然后可以用文本编辑器打开查看
```

## 方法三：使用 Google Cloud Logging（高级过滤）

1. **访问 Logging 控制台**
   - https://console.cloud.google.com/logs/query

2. **使用查询语言**
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="waypalanalyst"
   textPayload=~"\[API\]"
   ```

3. **更复杂的查询**
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="waypalanalyst"
   (textPayload=~"\[API\]" OR textPayload=~"Unauthorized" OR textPayload=~"401")
   severity>=ERROR
   ```

## 常见日志模式

### 查找 Thread 创建相关的日志
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep -E "POST /api/threads|Creating thread|Thread created"
```

### 查找认证相关的日志
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep -E "Session status|Unauthorized|401|AUTH"
```

### 查找数据库相关的日志
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep -E "Database|DATABASE_URL|connection"
```

## 快速诊断命令

### 查看最近的错误
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 --format="table(timestamp,textPayload)" | grep -i error
```

### 查看最近的 API 调用
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=100 | grep "\[API\]"
```

### 查看认证问题
```bash
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=200 | grep -E "Session status|Unauthorized|401"
```

## 提示

1. **日志延迟**：Cloud Run 日志可能有几秒到几分钟的延迟
2. **日志保留**：默认保留 30 天
3. **日志量**：如果日志很多，使用 `--limit` 参数限制数量
4. **时区**：日志时间使用 UTC 时区

## 示例：查找 401 错误

```bash
# 查找所有 401 错误
gcloud run services logs read waypalanalyst --region=europe-west1 --limit=500 | grep -B 5 -A 5 "401\|Unauthorized"

# 实时监控错误
gcloud run services logs tail waypalanalyst --region=europe-west1 | grep -i "error\|unauthorized\|401"
```

## 如果无法访问 gcloud CLI

如果无法使用命令行，可以：

1. **使用 Google Cloud Console Web 界面**（推荐）
   - 访问：https://console.cloud.google.com/run/detail/europe-west1/waypalanalyst/logs
   - 在搜索框中输入过滤条件

2. **使用浏览器开发者工具**
   - 打开生产环境网站
   - 按 F12 打开开发者工具
   - 查看 Console 和 Network 标签
   - 这些日志会显示前端错误和 API 请求状态
