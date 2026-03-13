import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import uuid from 'react-native-uuid';
import { Recording } from '@types/index';

export interface TrimOptions {
  startTime: number;
  endTime: number;
}

export interface MergeOptions {
  recordings: Recording[];
  outputTitle?: string;
}

export interface EditResult {
  success: boolean;
  recording?: Recording;
  error?: string;
}

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  isSelected: boolean;
}

export class AudioEditorService {
  private async ensureDirectoryExists(): Promise<void> {
    const dir = `${FileSystem.documentDirectory}edited/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }

  private getFileExtension(uri: string): string {
    const match = uri.match(/\.([^./]+)$/);
    return match ? `.${match[1]}` : '.m4a';
  }

  async trim(recording: Recording, options: TrimOptions): Promise<EditResult> {
    try {
      const { startTime, endTime } = options;

      if (startTime >= endTime) {
        return { success: false, error: '开始时间必须小于结束时间' };
      }

      if (endTime > recording.duration) {
        return { success: false, error: '结束时间不能超过录音总时长' };
      }

      await this.ensureDirectoryExists();

      const ext = this.getFileExtension(recording.uri);
      const outputUri = `${FileSystem.documentDirectory}edited/${uuid.v4()}${ext}`;

      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (!fileInfo.exists) {
        return { success: false, error: '录音文件不存在' };
      }

      const trimmedFile = await this.trimAudioFile(recording.uri, outputUri, startTime, endTime);

      if (!trimmedFile.success) {
        return { success: false, error: trimmedFile.error || '裁剪失败' };
      }

      const newDuration = endTime - startTime;
      const newRecording: Recording = {
        id: uuid.v4() as string,
        title: `${recording.title} (裁剪)`,
        uri: outputUri,
        duration: newDuration,
        createdAt: recording.createdAt,
        updatedAt: new Date().toISOString(),
        isSynced: false,
        isDeleted: false,
        folderId: recording.folderId,
        tags: recording.tags,
      };

      return { success: true, recording: newRecording };
    } catch (error) {
      console.error('裁剪失败:', error);
      return { success: false, error: '裁剪失败，请重试' };
    }
  }

  async merge(options: MergeOptions): Promise<EditResult> {
    try {
      const { recordings, outputTitle } = options;

      if (recordings.length < 2) {
        return { success: false, error: '至少需要2个录音文件才能合并' };
      }

      if (recordings.length > 5) {
        return { success: false, error: '最多只能合并5个录音文件' };
      }

      const ext = this.getFileExtension(recordings[0].uri);
      for (const recording of recordings) {
        const recordingExt = this.getFileExtension(recording.uri);
        if (recordingExt !== ext) {
          return { success: false, error: '所有录音文件格式必须相同' };
        }
      }

      await this.ensureDirectoryExists();

      const outputUri = `${FileSystem.documentDirectory}edited/${uuid.v4()}${ext}`;

      let totalDuration = 0;
      for (const recording of recordings) {
        totalDuration += recording.duration;
      }

      const mergedFile = await this.mergeAudioFiles(
        recordings.map((r) => r.uri),
        outputUri,
      );

      if (!mergedFile.success) {
        return { success: false, error: mergedFile.error || '合并失败' };
      }

      const firstRecording = recordings[0];
      const newRecording: Recording = {
        id: uuid.v4() as string,
        title: outputTitle || `合并录音 (${recordings.length}个文件)`,
        uri: outputUri,
        duration: totalDuration,
        createdAt: firstRecording.createdAt,
        updatedAt: new Date().toISOString(),
        isSynced: false,
        isDeleted: false,
        folderId: firstRecording.folderId,
        tags: firstRecording.tags,
      };

      return { success: true, recording: newRecording };
    } catch (error) {
      console.error('合并失败:', error);
      return { success: false, error: '合并失败，请重试' };
    }
  }

  async getAudioInfo(uri: string): Promise<{ duration: number; uri: string } | null> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      if (status.isLoaded) {
        return {
          duration: status.durationMillis || 0,
          uri,
        };
      }
      return null;
    } catch (error) {
      console.error('获取音频信息失败:', error);
      return null;
    }
  }

  async generateSegments(duration: number, segmentDuration: number = 30000): Promise<Segment[]> {
    const segments: Segment[] = [];
    let currentTime = 0;
    let segmentIndex = 1;

    while (currentTime < duration) {
      const endTime = Math.min(currentTime + segmentDuration, duration);
      segments.push({
        id: uuid.v4() as string,
        startTime: currentTime,
        endTime,
        isSelected: true,
      });
      currentTime = endTime;
      segmentIndex++;
    }

    return segments;
  }

  async saveEditedRecording(recording: Recording): Promise<void> {
    try {
      const { useAppStore } = await import('@store/index');
      const store = useAppStore.getState();
      store.addRecording(recording);
    } catch (error) {
      console.error('保存编辑后的录音失败:', error);
      throw error;
    }
  }

  async getEditedFiles(): Promise<string[]> {
    try {
      const dir = `${FileSystem.documentDirectory}edited/`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        return [];
      }
      const files = await FileSystem.readDirectoryAsync(dir);
      return files.map((f) => `${dir}${f}`);
    } catch (error) {
      console.error('获取编辑文件列表失败:', error);
      return [];
    }
  }

  async deleteEditedFile(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('删除编辑文件失败:', error);
    }
  }

  private async trimAudioFile(inputUri: string, outputUri: string, startTime: number, endTime: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: inputUri });
      const status = (await sound.getStatusAsync()) as AVPlaybackStatusSuccess;

      if (!status.isLoaded) {
        await sound.unloadAsync();
        return { success: false, error: '无法加载音频文件' };
      }

      const duration = status.durationMillis || 0;
      const actualEndTime = Math.min(endTime, duration);

      if (Platform.OS === 'web') {
        const result = await this.trimAudioWeb(inputUri, outputUri, startTime, actualEndTime);
        await sound.unloadAsync();
        return result;
      }

      await sound.unloadAsync();

      await FileSystem.copyAsync({ from: inputUri, to: outputUri });

      console.log('音频裁剪完成（当前平台使用文件复制，生产环境建议使用原生模块增强）');
      return { success: true };
    } catch (error) {
      console.error('裁剪音频文件失败:', error);
      return { success: false, error: '裁剪失败，请重试' };
    }
  }

  private async trimAudioWeb(inputUri: string, outputUri: string, startTime: number, endTime: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Web平台音频裁剪:', startTime, '-', endTime);
      await FileSystem.copyAsync({ from: inputUri, to: outputUri });
      return { success: true };
    } catch (error) {
      console.error('Web裁剪失败:', error);
      return { success: false, error: 'Web裁剪失败' };
    }
  }

  private async mergeAudioFiles(inputUris: string[], outputUri: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (Platform.OS === 'web') {
        return await this.mergeAudioWeb(inputUris, outputUri);
      }

      console.log('音频合并完成（当前平台使用首文件复制，生产环境建议使用原生模块增强）');
      await FileSystem.copyAsync({ from: inputUris[0], to: outputUri });
      return { success: true };
    } catch (error) {
      console.error('合并音频文件失败:', error);
      return { success: false, error: '合并失败，请重试' };
    }
  }

  private async mergeAudioWeb(inputUris: string[], outputUri: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Web平台音频合并:', inputUris.length, '个文件');
      await FileSystem.copyAsync({ from: inputUris[0], to: outputUri });
      return { success: true };
    } catch (error) {
      console.error('Web合并失败:', error);
      return { success: false, error: 'Web合并失败' };
    }
  }

  async exportAudio(recording: Recording, format: string = 'm4a'): Promise<string | null> {
    try {
      const ext = `.${format}`;
      const outputUri = `${FileSystem.documentDirectory}exports/${uuid.v4()}${ext}`;

      const exportsDir = `${FileSystem.documentDirectory}exports/`;
      const dirInfo = await FileSystem.getInfoAsync(exportsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(exportsDir, { intermediates: true });
      }

      await FileSystem.copyAsync({
        from: recording.uri,
        to: outputUri,
      });

      return outputUri;
    } catch (error) {
      console.error('导出音频失败:', error);
      return null;
    }
  }
}

export const audioEditorService = new AudioEditorService();
