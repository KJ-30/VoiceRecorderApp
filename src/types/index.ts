// 录音文件类型
export interface Recording {
  id: string;
  title: string;
  uri: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  transcription?: Transcription;
  summary?: Summary;
  todos?: Todo[];
  folderId?: string;
  tags?: string[];
  isSynced: boolean;
  isDeleted: boolean;
}

// 转写文本类型
export interface Transcription {
  id: string;
  recordingId: string;
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
}

// 转写片段类型
export interface TranscriptionSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  startTime: number;
  endTime: number;
  text: string;
}

// AI总结类型
export interface Summary {
  id: string;
  recordingId: string;
  content: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
}

// 待办事项类型
export interface Todo {
  id: string;
  recordingId: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// 文件夹类型
export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  recordingCount: number;
  createdAt: string;
  updatedAt: string;
}

// 用户类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  storageUsed: number;
  storageLimit: number;
  subscription: 'free' | 'basic' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

// 录音状态
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

// 转写状态
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'error';

// 导出格式
export type ExportFormat = 'txt' | 'docx' | 'pdf' | 'srt' | 'json';

// 分享类型
export interface ShareOptions {
  format: ExportFormat;
  includeAudio: boolean;
  includeTranscription: boolean;
  includeSummary: boolean;
  password?: string;
  expiresIn?: number;
}

// 应用状态
export interface AppState {
  isLoading: boolean;
  isRecording: boolean;
  recordingDuration: number;
  currentRecording: Recording | null;
  recordings: Recording[];
  folders: Folder[];
  user: User | null;
  isAuthenticated: boolean;
}

// 导航参数
export type RootStackParamList = {
  Main: undefined;
  Recording: { recordingId?: string };
  Editor: { recordingId: string; mode?: 'trim' };
  Export: { recordingId: string };
  Share: { recordingId: string };
  Settings: undefined;
  Profile: undefined;
  Statistics: undefined;
  CloudStorage: undefined;
  FolderDetail: { folderId: string };
  Trash: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Files: undefined;
  Statistics: undefined;
  Profile: undefined;
};
