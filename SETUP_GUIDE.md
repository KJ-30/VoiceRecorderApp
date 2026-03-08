# VoiceRecorderApp 完整配置指南

## 1. Supabase 配置

### 1.1 创建数据库表
1. 登录 Supabase Dashboard: https://bafeujvezjurbobculbp.supabase.co
2. 进入 SQL Editor
3. 打开 `supabase-schema.sql` 文件
4. 复制全部内容并执行

### 1.2 配置 Storage
1. 进入 Storage 页面
2. 创建新的存储桶 `audio-files`
3. 设置存储桶为私有
4. 配置访问策略（已在 SQL 中设置）

### 1.3 获取 API 密钥
1. 进入 Project Settings > API
2. 复制 `Project URL` 和 `anon public` 密钥
3. 更新 `.env` 文件：
```env
SUPABASE_URL=https://bafeujvezjurbobculbp.supabase.co
SUPABASE_ANON_KEY=sb_publishable_uZnhnkh1AGj1lC_x369_rg_7svUOm4r
```

## 2. Ollama 本地大模型配置

### 2.1 安装 Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
下载安装包：https://ollama.com/download/windows

### 2.2 启动 Ollama 服务
```bash
# 启动服务
ollama serve

# 后台运行（macOS/Linux）
nohup ollama serve &
```

### 2.3 下载模型
```bash
# 推荐模型 - Llama 3.2（速度快，效果好）
ollama pull llama3.2

# 中文优化模型
ollama pull qwen2.5

# 轻量级模型（适合低配设备）
ollama pull llama3.2:1b
```

### 2.4 验证安装
```bash
# 查看已安装模型
ollama list

# 测试模型
ollama run llama3.2
```

### 2.5 iOS 连接配置

**重要**: iOS 模拟器/真机无法直接访问电脑的 localhost

#### 方案 A：使用本地网络 IP（推荐）
```bash
# 获取本机 IP
ipconfig  # Windows
ifconfig  # macOS/Linux

# 在 .env 中使用局域网 IP
OLLAMA_BASE_URL=http://192.168.1.x:11434
```

#### 方案 B：使用 ngrok 暴露服务
```bash
# 安装 ngrok
brew install ngrok

# 注册并配置 authtoken
ngrok config add-authtoken YOUR_TOKEN

# 启动隧道
ngrok http 11434

# 使用生成的 HTTPS URL
OLLAMA_BASE_URL=https://xxxx.ngrok-free.app
```

## 3. 项目安装

### 3.1 安装依赖
```bash
cd VoiceRecorderApp
npm install
```

### 3.2 配置环境变量
创建 `.env` 文件：
```env
# Supabase 配置（已提供）
SUPABASE_URL=https://bafeujvezjurbobculbp.supabase.co
SUPABASE_ANON_KEY=sb_publishable_uZnhnkh1AGj1lC_x369_rg_7svUOm4r

# Ollama 配置
OLLAMA_BASE_URL=http://192.168.1.x:11434  # 替换为你的 IP
OLLAMA_MODEL=llama3.2

# 可选：OpenAI 备用
OPENAI_API_KEY=sk-...
```

### 3.3 iOS 特定配置

#### 配置 Info.plist
在 `app.json` 中已配置：
```json
{
  "ios": {
    "infoPlist": {
      "NSMicrophoneUsageDescription": "此应用需要访问麦克风以进行录音",
      "NSSpeechRecognitionUsageDescription": "此应用需要语音识别权限以进行实时转写"
    }
  }
}
```

#### 允许 HTTP 连接（开发环境）
在 `Info.plist` 中添加：
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

## 4. 运行项目

### 4.1 启动开发服务器
```bash
npx expo start
```

### 4.2 运行 iOS
- 按 `i` 在 iOS Simulator 中运行
- 或扫描 QR 码在真机上运行（需要 Expo Go App）

### 4.3 构建生产版本
```bash
# iOS 构建
eas build --platform ios

# 或本地构建
cd ios
pod install
cd ..
npx react-native run-ios --configuration Release
```

## 5. 功能测试

### 5.1 录音功能
1. 点击首页"开始录音"按钮
2. 授权麦克风权限
3. 开始说话，观察波形动画
4. 点击完成停止录音

### 5.2 AI 功能
1. 进入设置 > AI 后端
2. 选择 Ollama 本地模型
3. 确保 Ollama 服务已启动
4. 录制一段音频并查看 AI 总结

### 5.3 云端同步
1. 注册/登录账号
2. 录制音频
3. 检查 Supabase 数据库是否同步数据
4. 在另一台设备登录查看同步

## 6. 常见问题

### Q: Ollama 连接失败
**A:** 
- 检查 Ollama 服务是否运行：`curl http://localhost:11434/api/tags`
- 检查 IP 地址是否正确
- 确保手机和电脑在同一网络
- 检查防火墙设置

### Q: 录音权限被拒绝
**A:**
- iOS: 设置 > 隐私 > 麦克风 > 允许
- 重新安装应用

### Q: 无法同步到云端
**A:**
- 检查 Supabase 配置是否正确
- 检查网络连接
- 查看控制台错误信息

### Q: AI 总结质量不佳
**A:**
- 使用更大的模型：`ollama pull llama3.2`
- 确保录音清晰
- 使用中文模型：`ollama pull qwen2.5`

## 7. 生产环境部署

### 7.1 使用云端 AI（推荐生产环境）
1. 注册 OpenAI API
2. 在设置中切换到"云端 AI"
3. 配置 API 密钥

### 7.2 配置生产数据库
1. 使用 Supabase Pro 计划
2. 启用数据库备份
3. 配置连接池

### 7.3 发布到 App Store
1. 注册 Apple Developer 账号
2. 创建 App ID 和证书
3. 使用 Xcode Archive 构建
4. 提交到 App Store Connect

## 8. 技术架构

```
┌─────────────────────────────────────────┐
│           iOS App (React Native)        │
├─────────────────────────────────────────┤
│  UI Layer: React Native + Expo          │
│  State: Zustand                         │
│  Storage: AsyncStorage + Supabase       │
├─────────────────────────────────────────┤
│  Services:                              │
│  - Recording (expo-av)                  │
│  - Transcription (Ollama/OpenAI)        │
│  - AI Summary (Ollama/OpenAI)           │
│  - Sync (Supabase)                      │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
   ┌────▼────┐            ┌────▼────┐
   │ Ollama  │            │Supabase │
   │ (Local) │            │ (Cloud) │
   └─────────┘            └─────────┘
```

## 9. 更新日志

### v1.0.0
- ✅ 录音功能
- ✅ 实时转写
- ✅ AI 智能总结
- ✅ 待办事项生成
- ✅ 云端同步
- ✅ Ollama 本地 AI 支持

## 10. 支持

如有问题，请查看：
- [Ollama 文档](https://github.com/ollama/ollama)
- [Supabase 文档](https://supabase.com/docs)
- [Expo 文档](https://docs.expo.dev)
