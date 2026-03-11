import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useApiStore } from './apiStore';
import { encryptSync, decryptSync } from '../utils/encryption';

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
        collections: encryptSync(JSON.stringify(apiState.collections), user.id),
        endpoints: encryptSync(JSON.stringify(apiState.endpoints), user.id),
        call_logs: encryptSync(JSON.stringify(apiState.callLogs.slice(-200)), user.id),
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

      // Merge cloud data into local (decrypt first)
      const apiStore = useApiStore.getState();
      let cloudCollections: any[] = [];
      let cloudEndpoints: any[] = [];
      try {
        const decCol = decryptSync(data.collections || '', user.id);
        cloudCollections = JSON.parse(decCol || '[]');
      } catch {
        // Fallback: try parsing as unencrypted (legacy data)
        try { cloudCollections = JSON.parse(data.collections || '[]'); } catch { /* skip */ }
      }
      try {
        const decEp = decryptSync(data.endpoints || '', user.id);
        cloudEndpoints = JSON.parse(decEp || '[]');
      } catch {
        try { cloudEndpoints = JSON.parse(data.endpoints || '[]'); } catch { /* skip */ }
      }

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
