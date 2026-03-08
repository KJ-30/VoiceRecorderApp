# VoiceRecorderApp - 智能录音转写应用

一款基于 React Native + Expo 开发的 iOS 智能录音转写应用，支持实时转写、AI 智能总结、云端同步等功能。

## 功能特性

### 核心功能
- 🎙️ **高质量录音** - 支持 48kHz 高质量录音，可后台录音
- 📝 **实时转写** - 录音过程中实时显示转写文本
- 🤖 **AI 智能总结** - 自动生成会议总结、关键要点、行动项
- ✅ **待办事项** - 自动从录音中提取待办事项
- 👥 **发言人识别** - 自动识别不同发言人

### 文件管理
- 📁 **文件夹管理** - 支持创建文件夹分类管理录音
- 🔍 **智能搜索** - 支持按标题、内容搜索录音
- 📊 **多视图模式** - 支持网格/列表视图切换
- ✏️ **批量操作** - 支持批量选择、移动、删除

### 数据同步
- ☁️ **云端同步** - 录音文件自动同步到云端
- 💾 **离线使用** - 支持离线录音和查看
- 🔒 **数据安全** - 端到端加密保护隐私

### 导出分享
- 📤 **多种格式** - 支持导出 TXT、DOCX、PDF、SRT
- 🔗 **分享功能** - 一键分享录音和转写文本
- 🔐 **密码保护** - 支持设置分享密码

## 技术栈

- **框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: Zustand
- **导航**: React Navigation
- **UI 设计**: iOS Design System (深色模式)
- **后端服务**: Supabase (数据库 + 认证 + 存储)
- **AI 服务**: OpenAI API

## 项目结构

```
VoiceRecorderApp/
├── src/
│   ├── components/     # 可复用组件
│   ├── screens/        # 页面组件
│   │   ├── HomeScreen.tsx      # 首页
│   │   ├── RecordingScreen.tsx # 录音页面
│   │   ├── EditorScreen.tsx    # 编辑页面
│   │   ├── FilesScreen.tsx     # 文件管理
│   │   └── SettingsScreen.tsx  # 设置页面
│   ├── navigation/     # 导航配置
│   ├── hooks/          # 自定义 Hooks
│   ├── services/       # 业务服务
│   │   ├── recording.ts      # 录音服务
│   │   ├── transcription.ts  # 转写服务
│   │   └── ai.ts             # AI 服务
│   ├── utils/          # 工具函数
│   │   └── theme.ts          # 主题配置
│   ├── types/          # TypeScript 类型
│   ├── store/          # 状态管理
│   └── assets/         # 静态资源
├── App.tsx             # 应用入口
├── package.json        # 项目依赖
└── app.json            # Expo 配置
```

## 安装运行

### 环境要求
- Node.js >= 18
- npm 或 yarn
- iOS Simulator (macOS) 或 iOS 设备
- Xcode (iOS 开发)

### 安装步骤

1. 克隆项目
```bash
cd VoiceRecorderApp
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件：
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. 启动开发服务器
```bash
npx expo start
```

5. 运行 iOS 应用
- 按 `i` 在 iOS Simulator 中运行
- 或使用 Expo Go App 扫描二维码在真机上运行

## 开发指南

### 添加新页面
1. 在 `src/screens/` 创建页面组件
2. 在 `src/navigation/index.tsx` 添加路由
3. 更新类型定义 `src/types/index.ts`

### 添加新服务
1. 在 `src/services/` 创建服务文件
2. 导出单例实例
3. 在组件中使用

### 状态管理
使用 Zustand 进行状态管理：
```typescript
import { useAppStore } from '@store/index';

const { recordings, addRecording } = useAppStore();
```

## 构建发布

### iOS 构建
```bash
# 生成 iOS 项目
cd ios
pod install

# 使用 Xcode 打开项目并构建
open VoiceRecorderApp.xcworkspace
```

### 发布到 App Store
1. 在 Apple Developer 创建 App ID
2. 配置证书和描述文件
3. 使用 Xcode Archive 并上传

## 注意事项

1. **录音权限**: 首次使用需要授权麦克风权限
2. **网络连接**: AI 转写和云端同步需要网络
3. **存储空间**: 定期检查存储空间使用情况

## 后续优化

- [ ] 支持更多语言识别
- [ ] 添加语音命令功能
- [ ] 优化 AI 总结算法
- [ ] 支持团队协作
- [ ] 添加更多导出格式

## License

MIT
