import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';
import { Recording } from '../types/index';

// 获取 documentDirectory
const getDocumentDirectory = (): string => {
  // 在 Expo 环境中，documentDirectory 是一个常量
  // 通过 FileSystem 模块访问
  return (FileSystem as any).documentDirectory || 'file:///data/user/0/host.exp.exponent/files/';
};

// 音频编辑选项
export interface AudioEditOptions {
  startTime: number; // 开始时间（毫秒）
  endTime: number; // 结束时间（毫秒）
}

// 音频合并选项
export interface AudioMergeOptions {
  recordings: Recording[]; // 要合并的录音文件（最多5个）
}

// 音频元数据
export interface AudioMetadata {
  createdAt: string;
  deviceInfo?: string;
  originalDuration: number;
}

// 音频编辑服务类
export class AudioEditorService {
  private static readonly MAX_MERGE_FILES = 5;
  private static readonly SUPPORTED_FORMATS = ['.m4a', '.mp3', '.wav', '.aac'];

  // 获取文件扩展名
  private getFileExtension(uri: string): string {
    const match = uri.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '.m4a';
  }

  // 验证文件格式
  private isValidFormat(uri: string): boolean {
    const ext = this.getFileExtension(uri);
    return AudioEditorService.SUPPORTED_FORMATS.includes(ext);
  }

  // 获取音频文件的元数据
  async getMetadata(uri: string): Promise<AudioMetadata | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) return null;

      // 尝试从文件名或路径中提取元数据
      const metadata: AudioMetadata = {
        createdAt: new Date(fileInfo.modificationTime || Date.now()).toISOString(),
        deviceInfo: 'VoiceRecorderApp',
        originalDuration: 0,
      };

      return metadata;
    } catch (error) {
      console.error('获取元数据失败:', error);
      return null;
    }
  }

  // 裁剪音频
  async trim(recording: Recording, options: AudioEditOptions): Promise<Recording> {
    try {
      const { startTime, endTime } = options;

      // 验证时间范围
      if (startTime < 0 || endTime > recording.duration || startTime >= endTime) {
        throw new Error('无效的时间范围');
      }

      // 验证文件格式
      if (!this.isValidFormat(recording.uri)) {
        throw new Error('不支持的音频格式');
      }

      // 获取原始元数据
      const metadata = await this.getMetadata(recording.uri);

      // 创建新的录音对象
      const newRecording: Recording = {
        ...recording,
        id: uuid.v4() as string,
        title: `${recording.title} (裁剪)`,
        duration: endTime - startTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: false,
        transcription: undefined,
        summary: undefined,
        todos: undefined,
      };

      // 注意：由于 React Native / Expo 环境下没有原生的音频处理库
      // 这里我们使用一种轻量级的方法：复制原文件并记录裁剪信息
      // 实际播放时会根据裁剪信息调整播放范围

      const extension = this.getFileExtension(recording.uri);
      const docDir = getDocumentDirectory();
      const newUri = `${docDir}recordings/${newRecording.id}${extension}`;

      // 确保目录存在
      const dir = `${docDir}recordings`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      // 复制文件
      await FileSystem.copyAsync({
        from: recording.uri,
        to: newUri,
      });

      // 保存裁剪信息到元数据文件
      const metaUri = `${newUri}.meta.json`;
      const trimInfo = {
        originalUri: recording.uri,
        startTime,
        endTime,
        originalMetadata: metadata,
        createdAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(metaUri, JSON.stringify(trimInfo));

      newRecording.uri = newUri;

      return newRecording;
    } catch (error) {
      console.error('裁剪音频失败:', error);
      throw error;
    }
  }

  // 合并音频（最多5个文件）
  async merge(options: AudioMergeOptions): Promise<Recording> {
    try {
      const { recordings } = options;

      // 验证文件数量
      if (recordings.length < 2) {
        throw new Error('至少需要2个文件才能合并');
      }
      if (recordings.length > AudioEditorService.MAX_MERGE_FILES) {
        throw new Error(`最多只能合并${AudioEditorService.MAX_MERGE_FILES}个文件`);
      }

      // 验证文件格式一致性
      const firstExt = this.getFileExtension(recordings[0].uri);
      const allSameFormat = recordings.every(r => this.getFileExtension(r.uri) === firstExt);
      if (!allSameFormat) {
        throw new Error('所有文件必须是相同格式');
      }

      // 验证格式支持
      if (!this.isValidFormat(recordings[0].uri)) {
        throw new Error('不支持的音频格式');
      }

      // 收集元数据
      const metadataList: (AudioMetadata | null)[] = [];
      for (const recording of recordings) {
        const metadata = await this.getMetadata(recording.uri);
        metadataList.push(metadata);
      }

      // 创建新的录音对象
      const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);
      const newRecording: Recording = {
        id: uuid.v4() as string,
        title: `合并录音 (${recordings.length}个文件)`,
        uri: '',
        duration: totalDuration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: false,
        isDeleted: false,
        transcription: undefined,
        summary: undefined,
        todos: undefined,
      };

      // 创建合并后的文件
      const extension = firstExt;
      const docDir = getDocumentDirectory();
      const newUri = `${docDir}recordings/${newRecording.id}${extension}`;

      // 确保目录存在
      const dir = `${docDir}recordings`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      // 由于 React Native / Expo 没有原生音频合并功能
      // 我们采用一种轻量级方案：创建一个播放列表文件
      // 实际播放时按顺序播放各个文件

      // 首先复制第一个文件作为基础
      await FileSystem.copyAsync({
        from: recordings[0].uri,
        to: newUri,
      });

      // 保存合并信息到元数据文件
      const metaUri = `${newUri}.meta.json`;
      const mergeInfo = {
        type: 'merge',
        sources: recordings.map(r => ({
          id: r.id,
          uri: r.uri,
          duration: r.duration,
          title: r.title,
        })),
        originalMetadata: metadataList,
        createdAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(metaUri, JSON.stringify(mergeInfo));

      newRecording.uri = newUri;

      return newRecording;
    } catch (error) {
      console.error('合并音频失败:', error);
      throw error;
    }
  }

  // 获取编辑后的元数据
  async getEditMetadata(uri: string): Promise<any | null> {
    try {
      const metaUri = `${uri}.meta.json`;
      const metaInfo = await FileSystem.getInfoAsync(metaUri);

      if (!metaInfo.exists) return null;

      const content = await FileSystem.readAsStringAsync(metaUri);
      return JSON.parse(content);
    } catch (error) {
      console.error('获取编辑元数据失败:', error);
      return null;
    }
  }

  // 删除编辑元数据
  async deleteEditMetadata(uri: string): Promise<void> {
    try {
      const metaUri = `${uri}.meta.json`;
      const metaInfo = await FileSystem.getInfoAsync(metaUri);

      if (metaInfo.exists) {
        await FileSystem.deleteAsync(metaUri);
      }
    } catch (error) {
      console.error('删除编辑元数据失败:', error);
    }
  }

  // 验证文件是否存在
  async validateFile(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  // 获取文件大小
  async getFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      console.error('获取文件大小失败:', error);
      return 0;
    }
  }

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出单例
export const audioEditorService = new AudioEditorService();
