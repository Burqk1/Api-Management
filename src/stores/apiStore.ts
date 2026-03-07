import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiCollection,
  ApiEndpoint,
  ApiCallLog,
  ApiKey,
  HttpMethod,
  generateId,
} from '../types/api';

interface ApiState {
  collections: ApiCollection[];
  endpoints: ApiEndpoint[];
  callLogs: ApiCallLog[];
  apiKeys: ApiKey[];

  // Collections
  addCollection: (data: Omit<ApiCollection, 'id' | 'createdAt'>) => ApiCollection;
  updateCollection: (id: string, data: Partial<ApiCollection>) => void;
  deleteCollection: (id: string) => void;

  // Endpoints
  addEndpoint: (data: Omit<ApiEndpoint, 'id' | 'createdAt' | 'updatedAt'>) => ApiEndpoint;
  updateEndpoint: (id: string, data: Partial<ApiEndpoint>) => void;
  deleteEndpoint: (id: string) => void;
  getEndpointsByCollection: (collectionId: string) => ApiEndpoint[];

  // Call Logs
  addCallLog: (log: Omit<ApiCallLog, 'id'>) => void;
  clearCallLogs: () => void;
  getRecentLogs: (limit?: number) => ApiCallLog[];
  getLogsByEndpoint: (endpointId: string) => ApiCallLog[];

  // API Keys
  addApiKey: (data: Omit<ApiKey, 'id' | 'createdAt'>) => void;
  deleteApiKey: (id: string) => void;

  // Stats
  getTotalCalls: () => number;
  getAvgResponseTime: () => number;
  getSuccessRate: () => number;
  getCallsToday: () => number;

  // Favorites
  toggleFavorite: (endpointId: string) => void;
  getFavorites: () => ApiEndpoint[];

  // Search
  search: (query: string) => { collections: ApiCollection[]; endpoints: ApiEndpoint[]; logs: ApiCallLog[] };

  // Export/Import
  exportCollection: (collectionId: string) => string;
  importCollection: (jsonStr: string) => boolean;

  // Reorder
  moveCollection: (id: string, direction: 'up' | 'down') => void;
  moveEndpoint: (id: string, direction: 'up' | 'down') => void;

  // Persistence
  initialize: () => Promise<void>;
}

const MAX_LOGS = 5000; // Plan bazlı limit costGuardStore'da kontrol edilir

const persist = (state: ApiState) => {
  AsyncStorage.setItem('api_collections', JSON.stringify(state.collections));
  AsyncStorage.setItem('api_endpoints', JSON.stringify(state.endpoints));
  AsyncStorage.setItem('api_call_logs', JSON.stringify(state.callLogs));
  AsyncStorage.setItem('api_keys', JSON.stringify(state.apiKeys));
};

export const useApiStore = create<ApiState>((set, get) => ({
  collections: [],
  endpoints: [],
  callLogs: [],
  apiKeys: [],

  addCollection: (data) => {
    const col: ApiCollection = { ...data, id: generateId(), createdAt: Date.now() };
    set((s) => {
      const updated = { ...s, collections: [...s.collections, col] };
      persist(updated);
      return updated;
    });
    return col;
  },

  updateCollection: (id, data) => {
    set((s) => {
      const updated = {
        ...s,
        collections: s.collections.map((c) => (c.id === id ? { ...c, ...data } : c)),
      };
      persist(updated);
      return updated;
    });
  },

  deleteCollection: (id) => {
    set((s) => {
      const updated = {
        ...s,
        collections: s.collections.filter((c) => c.id !== id),
        endpoints: s.endpoints.filter((e) => e.collectionId !== id),
      };
      persist(updated);
      return updated;
    });
  },

  addEndpoint: (data) => {
    const ep: ApiEndpoint = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => {
      const updated = { ...s, endpoints: [...s.endpoints, ep] };
      persist(updated);
      return updated;
    });
    return ep;
  },

  updateEndpoint: (id, data) => {
    set((s) => {
      const updated = {
        ...s,
        endpoints: s.endpoints.map((e) =>
          e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
        ),
      };
      persist(updated);
      return updated;
    });
  },

  deleteEndpoint: (id) => {
    set((s) => {
      const updated = {
        ...s,
        endpoints: s.endpoints.filter((e) => e.id !== id),
      };
      persist(updated);
      return updated;
    });
  },

  getEndpointsByCollection: (collectionId) =>
    get().endpoints.filter((e) => e.collectionId === collectionId),

  addCallLog: (log) => {
    const entry: ApiCallLog = { ...log, id: generateId() };
    set((s) => {
      const logs = [entry, ...s.callLogs].slice(0, MAX_LOGS);
      const updated = { ...s, callLogs: logs };
      persist(updated);
      return updated;
    });
  },

  clearCallLogs: () => {
    set((s) => {
      const updated = { ...s, callLogs: [] };
      persist(updated);
      return updated;
    });
  },

  getRecentLogs: (limit = 20) => get().callLogs.slice(0, limit),

  getLogsByEndpoint: (endpointId) =>
    get().callLogs.filter((l) => l.endpointId === endpointId),

  addApiKey: (data) => {
    const key: ApiKey = { ...data, id: generateId(), createdAt: Date.now() };
    set((s) => {
      const updated = { ...s, apiKeys: [...s.apiKeys, key] };
      persist(updated);
      return updated;
    });
  },

  deleteApiKey: (id) => {
    set((s) => {
      const updated = { ...s, apiKeys: s.apiKeys.filter((k) => k.id !== id) };
      persist(updated);
      return updated;
    });
  },

  toggleFavorite: (endpointId) => {
    set((s) => {
      const updated = {
        ...s,
        endpoints: s.endpoints.map((e) =>
          e.id === endpointId ? { ...e, isFavorite: !e.isFavorite, updatedAt: Date.now() } : e
        ),
      };
      persist(updated);
      return updated;
    });
  },

  getFavorites: () => get().endpoints.filter((e) => e.isFavorite),

  search: (query) => {
    const q = query.toLowerCase();
    return {
      collections: get().collections.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
      endpoints: get().endpoints.filter((e) => e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)),
      logs: get().callLogs.filter((l) => l.endpointName.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)),
    };
  },

  exportCollection: (collectionId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    const eps = get().endpoints.filter((e) => e.collectionId === collectionId);
    return JSON.stringify({ collection: col, endpoints: eps }, null, 2);
  },

  importCollection: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.collection || !data.endpoints) return false;
      const newColId = generateId();
      const col: ApiCollection = {
        ...data.collection,
        id: newColId,
        createdAt: Date.now(),
      };
      const eps: ApiEndpoint[] = data.endpoints.map((ep: any) => ({
        ...ep,
        id: generateId(),
        collectionId: newColId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      set((s) => {
        const updated = {
          ...s,
          collections: [...s.collections, col],
          endpoints: [...s.endpoints, ...eps],
        };
        persist(updated);
        return updated;
      });
      return true;
    } catch {
      return false;
    }
  },

  moveCollection: (id, direction) => {
    set((s) => {
      const cols = [...s.collections];
      const idx = cols.findIndex((c) => c.id === id);
      if (idx < 0) return s;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= cols.length) return s;
      [cols[idx], cols[swap]] = [cols[swap], cols[idx]];
      const updated = { ...s, collections: cols };
      persist(updated);
      return updated;
    });
  },

  moveEndpoint: (id, direction) => {
    set((s) => {
      const ep = s.endpoints.find((e) => e.id === id);
      if (!ep) return s;
      const colEps = s.endpoints.filter((e) => e.collectionId === ep.collectionId);
      const others = s.endpoints.filter((e) => e.collectionId !== ep.collectionId);
      const idx = colEps.findIndex((e) => e.id === id);
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= colEps.length) return s;
      [colEps[idx], colEps[swap]] = [colEps[swap], colEps[idx]];
      const updated = { ...s, endpoints: [...others, ...colEps] };
      persist(updated);
      return updated;
    });
  },

  getTotalCalls: () => get().callLogs.length,

  getAvgResponseTime: () => {
    const logs = get().callLogs;
    if (logs.length === 0) return 0;
    return Math.round(logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length);
  },

  getSuccessRate: () => {
    const logs = get().callLogs;
    if (logs.length === 0) return 100;
    const success = logs.filter((l) => l.success).length;
    return Math.round((success / logs.length) * 100);
  },

  getCallsToday: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return get().callLogs.filter((l) => l.timestamp >= start.getTime()).length;
  },

  initialize: async () => {
    try {
      const [cols, eps, logs, keys] = await Promise.all([
        AsyncStorage.getItem('api_collections'),
        AsyncStorage.getItem('api_endpoints'),
        AsyncStorage.getItem('api_call_logs'),
        AsyncStorage.getItem('api_keys'),
      ]);
      set({
        collections: cols ? JSON.parse(cols) : [],
        endpoints: eps ? JSON.parse(eps) : [],
        callLogs: logs ? JSON.parse(logs) : [],
        apiKeys: keys ? JSON.parse(keys) : [],
      });
    } catch {}
  },
}));
