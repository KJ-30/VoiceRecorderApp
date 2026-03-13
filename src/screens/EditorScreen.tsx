import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Animated,
  Modal,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme, utils } from '@utils/theme';
import { Recording, Transcription, Summary, Todo } from '@types/index';
import { audioPlayerService, AudioPlayerState } from '@services/audioPlayer';
import { audioEditorService, TrimOptions } from '@services/audioEditor';

interface EditorScreenProps {
  recording: Recording;
  navigation?: any;
}

type TabType = 'transcription' | 'summary' | 'todos';

export const EditorScreen: React.FC<EditorScreenProps> = ({ recording, navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  const [editedText, setEditedText] = useState(recording.transcription?.text || '');
  const [isEditing, setIsEditing] = useState(false);
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    duration: 0,
    position: 0,
    speed: 1,
    isLoaded: false,
    isLoading: false,
  });
  
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [trimRange, setTrimRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: recording.duration || 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const progressRef = useRef<View>(null);
  const progressBarWidth = useRef(0);

  useEffect(() => {
    if (recording?.uri) {
      audioPlayerService.loadAudio(recording.uri, recording.id);
    }

    const unsubscribe = audioPlayerService.subscribe(setPlayerState);

    return () => {
      audioPlayerService.savePlaybackPosition(recording.id);
      audioPlayerService.unloadAudio();
      unsubscribe();
    };
  }, [recording?.id, recording?.uri]);

  useEffect(() => {
    setTrimRange({
      start: 0,
      end: playerState.duration || recording.duration || 0,
    });
  }, [playerState.duration, recording.duration]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleProgressTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleProgressTouch(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
      },
    })
  ).current;

  const handleProgressTouch = useCallback((x: number) => {
    if (progressBarWidth.current > 0 && playerState.duration > 0) {
      const progress = Math.max(0, Math.min(1, x / progressBarWidth.current));
      const position = progress * playerState.duration;
      audioPlayerService.seekTo(position);
    }
  }, [playerState.duration]);

  const handleProgressLayout = useCallback((event: any) => {
    progressBarWidth.current = event.nativeEvent.layout.width;
  }, []);

  const handlePlayPause = useCallback(() => {
    audioPlayerService.togglePlayPause();
  }, []);

  const handleSeek = useCallback((time: number) => {
    audioPlayerService.seekTo(time);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    audioPlayerService.setSpeed(speed);
    setShowSpeedModal(false);
  }, []);

  const handleSeekBackward = useCallback(() => {
    audioPlayerService.seekBackward(10000);
  }, []);

  const handleSeekForward = useCallback(() => {
    audioPlayerService.seekForward(10000);
  }, []);

  const handleTrim = async () => {
    if (trimRange.end <= trimRange.start) {
      Alert.alert('错误', '结束时间必须大于开始时间');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await audioEditorService.trimAudio(recording.uri, {
        startTime: trimRange.start,
        endTime: trimRange.end,
      }, {
        duration: trimRange.end - trimRange.start,
        createdAt: recording.createdAt,
      });

      Alert.alert(
        '裁剪成功',
        `已保存到: ${result.uri.split('/').pop()}`,
        [
          { text: '确定', onPress: () => setShowTrimModal(false) }
        ]
      );
    } catch (error) {
      Alert.alert('裁剪失败', String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'transcription', label: '转写文本', icon: 'text' },
    { key: 'summary', label: 'AI总结', icon: 'sparkles' },
    { key: 'todos', label: '待办事项', icon: 'checkbox' },
  ];

  const speedOptions = audioPlayerService.getSpeedOptions();

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation?.goBack()}
      >
        <Icon name="chevron-back" size={28} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerTitle}>
        <Text style={styles.headerTitleText} numberOfLines={1}>
          {recording.title}
        </Text>
        <Text style={styles.headerSubtitle}>
          {utils.formatDate(recording.createdAt)} · {utils.formatDuration(recording.duration)}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => setShowTrimModal(true)}
      >
        <Icon name="cut-outline" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderAudioPlayer = () => {
    const progress = playerState.duration > 0 ? playerState.position / playerState.duration : 0;
    const progressPercent = `${(progress * 100).toFixed(1)}%`;

    return (
      <View style={styles.audioPlayer}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSeekBackward}
        >
          <Icon name="play-back" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.skipText}>10s</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playButton} 
          onPress={handlePlayPause}
          disabled={playerState.isLoading}
        >
          {playerState.isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name={playerState.isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSeekForward}
        >
          <Icon name="play-forward" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.skipText}>10s</Text>
        </TouchableOpacity>
        
        <View 
          style={styles.progressContainer}
          ref={progressRef}
          onLayout={handleProgressLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: progressPercent }
              ]} 
            />
            <View 
              style={[
                styles.progressThumb,
                { left: progressPercent }
              ]} 
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {audioPlayerService.formatPosition()}
            </Text>
            <Text style={styles.timeText}>
              {audioPlayerService.formatDuration()}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.speedButton} 
          onPress={() => setShowSpeedModal(true)}
        >
          <Text style={styles.speedText}>{playerState.speed}x</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSpeedModal = () => (
    <Modal
      visible={showSpeedModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSpeedModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSpeedModal(false)}
      >
        <View style={styles.speedModalContent}>
          <Text style={styles.modalTitle}>播放速度</Text>
          <View style={styles.speedOptions}>
            {speedOptions.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedOption,
                  playerState.speed === speed && styles.speedOptionActive
                ]}
                onPress={() => handleSpeedChange(speed)}
              >
                <Text style={[
                  styles.speedOptionText,
                  playerState.speed === speed && styles.speedOptionTextActive
                ]}>
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTrimModal = () => (
    <Modal
      visible={showTrimModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTrimModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.trimModalContent}>
          <View style={styles.trimModalHeader}>
            <TouchableOpacity onPress={() => setShowTrimModal(false)}>
              <Text style={styles.trimModalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>裁剪音频</Text>
            <TouchableOpacity 
              onPress={handleTrim}
              disabled={isProcessing}
            >
              <Text style={[
                styles.trimModalConfirm,
                isProcessing && styles.trimModalConfirmDisabled
              ]}>
                {isProcessing ? '处理中...' : '确认'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trimPreview}>
            <View style={styles.trimTimeBlock}>
              <Text style={styles.trimTimeLabel}>开始时间</Text>
              <Text style={styles.trimTimeValue}>
                {audioEditorService.formatTimeForDisplay(trimRange.start)}
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color={theme.colors.textSecondary} />
            <View style={styles.trimTimeBlock}>
              <Text style={styles.trimTimeLabel}>结束时间</Text>
              <Text style={styles.trimTimeValue}>
                {audioEditorService.formatTimeForDisplay(trimRange.end)}
              </Text>
            </View>
          </View>

          <View style={styles.trimDurationInfo}>
            <Text style={styles.trimDurationText}>
              裁剪后时长: {audioEditorService.formatTimeForDisplay(trimRange.end - trimRange.start)}
            </Text>
          </View>

          <View style={styles.trimControls}>
            <Text style={styles.trimLabel}>开始位置</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill,
                    { width: `${(trimRange.start / playerState.duration) * 100}%` }
                  ]} 
                />
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => setTrimRange(prev => ({ 
                    ...prev, 
                    start: Math.max(0, prev.start - 5000) 
                  }))}
                >
                  <Icon name="remove" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.sliderValue}>
                  {audioEditorService.formatTimeForDisplay(trimRange.start)}
                </Text>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => setTrimRange(prev => ({ 
                    ...prev, 
                    start: Math.min(prev.end - 1000, prev.start + 5000) 
                  }))}
                >
                  <Icon name="add" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.trimLabel}>结束位置</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill,
                    { width: `${(trimRange.end / playerState.duration) * 100}%` }
                  ]} 
                />
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => setTrimRange(prev => ({ 
                    ...prev, 
                    end: Math.max(prev.start + 1000, prev.end - 5000) 
                  }))}
                >
                  <Icon name="remove" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.sliderValue}>
                  {audioEditorService.formatTimeForDisplay(trimRange.end)}
                </Text>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => setTrimRange(prev => ({ 
                    ...prev, 
                    end: Math.min(playerState.duration, prev.end + 5000) 
                  }))}
                >
                  <Icon name="add" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.trimQuickActions}>
            <TouchableOpacity 
              style={styles.trimQuickButton}
              onPress={() => setTrimRange({ start: 0, end: playerState.duration / 2 })}
            >
              <Text style={styles.trimQuickButtonText}>前半段</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.trimQuickButton}
              onPress={() => setTrimRange({ start: playerState.duration / 2, end: playerState.duration })}
            >
              <Text style={styles.trimQuickButtonText}>后半段</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.trimQuickButton}
              onPress={() => setTrimRange({ start: 0, end: playerState.duration })}
            >
              <Text style={styles.trimQuickButtonText}>全部</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Icon 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.tabTextActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTranscriptionTab = () => {
    if (!recording.transcription) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Icon name="text" size={40} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>暂无转写文本</Text>
          <Text style={styles.emptyStateSubtitle}>正在处理中，请稍候...</Text>
        </View>
      );
    }

    return (
      <View style={styles.transcriptionContainer}>
        <View style={styles.transcriptionToolbar}>
          <View style={styles.transcriptionInfo}>
            <Text style={styles.transcriptionInfoText}>
              {recording.transcription.segments.length} 位发言人
            </Text>
            <Text style={styles.transcriptionInfoDot}>·</Text>
            <Text style={styles.transcriptionInfoText}>
              {recording.transcription.language === 'zh-CN' ? '中文' : '英文'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Icon name={isEditing ? 'checkmark' : 'create-outline'} size={18} color={theme.colors.primary} />
            <Text style={styles.editButtonText}>
              {isEditing ? '完成' : '编辑'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.transcriptionContent}>
          {recording.transcription.segments.map((segment, index) => (
            <View key={segment.id} style={styles.segment}>
              <View style={styles.segmentHeader}>
                <View style={styles.speakerBadge}>
                  <Text style={styles.speakerName}>{segment.speakerName}</Text>
                </View>
                <TouchableOpacity onPress={() => handleSeek(segment.startTime)}>
                  <Text style={styles.segmentTime}>
                    {utils.formatDuration(segment.startTime)}
                  </Text>
                </TouchableOpacity>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.segmentTextInput}
                  multiline
                  value={segment.text}
                  onChangeText={(text) => {
                  }}
                />
              ) : (
                <Text style={styles.segmentText}>{segment.text}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSummaryTab = () => {
    if (!recording.summary) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Icon name="sparkles" size={40} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>暂无AI总结</Text>
          <TouchableOpacity style={styles.generateButton}>
            <Icon name="sparkles" size={18} color="#fff" />
            <Text style={styles.generateButtonText}>生成AI总结</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.summaryContainer}>
        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name="document-text" size={18} color={theme.colors.primary} />
            <Text style={styles.summarySectionTitle}>内容摘要</Text>
          </View>
          <Text style={styles.summaryContent}>{recording.summary.content}</Text>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name="key" size={18} color={theme.colors.warning} />
            <Text style={styles.summarySectionTitle}>关键要点</Text>
          </View>
          {recording.summary.keyPoints.map((point, index) => (
            <View key={index} style={styles.summaryItem}>
              <View style={styles.summaryItemDot} />
              <Text style={styles.summaryItemText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name="checkmark-done" size={18} color={theme.colors.success} />
            <Text style={styles.summarySectionTitle}>行动项</Text>
          </View>
          {recording.summary.actionItems.map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <View style={[styles.summaryItemDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.summaryItemText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name="git-branch" size={18} color={theme.colors.purple} />
            <Text style={styles.summarySectionTitle}>决策事项</Text>
          </View>
          {recording.summary.decisions.map((decision, index) => (
            <View key={index} style={styles.summaryItem}>
              <View style={[styles.summaryItemDot, { backgroundColor: theme.colors.purple }]} />
              <Text style={styles.summaryItemText}>{decision}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTodosTab = () => {
    if (!recording.todos || recording.todos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Icon name="checkbox-outline" size={40} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>暂无待办事项</Text>
          <TouchableOpacity style={styles.generateButton}>
            <Icon name="sparkles" size={18} color="#fff" />
            <Text style={styles.generateButtonText}>从录音生成待办</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.todosContainer}>
        {recording.todos.map((todo) => (
          <View key={todo.id} style={styles.todoItem}>
            <TouchableOpacity style={styles.todoCheckbox}>
              <View style={[
                styles.todoCheckboxInner,
                todo.completed && styles.todoCheckboxChecked
              ]}>
                {todo.completed && <Icon name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
            <View style={styles.todoContent}>
              <Text style={[
                styles.todoText,
                todo.completed && styles.todoTextCompleted
              ]}>
                {todo.text}
              </Text>
              <View style={styles.todoMeta}>
                <View style={[
                  styles.todoPriority,
                  { backgroundColor: todo.priority === 'high' ? theme.colors.danger : 
                                   todo.priority === 'medium' ? theme.colors.warning : 
                                   theme.colors.success }
                ]}>
                  <Text style={styles.todoPriorityText}>
                    {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                  </Text>
                </View>
                {todo.dueDate && (
                  <Text style={styles.todoDueDate}>
                    截止: {utils.formatDate(todo.dueDate)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'transcription':
        return renderTranscriptionTab();
      case 'summary':
        return renderSummaryTab();
      case 'todos':
        return renderTodosTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      {renderAudioPlayer()}
      {renderTabBar()}
      {renderContent()}
      {renderSpeedModal()}
      {renderTrimModal()}
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
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  skipText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginLeft: -6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.sm,
  },
  speedText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.semibold,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  tabTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  generateButtonText: {
    fontSize: theme.typography.sizes.base,
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  transcriptionContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.lg,
  },
  transcriptionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  transcriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcriptionInfoText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  transcriptionInfoDot: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  transcriptionContent: {
    flex: 1,
  },
  segment: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  speakerBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  speakerName: {
    fontSize: theme.typography.sizes.xs,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
  segmentTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
  },
  segmentText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.base * 1.5,
  },
  segmentTextInput: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.base * 1.5,
    padding: 0,
    minHeight: 60,
  },
  summaryContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.lg,
  },
  summarySection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  summarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  summarySectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  summaryContent: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.base * 1.6,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  summaryItemDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.warning,
    marginTop: 8,
    marginRight: 10,
  },
  summaryItemText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.base * 1.5,
  },
  todosContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.lg,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  todoCheckbox: {
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  todoCheckboxInner: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.gray1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoCheckboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    lineHeight: theme.typography.sizes.base * 1.4,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textTertiary,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todoPriority: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  todoPriorityText: {
    fontSize: theme.typography.sizes.xs,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
  todoDueDate: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  speedModalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  speedOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  speedOption: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  speedOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  speedOptionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.semibold,
  },
  speedOptionTextActive: {
    color: '#fff',
  },
  trimModalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '80%',
  },
  trimModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  trimModalCancel: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  trimModalConfirm: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  trimModalConfirmDisabled: {
    color: theme.colors.textTertiary,
  },
  trimPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
  },
  trimTimeBlock: {
    alignItems: 'center',
  },
  trimTimeLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  trimTimeValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  trimDurationInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  trimDurationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  trimControls: {
    marginBottom: theme.spacing.lg,
  },
  trimLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  sliderContainer: {
    marginBottom: theme.spacing.md,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.medium,
  },
  trimQuickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  trimQuickButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },
  trimQuickButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
  },
});

export default EditorScreen;
