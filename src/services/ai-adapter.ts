// AI 服务适配器 - 支持 Ollama 和 OpenAI 双后端
import { Summary, Todo, Transcription } from '../types/index';
import { ollamaService } from './ollama';
import { aiService } from './ai';

export type AIBackend = 'ollama' | 'openai' | 'auto';

export class AIAdapter {
  private backend: AIBackend = 'auto';
  private ollamaAvailable: boolean = false;

  constructor() {
    this.checkBackends();
  }

  // 检查可用的 AI 后端
  async checkBackends(): Promise<void> {
    this.ollamaAvailable = await ollamaService.checkAvailability();
    console.log('Ollama 可用:', this.ollamaAvailable);
  }

  // 设置后端
  setBackend(backend: AIBackend) {
    this.backend = backend;
  }

  // 获取当前后端
  getBackend(): AIBackend {
    return this.backend;
  }

  // 确定使用哪个后端
  private async resolveBackend(): Promise<'ollama' | 'openai'> {
    if (this.backend === 'ollama') {
      if (!this.ollamaAvailable) {
        throw new Error('Ollama 服务不可用，请先启动 Ollama');
      }
      return 'ollama';
    }
    
    if (this.backend === 'openai') {
      return 'openai';
    }

    // 自动选择
    if (this.ollamaAvailable) {
      return 'ollama';
    }
    
    return 'openai';
  }

  // 生成总结
  async generateSummary(
    transcription: Transcription
  ): Promise<Summary> {
    const backend = await this.resolveBackend();
    
    if (backend === 'ollama') {
      return ollamaService.generateSummary(transcription);
    } else {
      // 使用模拟的 AI 服务
      return aiService.generateSummary(
        { id: transcription.recordingId } as any,
        transcription
      );
    }
  }

  // 生成待办事项
  async generateTodos(
    transcription: Transcription
  ): Promise<Todo[]> {
    const backend = await this.resolveBackend();
    
    if (backend === 'ollama') {
      return ollamaService.generateTodos(transcription);
    } else {
      return aiService.generateTodos(
        { id: transcription.recordingId } as any,
        transcription
      );
    }
  }

  // 智能搜索
  async searchRecordings(
    query: string,
    texts: string[]
  ): Promise<number[]> {
    const backend = await this.resolveBackend();
    
    if (backend === 'ollama') {
      return ollamaService.searchRecordings(query, texts);
    } else {
      // 简单的关键词匹配
      return texts
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => text.toLowerCase().includes(query.toLowerCase()))
        .map(({ index }) => index);
    }
  }

  // 流式生成总结（用于实时显示）
  async *streamSummary(
    transcription: Transcription
  ): AsyncGenerator<string, void, unknown> {
    const backend = await this.resolveBackend();
    
    if (backend === 'ollama') {
      const prompt = `请对以下内容进行总结：\n\n${transcription.text}\n\n摘要：`;
      yield* ollamaService.streamGenerate(prompt);
    } else {
      // 模拟流式输出
      const summary = await this.generateSummary(transcription);
      yield summary.content;
    }
  }

  // 获取状态
  getStatus(): {
    backend: AIBackend;
    ollamaAvailable: boolean;
    currentBackend: 'ollama' | 'openai';
  } {
    return {
      backend: this.backend,
      ollamaAvailable: this.ollamaAvailable,
      currentBackend: this.ollamaAvailable ? 'ollama' : 'openai',
    };
  }
}

// 导出单例
export const aiAdapter = new AIAdapter();
