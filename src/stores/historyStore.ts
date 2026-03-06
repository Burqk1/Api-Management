import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EndpointVersion, ApiEndpoint, generateId } from '../types/api';

interface HistoryState {
  versions: EndpointVersion[];
  initialize: () => Promise<void>;
  saveVersion: (endpoint: ApiEndpoint, label?: string) => void;
  getVersions: (endpointId: string) => EndpointVersion[];
  deleteVersion: (versionId: string) => void;
  clearEndpointHistory: (endpointId: string) => void;
}

const STORAGE_KEY = 'endpoint_history';

export const useHistoryStore = create<HistoryState>((set, get) => ({
  versions: [],

  initialize: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) set({ versions: JSON.parse(data) });
    } catch {}
  },

  saveVersion: (endpoint, label) => {
    const { id, collectionId, createdAt, ...snapshot } = endpoint;
    const version: EndpointVersion = {
      id: generateId(),
      endpointId: endpoint.id,
      snapshot,
      label,
      timestamp: Date.now(),
    };
    const versions = [...get().versions, version];
    // Keep max 50 versions per endpoint
    const grouped: Record<string, EndpointVersion[]> = {};
    versions.forEach((v) => {
      if (!grouped[v.endpointId]) grouped[v.endpointId] = [];
      grouped[v.endpointId].push(v);
    });
    const trimmed = Object.values(grouped).flatMap((arr) => arr.slice(-50));
    set({ versions: trimmed });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  },

  getVersions: (endpointId) => {
    return get().versions.filter((v) => v.endpointId === endpointId).sort((a, b) => b.timestamp - a.timestamp);
  },

  deleteVersion: (versionId) => {
    const versions = get().versions.filter((v) => v.id !== versionId);
    set({ versions });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  },

  clearEndpointHistory: (endpointId) => {
    const versions = get().versions.filter((v) => v.endpointId !== endpointId);
    set({ versions });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  },
}));
