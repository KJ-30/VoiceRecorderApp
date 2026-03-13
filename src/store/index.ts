import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Recording,
  Folder,
  User,
  RecordingStatus,
  AppState
} from '../types/index';

interface AppStore extends AppState {
  // Actions
  setLoading: (isLoading: boolean) => void;
  setRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  setCurrentRecording: (recording: Recording | null) => void;
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  setRecordings: (recordings: Recording[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  setFolders: (folders: Folder[]) => void;
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  updateStorage: (used: number) => void;
  
  // Computed
  getRecordingById: (id: string) => Recording | undefined;
  getRecordingsByFolder: (folderId: string) => Recording[];
  getRecentRecordings: (limit?: number) => Recording[];
  getDeletedRecordings: () => Recording[];
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      isRecording: false,
      recordingDuration: 0,
      currentRecording: null,
      recordings: [],
      folders: [],
      user: null,
      isAuthenticated: false,

      // Actions
      setLoading: (isLoading) => set({ isLoading }),
      
      setRecording: (isRecording) => set({ isRecording }),
      
      setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
      
      setCurrentRecording: (currentRecording) => set({ currentRecording }),
      
      addRecording: (recording) => 
        set((state) => ({ 
          recordings: [recording, ...state.recordings] 
        })),
      
      updateRecording: (id, updates) =>
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        })),
      
      deleteRecording: (id) =>
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, isDeleted: true, updatedAt: new Date().toISOString() } : r
          ),
        })),
      
      setRecordings: (recordings) => set({ recordings }),
      
      addFolder: (folder) =>
        set((state) => ({
          folders: [folder, ...state.folders],
        })),
      
      updateFolder: (id, updates) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
          ),
        })),
      
      deleteFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          recordings: state.recordings.map((r) =>
            r.folderId === id ? { ...r, folderId: undefined } : r
          ),
        })),
      
      setFolders: (folders) => set({ folders }),
      
      setUser: (user) => set({ user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      updateStorage: (used) =>
        set((state) => ({
          user: state.user ? { ...state.user, storageUsed: used } : null,
        })),

      // Computed
      getRecordingById: (id) => {
        return get().recordings.find((r) => r.id === id);
      },
      
      getRecordingsByFolder: (folderId) => {
        return get().recordings.filter(
          (r) => r.folderId === folderId && !r.isDeleted
        );
      },
      
      getRecentRecordings: (limit = 10) => {
        return get().recordings
          .filter((r) => !r.isDeleted)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },
      
      getDeletedRecordings: () => {
        return get().recordings.filter((r) => r.isDeleted);
      },
    }),
    {
      name: 'voice-recorder-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recordings: state.recordings,
        folders: state.folders,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 录音状态管理
interface RecordingState {
  status: RecordingStatus;
  duration: number;
  uri: string | null;
  startTime: number | null;
  pausedDuration: number;
}

interface RecordingStore extends RecordingState {
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setUri: (uri: string) => void;
  setRecordingDuration: (duration: number) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>()((set, get) => ({
  status: 'idle',
  duration: 0,
  uri: null,
  startTime: null,
  pausedDuration: 0,

  startRecording: () =>
    set({
      status: 'recording',
      startTime: Date.now(),
      duration: 0,
      pausedDuration: 0,
    }),

  pauseRecording: () => {
    const { startTime, duration } = get();
    if (startTime) {
      const elapsed = Date.now() - startTime;
      set({
        status: 'paused',
        pausedDuration: duration + elapsed,
      });
    }
  },

  resumeRecording: () =>
    set({
      status: 'recording',
      startTime: Date.now(),
    }),

  stopRecording: () =>
    set({
      status: 'stopped',
      startTime: null,
    }),

  setUri: (uri) => set({ uri }),

  setRecordingDuration: (duration) => set({ duration }),

  reset: () =>
    set({
      status: 'idle',
      duration: 0,
      uri: null,
      startTime: null,
      pausedDuration: 0,
    }),
}));
