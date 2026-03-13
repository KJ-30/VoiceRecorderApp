import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYBACK_POSITION_KEY = '@playback_positions';
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

interface PlaybackPosition {
  recordingId: string;
  position: number;
  lastPlayed: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  duration: number;
  position: number;
  speed: number;
  isLoaded: boolean;
  isLoading: boolean;
}

type PlaybackCallback = (state: AudioPlayerState) => void;

export class AudioPlayerService {
  private sound: Audio.Sound | null = null;
  private state: AudioPlayerState = {
    isPlaying: false,
    duration: 0,
    position: 0,
    speed: 1,
    isLoaded: false,
    isLoading: false,
  };
  
  private callbacks: Set<PlaybackCallback> = new Set();
  private currentRecordingId: string | null = null;
  private isSeeking: boolean = false;

  async loadAudio(uri: string, recordingId: string): Promise<void> {
    try {
      this.state.isLoading = true;
      this.notifyCallbacks();

      if (this.sound) {
        await this.unloadAudio();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: false, 
          progressUpdateIntervalMillis: 100,
          rate: this.state.speed,
          shouldCorrectPitch: true,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.currentRecordingId = recordingId;
      this.state.isLoaded = true;
      this.state.isLoading = false;

      const savedPosition = await this.getPlaybackPosition(recordingId);
      if (savedPosition > 0) {
        await sound.setPositionAsync(savedPosition);
        this.state.position = savedPosition;
      }

      this.notifyCallbacks();
    } catch (error) {
      console.error('加载音频失败:', error);
      this.state.isLoading = false;
      this.state.isLoaded = false;
      this.notifyCallbacks();
      throw error;
    }
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      this.state.isLoaded = false;
      this.notifyCallbacks();
      return;
    }

    this.state.isPlaying = status.isPlaying;
    this.state.duration = status.durationMillis || 0;
    this.state.isLoaded = true;
    
    if (!this.isSeeking) {
      this.state.position = status.positionMillis;
    }
    
    if (status.didJustFinish) {
      this.state.isPlaying = false;
      this.state.position = 0;
      if (this.currentRecordingId) {
        this.clearPlaybackPosition(this.currentRecordingId);
      }
    }
    
    this.notifyCallbacks();
  }

  async play(): Promise<void> {
    if (this.sound && this.state.isLoaded) {
      await this.sound.playAsync();
      this.state.isPlaying = true;
      this.notifyCallbacks();
    }
  }

  async pause(): Promise<void> {
    if (this.sound && this.state.isLoaded) {
      await this.sound.pauseAsync();
      this.state.isPlaying = false;
      this.notifyCallbacks();
    }
  }

  async togglePlayPause(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (this.sound && this.state.isLoaded) {
      this.isSeeking = true;
      const clampedPosition = Math.max(0, Math.min(positionMillis, this.state.duration));
      await this.sound.setPositionAsync(clampedPosition);
      this.state.position = clampedPosition;
      this.isSeeking = false;
      this.notifyCallbacks();
    }
  }

  async seekByPercent(percent: number): Promise<void> {
    const position = (percent / 100) * this.state.duration;
    await this.seekTo(position);
  }

  async seekForward(milliseconds: number = 10000): Promise<void> {
    const newPosition = Math.min(this.state.position + milliseconds, this.state.duration);
    await this.seekTo(newPosition);
  }

  async seekBackward(milliseconds: number = 10000): Promise<void> {
    const newPosition = Math.max(this.state.position - milliseconds, 0);
    await this.seekTo(newPosition);
  }

  async setSpeed(speed: number): Promise<void> {
    if (this.sound && this.state.isLoaded) {
      await this.sound.setRateAsync(speed, true);
      this.state.speed = speed;
      this.notifyCallbacks();
    }
  }

  cycleSpeed(): number {
    const currentIndex = SPEED_OPTIONS.indexOf(this.state.speed as typeof SPEED_OPTIONS[number]);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    this.setSpeed(newSpeed);
    return newSpeed;
  }

  getSpeedOptions(): readonly number[] {
    return SPEED_OPTIONS;
  }

  async savePlaybackPosition(recordingId?: string): Promise<void> {
    const id = recordingId || this.currentRecordingId;
    if (!id || this.state.position <= 0) return;

    try {
      const positions = await this.getAllPlaybackPositions();
      positions[id] = {
        recordingId: id,
        position: this.state.position,
        lastPlayed: Date.now(),
      };
      await AsyncStorage.setItem(PLAYBACK_POSITION_KEY, JSON.stringify(positions));
    } catch (error) {
      console.error('保存播放位置失败:', error);
    }
  }

  async getPlaybackPosition(recordingId: string): Promise<number> {
    try {
      const positions = await this.getAllPlaybackPositions();
      return positions[recordingId]?.position || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getAllPlaybackPositions(): Promise<Record<string, PlaybackPosition>> {
    try {
      const data = await AsyncStorage.getItem(PLAYBACK_POSITION_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }

  async clearPlaybackPosition(recordingId: string): Promise<void> {
    try {
      const positions = await this.getAllPlaybackPositions();
      delete positions[recordingId];
      await AsyncStorage.setItem(PLAYBACK_POSITION_KEY, JSON.stringify(positions));
    } catch (error) {
      console.error('清除断点失败:', error);
    }
  }

  async clearAllPlaybackPositions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PLAYBACK_POSITION_KEY);
    } catch (error) {
      console.error('清除所有断点失败:', error);
    }
  }

  async getAllPlaybackPositionsList(): Promise<PlaybackPosition[]> {
    const positions = await this.getAllPlaybackPositions();
    return Object.values(positions).sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  async unloadAudio(): Promise<void> {
    if (this.currentRecordingId && this.state.position > 0) {
      await this.savePlaybackPosition(this.currentRecordingId);
    }

    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('卸载音频失败:', error);
      }
      this.sound = null;
    }
    
    this.currentRecordingId = null;
    this.state = {
      isPlaying: false,
      duration: 0,
      position: 0,
      speed: 1,
      isLoaded: false,
      isLoading: false,
    };
    
    this.notifyCallbacks();
  }

  subscribe(callback: PlaybackCallback): () => void {
    this.callbacks.add(callback);
    callback(this.state);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyCallbacks(): void {
    const stateCopy = { ...this.state };
    this.callbacks.forEach(callback => callback(stateCopy));
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  getProgress(): number {
    if (this.state.duration <= 0) return 0;
    return this.state.position / this.state.duration;
  }

  formatPosition(): string {
    return this.formatTime(this.state.position);
  }

  formatDuration(): string {
    return this.formatTime(this.state.duration);
  }

  private formatTime(milliseconds: number): string {
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

export const audioPlayerService = new AudioPlayerService();
