import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore, useRecordingStore } from '@store/index';
import { recordingService } from '@services/recording';
import { transcriptionService } from '@services/transcription';
import { theme, utils } from '@utils/theme';

export const RecordingScreen: React.FC = () => {
  const { addRecording } = useAppStore();
  const { 
    status, 
    duration, 
    startRecording, 
    pauseRecording, 
    resumeRecording, 
    stopRecording,
    setRecordingDuration 
  } = useRecordingStore();
  
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 动画值
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // 开始录音
  const handleStartRecording = async () => {
    try {
      const recording = await recordingService.startRecording();
      startRecording();
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingDuration(duration + 1000);
      }, 1000);
      
      // 开始实时转写
      setIsTranscribing(true);
      transcriptionService.startRealtimeTranscription((text) => {
        setTranscription(text);
      });
      
      // 开始脉冲动画
      startPulseAnimation();
      startWaveAnimation();
    } catch (error) {
      console.error('开始录音失败:', error);
    }
  };

  // 暂停录音
  const handlePauseRecording = async () => {
    try {
      await recordingService.pauseRecording();
      pauseRecording();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      stopPulseAnimation();
    } catch (error) {
      console.error('暂停录音失败:', error);
    }
  };

  // 继续录音
  const handleResumeRecording = async () => {
    try {
      await recordingService.resumeRecording();
      resumeRecording();
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(duration + 1000);
      }, 1000);
      
      startPulseAnimation();
    } catch (error) {
      console.error('继续录音失败:', error);
    }
  };

  // 停止录音
  const handleStopRecording = async () => {
    try {
      const recording = await recordingService.stopRecording();
      stopRecording();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      stopPulseAnimation();
      stopWaveAnimation();
      
      // 保存录音
      addRecording(recording);
      
      // 开始转写
      if (recording.uri) {
        transcriptionService.startTranscription(recording);
      }
    } catch (error) {
      console.error('停止录音失败:', error);
    }
  };

  // 脉冲动画
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // 波形动画
  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopWaveAnimation = () => {
    waveAnim.stopAnimation();
    waveAnim.setValue(0);
  };

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopPulseAnimation();
      stopWaveAnimation();
    };
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeButton}>
        <Icon name="close" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {status === 'recording' ? '正在录音' : status === 'paused' ? '已暂停' : '准备录音'}
      </Text>
      <TouchableOpacity style={styles.settingsButton}>
        <Icon name="settings-outline" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderWaveform = () => {
    if (status !== 'recording') return null;

    const bars = 30;
    const barWidth = 4;
    const barGap = 4;

    return (
      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {Array.from({ length: bars }).map((_, index) => {
            const inputRange = [0, 0.5, 1];
            const outputRange = [0.3, 1, 0.3];
            const delay = index * 50;
            
            const height = waveAnim.interpolate({
              inputRange: inputRange.map(v => v + delay / 2000),
              outputRange,
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    width: barWidth,
                    transform: [{ scaleY: height }],
                    backgroundColor: index % 2 === 0 ? theme.colors.primary : theme.colors.primaryLight,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderTimer = () => (
    <View style={styles.timerContainer}>
      <Text style={styles.timer}>
        {utils.formatDuration(duration)}
      </Text>
      {status === 'recording' && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>正在录音</Text>
        </View>
      )}
    </View>
  );

  const renderTranscription = () => (
    <View style={styles.transcriptionContainer}>
      <View style={styles.transcriptionHeader}>
        <Icon name="text" size={16} color={theme.colors.primary} />
        <Text style={styles.transcriptionTitle}>实时转写</Text>
        {isTranscribing && (
          <View style={styles.transcribingIndicator}>
            <View style={styles.transcribingDot} />
            <Text style={styles.transcribingText}>转写中</Text>
          </View>
        )}
      </View>
      <View style={styles.transcriptionContent}>
        <Text style={styles.transcriptionText}>
          {transcription || '等待语音输入...'}
        </Text>
      </View>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      {/* 标记按钮 */}
      <TouchableOpacity style={styles.controlButton}>
        <View style={styles.controlButtonIcon}>
          <Icon name="flag" size={24} color={theme.colors.textPrimary} />
        </View>
        <Text style={styles.controlButtonText}>标记</Text>
      </TouchableOpacity>

      {/* 主录音按钮 */}
      <View style={styles.mainControl}>
        {status === 'recording' ? (
          <TouchableOpacity
            style={[styles.recordButton, styles.pauseButton]}
            onPress={handlePauseRecording}
          >
            <Icon name="pause" size={32} color="#fff" />
          </TouchableOpacity>
        ) : status === 'paused' ? (
          <TouchableOpacity
            style={[styles.recordButton, styles.resumeButton]}
            onPress={handleResumeRecording}
          >
            <Icon name="play" size={32} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.recordButton, styles.startButton]}
            onPress={handleStartRecording}
          >
            <Icon name="mic" size={32} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* 脉冲效果 */}
        {status === 'recording' && (
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.5, 0],
              })},
            ]}
          />
        )}
      </View>

      {/* 停止按钮 */}
      <TouchableOpacity
        style={[styles.controlButton, status === 'idle' && styles.controlButtonDisabled]}
        onPress={handleStopRecording}
        disabled={status === 'idle'}
      >
        <View style={[styles.controlButtonIcon, status === 'idle' && styles.controlButtonIconDisabled]}>
          <Icon name="stop" size={24} color={status === 'idle' ? theme.colors.textTertiary : theme.colors.danger} />
        </View>
        <Text style={[styles.controlButtonText, status === 'idle' && styles.controlButtonTextDisabled]}>
          完成
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      {renderWaveform()}
      {renderTimer()}
      {renderTranscription()}
      {renderControls()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 80,
  },
  waveformBar: {
    height: 60,
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  timer: {
    fontSize: 64,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.danger,
  },
  recordingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.medium,
  },
  transcriptionContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  transcriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.separator,
    gap: 8,
  },
  transcriptionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transcribingDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  transcribingText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
  },
  transcriptionContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  transcriptionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.base * 1.6,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonIconDisabled: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  controlButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.medium,
  },
  controlButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  mainControl: {
    position: 'relative',
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: theme.colors.danger,
  },
  pauseButton: {
    backgroundColor: theme.colors.warning,
  },
  resumeButton: {
    backgroundColor: theme.colors.success,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.danger,
    top: 0,
    left: 0,
  },
});

export default RecordingScreen;
