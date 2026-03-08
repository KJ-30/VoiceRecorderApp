import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '@store/index';
import { theme, utils } from '@utils/theme';
import { Recording } from '@types/index';

export const HomeScreen: React.FC = () => {
  const { recordings, user, getRecentRecordings } = useAppStore();
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(utils.getGreeting());
    setRecentRecordings(getRecentRecordings(5));
  }, [recordings]);

  const stats = {
    total: recordings.filter(r => !r.isDeleted).length,
    thisMonth: recordings.filter(r => {
      const date = new Date(r.createdAt);
      const now = new Date();
      return !r.isDeleted && date.getMonth() === now.getMonth();
    }).length,
    duration: Math.floor(
      recordings
        .filter(r => !r.isDeleted)
        .reduce((acc, r) => acc + r.duration, 0) / 3600000
    ),
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.userName}>{user?.name || '用户'}</Text>
      </View>
      <TouchableOpacity style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.name || '用').charAt(0)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.thisMonth}</Text>
        <Text style={styles.statLabel}>本月录音</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.duration}</Text>
        <Text style={styles.statLabel}>录音时长(h)</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>总录音数</Text>
      </View>
    </View>
  );

  const renderMainAction = () => (
    <TouchableOpacity style={styles.mainAction}>
      <View style={styles.mainActionContent}>
        <View style={styles.mainActionIcon}>
          <Icon name="mic" size={28} color="#fff" />
        </View>
        <View style={styles.mainActionText}>
          <Text style={styles.mainActionTitle}>开始录音</Text>
          <Text style={styles.mainActionSubtitle}>点击开始实时转写</Text>
        </View>
        <Icon name="chevron-forward" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  const renderSecondaryActions = () => (
    <View style={styles.secondaryActions}>
      <TouchableOpacity style={styles.secondaryAction}>
        <View style={[styles.secondaryActionIcon, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
          <Icon name="cloud-upload-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.secondaryActionTitle}>导入音频</Text>
        <Text style={styles.secondaryActionSubtitle}>从本地导入</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.secondaryAction}>
        <View style={[styles.secondaryActionIcon, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
          <Icon name="folder-outline" size={20} color={theme.colors.warning} />
        </View>
        <Text style={styles.secondaryActionTitle}>文件夹</Text>
        <Text style={styles.secondaryActionSubtitle}>管理文件</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStorageWarning = () => {
    const usedPercent = user ? (user.storageUsed / user.storageLimit) * 100 : 0;
    if (usedPercent < 80) return null;

    return (
      <TouchableOpacity style={styles.storageWarning}>
        <View style={styles.storageWarningIcon}>
          <Icon name="warning" size={18} color={theme.colors.warning} />
        </View>
        <View style={styles.storageWarningContent}>
          <Text style={styles.storageWarningTitle}>存储空间不足</Text>
          <Text style={styles.storageWarningSubtitle}>
            已使用 {utils.formatFileSize(user?.storageUsed || 0)} / {utils.formatFileSize(user?.storageLimit || 0)}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={theme.colors.warning} />
      </TouchableOpacity>
    );
  };

  const renderRecentRecordings = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>最近录音</Text>
        <TouchableOpacity>
          <Text style={styles.sectionAction}>查看全部</Text>
        </TouchableOpacity>
      </View>

      {recentRecordings.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Icon name="mic-off" size={32} color={theme.colors.gray1} />
          </View>
          <Text style={styles.emptyStateTitle}>还没有录音</Text>
          <Text style={styles.emptyStateSubtitle}>点击上方按钮开始录音</Text>
        </View>
      ) : (
        recentRecordings.map((recording) => (
          <TouchableOpacity key={recording.id} style={styles.recordCard}>
            <View style={styles.recordCardHeader}>
              <View style={styles.recordIcon}>
                <Icon name="mic" size={20} color="#fff" />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle} numberOfLines={1}>
                  {recording.title}
                </Text>
                <View style={styles.recordMeta}>
                  <Text style={styles.recordMetaText}>
                    {utils.formatDate(recording.createdAt)}
                  </Text>
                  <View style={styles.recordMetaDot} />
                  <Text style={styles.recordMetaText}>
                    {utils.formatTime(recording.createdAt)}
                  </Text>
                  {recording.transcription && (
                    <>
                      <View style={styles.recordMetaDot} />
                      <Text style={styles.recordMetaText}>
                        {recording.transcription.segments.length}位发言人
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.recordDuration}>
                {utils.formatDuration(recording.duration)}
              </Text>
            </View>
            
            <View style={styles.recordCardFooter}>
              <View style={styles.recordTags}>
                {recording.tags?.map((tag, index) => (
                  <View key={index} style={styles.recordTag}>
                    <Text style={styles.recordTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              {recording.summary && (
                <View style={styles.recordStatus}>
                  <View style={styles.recordStatusIcon} />
                  <Text style={styles.recordStatusText}>AI已总结</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderStats()}
        {renderMainAction()}
        {renderSecondaryActions()}
        {renderStorageWarning()}
        {renderRecentRecordings()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md + 8,
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.sizes.xxl * theme.typography.lineHeights.tight,
  },
  userName: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  mainAction: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  mainActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mainActionIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionText: {
    flex: 1,
  },
  mainActionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginBottom: 4,
  },
  mainActionSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  secondaryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  secondaryActionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  secondaryActionSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  storageWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  storageWarningIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageWarningContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  storageWarningTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  storageWarningSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  sectionAction: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  emptyState: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
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
  },
  recordCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  recordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  recordMetaText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  recordMetaDot: {
    width: 3,
    height: 3,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray1,
  },
  recordDuration: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  recordCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.separator,
  },
  recordTags: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  recordTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.sm,
  },
  recordTagText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordStatusIcon: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  recordStatusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
  },
});

export default HomeScreen;
