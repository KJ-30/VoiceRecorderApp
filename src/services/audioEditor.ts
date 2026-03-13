import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import uuid from 'react-native-uuid';

export interface TrimOptions {
  startTime: number;
  endTime: number;
}

export interface MergeOptions {
  uris: string[];
  outputFileName?: string;
}

export interface AudioMetadata {
  duration: number;
  createdAt: string;
  deviceInfo?: string;
  originalFileName?: string;
}

export interface EditResult {
  uri: string;
  metadata: AudioMetadata;
}

export class AudioEditorService {
  private editedDir = `${FileSystem.documentDirectory}edited/`;

  async ensureDirectories(): Promise<void> {
    const info = await FileSystem.getInfoAsync(this.editedDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.editedDir, { intermediates: true });
    }
  }

  async trimAudio(
    sourceUri: string,
    options: TrimOptions,
    metadata?: AudioMetadata
  ): Promise<EditResult> {
    await this.ensureDirectories();

    if (options.startTime < 0 || options.endTime <= options.startTime) {
      throw new Error('无效的裁剪时间范围');
    }

    const fileName = `trimmed_${Date.now()}_${uuid.v4()}.m4a`;
    const outputUri = `${this.editedDir}${fileName}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: outputUri,
    });

    const trimmedMetadata: AudioMetadata = {
      duration: options.endTime - options.startTime,
      createdAt: metadata?.createdAt || new Date().toISOString(),
      deviceInfo: metadata?.deviceInfo,
      originalFileName: sourceUri.split('/').pop(),
    };

    await this.writeMetadata(outputUri, trimmedMetadata);

    return {
      uri: outputUri,
      metadata: trimmedMetadata,
    };
  }

  async mergeAudios(
    options: MergeOptions,
    metadataList?: AudioMetadata[]
  ): Promise<EditResult> {
    if (options.uris.length === 0) {
      throw new Error('请选择要合并的音频文件');
    }

    if (options.uris.length > 5) {
      throw new Error('最多支持合并5个音频文件');
    }

    await this.ensureDirectories();

    const fileName = `${options.outputFileName || 'merged'}_${Date.now()}.m4a`;
    const outputUri = `${this.editedDir}${fileName}`;

    let totalDuration = 0;
    const tempFiles: string[] = [];
    const durations: number[] = [];

    for (let i = 0; i < options.uris.length; i++) {
      const uri = options.uris[i];
      const tempFile = `${this.editedDir}temp_${i}_${uuid.v4()}.m4a`;

      await FileSystem.copyAsync({
        from: uri,
        to: tempFile,
      });

      tempFiles.push(tempFile);

      const duration = await this.getAudioDuration(uri);
      durations.push(duration);
      totalDuration += duration;
    }

    await FileSystem.copyAsync({
      from: tempFiles[0],
      to: outputUri,
    });

    for (const tempFile of tempFiles) {
      try {
        await FileSystem.deleteAsync(tempFile, { idempotent: true });
      } catch (e) {
        console.warn('清理临时文件失败:', e);
      }
    }

    const mergedMetadata: AudioMetadata = {
      duration: totalDuration,
      createdAt: metadataList?.[0]?.createdAt || new Date().toISOString(),
      deviceInfo: metadataList?.[0]?.deviceInfo,
      originalFileName: options.uris.map(u => u.split('/').pop()).join(', '),
    };

    await this.writeMetadata(outputUri, mergedMetadata);

    return {
      uri: outputUri,
      metadata: mergedMetadata,
    };
  }

  private async writeMetadata(uri: string, metadata: AudioMetadata): Promise<void> {
    const metadataUri = uri.replace(/\.[^.]+$/, '_metadata.json');
    await FileSystem.writeAsStringAsync(
      metadataUri,
      JSON.stringify(metadata, null, 2)
    );
  }

  async readMetadata(uri: string): Promise<AudioMetadata | null> {
    try {
      const metadataUri = uri.replace(/\.[^.]+$/, '_metadata.json');
      const info = await FileSystem.getInfoAsync(metadataUri);

      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(metadataUri);
        return JSON.parse(content);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAudioDuration(uri: string): Promise<number> {
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync({ uri });
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        return status.durationMillis;
      }
      return 0;
    } catch (error) {
      console.error('获取音频时长失败:', error);
      return 0;
    } finally {
      try {
        await sound.unloadAsync();
      } catch (e) {
        // ignore
      }
    }
  }

  async getAudioInfo(uri: string): Promise<{
    duration: number;
    size: number;
    exists: boolean;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const duration = await this.getAudioDuration(uri);

      return {
        duration,
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        exists: fileInfo.exists,
      };
    } catch (error) {
      return {
        duration: 0,
        size: 0,
        exists: false,
      };
    }
  }

  async deleteEditedFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri);
      }

      const metadataUri = uri.replace(/\.[^.]+$/, '_metadata.json');
      const metadataInfo = await FileSystem.getInfoAsync(metadataUri);
      if (metadataInfo.exists) {
        await FileSystem.deleteAsync(metadataUri);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  }

  async listEditedFiles(): Promise<string[]> {
    try {
      await this.ensureDirectories();
      const files = await FileSystem.readDirectoryAsync(this.editedDir);
      return files
        .filter(f => !f.endsWith('_metadata.json'))
        .map(f => `${this.editedDir}${f}`);
    } catch (error) {
      return [];
    }
  }

  formatTimeForDisplay(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const audioEditorService = new AudioEditorService();
