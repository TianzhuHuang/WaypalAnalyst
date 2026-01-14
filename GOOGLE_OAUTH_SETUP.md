# Google OAuth 配置指南

## 问题说明

如果遇到 "Configuration" 错误，通常是因为 Google Cloud Console 中的回调 URL 配置不正确。

## 详细配置步骤

### 步骤 1: 访问 Google Cloud Console

1. 打开浏览器，访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 使用您的 Google 账号登录
3. 在页面顶部的项目选择器中，选择您的项目（如果还没有项目，需要先创建一个）

### 步骤 2: 导航到 OAuth 凭据页面

1. 在左侧导航菜单中，点击 **"APIs & Services"**（API 和服务）
2. 在子菜单中，点击 **"Credentials"**（凭据）
3. 您会看到一个凭据列表页面

### 步骤 3: 找到并编辑 OAuth 2.0 Client ID

1. 在凭据列表中，找到类型为 **"OAuth 2.0 Client ID"** 的条目
2. 如果列表中有多个 Client ID，找到您正在使用的那个（通常名称会包含 "Web client" 或类似描述）
3. 点击该 Client ID 右侧的**编辑图标**（铅笔图标 ✏️）或直接点击 Client ID 名称

### 步骤 4: 添加授权的重定向 URI

1. 在编辑页面中，向下滚动找到 **"Authorized redirect URIs"**（已授权的重定向 URI）部分
2. 点击 **"+ ADD URI"**（添加 URI）按钮
3. 在文本框中输入以下 URL（**精确复制，不要有任何空格或多余字符**）：

```
http://localhost:3000/api/auth/callback/google
```

4. 点击文本框外的区域或按 Enter 键确认

**重要注意事项**：
- ✅ 必须使用 `http://`（不是 `https://`），因为 localhost 是开发环境
- ✅ 不能有尾随斜杠（末尾不能有 `/`）
- ✅ 端口号 `3000` 必须与您的开发服务器端口一致
- ✅ 路径 `/api/auth/callback/google` 必须完全匹配
- ❌ 不要添加任何空格或特殊字符

### 步骤 5: 保存配置

1. 滚动到页面底部
2. 点击 **"SAVE"**（保存）按钮
3. 等待保存成功的提示（通常几秒钟）

### 步骤 6: 验证配置

保存后，您应该能在 **"Authorized redirect URIs"** 列表中看到新添加的 URL：

```
http://localhost:3000/api/auth/callback/google
```

### 步骤 7: 等待配置生效

- Google Cloud Console 的配置更改通常需要 **1-2 分钟** 才能生效
- 如果立即测试仍然失败，请等待几分钟后重试

### 步骤 8: 重启开发服务器

在您的项目目录中：

```bash
# 如果服务器正在运行，按 Ctrl+C 停止
# 然后重新启动
npm run dev
```

### 步骤 9: 验证环境变量

确保 `.env.local` 文件中包含：

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
AUTH_SECRET=your-secret-key-here
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

**重要**：`AUTH_TRUST_HOST=true` 是 NextAuth v5 在开发环境中必需的，用于信任 localhost 主机。

## 配置截图说明

如果您在 Google Cloud Console 中找不到相关选项，请参考以下路径：

```
Google Cloud Console
  └─ 项目选择器（页面顶部）
  └─ 左侧菜单：APIs & Services
      └─ Credentials
          └─ OAuth 2.0 Client IDs
              └─ [点击您的 Client ID]
                  └─ Authorized redirect URIs
                      └─ + ADD URI
```

## 如果找不到 OAuth Client ID

如果您在凭据列表中看不到 OAuth 2.0 Client ID，您需要先创建一个：

1. 在 **Credentials** 页面，点击页面顶部的 **"+ CREATE CREDENTIALS"**（创建凭据）
2. 选择 **"OAuth client ID"**（OAuth 客户端 ID）
3. 如果这是第一次创建，系统会提示您配置 OAuth 同意屏幕，按照提示完成配置
4. 选择应用类型为 **"Web application"**（Web 应用程序）
5. 输入名称（例如："Waypal Dev"）
6. 在 **"Authorized redirect URIs"** 中添加：`http://localhost:3000/api/auth/callback/google`
7. 点击 **"CREATE"**（创建）
8. 系统会显示 **Client ID** 和 **Client Secret**，将这些值复制到您的 `.env.local` 文件中

## 常见问题

### Q: 为什么需要配置回调 URL？
A: Google OAuth 需要知道在用户授权后应该重定向到哪个地址。如果回调 URL 不在授权列表中，Google 会拒绝重定向请求。

### Q: 生产环境需要不同的配置吗？
A: 是的。在生产环境中，您需要：
1. 在 Google Cloud Console 中添加生产环境的回调 URL（例如：`https://yourdomain.com/api/auth/callback/google`）
2. 更新 `AUTH_URL` 环境变量为生产域名

### Q: 配置后仍然出现错误？
A: 请检查：
1. Google Cloud Console 中的更改是否已保存
2. 环境变量是否正确加载（重启服务器）
3. 浏览器控制台和服务器日志中的具体错误信息
