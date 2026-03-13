import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recording } from '../types/index';

// 播放速度选项
export type PlaybackSpeed = 0.5 | 1.0 | 1.5 | 2.0;

// 播放状态
export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  speed: PlaybackSpeed;
  isSeeking: boolean;
}

// 断点数据接口
interface PlaybackBreakpoint {
  recordingId: string;
  position: number;
  updatedAt: string;
}

// 音频播放服务类
export class AudioPlayerService {
  private sound: Audio.Sound | null = null;
  private recording: Recording | null = null;
  private state: PlayerState = {
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    speed: 1.0,
    isSeeking: false,
  };
  private stateListeners: ((state: PlayerState) => void)[] = [];
  private playbackUpdateInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;

  // 获取当前状态
  getState(): PlayerState {
    return { ...this.state };
  }

  // 订阅状态变化
  subscribe(listener: (state: PlayerState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  // 通知状态变化
  private notifyStateChange(): void {
    this.stateListeners.forEach(listener => listener(this.state));
  }

  // 更新状态
  private updateState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateChange();
  }

  // 加载录音文件
  async loadRecording(recording: Recording): Promise<void> {
    try {
      // 如果已有音频在播放，先卸载
      if (this.sound) {
        await this.unload();
      }

      this.recording = recording;
      this.updateState({ isLoading: true });

      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 创建音频实例
      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: false },
        this.onPlaybackStatusUpdate.bind(this),
        true // 下载并缓存，优化大文件播放
      );

      this.sound = sound;

      // 获取音频时长
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        this.updateState({
          duration: status.durationMillis || recording.duration,
          isLoading: false,
        });
      }

      // 尝试恢复断点位置
      await this.restoreBreakpoint(recording.id);
    } catch (error) {
      console.error('加载录音失败:', error);
      this.updateState({ isLoading: false });
      throw error;
    }
  }

  // 播放状态回调
  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) return;

    const updates: Partial<PlayerState> = {
      isPlaying: status.isPlaying,
      position: status.positionMillis,
    };

    if (status.durationMillis) {
      updates.duration = status.durationMillis;
    }

    this.updateState(updates);

    // 定期保存播放位置（每5秒）
    if (status.isPlaying && this.recording) {
      const now = Date.now();
      if (now - this.lastSaveTime > 5000) {
        this.saveBreakpoint(this.recording.id, status.positionMillis);
        this.lastSaveTime = now;
      }
    }

    // 播放完成
    if (status.didJustFinish && this.recording) {
      this.clearBreakpoint(this.recording.id);
    }
  }

  // 播放/暂停
  async playPause(): Promise<void> {
    if (!this.sound) return;

    try {
      const status = await this.sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await this.sound.pauseAsync();
        // 暂停时保存断点
        if (this.recording) {
          await this.saveBreakpoint(this.recording.id, status.positionMillis);
        }
      } else {
        await this.sound.playAsync();
      }
    } catch (error) {
      console.error('播放/暂停失败:', error);
      throw error;
    }
  }

  // 播放
  async play(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
    } catch (error) {
      console.error('播放失败:', error);
      throw error;
    }
  }

  // 暂停
  async pause(): Promise<void> {
    if (!this.sound) return;
    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await this.sound.pauseAsync();
        if (this.recording) {
          await this.saveBreakpoint(this.recording.id, status.positionMillis);
        }
      }
    } catch (error) {
      console.error('暂停失败:', error);
      throw error;
    }
  }

  // 跳转到指定位置（优化大文件性能）
  async seekTo(position: number): Promise<void> {
    if (!this.sound) return;

    try {
      // 限制位置范围
      const clampedPosition = Math.max(0, Math.min(position, this.state.duration));

      // 使用 setPositionAsync 进行跳转
      // 对于大文件，expo-av 会自动处理缓冲
      await this.sound.setPositionAsync(clampedPosition);
      this.updateState({ position: clampedPosition });

      // 保存断点
      if (this.recording) {
        await this.saveBreakpoint(this.recording.id, clampedPosition);
      }
    } catch (error) {
      console.error('跳转失败:', error);
      throw error;
    }
  }

  // 设置播放速度
  async setSpeed(speed: PlaybackSpeed): Promise<void> {
    if (!this.sound) return;

    try {
      // 检查是否支持倍速播放
      const status = await this.sound.getStatusAsync();
      if (!status.isLoaded) return;

      // 设置播放速度，保持音调不变
      await this.sound.setRateAsync(speed, true);
      this.updateState({ speed });
    } catch (error) {
      console.error('设置播放速度失败:', error);
      throw error;
    }
  }

  // 切换播放速度
  async toggleSpeed(): Promise<PlaybackSpeed> {
    const speeds: PlaybackSpeed[] = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(this.state.speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];

    await this.setSpeed(nextSpeed);
    return nextSpeed;
  }

  // 保存断点
  private async saveBreakpoint(recordingId: string, position: number): Promise<void> {
    try {
      const breakpoint: PlaybackBreakpoint = {
        recordingId,
        position: Math.floor(position / 1000), // 精确到秒
        updatedAt: new Date().toISOString(),
      };

      const key = `playback_breakpoint_${recordingId}`;
      await AsyncStorage.setItem(key, JSON.stringify(breakpoint));
    } catch (error) {
      console.error('保存断点失败:', error);
    }
  }

  // 恢复断点
  private async restoreBreakpoint(recordingId: string): Promise<void> {
    try {
      const key = `playback_breakpoint_${recordingId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const breakpoint: PlaybackBreakpoint = JSON.parse(data);
        const position = breakpoint.position * 1000; // 转换为毫秒

        // 跳转到断点位置
        if (this.sound && position < this.state.duration) {
          await this.sound.setPositionAsync(position);
          this.updateState({ position });
        }
      }
    } catch (error) {
      console.error('恢复断点失败:', error);
    }
  }

  // 获取断点信息
  async getBreakpoint(recordingId: string): Promise<PlaybackBreakpoint | null> {
    try {
      const key = `playback_breakpoint_${recordingId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取断点失败:', error);
      return null;
    }
  }

  // 清除断点
  async clearBreakpoint(recordingId: string): Promise<void> {
    try {
      const key = `playback_breakpoint_${recordingId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('清除断点失败:', error);
    }
  }

  // 清除所有断点
  async clearAllBreakpoints(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const breakpointKeys = keys.filter(key => key.startsWith('playback_breakpoint_'));
      await AsyncStorage.multiRemove(breakpointKeys);
    } catch (error) {
      console.error('清除所有断点失败:', error);
    }
  }

  // 获取所有断点
  async getAllBreakpoints(): Promise<PlaybackBreakpoint[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const breakpointKeys = keys.filter(key => key.startsWith('playback_breakpoint_'));
      const data = await AsyncStorage.multiGet(breakpointKeys);

      return data
        .filter(([, value]) => value !== null)
        .map(([, value]) => JSON.parse(value!));
    } catch (error) {
      console.error('获取所有断点失败:', error);
      return [];
    }
  }

  // 卸载音频
  async unload(): Promise<void> {
    try {
      // 保存当前位置
      if (this.sound && this.recording) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.saveBreakpoint(this.recording.id, status.positionMillis);
        }
      }

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.recording = null;
      this.updateState({
        isPlaying: false,
        isLoading: false,
        position: 0,
        duration: 0,
        speed: 1.0,
      });
    } catch (error) {
      console.error('卸载音频失败:', error);
    }
  }

  // 释放资源
  async dispose(): Promise<void> {
    await this.unload();
    this.stateListeners = [];
  }
}

// 导出单例
export const audioPlayerService = new AudioPlayerService();
