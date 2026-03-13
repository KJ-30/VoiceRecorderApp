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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '@store/index';
import { theme, utils } from '@utils/theme';
import { Recording, Folder, RootStackParamList } from '@types/index';
import { audioEditorService } from '@services/audio-editor';

type FilesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export const FilesScreen: React.FC = () => {
  const navigation = useNavigation<FilesScreenNavigationProp>();
  const { recordings, folders, addRecording } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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

  const handleTrim = () => {
    if (selectedItems.length !== 1) {
      Alert.alert('提示', '请选择一个文件进行裁剪');
      return;
    }
    const recording = recordings.find(r => r.id === selectedItems[0]);
    if (recording) {
      navigation.navigate('Editor', { recordingId: recording.id, mode: 'trim' });
    }
  };

  const handleMerge = async () => {
    if (selectedItems.length < 2) {
      Alert.alert('提示', '请选择至少2个文件进行合并');
      return;
    }
    if (selectedItems.length > 5) {
      Alert.alert('提示', '最多只能合并5个文件');
      return;
    }

    const selectedRecordings = recordings.filter(r => selectedItems.includes(r.id));
    
    Alert.alert(
      '确认合并',
      `将合并 ${selectedRecordings.length} 个文件，是否继续？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            const result = await audioEditorService.merge({
              recordings: selectedRecordings,
            });
            if (result.success && result.recording) {
              addRecording(result.recording);
              setIsSelectionMode(false);
              setSelectedItems([]);
              Alert.alert('成功', '文件合并完成');
            } else {
              Alert.alert('失败', result.error || '合并失败');
            }
          },
        },
      ]
    );
  };

  const renderSelectionToolbar = () => {
    if (!isSelectionMode) return null;

    const showMerge = selectedItems.length >= 2 && selectedItems.length <= 5;
    const showTrim = selectedItems.length === 1;

    return (
      <View style={styles.selectionToolbar}>
        {showTrim && (
          <TouchableOpacity style={styles.selectionToolbarButton} onPress={handleTrim}>
            <Icon name="cut" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.selectionToolbarText}>裁剪</Text>
          </TouchableOpacity>
        )}
        {showMerge && (
          <TouchableOpacity style={styles.selectionToolbarButton} onPress={handleMerge}>
            <Icon name="git-merge" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.selectionToolbarText}>合并</Text>
          </TouchableOpacity>
        )}
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
});

export default FilesScreen;
