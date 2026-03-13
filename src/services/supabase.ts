import { createClient } from '@supabase/supabase-js';
import { Recording, Folder, User, Transcription, Summary, Todo } from '../types/index';

// Supabase 客户端配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://bafeujvezjurbobculbp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_uZnhnkh1AGj1lC_x369_rg_7svUOm4r';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase 服务类
export class SupabaseService {
  // 用户认证
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // 录音数据操作
  async createRecording(recording: Recording) {
    const { data, error } = await supabase
      .from('recordings')
      .insert([recording])
      .select()
      .single();
    return { data, error };
  }

  async updateRecording(id: string, updates: Partial<Recording>) {
    const { data, error } = await supabase
      .from('recordings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  async deleteRecording(id: string) {
    const { error } = await supabase
      .from('recordings')
      .update({ is_deleted: true })
      .eq('id', id);
    return { error };
  }

  async getRecordings(userId: string) {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // 文件夹操作
  async createFolder(folder: Folder) {
    const { data, error } = await supabase
      .from('folders')
      .insert([folder])
      .select()
      .single();
    return { data, error };
  }

  async getFolders(userId: string) {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // 转写数据操作
  async createTranscription(transcription: Transcription) {
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([transcription])
      .select()
      .single();
    return { data, error };
  }

  async updateTranscription(id: string, updates: Partial<Transcription>) {
    const { data, error } = await supabase
      .from('transcriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  // AI 总结操作
  async createSummary(summary: Summary) {
    const { data, error } = await supabase
      .from('summaries')
      .insert([summary])
      .select()
      .single();
    return { data, error };
  }

  async updateSummary(id: string, updates: Partial<Summary>) {
    const { data, error } = await supabase
      .from('summaries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  // 待办事项操作
  async createTodos(todos: Todo[]) {
    const { data, error } = await supabase
      .from('todos')
      .insert(todos)
      .select();
    return { data, error };
  }

  async updateTodo(id: string, updates: Partial<Todo>) {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  // 文件存储
  async uploadAudio(fileName: string, file: File | Blob) {
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    return { data, error };
  }

  async getAudioUrl(fileName: string) {
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);
    return data.publicUrl;
  }

  async deleteAudio(fileName: string) {
    const { error } = await supabase.storage
      .from('audio-files')
      .remove([fileName]);
    return { error };
  }

  // 同步本地数据到云端
  async syncRecordings(recordings: Recording[]) {
    const { data, error } = await supabase
      .from('recordings')
      .upsert(recordings, { onConflict: 'id' });
    return { data, error };
  }

  // 监听数据变化（实时同步）
  subscribeToRecordings(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('recordings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }
}

// 导出单例
export const supabaseService = new SupabaseService();
