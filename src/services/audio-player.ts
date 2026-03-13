import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recording } from '@types/index';

const PLAYBACK_POSITION_KEY = 'playback_position_';
const PLAYBACK_SPEED_KEY = 'playback_speed_';

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  rate: number;
  shouldCorrectPitch: boolean;
  isBuffering: boolean;
  isLoaded: boolean;
}

export class AudioPlayerService {
  private sound: Audio.Sound | null = null;
  private currentRecordingId: string | null = null;
  private playbackStatusUpdateInterval: NodeJS.Timeout | null = null;
  private onStatusUpdate: ((status: PlaybackStatus) => void) | null = null;
  private onPlaybackError: ((error: string) => void) | null = null;

  async configureAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
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

  setStatusUpdateCallback(callback: (status: PlaybackStatus) => void): void {
    this.onStatusUpdate = callback;
  }

  setErrorCallback(callback: (error: string) => void): void {
    this.onPlaybackError = callback;
  }

  async loadRecording(
    recording: Recording,
    autoPlay: boolean = false,
  ): Promise<void> {
    try {
      await this.unloadCurrentSound();
      await this.configureAudio();

      this.currentRecordingId = recording.id;

      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        {
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 100,
        },
        this.onPlaybackStatusUpdate.bind(this),
      );

      this.sound = sound;

      const savedPosition = await this.getSavedPosition(recording.id);
      if (savedPosition > 0 && savedPosition < recording.duration - 1000) {
        await sound.setPositionAsync(savedPosition);
      }

      const savedSpeed = await this.getSavedSpeed(recording.id);
      if (savedSpeed !== 1) {
        await sound.setRateAsync(savedSpeed, true);
      }

      this.startStatusUpdateInterval();

      if (autoPlay) {
        await this.play();
      }
    } catch (error) {
      console.error('加载录音失败:', error);
      this.onPlaybackError?.('加载录音失败');
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
    } catch (error) {
      console.error('播放失败:', error);
      this.onPlaybackError?.('播放失败');
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
    } catch (error) {
      console.error('暂停失败:', error);
      this.onPlaybackError?.('暂停失败');
      throw error;
    }
  }

  async togglePlayPause(): Promise<void> {
    try {
      const status = await this.getPlaybackStatus();
      if (status.isPlaying) {
        await this.pause();
      } else {
        await this.play();
      }
    } catch (error) {
      console.error('切换播放状态失败:', error);
      throw error;
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error('跳转失败:', error);
      this.onPlaybackError?.('跳转失败');
      throw error;
    }
  }

  async setRate(rate: number): Promise<void> {
    try {
      if (this.sound && this.currentRecordingId) {
        await this.sound.setRateAsync(rate, true);
        await this.saveSpeed(this.currentRecordingId, rate);
      }
    } catch (error) {
      console.error('设置播放速度失败:', error);
      this.onPlaybackError?.('设置播放速度失败');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
      }
    } catch (error) {
      console.error('停止失败:', error);
      this.onPlaybackError?.('停止失败');
      throw error;
    }
  }

  async unloadCurrentSound(): Promise<void> {
    try {
      this.stopStatusUpdateInterval();

      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && this.currentRecordingId) {
          await this.savePosition(
            this.currentRecordingId,
            status.positionMillis || 0,
          );
        }
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.currentRecordingId = null;
    } catch (error) {
      console.error('卸载音频失败:', error);
      this.sound = null;
      this.currentRecordingId = null;
    }
  }

  async getPlaybackStatus(): Promise<PlaybackStatus> {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
            rate: status.rate || 1,
            shouldCorrectPitch: status.shouldCorrectPitch || false,
            isBuffering: status.isBuffering || false,
            isLoaded: true,
          };
        }
      }
    } catch (error) {
      console.error('获取播放状态失败:', error);
    }
    return {
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      rate: 1,
      shouldCorrectPitch: true,
      isBuffering: false,
      isLoaded: false,
    };
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      this.onStatusUpdate?.({
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis || 0,
        durationMillis: status.durationMillis || 0,
        rate: status.rate || 1,
        shouldCorrectPitch: status.shouldCorrectPitch || false,
        isBuffering: status.isBuffering || false,
        isLoaded: true,
      });

      if (status.didJustFinish && this.currentRecordingId) {
        this.clearSavedPosition(this.currentRecordingId);
      }
    }
  }

  private startStatusUpdateInterval(): void {
    this.stopStatusUpdateInterval();
    this.playbackStatusUpdateInterval = setInterval(async () => {
      const status = await this.getPlaybackStatus();
      this.onStatusUpdate?.(status);
    }, 100);
  }

  private stopStatusUpdateInterval(): void {
    if (this.playbackStatusUpdateInterval) {
      clearInterval(this.playbackStatusUpdateInterval);
      this.playbackStatusUpdateInterval = null;
    }
  }

  private async savePosition(recordingId: string, position: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${PLAYBACK_POSITION_KEY}${recordingId}`,
        Math.round(position / 1000).toString(),
      );
    } catch (error) {
      console.error('保存播放位置失败:', error);
    }
  }

  async getSavedPosition(recordingId: string): Promise<number> {
    try {
      const position = await AsyncStorage.getItem(`${PLAYBACK_POSITION_KEY}${recordingId}`);
      return position ? parseInt(position, 10) * 1000 : 0;
    } catch (error) {
      console.error('获取保存的播放位置失败:', error);
      return 0;
    }
  }

  async clearSavedPosition(recordingId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${PLAYBACK_POSITION_KEY}${recordingId}`);
    } catch (error) {
      console.error('清除播放位置失败:', error);
    }
  }

  async clearAllSavedPositions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const positionKeys = keys.filter(key => key.startsWith(PLAYBACK_POSITION_KEY));
      if (positionKeys.length > 0) {
        await AsyncStorage.multiRemove(positionKeys);
      }
    } catch (error) {
      console.error('清除所有播放位置失败:', error);
    }
  }

  private async saveSpeed(recordingId: string, speed: number): Promise<void> {
    try {
      await AsyncStorage.setItem(`${PLAYBACK_SPEED_KEY}${recordingId}`, speed.toString());
    } catch (error) {
      console.error('保存播放速度失败:', error);
    }
  }

  async getSavedSpeed(recordingId: string): Promise<number> {
    try {
      const speed = await AsyncStorage.getItem(`${PLAYBACK_SPEED_KEY}${recordingId}`);
      return speed ? parseFloat(speed) : 1;
    } catch (error) {
      console.error('获取保存的播放速度失败:', error);
      return 1;
    }
  }
}

export const audioPlayerService = new AudioPlayerService();
