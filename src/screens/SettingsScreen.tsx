import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Switch, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '@store/index';
import { theme, utils } from '@utils/theme';
import { aiService } from '@services/ai';
import { ollamaService } from '@services/ollama';
import { AIBackend } from '@services/ai-adapter';
import { audioPlayerService } from '@services/audio-player';

export const SettingsScreen: React.FC = () => {
  const { user } = useAppStore();
  const [aiBackend, setAiBackend] = useState<AIBackend>('auto');
  const [ollamaStatus, setOllamaStatus] = useState(false);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [breakpointCount, setBreakpointCount] = useState(0);

  useEffect(() => {
    checkAIBackendStatus();
    loadBreakpointCount();
  }, []);

  const loadBreakpointCount = async () => {
    const breakpoints = await audioPlayerService.getAllBreakpoints();
    setBreakpointCount(breakpoints.length);
  };

  const handleClearAllBreakpoints = async () => {
    Alert.alert('清除所有断点', `确定要清除 ${breakpointCount} 个播放断点吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          await audioPlayerService.clearAllBreakpoints();
          setBreakpointCount(0);
          Alert.alert('成功', '所有断点已清除');
        },
      },
    ]);
  };

  const checkAIBackendStatus = async () => {
    const status = await ollamaService.checkAvailability();
    setOllamaStatus(status);
  };

  const handleBackendChange = (backend: AIBackend) => {
    setAiBackend(backend);
    aiService.setBackend(backend);
    setShowBackendModal(false);
  };

  const getBackendLabel = (backend: AIBackend) => {
    switch (backend) {
      case 'ollama':
        return 'Ollama 本地模型';
      case 'openai':
        return 'OpenAI 云端';
      case 'auto':
        return '自动选择';
      default:
        return '自动选择';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>设置</Text>
    </View>
  );

  const renderProfileCard = () => (
    <TouchableOpacity style={styles.profileCard}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{(user?.name || '用').charAt(0)}</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{user?.name || '用户'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
      </View>
      <Icon name='chevron-forward' size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderStorageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>存储空间</Text>
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View style={styles.storageIcon}>
            <Icon name='cloud' size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.storageInfo}>
            <Text style={styles.storageTitle}>云存储</Text>
            <Text style={styles.storageSubtitle}>
              {utils.formatFileSize(user?.storageUsed || 0)} / {utils.formatFileSize(user?.storageLimit || 0)}
            </Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>升级</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageBarFill,
              {
                width: `${Math.min(((user?.storageUsed || 0) / (user?.storageLimit || 1)) * 100, 100)}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>录音设置</Text>
      <View style={styles.settingsCard}>
        <SettingItem icon='mic' iconColor={theme.colors.primary} title='录音质量' subtitle='高质量 (48kHz)' showArrow />
        <SettingItem icon='language' iconColor={theme.colors.success} title='默认语言' subtitle='中文 (简体)' showArrow isLast />
      </View>
    </View>
  );

  const renderPlaybackSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>播放设置</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingItem} onPress={handleClearAllBreakpoints}>
          <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Icon name='time-outline' size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>清除所有断点</Text>
            <Text style={styles.settingSubtitle}>当前有 {breakpointCount} 个播放断点</Text>
          </View>
          <Icon name='trash-outline' size={20} color={theme.colors.danger} />
        </TouchableOpacity>
        <SettingItem icon='speedometer' iconColor={theme.colors.warning} title='默认播放速度' subtitle='1.0x' showArrow isLast />
      </View>
    </View>
  );

  const renderAISettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI 设置</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowBackendModal(true)}>
          <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.purple}20` }]}>
            <Icon name='hardware-chip' size={20} color={theme.colors.purple} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>AI 后端</Text>
            <View style={styles.backendStatus}>
              <Text style={styles.settingSubtitle}>{getBackendLabel(aiBackend)}</Text>
              {ollamaStatus && (
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.statusText}>本地可用</Text>
                </View>
              )}
            </View>
          </View>
          <Icon name='chevron-forward' size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <SettingItem icon='sparkles' iconColor={theme.colors.purple} title='AI 总结' subtitle='自动生成会议总结' showSwitch switchValue={true} />
        <SettingItem icon='checkbox' iconColor={theme.colors.warning} title='待办事项' subtitle='自动提取行动项' showSwitch switchValue={true} />
        <SettingItem icon='people' iconColor={theme.colors.teal} title='发言人识别' subtitle='自动识别不同发言人' showSwitch switchValue={true} isLast />
      </View>
    </View>
  );

  const renderBackendModal = () => (
    <Modal visible={showBackendModal} transparent animationType='slide' onRequestClose={() => setShowBackendModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>选择 AI 后端</Text>
            <TouchableOpacity onPress={() => setShowBackendModal(false)}>
              <Icon name='close' size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.backendOption, aiBackend === 'auto' && styles.backendOptionActive]} onPress={() => handleBackendChange('auto')}>
            <View style={styles.backendOptionIcon}>
              <Icon name='sync' size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.backendOptionContent}>
              <Text style={styles.backendOptionTitle}>自动选择</Text>
              <Text style={styles.backendOptionSubtitle}>优先使用本地模型，不可用时切换到云端</Text>
            </View>
            {aiBackend === 'auto' && <Icon name='checkmark' size={20} color={theme.colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.backendOption, aiBackend === 'ollama' && styles.backendOptionActive]} onPress={() => handleBackendChange('ollama')}>
            <View style={[styles.backendOptionIcon, { backgroundColor: `${theme.colors.success}20` }]}>
              <Icon name='desktop' size={24} color={theme.colors.success} />
            </View>
            <View style={styles.backendOptionContent}>
              <Text style={styles.backendOptionTitle}>Ollama 本地模型</Text>
              <Text style={styles.backendOptionSubtitle}>{ollamaStatus ? '已连接 - 数据不上传云端' : '未连接 - 请启动 Ollama 服务'}</Text>
            </View>
            {aiBackend === 'ollama' && <Icon name='checkmark' size={20} color={theme.colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.backendOption, aiBackend === 'openai' && styles.backendOptionActive]} onPress={() => handleBackendChange('openai')}>
            <View style={[styles.backendOptionIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
              <Icon name='cloud' size={24} color={theme.colors.warning} />
            </View>
            <View style={styles.backendOptionContent}>
              <Text style={styles.backendOptionTitle}>云端 AI</Text>
              <Text style={styles.backendOptionSubtitle}>使用云端大模型，需要网络连接</Text>
            </View>
            {aiBackend === 'openai' && <Icon name='checkmark' size={20} color={theme.colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowBackendModal(false)}>
            <Text style={styles.modalCloseButtonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderGeneralSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>通用设置</Text>
      <View style={styles.settingsCard}>
        <SettingItem icon='moon' iconColor={theme.colors.indigo} title='深色模式' subtitle='跟随系统' showArrow />
        <SettingItem icon='notifications' iconColor={theme.colors.pink} title='通知设置' showArrow />
        <SettingItem icon='shield-checkmark' iconColor={theme.colors.success} title='隐私与安全' showArrow />
        <SettingItem icon='globe' iconColor={theme.colors.teal} title='语言' subtitle='中文 (简体)' showArrow isLast />
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>关于</Text>
      <View style={styles.settingsCard}>
        <SettingItem icon='help-circle' iconColor={theme.colors.gray1} title='帮助与反馈' showArrow />
        <SettingItem icon='star' iconColor={theme.colors.warning} title='评分' showArrow />
        <SettingItem icon='document-text' iconColor={theme.colors.gray1} title='隐私政策' showArrow />
        <SettingItem icon='information-circle' iconColor={theme.colors.gray1} title='关于我们' subtitle='版本 1.0.0' showArrow isLast />
      </View>
    </View>
  );

  const renderLogoutButton = () => (
    <TouchableOpacity style={styles.logoutButton}>
      <Text style={styles.logoutButtonText}>退出登录</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' />
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProfileCard()}
        {renderStorageSection()}
        {renderSettingsSection()}
        {renderPlaybackSettingsSection()}
        {renderAISettingsSection()}
        {renderGeneralSection()}
        {renderAboutSection()}
        {renderLogoutButton()}
      </ScrollView>
      {renderBackendModal()}
    </SafeAreaView>
  );
};

// 设置项组件
interface SettingItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  showArrow?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, iconColor, title, subtitle, showArrow, showSwitch, switchValue, isLast }) => {
  return (
    <TouchableOpacity style={[styles.settingItem, isLast && styles.settingItemLast]}>
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Icon name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showSwitch ? <Switch value={switchValue} onValueChange={() => {}} trackColor={{ false: theme.colors.backgroundTertiary, true: theme.colors.primary }} thumbColor='#fff' /> : showArrow ? <Icon name='chevron-forward' size={20} color={theme.colors.textSecondary} /> : null}
    </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  profileAvatarText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  storageCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  storageIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  storageSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  storageBar: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  settingsCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.separator,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.medium,
  },
  settingSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  backendStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.success}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  backendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  backendOptionActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  backendOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  backendOptionContent: {
    flex: 1,
  },
  backendOptionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  backendOptionSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  modalCloseButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.semibold,
  },
});

export default SettingsScreen;
