import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, TextInput, Animated, PanResponder, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme, utils } from '@utils/theme';
import { Recording, Transcription, Summary, Todo } from '@types/index';
import { audioPlayerService, PlaybackStatus } from '@services/audio-player';
import { audioEditorService } from '@services/audio-editor';
import { useNavigation } from '@react-navigation/native';

interface EditorScreenProps {
  recording: Recording;
  route?: {
    params?: {
      recordingId: string;
      mode?: 'trim';
    };
  };
}

type TabType = 'transcription' | 'summary' | 'todos';

export const EditorScreen: React.FC<EditorScreenProps> = ({ recording, route }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [duration, setDuration] = useState(recording.duration);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editedText, setEditedText] = useState(recording.transcription?.text || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isTrimMode, setIsTrimMode] = useState(route?.params?.mode === 'trim');
  const [trimStartTime, setTrimStartTime] = useState(0);
  const [trimEndTime, setTrimEndTime] = useState(recording.duration);

  const scrollY = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(0);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'transcription', label: '转写文本', icon: 'text' },
    { key: 'summary', label: 'AI总结', icon: 'sparkles' },
    { key: 'todos', label: '待办事项', icon: 'checkbox' },
  ];

  const handlePlaybackStatusUpdate = useCallback((status: PlaybackStatus) => {
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis);
    setDuration(status.durationMillis);
    setPlaybackSpeed(status.rate);
    setIsLoaded(status.isLoaded);
    progressAnim.setValue(status.positionMillis / Math.max(status.durationMillis, 1));
  }, []);

  const handlePlaybackError = useCallback((error: string) => {
    Alert.alert('播放错误', error);
  }, []);

  useEffect(() => {
    audioPlayerService.setStatusUpdateCallback(handlePlaybackStatusUpdate);
    audioPlayerService.setErrorCallback(handlePlaybackError);

    const loadAudio = async () => {
      try {
        await audioPlayerService.loadRecording(recording, false);
      } catch (error) {
        console.error('加载录音失败:', error);
      }
    };

    loadAudio();

    return () => {
      audioPlayerService.unloadCurrentSound();
    };
  }, [recording.id]);

  const handlePlayPause = async () => {
    try {
      if (!isLoaded) {
        await audioPlayerService.loadRecording(recording, true);
        return;
      }
      await audioPlayerService.togglePlayPause();
    } catch (error) {
      console.error('播放/暂停失败:', error);
    }
  };

  const handleSeek = async (time: number) => {
    try {
      const targetTime = Math.max(0, Math.min(time, duration));
      await audioPlayerService.seekTo(targetTime);
      setCurrentTime(targetTime);
      progressAnim.setValue(targetTime / Math.max(duration, 1));
    } catch (error) {
      console.error('跳转失败:', error);
    }
  };

  const handleSpeedChange = async () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    try {
      await audioPlayerService.setRate(newSpeed);
      setPlaybackSpeed(newSpeed);
    } catch (error) {
      console.error('设置播放速度失败:', error);
    }
  };

  const clearBreakpoint = async () => {
    try {
      await audioPlayerService.clearSavedPosition(recording.id);
      Alert.alert('提示', '已清除该文件的播放断点');
    } catch (error) {
      console.error('清除断点失败:', error);
    }
  };

  const handleTrim = async () => {
    try {
      if (trimStartTime >= trimEndTime) {
        Alert.alert('提示', '开始时间必须小于结束时间');
        return;
      }

      const result = await audioEditorService.trim(recording, {
        startTime: trimStartTime,
        endTime: trimEndTime,
      });

      if (result.success && result.recording) {
        await audioEditorService.saveEditedRecording(result.recording);
        Alert.alert('成功', '裁剪完成，新文件已保存');
        setIsTrimMode(false);
        navigation.goBack();
      } else {
        Alert.alert('失败', result.error || '裁剪失败');
      }
    } catch (error) {
      console.error('裁剪失败:', error);
      Alert.alert('失败', '裁剪失败，请重试');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (progressBarWidth.current > 0) {
          const positionRatio = gestureState.moveX / progressBarWidth.current;
          const newPosition = Math.max(0, Math.min(positionRatio, 1)) * duration;
          setCurrentTime(newPosition);
          progressAnim.setValue(newPosition / Math.max(duration, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (progressBarWidth.current > 0) {
          const positionRatio = gestureState.moveX / progressBarWidth.current;
          const newPosition = Math.max(0, Math.min(positionRatio, 1)) * duration;
          handleSeek(newPosition);
        }
      },
    }),
  ).current;

  const trimLeftPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (progressBarWidth.current > 0) {
          const positionRatio = gestureState.moveX / progressBarWidth.current;
          const newStartTime = Math.max(0, Math.min(positionRatio, 1)) * duration;
          if (newStartTime < trimEndTime - 1000) {
            setTrimStartTime(newStartTime);
          }
        }
      },
    }),
  ).current;

  const trimRightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (progressBarWidth.current > 0) {
          const positionRatio = gestureState.moveX / progressBarWidth.current;
          const newEndTime = Math.max(0, Math.min(positionRatio, 1)) * duration;
          if (newEndTime > trimStartTime + 1000) {
            setTrimEndTime(newEndTime);
          }
        }
      },
    }),
  ).current;

  const renderTrimToolbar = () => (
    <View style={styles.trimToolbar}>
      <TouchableOpacity style={styles.trimCancelButton} onPress={() => setIsTrimMode(false)}>
        <Text style={styles.trimCancelText}>取消</Text>
      </TouchableOpacity>
      <View style={styles.trimTimeInfo}>
        <Text style={styles.trimTimeText}>
          {utils.formatDuration(trimStartTime)} - {utils.formatDuration(trimEndTime)}
        </Text>
        <Text style={styles.trimDurationText}>({utils.formatDuration(trimEndTime - trimStartTime)})</Text>
      </View>
      <TouchableOpacity style={styles.trimConfirmButton} onPress={handleTrim}>
        <Icon name='checkmark' size={18} color='#fff' />
        <Text style={styles.trimConfirmText}>确认裁剪</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton}>
        <Icon name='chevron-back' size={28} color={theme.colors.textPrimary} />
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
        onPress={() => {
          const buttons = [
            { text: '取消', style: 'cancel' as const },
            { text: '清除播放断点', onPress: clearBreakpoint },
          ];
          if (!isTrimMode) {
            buttons.push({ text: '进入裁剪模式', onPress: () => setIsTrimMode(true) });
          }
          Alert.alert('操作', '请选择操作', buttons);
        }}
      >
        <Icon name='ellipsis-horizontal' size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderAudioPlayer = () => {
    const trimLeftPos = (trimStartTime / Math.max(duration, 1)) * 100;
    const trimRightPos = (trimEndTime / Math.max(duration, 1)) * 100;
    const trimWidth = trimRightPos - trimLeftPos;

    return (
      <View style={styles.audioPlayer}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} color='#fff' />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View
            style={styles.progressBar}
            onLayout={(e) => {
              progressBarWidth.current = e.nativeEvent.layout.width;
            }}
            {...(isTrimMode ? {} : panResponder.panHandlers)}
          >
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
            {isTrimMode && (
              <>
                <View style={[styles.trimOverlay, { left: `${trimLeftPos}%`, width: `${trimWidth}%` }]} />
                <View style={[styles.trimHandle, styles.trimHandleLeft, { left: `${trimLeftPos}%` }]} {...trimLeftPanResponder.panHandlers} />
                <View style={[styles.trimHandle, styles.trimHandleRight, { left: `${trimRightPos}%` }]} {...trimRightPanResponder.panHandlers} />
              </>
            )}
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{isTrimMode ? utils.formatDuration(trimStartTime) : utils.formatDuration(currentTime)}</Text>
            <Text style={styles.timeText}>{isTrimMode ? utils.formatDuration(trimEndTime) : utils.formatDuration(duration)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.speedButton} onPress={handleSpeedChange}>
          <Text style={styles.speedText}>{playbackSpeed}x</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
          <Icon name={tab.icon} size={18} color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTranscriptionTab = () => {
    if (!recording.transcription) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Icon name='text' size={40} color={theme.colors.gray1} />
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
            <Text style={styles.transcriptionInfoText}>{recording.transcription.segments.length} 位发言人</Text>
            <Text style={styles.transcriptionInfoDot}>·</Text>
            <Text style={styles.transcriptionInfoText}>{recording.transcription.language === 'zh-CN' ? '中文' : '英文'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(!isEditing)}>
            <Icon name={isEditing ? 'checkmark' : 'create-outline'} size={18} color={theme.colors.primary} />
            <Text style={styles.editButtonText}>{isEditing ? '完成' : '编辑'}</Text>
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
                  <Text style={styles.segmentTime}>{utils.formatDuration(segment.startTime)}</Text>
                </TouchableOpacity>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.segmentTextInput}
                  multiline
                  value={segment.text}
                  onChangeText={(text) => {
                    // 更新文本逻辑
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
            <Icon name='sparkles' size={40} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>暂无AI总结</Text>
          <TouchableOpacity style={styles.generateButton}>
            <Icon name='sparkles' size={18} color='#fff' />
            <Text style={styles.generateButtonText}>生成AI总结</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.summaryContainer}>
        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name='document-text' size={18} color={theme.colors.primary} />
            <Text style={styles.summarySectionTitle}>内容摘要</Text>
          </View>
          <Text style={styles.summaryContent}>{recording.summary.content}</Text>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summarySectionHeader}>
            <Icon name='key' size={18} color={theme.colors.warning} />
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
            <Icon name='checkmark-done' size={18} color={theme.colors.success} />
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
            <Icon name='git-branch' size={18} color={theme.colors.purple} />
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
            <Icon name='checkbox-outline' size={40} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>暂无待办事项</Text>
          <TouchableOpacity style={styles.generateButton}>
            <Icon name='sparkles' size={18} color='#fff' />
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
              <View style={[styles.todoCheckboxInner, todo.completed && styles.todoCheckboxChecked]}>{todo.completed && <Icon name='checkmark' size={14} color='#fff' />}</View>
            </TouchableOpacity>
            <View style={styles.todoContent}>
              <Text style={[styles.todoText, todo.completed && styles.todoTextCompleted]}>{todo.text}</Text>
              <View style={styles.todoMeta}>
                <View style={[styles.todoPriority, { backgroundColor: todo.priority === 'high' ? theme.colors.danger : todo.priority === 'medium' ? theme.colors.warning : theme.colors.success }]}>
                  <Text style={styles.todoPriorityText}>{todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}</Text>
                </View>
                {todo.dueDate && <Text style={styles.todoDueDate}>截止: {utils.formatDate(todo.dueDate)}</Text>}
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
      <StatusBar barStyle='light-content' />
      {renderHeader()}
      {renderAudioPlayer()}
      {isTrimMode && renderTrimToolbar()}
      {!isTrimMode && renderTabBar()}
      {!isTrimMode && renderContent()}
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
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
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  speedButton: {
    paddingHorizontal: 12,
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
    gap: 10,
  },
  todoPriority: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  trimToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  trimCancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  trimCancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  trimTimeInfo: {
    alignItems: 'center',
  },
  trimTimeText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  trimDurationText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  trimConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  trimConfirmText: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  trimOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.primary}40`,
    zIndex: 1,
  },
  trimHandle: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
    zIndex: 2,
    transform: [{ translateX: -8 }],
  },
  trimHandleLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  trimHandleRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
});

export default EditorScreen;
