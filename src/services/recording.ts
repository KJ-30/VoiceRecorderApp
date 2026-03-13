import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';
import { Recording } from '../types/index';

// 录音配置
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// 录音服务类
export class RecordingService {
  private recording: Audio.Recording | null = null;
  private recordingInstance: Recording | null = null;

  // 请求录音权限
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('请求录音权限失败:', error);
      return false;
    }
  }

  // 配置音频模式
  async configureAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('配置音频模式失败:', error);
      throw error;
    }
  }

  // 开始录音
  async startRecording(title?: string): Promise<Recording> {
    try {
      // 请求权限
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('没有录音权限');
      }

      // 配置音频
      await this.configureAudio();

      // 创建录音实例
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      this.recording = recording;

      // 创建录音记录
      const recordingData: Recording = {
        id: uuid.v4() as string,
        title: title || `录音 ${new Date().toLocaleString('zh-CN')}`,
        uri: '',
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: false,
        isDeleted: false,
      };

      this.recordingInstance = recordingData;
      return recordingData;
    } catch (error) {
      console.error('开始录音失败:', error);
      throw error;
    }
  }

  // 暂停录音
  async pauseRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.pauseAsync();
      }
    } catch (error) {
      console.error('暂停录音失败:', error);
      throw error;
    }
  }

  // 继续录音
  async resumeRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.startAsync();
      }
    } catch (error) {
      console.error('继续录音失败:', error);
      throw error;
    }
  }

  // 停止录音
  async stopRecording(): Promise<Recording> {
    try {
      if (!this.recording) {
        throw new Error('没有正在进行的录音');
      }

      // 停止录音
      await this.recording.stopAndUnloadAsync();
      
      // 获取录音URI
      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('获取录音文件失败');
      }

      // 获取录音状态
      const status = await this.recording.getStatusAsync();
      const durationMillis = 'durationMillis' in status ? status.durationMillis : 0;

      // 更新录音记录
      if (this.recordingInstance) {
        this.recordingInstance.uri = uri;
        this.recordingInstance.duration = durationMillis || 0;
        this.recordingInstance.updatedAt = new Date().toISOString();
      }

      // 重置录音实例
      this.recording = null;

      return this.recordingInstance!;
    } catch (error) {
      console.error('停止录音失败:', error);
      throw error;
    }
  }

  // 获取录音时长
  async getRecordingDuration(): Promise<number> {
    try {
      if (this.recording) {
        const status = await this.recording.getStatusAsync();
        if ('durationMillis' in status) {
          return status.durationMillis;
        }
      }
      return 0;
    } catch (error) {
      console.error('获取录音时长失败:', error);
      return 0;
    }
  }

  // 删除录音文件
  async deleteRecordingFile(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('删除录音文件失败:', error);
      throw error;
    }
  }

  // 获取录音文件信息
  async getRecordingFileInfo(uri: string): Promise<FileSystem.FileInfo> {
    try {
      return await FileSystem.getInfoAsync(uri);
    } catch (error) {
      console.error('获取录音文件信息失败:', error);
      throw error;
    }
  }

  // 复制录音文件
  async copyRecordingFile(sourceUri: string, destinationUri: string): Promise<void> {
    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri,
      });
    } catch (error) {
      console.error('复制录音文件失败:', error);
      throw error;
    }
  }

  // 移动录音文件
  async moveRecordingFile(sourceUri: string, destinationUri: string): Promise<void> {
    try {
      await FileSystem.moveAsync({
        from: sourceUri,
        to: destinationUri,
      });
    } catch (error) {
      console.error('移动录音文件失败:', error);
      throw error;
    }
  }

  // 获取录音文件大小
  async getRecordingFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      console.error('获取录音文件大小失败:', error);
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

  // 格式化时长
  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 导出单例
export const recordingService = new RecordingService();
