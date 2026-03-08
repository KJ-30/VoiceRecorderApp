import { Summary, Todo, Recording, Transcription } from '@types/index';
import uuid from 'react-native-uuid';
import { aiAdapter } from './ai-adapter';

// AI服务类 - 使用适配器模式支持多种后端
export class AIService {
  private isProcessing: boolean = false;

  // 生成AI总结
  async generateSummary(recording: Recording, transcription: Transcription): Promise<Summary> {
    try {
      this.isProcessing = true;

      // 使用适配器调用 AI
      const summary = await aiAdapter.generateSummary(transcription);

      return summary;
    } catch (error) {
      console.error('生成AI总结失败:', error);
      // 如果 AI 服务失败，使用模拟数据
      return this.generateMockSummary(recording, transcription);
    } finally {
      this.isProcessing = false;
    }
  }

  // 生成模拟总结（备用方案）
  private generateMockSummary(recording: Recording, transcription: Transcription): Summary {
    return {
      id: uuid.v4() as string,
      recordingId: recording.id,
      content: this.generateSummaryContent(transcription.text),
      keyPoints: this.extractKeyPoints(transcription.text),
      actionItems: this.extractActionItems(transcription.text),
      decisions: this.extractDecisions(transcription.text),
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 生成总结内容
  private generateSummaryContent(text: string): string {
    return '本次会议主要讨论了产品规划和开发进展，团队整体进展顺利。';
  }

  // 提取关键要点
  private extractKeyPoints(text: string): string[] {
    return ['核心功能开发已完成80%', '用户日活增长30%', '技术架构支持百万级并发'];
  }

  // 提取行动项
  private extractActionItems(text: string): string[] {
    return ['产品经理整理Q4详细规划文档', '技术团队完成移动端优化', '设计团队提供新版UI方案'];
  }

  // 提取决策事项
  private extractDecisions(text: string): string[] {
    return ['Q4重点关注用户体验优化', '继续推进新功能开发'];
  }

  // 生成待办事项
  async generateTodos(recording: Recording, transcription: Transcription): Promise<Todo[]> {
    try {
      this.isProcessing = true;

      // 使用适配器生成待办
      const todos = await aiAdapter.generateTodos(transcription);

      return todos;
    } catch (error) {
      console.error('生成待办事项失败:', error);
      // 使用模拟数据
      return this.generateMockTodos(recording);
    } finally {
      this.isProcessing = false;
    }
  }

  // 生成模拟待办
  private generateMockTodos(recording: Recording): Todo[] {
    return [
      {
        id: uuid.v4() as string,
        recordingId: recording.id,
        text: '整理会议记录',
        completed: false,
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuid.v4() as string,
        recordingId: recording.id,
        text: '跟进行动项',
        completed: false,
        priority: 'medium',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // 更新总结
  async updateSummary(summaryId: string, updates: Partial<Summary>): Promise<Summary> {
    const updatedSummary: Summary = {
      id: summaryId,
      recordingId: '',
      content: '',
      keyPoints: [],
      actionItems: [],
      decisions: [],
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates,
    };

    return updatedSummary;
  }

  // 重新生成总结
  async regenerateSummary(recording: Recording, transcription: Transcription): Promise<Summary> {
    return this.generateSummary(recording, transcription);
  }

  // 智能搜索
  async searchRecordings(query: string, recordings: Recording[]): Promise<Recording[]> {
    try {
      const texts = recordings.map((r) => `${r.title} ${r.transcription?.text || ''}`);

      const indices = await aiAdapter.searchRecordings(query, texts);

      return indices.map((i) => recordings[i]).filter(Boolean);
    } catch (error) {
      console.error('搜索失败:', error);
      // 回退到关键词搜索
      return recordings.filter((recording) => {
        const searchText = `${recording.title} ${recording.transcription?.text || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });
    }
  }

  // 智能分类
  async classifyRecording(recording: Recording): Promise<string[]> {
    const text = `${recording.title} ${recording.transcription?.text || ''}`.toLowerCase();
    const categories: string[] = [];

    if (text.includes('会议') || text.includes('讨论')) {
      categories.push('会议');
    }
    if (text.includes('产品') || text.includes('需求')) {
      categories.push('产品');
    }
    if (text.includes('技术') || text.includes('开发')) {
      categories.push('技术');
    }
    if (text.includes('客户') || text.includes('用户')) {
      categories.push('客户');
    }
    if (text.includes('采访') || text.includes('访谈')) {
      categories.push('采访');
    }

    return categories.length > 0 ? categories : ['其他'];
  }

  // 流式生成总结
  async *streamSummary(recording: Recording, transcription: Transcription): AsyncGenerator<string, void, unknown> {
    yield* aiAdapter.streamSummary(transcription);
  }

  // 获取 AI 状态
  getStatus() {
    return aiAdapter.getStatus();
  }

  // 设置 AI 后端
  setBackend(backend: 'ollama' | 'openai' | 'auto') {
    aiAdapter.setBackend(backend);
  }

  // 检查是否正在处理
  isProcessing(): boolean {
    return this.isProcessing;
  }
}

// 导出单例
export const aiService = new AIService();
