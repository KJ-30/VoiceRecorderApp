// Ollama 本地大模型服务
// 需要先安装 Ollama: https://ollama.com
// 然后运行: ollama pull llama3.2

import { Summary, Todo, Transcription } from '../types/index';
import uuid from 'react-native-uuid';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private isAvailable: boolean = false;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = OLLAMA_MODEL) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.checkAvailability();
  }

  // 检查 Ollama 服务是否可用
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch (error) {
      console.warn('Ollama 服务不可用:', error);
      this.isAvailable = false;
      return false;
    }
  }

  // 生成 AI 总结
  async generateSummary(transcription: Transcription): Promise<Summary> {
    if (!this.isAvailable) {
      throw new Error('Ollama 服务不可用');
    }

    const prompt = this.buildSummaryPrompt(transcription.text);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API 错误: ${response.status}`);
      }

      const result = await response.json();
      const parsedResult = this.parseSummaryResponse(result.response);

      const summary: Summary = {
        id: uuid.v4() as string,
        recordingId: transcription.recordingId,
        content: parsedResult.content,
        keyPoints: parsedResult.keyPoints,
        actionItems: parsedResult.actionItems,
        decisions: parsedResult.decisions,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return summary;
    } catch (error) {
      console.error('生成总结失败:', error);
      throw error;
    }
  }

  // 生成待办事项
  async generateTodos(transcription: Transcription): Promise<Todo[]> {
    if (!this.isAvailable) {
      throw new Error('Ollama 服务不可用');
    }

    const prompt = this.buildTodosPrompt(transcription.text);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.5,
            num_predict: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API 错误: ${response.status}`);
      }

      const result = await response.json();
      const todos = this.parseTodosResponse(result.response, transcription.recordingId);

      return todos;
    } catch (error) {
      console.error('生成待办事项失败:', error);
      throw error;
    }
  }

  // 智能搜索
  async searchRecordings(query: string, texts: string[]): Promise<number[]> {
    if (!this.isAvailable) {
      // 如果 Ollama 不可用，返回空数组
      return [];
    }

    const prompt = this.buildSearchPrompt(query, texts);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 512,
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return this.parseSearchResponse(result.response);
    } catch (error) {
      console.error('搜索失败:', error);
      return [];
    }
  }

  // 构建总结提示词
  private buildSummaryPrompt(text: string): string {
    return `请对以下会议/对话内容进行总结分析，并以 JSON 格式返回结果：

内容：
"""
${text}
"""

请返回以下格式的 JSON：
{
  "content": "整体摘要（200字以内）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "actionItems": ["行动项1", "行动项2"],
  "decisions": ["决策1", "决策2"]
}

注意：
1. 只返回 JSON 格式，不要其他说明文字
2. 如果某一项没有内容，返回空数组
3. 确保 JSON 格式正确`;
  }

  // 构建待办事项提示词
  private buildTodosPrompt(text: string): string {
    return `请从以下会议/对话内容中提取待办事项，并以 JSON 格式返回：

内容：
"""
${text}
"""

请返回以下格式的 JSON 数组：
[
  {
    "text": "待办事项描述",
    "priority": "high/medium/low",
    "dueDate": "截止日期（可选，格式：YYYY-MM-DD）"
  }
]

注意：
1. 只返回 JSON 格式，不要其他说明文字
2. 如果没有待办事项，返回空数组
3. 优先级根据紧急程度判断
4. 确保 JSON 格式正确`;
  }

  // 构建搜索提示词
  private buildSearchPrompt(query: string, texts: string[]): string {
    const textsFormatted = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    
    return `根据查询"${query}"，找出最相关的文本索引。

文本列表：
${textsFormatted}

请返回相关文本的索引数组，格式：[0, 2, 5]
只返回数组，不要其他说明。`;
  }

  // 解析总结响应
  private parseSummaryResponse(response: string): {
    content: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
  } {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content: parsed.content || '',
          keyPoints: parsed.keyPoints || [],
          actionItems: parsed.actionItems || [],
          decisions: parsed.decisions || [],
        };
      }
    } catch (error) {
      console.error('解析总结响应失败:', error);
    }

    // 返回默认值
    return {
      content: response.slice(0, 200),
      keyPoints: [],
      actionItems: [],
      decisions: [],
    };
  }

  // 解析待办事项响应
  private parseTodosResponse(response: string, recordingId: string): Todo[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any, index: number) => ({
          id: uuid.v4() as string,
          recordingId,
          text: item.text || '',
          completed: false,
          priority: item.priority || 'medium',
          dueDate: item.dueDate || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('解析待办事项响应失败:', error);
    }

    return [];
  }

  // 解析搜索响应
  private parseSearchResponse(response: string): number[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('解析搜索响应失败:', error);
    }

    return [];
  }

  // 流式生成（用于实时显示）
  async *streamGenerate(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable) {
      throw new Error('Ollama 服务不可用');
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API 错误: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch (error) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  // 获取可用模型列表
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  // 检查服务状态
  getStatus(): { available: boolean; model: string; url: string } {
    return {
      available: this.isAvailable,
      model: this.model,
      url: this.baseUrl,
    };
  }
}

// 导出单例
export const ollamaService = new OllamaService();
