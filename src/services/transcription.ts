import { Transcription, TranscriptionSegment, Recording } from '../types/index';
import uuid from 'react-native-uuid';

// 模拟转写服务
export class TranscriptionService {
  private isProcessing: boolean = false;

  // 开始转写
  async startTranscription(recording: Recording): Promise<Transcription> {
    try {
      this.isProcessing = true;

      // 创建转写记录
      const transcription: Transcription = {
        id: uuid.v4() as string,
        recordingId: recording.id,
        text: '',
        segments: [],
        language: 'zh-CN',
        status: 'processing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 模拟转写过程
      await this.simulateTranscription(transcription);

      return transcription;
    } catch (error) {
      console.error('转写失败:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // 模拟转写过程（实际项目中应调用真实的语音识别API）
  private async simulateTranscription(transcription: Transcription): Promise<void> {
    // 模拟转写延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟转写文本
    const mockText = '今天我们要讨论一下下个季度的产品规划。首先请产品经理介绍一下目前的进展情况。';
    
    // 模拟转写片段
    const mockSegments: TranscriptionSegment[] = [
      {
        id: uuid.v4() as string,
        speakerId: 'speaker-1',
        speakerName: '发言人1',
        startTime: 0,
        endTime: 5000,
        text: '今天我们要讨论一下下个季度的产品规划。',
      },
      {
        id: uuid.v4() as string,
        speakerId: 'speaker-1',
        speakerName: '发言人1',
        startTime: 5000,
        endTime: 10000,
        text: '首先请产品经理介绍一下目前的进展情况。',
      },
    ];

    transcription.text = mockText;
    transcription.segments = mockSegments;
    transcription.status = 'completed';
    transcription.updatedAt = new Date().toISOString();
  }

  // 实时转写（用于录音过程中的实时转写）
  async startRealtimeTranscription(
    onTranscriptionUpdate: (text: string) => void
  ): Promise<void> {
    try {
      // 模拟实时转写
      const mockTexts = [
        '今天',
        '今天我们要',
        '今天我们要讨论',
        '今天我们要讨论一下',
        '今天我们要讨论一下下个',
        '今天我们要讨论一下下个季度',
        '今天我们要讨论一下下个季度的',
        '今天我们要讨论一下下个季度的产品',
        '今天我们要讨论一下下个季度的产品规划',
      ];

      for (const text of mockTexts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onTranscriptionUpdate(text);
      }
    } catch (error) {
      console.error('实时转写失败:', error);
      throw error;
    }
  }

  // 更新转写文本
  async updateTranscription(
    transcriptionId: string,
    updates: Partial<Transcription>
  ): Promise<Transcription> {
    try {
      // 实际项目中应调用API更新数据库
      const updatedTranscription: Transcription = {
        id: transcriptionId,
        recordingId: '',
        text: '',
        segments: [],
        language: 'zh-CN',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates,
      };

      return updatedTranscription;
    } catch (error) {
      console.error('更新转写失败:', error);
      throw error;
    }
  }

  // 识别发言人
  async identifySpeakers(audioUri: string): Promise<{ id: string; name: string }[]> {
    try {
      // 模拟发言人识别
      await new Promise(resolve => setTimeout(resolve, 1000));

      return [
        { id: 'speaker-1', name: '发言人1' },
        { id: 'speaker-2', name: '发言人2' },
        { id: 'speaker-3', name: '发言人3' },
      ];
    } catch (error) {
      console.error('识别发言人失败:', error);
      throw error;
    }
  }

  // 更新发言人名称
  async updateSpeakerName(
    transcriptionId: string,
    speakerId: string,
    newName: string
  ): Promise<void> {
    try {
      // 实际项目中应调用API更新数据库
      console.log(`更新发言人名称: ${speakerId} -> ${newName}`);
    } catch (error) {
      console.error('更新发言人名称失败:', error);
      throw error;
    }
  }

  // 导出转写文本
  exportTranscription(transcription: Transcription, format: 'txt' | 'srt' | 'json'): string {
    switch (format) {
      case 'txt':
        return this.exportAsTxt(transcription);
      case 'srt':
        return this.exportAsSrt(transcription);
      case 'json':
        return this.exportAsJson(transcription);
      default:
        return this.exportAsTxt(transcription);
    }
  }

  // 导出为TXT格式
  private exportAsTxt(transcription: Transcription): string {
    let content = '';
    
    transcription.segments.forEach(segment => {
      content += `${segment.speakerName}: ${segment.text}\n`;
    });

    return content;
  }

  // 导出为SRT格式
  private exportAsSrt(transcription: Transcription): string {
    let content = '';
    
    transcription.segments.forEach((segment, index) => {
      const startTime = this.formatSrtTime(segment.startTime);
      const endTime = this.formatSrtTime(segment.endTime);
      
      content += `${index + 1}\n`;
      content += `${startTime} --> ${endTime}\n`;
      content += `${segment.speakerName}: ${segment.text}\n\n`;
    });

    return content;
  }

  // 导出为JSON格式
  private exportAsJson(transcription: Transcription): string {
    return JSON.stringify(transcription, null, 2);
  }

  // 格式化SRT时间
  private formatSrtTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(2, '0')}`;
  }

  // 检查是否正在处理
  isTranscribing(): boolean {
    return this.isProcessing;
  }
}

// 导出单例
export const transcriptionService = new TranscriptionService();
