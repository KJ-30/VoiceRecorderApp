# Ollama 本地大模型配置指南

## 安装 Ollama

### macOS
```bash
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
下载安装包：https://ollama.com/download/windows

## 启动 Ollama 服务

```bash
# 启动服务
ollama serve

# 后台运行（macOS/Linux）
nohup ollama serve &
```

## 下载模型

```bash
# 下载 Llama 3.2 模型（推荐，速度快）
ollama pull llama3.2

# 或下载其他模型
ollama pull llama3.2:3b      # 轻量版
ollama pull qwen2.5           # 阿里通义千问
ollama pull deepseek-r1:1.5b  # DeepSeek
```

## 验证安装

```bash
# 查看已安装模型
ollama list

# 测试模型
ollama run llama3.2
```

## 配置应用连接

### 1. 确保 Ollama 服务运行
```bash
# 检查服务状态
curl http://localhost:11434/api/tags
```

### 2. 配置环境变量
在 `.env` 文件中设置：
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 3. iOS 模拟器/真机连接

**注意**：iOS 模拟器/真机无法直接访问电脑的 localhost。

#### 方案 A：使用 ngrok 暴露服务
```bash
# 安装 ngrok
brew install ngrok

# 启动隧道
ngrok http 11434

# 使用生成的 URL（如 https://xxxx.ngrok.io）
```

#### 方案 B：使用本地网络 IP
```bash
# 获取本机 IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# 在 .env 中使用局域网 IP
OLLAMA_BASE_URL=http://192.168.x.x:11434
```

#### 方案 C：仅使用云端 AI（无需 Ollama）
在设置中将 AI 后端切换为 OpenAI 或其他云服务。

## 模型选择建议

| 模型 | 大小 | 速度 | 质量 | 适用场景 |
|------|------|------|------|----------|
| llama3.2:1b | 1.3GB | 极快 | 一般 | 简单总结 |
| llama3.2 | 2.0GB | 快 | 良好 | 日常使用 |
| qwen2.5:3b | 1.9GB | 快 | 优秀 | 中文场景 |
| deepseek-r1:1.5b | 1.1GB | 极快 | 良好 | 推理任务 |

## 性能优化

### 1. 使用 GPU 加速（如果可用）
```bash
# 检查 GPU 支持
ollama run llama3.2 --verbose
```

### 2. 调整上下文长度
在代码中设置 `num_ctx` 参数：
```typescript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.2',
    prompt: prompt,
    options: {
      num_ctx: 4096,  // 上下文长度
      temperature: 0.7,
    },
  }),
});
```

### 3. 并发控制
避免同时发送过多请求，建议：
- AI 总结：单条处理
- 待办生成：单条处理
- 智能搜索：可批量处理

## 故障排除

### 连接失败
```bash
# 检查服务是否运行
curl http://localhost:11434/api/tags

# 重启服务
ollama serve
```

### 内存不足
```bash
# 使用更小的模型
ollama pull llama3.2:1b

# 关闭其他应用释放内存
```

### 响应慢
```bash
# 使用量化版本
ollama pull llama3.2:q4_0

# 或降低上下文长度
```

## 隐私说明

使用 Ollama 本地模型的优势：
- ✅ 录音数据不上传到云端
- ✅ AI 处理完全在本地进行
- ✅ 无需网络连接（除首次下载模型）
- ✅ 适合处理敏感会议内容

## 切换到云端 AI

如果本地模型效果不理想，可以在应用设置中切换到：
- OpenAI GPT-4
- 阿里云通义千问
- 其他云端服务

切换后数据将发送到云端处理，请注意隐私保护。
