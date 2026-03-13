import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  PanResponder,
  GestureResponderEvent,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { theme, utils } from '@utils/theme';
import { useAppStore } from '@store/index';
import { audioPlayerService, PlaybackSpeed, PlayerState } from '@services/audio-player';
import { audioEditorService, AudioEditOptions } from '@services/audio-editor';
import { Recording, RootStackParamList } from '../types/index';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

// 格式化时间显示
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PlayerScreenRouteProp>();
  const { recordingId } = route.params;
  const { recordings, addRecording } = useAppStore();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    speed: 1.0,
    isSeeking: false,
  });
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [selectedRecordings, setSelectedRecordings] = useState<string[]>([]);
  const [hasBreakpoint, setHasBreakpoint] = useState(false);
  const [showBreakpointAlert, setShowBreakpointAlert] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressBarLayout = useRef({ x: 0, width: 0 });

  // 获取录音数据
  useEffect(() => {
    const rec = recordings.find(r => r.id === recordingId);
    if (rec) {
      setRecording(rec);
      setTrimEnd(rec.duration);
      checkBreakpoint(rec.id);
    }
  }, [recordingId, recordings]);

  // 检查是否有断点
  const checkBreakpoint = async (id: string) => {
    const breakpoint = await audioPlayerService.getBreakpoint(id);
    if (breakpoint && breakpoint.position > 0) {
      setHasBreakpoint(true);
      setShowBreakpointAlert(true);
    }
  };

  // 加载音频
  useEffect(() => {
    if (recording) {
      loadAudio();
    }

    return () => {
      audioPlayerService.unload();
    };
  }, [recording]);

  // 订阅播放状态
  useEffect(() => {
    const unsubscribe = audioPlayerService.subscribe((state) => {
      setPlayerState(state);
      // 更新进度条动画
      if (state.duration > 0) {
        const progress = state.position / state.duration;
        progressAnim.setValue(progress);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadAudio = async () => {
    if (!recording) return;
    try {
      await audioPlayerService.loadRecording(recording);
    } catch (error) {
      console.error('加载音频失败:', error);
      Alert.alert('错误', '无法加载音频文件');
    }
  };

  // 播放/暂停
  const handlePlayPause = async () => {
    try {
      await audioPlayerService.playPause();
    } catch (error) {
      console.error('播放控制失败:', error);
    }
  };

  // 设置播放速度
  const handleSpeedChange = async (speed: PlaybackSpeed) => {
    try {
      await audioPlayerService.setSpeed(speed);
      setShowSpeedOptions(false);
    } catch (error) {
      console.error('设置播放速度失败:', error);
    }
  };

  // 进度条手势处理
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // 开始拖动时暂停播放
        if (playerState.isPlaying) {
          audioPlayerService.pause();
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const { moveX } = gestureState;
        const { x, width } = progressBarLayout.current;
        const relativeX = Math.max(0, Math.min(moveX - x, width));
        const progress = relativeX / width;
        progressAnim.setValue(progress);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { moveX } = gestureState;
        const { x, width } = progressBarLayout.current;
        const relativeX = Math.max(0, Math.min(moveX - x, width));
        const progress = relativeX / width;
        const newPosition = progress * playerState.duration;

        // 跳转到新位置
        audioPlayerService.seekTo(newPosition);

        // 如果之前在播放，恢复播放
        if (playerState.isPlaying) {
          audioPlayerService.play();
        }
      },
    })
  ).current;

  // 处理进度条点击
  const handleProgressBarPress = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    const { width } = progressBarLayout.current;
    const progress = Math.max(0, Math.min(locationX / width, 1));
    const newPosition = progress * playerState.duration;

    audioPlayerService.seekTo(newPosition);
  };

  // 清除断点
  const handleClearBreakpoint = async () => {
    if (recording) {
      await audioPlayerService.clearBreakpoint(recording.id);
      setHasBreakpoint(false);
      setShowBreakpointAlert(false);
    }
  };

  // 从断点继续播放
  const handleContinueFromBreakpoint = () => {
    setShowBreakpointAlert(false);
  };

  // 裁剪音频
  const handleTrim = async () => {
    if (!recording) return;

    try {
      const options: AudioEditOptions = {
        startTime: trimStart,
        endTime: trimEnd,
      };

      const newRecording = await audioEditorService.trim(recording, options);
      addRecording(newRecording);

      Alert.alert('成功', '音频裁剪完成');
      setShowEditModal(false);
    } catch (error) {
      console.error('裁剪失败:', error);
      Alert.alert('错误', '裁剪音频失败');
    }
  };

  // 合并音频
  const handleMerge = async () => {
    if (selectedRecordings.length < 2) {
      Alert.alert('提示', '请至少选择2个文件');
      return;
    }

    try {
      const selectedRecs = recordings.filter(r => selectedRecordings.includes(r.id));
      const newRecording = await audioEditorService.merge({ recordings: selectedRecs });
      addRecording(newRecording);

      Alert.alert('成功', '音频合并完成');
      setShowMergeModal(false);
      setSelectedRecordings([]);
    } catch (error) {
      console.error('合并失败:', error);
      Alert.alert('错误', '合并音频失败');
    }
  };

  // 切换选择
  const toggleSelection = (id: string) => {
    setSelectedRecordings(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 5) {
        Alert.alert('提示', '最多只能选择5个文件');
        return prev;
      }
      return [...prev, id];
    });
  };

  // 渲染头部
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="chevron-back" size={28} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerTitle}>
        <Text style={styles.headerTitleText} numberOfLines={1}>
          {recording?.title || '播放'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {recording ? utils.formatDate(recording.createdAt) : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.moreButton} onPress={() => setShowEditModal(true)}>
        <Icon name="cut" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  // 渲染断点提示
  const renderBreakpointAlert = () => {
    if (!showBreakpointAlert) return null;

    return (
      <View style={styles.breakpointAlert}>
        <View style={styles.breakpointAlertContent}>
          <Icon name="time-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.breakpointAlertText}>检测到上次播放位置</Text>
        </View>
        <View style={styles.breakpointAlertActions}>
          <TouchableOpacity onPress={handleClearBreakpoint}>
            <Text style={styles.breakpointAlertActionText}>清除</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContinueFromBreakpoint}>
            <Text style={[styles.breakpointAlertActionText, styles.breakpointAlertActionPrimary]}>
              继续播放
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 渲染播放控制
  const renderPlayerControls = () => (
    <View style={styles.playerContainer}>
      {/* 进度条 */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressBarContainer}
          onLayout={(event) => {
            const { width, x } = event.nativeEvent.layout;
            progressBarLayout.current = { x, width };
          }}
          onTouchStart={handleProgressBarPress}
        >
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.progressHandle} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.progressHandleInner,
                {
                  transform: [
                    {
                      translateX: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, progressBarLayout.current.width - 16],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(playerState.position)}</Text>
          <Text style={styles.timeText}>{formatTime(playerState.duration)}</Text>
        </View>
      </View>

      {/* 控制按钮 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => setShowSpeedOptions(true)}
        >
          <Text style={styles.speedButtonText}>{playerState.speed.toFixed(1)}x</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => audioPlayerService.seekTo(playerState.position - 15000)}>
          <Icon name="play-back" size={24} color={theme.colors.textPrimary} />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Icon
            name={playerState.isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => audioPlayerService.seekTo(playerState.position + 15000)}>
          <Icon name="play-forward" size={24} color={theme.colors.textPrimary} />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mergeButton} onPress={() => setShowMergeModal(true)}>
          <Icon name="git-merge" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 渲染倍速选项
  const renderSpeedOptions = () => (
    <Modal
      visible={showSpeedOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSpeedOptions(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSpeedOptions(false)}
      >
        <View style={styles.speedOptionsContainer}>
          {[0.5, 1.0, 1.5, 2.0].map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedOption,
                playerState.speed === speed && styles.speedOptionActive,
              ]}
              onPress={() => handleSpeedChange(speed as PlaybackSpeed)}
            >
              <Text
                style={[
                  styles.speedOptionText,
                  playerState.speed === speed && styles.speedOptionTextActive,
                ]}
              >
                {speed.toFixed(1)}x
              </Text>
              {playerState.speed === speed && (
                <Icon name="checkmark" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // 渲染编辑模态框
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>裁剪音频</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.trimContainer}>
            <Text style={styles.trimLabel}>开始时间: {formatTime(trimStart)}</Text>
            <View style={styles.trimSlider}>
              <TouchableOpacity
                style={styles.trimButton}
                onPress={() => setTrimStart(Math.max(0, trimStart - 10000))}
              >
                <Icon name="remove" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trimButton}
                onPress={() => setTrimStart(Math.min(trimEnd - 1000, trimStart + 10000))}
              >
                <Icon name="add" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.trimLabel}>结束时间: {formatTime(trimEnd)}</Text>
            <View style={styles.trimSlider}>
              <TouchableOpacity
                style={styles.trimButton}
                onPress={() => setTrimEnd(Math.max(trimStart + 1000, trimEnd - 10000))}
              >
                <Icon name="remove" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trimButton}
                onPress={() => setTrimEnd(Math.min(playerState.duration, trimEnd + 10000))}
              >
                <Icon name="add" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.trimConfirmButton} onPress={handleTrim}>
            <Text style={styles.trimConfirmText}>确认裁剪</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // 渲染合并模态框
  const renderMergeModal = () => (
    <Modal
      visible={showMergeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMergeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.mergeModalContainer}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>合并音频 (最多5个)</Text>
            <TouchableOpacity onPress={() => setShowMergeModal(false)}>
              <Icon name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.mergeList}>
            {recordings
              .filter(r => !r.isDeleted && r.id !== recordingId)
              .map(rec => (
                <TouchableOpacity
                  key={rec.id}
                  style={[
                    styles.mergeItem,
                    selectedRecordings.includes(rec.id) && styles.mergeItemSelected,
                  ]}
                  onPress={() => toggleSelection(rec.id)}
                >
                  <View style={styles.mergeItemIcon}>
                    <Icon name="mic" size={20} color="#fff" />
                  </View>
                  <View style={styles.mergeItemInfo}>
                    <Text style={styles.mergeItemTitle} numberOfLines={1}>
                      {rec.title}
                    </Text>
                    <Text style={styles.mergeItemMeta}>
                      {utils.formatDuration(rec.duration)}
                    </Text>
                  </View>
                  {selectedRecordings.includes(rec.id) && (
                    <Icon name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>

          <View style={styles.mergeFooter}>
            <Text style={styles.mergeCountText}>
              已选择 {selectedRecordings.length}/5 个文件
            </Text>
            <TouchableOpacity
              style={[
                styles.mergeConfirmButton,
                selectedRecordings.length < 2 && styles.mergeConfirmButtonDisabled,
              ]}
              onPress={handleMerge}
              disabled={selectedRecordings.length < 2}
            >
              <Text style={styles.mergeConfirmText}>合并</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!recording) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      {renderBreakpointAlert()}

      <View style={styles.content}>
        {/* 录音信息卡片 */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Icon name="mic" size={40} color="#fff" />
          </View>
          <Text style={styles.infoTitle} numberOfLines={2}>
            {recording.title}
          </Text>
          <View style={styles.infoMeta}>
            <Text style={styles.infoMetaText}>
              {utils.formatDuration(recording.duration)}
            </Text>
            <View style={styles.infoMetaDot} />
            <Text style={styles.infoMetaText}>
              {new Date(recording.createdAt).toLocaleDateString('zh-CN')}
            </Text>
          </View>
          {hasBreakpoint && (
            <View style={styles.breakpointBadge}>
              <Icon name="time" size={12} color={theme.colors.primary} />
              <Text style={styles.breakpointBadgeText}>有断点</Text>
            </View>
          )}
        </View>

        {renderPlayerControls()}
      </View>

      {renderSpeedOptions()}
      {renderEditModal()}
      {renderMergeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakpointAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  breakpointAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakpointAlertText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
  breakpointAlertActions: {
    flexDirection: 'row',
    gap: 16,
  },
  breakpointAlertActionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  breakpointAlertActionPrimary: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  infoCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  infoIcon: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoMetaText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  infoMetaDot: {
    width: 4,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray1,
  },
  breakpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: theme.borderRadius.sm,
  },
  breakpointBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  playerContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  progressSection: {
    marginBottom: theme.spacing.lg,
  },
  progressBarContainer: {
    height: 24,
    justifyContent: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressHandle: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  progressHandleInner: {
    width: 16,
    height: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    left: -8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    minWidth: 50,
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.semibold,
  },
  skipButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  skipText: {
    position: 'absolute',
    fontSize: 8,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.bold,
    bottom: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mergeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  speedOptionsContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.separator,
  },
  speedOptionActive: {},
  speedOptionText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textPrimary,
  },
  speedOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  editModalContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  editModalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  trimContainer: {
    marginBottom: theme.spacing.lg,
  },
  trimLabel: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  trimSlider: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  trimButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimConfirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  trimConfirmText: {
    fontSize: theme.typography.sizes.base,
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  mergeModalContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  mergeList: {
    maxHeight: 400,
  },
  mergeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  mergeItemSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  mergeItemIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  mergeItemInfo: {
    flex: 1,
  },
  mergeItemTitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 2,
  },
  mergeItemMeta: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  mergeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.separator,
  },
  mergeCountText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  mergeConfirmButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  mergeConfirmButtonDisabled: {
    backgroundColor: theme.colors.gray1,
  },
  mergeConfirmText: {
    fontSize: theme.typography.sizes.base,
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
});

export default PlayerScreen;
