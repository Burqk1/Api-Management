import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { generateId, HttpMethod } from '../types/api';

export interface QueuedRequest {
  id: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  endpointName: string;
  queuedAt: number;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  error?: string;
}

interface OfflineState {
  queue: QueuedRequest[];
  isOnline: boolean;
  addToQueue: (data: Omit<QueuedRequest, 'id' | 'queuedAt' | 'status'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  setOnline: (online: boolean) => void;
  initialize: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  queue: [],
  isOnline: true,

  addToQueue: (data) => {
    const req: QueuedRequest = { ...data, id: generateId(), queuedAt: Date.now(), status: 'queued' };
    set((s) => {
      const updated = [...s.queue, req];
      AsyncStorage.setItem('offline_queue', JSON.stringify(updated));
      return { queue: updated };
    });
  },

  removeFromQueue: (id) => {
    set((s) => {
      const updated = s.queue.filter((r) => r.id !== id);
      AsyncStorage.setItem('offline_queue', JSON.stringify(updated));
      return { queue: updated };
    });
  },

  clearQueue: () => {
    AsyncStorage.setItem('offline_queue', '[]');
    set({ queue: [] });
  },

  processQueue: async () => {
    const { queue, isOnline } = get();
    if (!isOnline) return;

    const pending = queue.filter((r) => r.status === 'queued');
    for (const req of pending) {
      set((s) => ({
        queue: s.queue.map((r) => r.id === req.id ? { ...r, status: 'sending' as const } : r),
      }));

      try {
        const opts: RequestInit = { method: req.method, headers: req.headers };
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
          opts.body = req.body;
        }
        await fetch(req.url, opts);
        set((s) => {
          const updated = s.queue.map((r) => r.id === req.id ? { ...r, status: 'sent' as const } : r);
          AsyncStorage.setItem('offline_queue', JSON.stringify(updated));
          return { queue: updated };
        });
      } catch (err: any) {
        set((s) => {
          const updated = s.queue.map((r) =>
            r.id === req.id ? { ...r, status: 'failed' as const, error: err.message } : r
          );
          AsyncStorage.setItem('offline_queue', JSON.stringify(updated));
          return { queue: updated };
        });
      }
    }
  },

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) get().processQueue();
  },

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('offline_queue');
      if (saved) set({ queue: JSON.parse(saved) });

      const netState = await NetInfo.fetch();
      set({ isOnline: netState.isConnected ?? true });

      NetInfo.addEventListener((state) => {
        const online = state.isConnected ?? true;
        get().setOnline(online);
      });
    } catch (e) { console.warn('[offlineStore] Failed to initialize:', e); }
  },
}));
