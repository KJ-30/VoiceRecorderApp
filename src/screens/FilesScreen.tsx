import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '@store/index';
import { theme, utils } from '@utils/theme';
import { Recording, Folder } from '@types/index';
import { audioEditorService } from '@services/audioEditor';

export const FilesScreen: React.FC = () => {
  const { recordings, folders } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeFileName, setMergeFileName] = useState('');

  const filteredRecordings = recordings.filter(recording => {
    if (recording.isDeleted) return false;
    if (selectedFolder && recording.folderId !== selectedFolder) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        recording.title.toLowerCase().includes(query) ||
        recording.transcription?.text.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSelectItem = (id: string) => {
    if (isSelectionMode) {
      setSelectedItems(prev => 
        prev.includes(id) 
          ? prev.filter(item => item !== id)
          : [...prev, id]
      );
    }
  };

  const handleMerge = async () => {
    if (selectedItems.length < 2) {
      Alert.alert('提示', '请至少选择2个音频文件进行合并');
      return;
    }

    if (selectedItems.length > 5) {
      Alert.alert('提示', '最多支持合并5个音频文件');
      return;
    }

    const selectedRecordings = selectedItems.map(id => 
      recordings.find(r => r.id === id)
    ).filter(Boolean) as Recording[];

    const uris = selectedRecordings.map(r => r.uri).filter(Boolean);
    if (uris.length !== selectedItems.length) {
      Alert.alert('错误', '部分文件路径无效');
      return;
    }

    setShowMergeModal(true);
    setMergeFileName(`合并_${selectedRecordings.length}个文件`);
  };

  const confirmMerge = async () => {
    if (!mergeFileName.trim()) {
      Alert.alert('提示', '请输入文件名');
      return;
    }

    setIsMerging(true);
    try {
      const selectedRecordings = selectedItems.map(id => 
        recordings.find(r => r.id === id)
      ).filter(Boolean) as Recording[];

      const uris = selectedRecordings.map(r => r.uri);

      const result = await audioEditorService.mergeAudios({
        uris,
        outputFileName: mergeFileName,
      }, selectedRecordings.map(r => ({
        duration: r.duration,
        createdAt: r.createdAt,
      })));

      Alert.alert(
        '合并成功',
        `已创建: ${result.uri.split('/').pop()}\n时长: ${audioEditorService.formatTimeForDisplay(result.metadata.duration)}`,
        [
          { 
            text: '确定', 
            onPress: () => {
              setShowMergeModal(false);
              setIsSelectionMode(false);
              setSelectedItems([]);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('合并失败', String(error));
    } finally {
      setIsMerging(false);
    }
  };

  const selectedRecordingsForMerge = selectedItems.map(id => 
    recordings.find(r => r.id === id)
  ).filter(Boolean) as Recording[];

  const renderMergeModal = () => (
    <Modal
      visible={showMergeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMergeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.mergeModalContent}>
          <View style={styles.mergeModalHeader}>
            <TouchableOpacity onPress={() => setShowMergeModal(false)}>
              <Text style={styles.mergeModalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.mergeModalTitle}>合并音频</Text>
            <TouchableOpacity 
              onPress={confirmMerge}
              disabled={isMerging}
            >
              <Text style={[
                styles.mergeModalConfirm,
                isMerging && styles.mergeModalConfirmDisabled
              ]}>
                {isMerging ? '合并中...' : '确认'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mergeFileList}>
            <Text style={styles.mergeFileListTitle}>已选择 {selectedRecordingsForMerge.length} 个文件</Text>
            {selectedRecordingsForMerge.map((recording, index) => (
              <View key={recording.id} style={styles.mergeFileItem}>
                <View style={styles.mergeFileIndex}>
                  <Text style={styles.mergeFileIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.mergeFileInfo}>
                  <Text style={styles.mergeFileName} numberOfLines={1}>{recording.title}</Text>
                  <Text style={styles.mergeFileDuration}>
                    {utils.formatDuration(recording.duration)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.mergeInputSection}>
            <Text style={styles.mergeInputLabel}>合并后文件名</Text>
            <TextInput
              style={styles.mergeInput}
              value={mergeFileName}
              onChangeText={setMergeFileName}
              placeholder="输入文件名"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.mergeInfo}>
            <Icon name="information-circle" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.mergeInfoText}>
              合并后文件将保留原始录音的元数据信息
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>文件管理</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Icon name={viewMode === 'grid' ? 'list' : 'grid'} size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setIsSelectionMode(!isSelectionMode)}
        >
          <Icon name={isSelectionMode ? 'close' : 'checkmark-circle'} size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索录音..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFolders = () => (
    <View style={styles.foldersSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>文件夹</Text>
        <TouchableOpacity>
          <Text style={styles.sectionAction}>新建</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.foldersScroll}
      >
        <TouchableOpacity
          style={[
            styles.folderCard,
            selectedFolder === null && styles.folderCardActive
          ]}
          onPress={() => setSelectedFolder(null)}
        >
          <View style={[styles.folderIcon, { backgroundColor: theme.colors.primary }]}>
            <Icon name="folder" size={24} color="#fff" />
          </View>
          <Text style={styles.folderName}>全部</Text>
          <Text style={styles.folderCount}>{recordings.filter(r => !r.isDeleted).length} 个文件</Text>
        </TouchableOpacity>

        {folders.map(folder => (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.folderCard,
              selectedFolder === folder.id && styles.folderCardActive
            ]}
            onPress={() => setSelectedFolder(folder.id)}
          >
            <View style={[styles.folderIcon, { backgroundColor: folder.color }]}>
              <Icon name={folder.icon as any} size={24} color="#fff" />
            </View>
            <Text style={styles.folderName}>{folder.name}</Text>
            <Text style={styles.folderCount}>{folder.recordingCount} 个文件</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addFolderCard}>
          <View style={styles.addFolderIcon}>
            <Icon name="add" size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.addFolderText}>新建文件夹</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
          <Text style={[styles.filterChipText, styles.filterChipTextActive]}>全部</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>今天</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>本周</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>本月</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>已转写</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>AI总结</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderRecordingGrid = () => (
    <View style={styles.recordingsGrid}>
      {filteredRecordings.map(recording => (
        <TouchableOpacity
          key={recording.id}
          style={[
            styles.recordingCard,
            isSelectionMode && selectedItems.includes(recording.id) && styles.recordingCardSelected
          ]}
          onPress={() => handleSelectItem(recording.id)}
          onLongPress={() => setIsSelectionMode(true)}
        >
          <View style={styles.recordingCardHeader}>
            <View style={styles.recordingIcon}>
              <Icon name="mic" size={20} color="#fff" />
            </View>
            {isSelectionMode && (
              <View style={[
                styles.selectionIndicator,
                selectedItems.includes(recording.id) && styles.selectionIndicatorSelected
              ]}>
                {selectedItems.includes(recording.id) && (
                  <Icon name="checkmark" size={14} color="#fff" />
                )}
              </View>
            )}
          </View>
          <Text style={styles.recordingCardTitle} numberOfLines={1}>
            {recording.title}
          </Text>
          <Text style={styles.recordingCardMeta}>
            {utils.formatDate(recording.createdAt)} · {utils.formatDuration(recording.duration)}
          </Text>
          {recording.transcription && (
            <View style={styles.recordingCardStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>已转写</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecordingList = () => (
    <View style={styles.recordingsList}>
      {filteredRecordings.map(recording => (
        <TouchableOpacity
          key={recording.id}
          style={[
            styles.recordingListItem,
            isSelectionMode && selectedItems.includes(recording.id) && styles.recordingListItemSelected
          ]}
          onPress={() => handleSelectItem(recording.id)}
          onLongPress={() => setIsSelectionMode(true)}
        >
          <View style={styles.recordingListIcon}>
            <Icon name="mic" size={20} color="#fff" />
          </View>
          <View style={styles.recordingListInfo}>
            <Text style={styles.recordingListTitle} numberOfLines={1}>
              {recording.title}
            </Text>
            <View style={styles.recordingListMeta}>
              <Text style={styles.recordingListMetaText}>
                {utils.formatDate(recording.createdAt)}
              </Text>
              <View style={styles.recordingListMetaDot} />
              <Text style={styles.recordingListMetaText}>
                {utils.formatDuration(recording.duration)}
              </Text>
            </View>
          </View>
          {isSelectionMode ? (
            <View style={[
              styles.listSelectionIndicator,
              selectedItems.includes(recording.id) && styles.listSelectionIndicatorSelected
            ]}>
              {selectedItems.includes(recording.id) && (
                <Icon name="checkmark" size={14} color="#fff" />
              )}
            </View>
          ) : (
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSelectionToolbar = () => {
    if (!isSelectionMode) return null;

    return (
      <View style={styles.selectionToolbar}>
        <TouchableOpacity 
          style={styles.selectionToolbarButton}
          onPress={handleMerge}
        >
          <Icon name="git-merge" size={20} color={theme.colors.primary} />
          <Text style={[styles.selectionToolbarText, { color: theme.colors.primary }]}>
            合并 ({selectedItems.length}/5)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionToolbarButton}>
          <Icon name="folder-open" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.selectionToolbarText}>移动</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionToolbarButton}>
          <Icon name="share-outline" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.selectionToolbarText}>分享</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionToolbarButton}>
          <Icon name="trash-outline" size={20} color={theme.colors.danger} />
          <Text style={[styles.selectionToolbarText, { color: theme.colors.danger }]}>删除</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSearchBar()}
        {renderFolders()}
        {renderFilters()}
        {viewMode === 'grid' ? renderRecordingGrid() : renderRecordingList()}
      </ScrollView>
      {renderSelectionToolbar()}
      {renderMergeModal()}
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
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  foldersSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  sectionAction: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  foldersScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  folderCard: {
    width: 100,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  folderCardActive: {
    backgroundColor: theme.colors.primary,
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  folderName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  folderCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  addFolderCard: {
    width: 100,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addFolderIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  addFolderText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  filtersContainer: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.md,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  recordingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  recordingCard: {
    width: '47%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  recordingCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  recordingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  recordingIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.gray1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicatorSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  recordingCardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  recordingCardMeta: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  recordingCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
  },
  recordingsList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  recordingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  recordingListItemSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  recordingListIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  recordingListInfo: {
    flex: 1,
  },
  recordingListTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  recordingListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingListMetaText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  recordingListMetaDot: {
    width: 3,
    height: 3,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray1,
  },
  listSelectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.gray1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  listSelectionIndicatorSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.separator,
  },
  selectionToolbarButton: {
    alignItems: 'center',
    gap: 4,
  },
  selectionToolbarText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  mergeModalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '80%',
  },
  mergeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  mergeModalCancel: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  mergeModalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  mergeModalConfirm: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  mergeModalConfirmDisabled: {
    color: theme.colors.textTertiary,
  },
  mergeFileList: {
    marginBottom: theme.spacing.lg,
  },
  mergeFileListTitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  mergeFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  mergeFileIndex: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  mergeFileIndexText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  mergeFileInfo: {
    flex: 1,
  },
  mergeFileName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.medium,
  },
  mergeFileDuration: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  mergeInputSection: {
    marginBottom: theme.spacing.lg,
  },
  mergeInputLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  mergeInput: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  mergeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },
  mergeInfoText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
});

export default FilesScreen;
