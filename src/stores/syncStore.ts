import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useApiStore } from './apiStore';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncState {
  lastSyncAt: number | null;
  status: SyncStatus;
  autoSync: boolean;

  setAutoSync: (enabled: boolean) => void;
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  sync: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  lastSyncAt: null,
  status: 'idle',
  autoSync: false,

  setAutoSync: (enabled) => {
    set({ autoSync: enabled });
    AsyncStorage.setItem('auto_sync', JSON.stringify(enabled));
  },

  pushToCloud: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ status: 'syncing' });
    try {
      const apiState = useApiStore.getState();
      const payload = {
        user_id: user.id,
        collections: JSON.stringify(apiState.collections),
        endpoints: JSON.stringify(apiState.endpoints),
        call_logs: JSON.stringify(apiState.callLogs.slice(-200)),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_data')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      const now = Date.now();
      set({ status: 'success', lastSyncAt: now });
      AsyncStorage.setItem('last_sync', String(now));
    } catch {
      set({ status: 'error' });
    }
  },

  pullFromCloud: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ status: 'syncing' });
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) { set({ status: 'idle' }); return; }

      // Merge cloud data into local
      const apiStore = useApiStore.getState();
      const cloudCollections = JSON.parse(data.collections || '[]');
      const cloudEndpoints = JSON.parse(data.endpoints || '[]');

      // Simple merge: cloud wins for conflicts by id
      const mergedCollections = mergeById(apiStore.collections, cloudCollections);
      const mergedEndpoints = mergeById(apiStore.endpoints, cloudEndpoints);

      useApiStore.setState({ collections: mergedCollections, endpoints: mergedEndpoints });
      // Persist locally
      AsyncStorage.setItem('api_collections', JSON.stringify(mergedCollections));
      AsyncStorage.setItem('api_endpoints', JSON.stringify(mergedEndpoints));

      const now = Date.now();
      set({ status: 'success', lastSyncAt: now });
      AsyncStorage.setItem('last_sync', String(now));
    } catch {
      set({ status: 'error' });
    }
  },

  sync: async () => {
    await get().pushToCloud();
    await get().pullFromCloud();
  },

  initialize: async () => {
    const [saved, autoSyncStr] = await Promise.all([
      AsyncStorage.getItem('last_sync'),
      AsyncStorage.getItem('auto_sync'),
    ]);
    set({
      lastSyncAt: saved ? Number(saved) : null,
      autoSync: autoSyncStr ? JSON.parse(autoSyncStr) : false,
    });
  },
}));

function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  local.forEach((item) => map.set(item.id, item));
  cloud.forEach((item) => map.set(item.id, item)); // Cloud overrides
  return Array.from(map.values());
}
