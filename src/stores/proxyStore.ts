import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProxyConfig } from '../types/api';

interface ProxyState {
  proxy: ProxyConfig;
  setProxy: (config: Partial<ProxyConfig>) => void;
  initialize: () => Promise<void>;
}

const defaultProxy: ProxyConfig = {
  enabled: false,
  host: '',
  port: 8080,
};

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxy: defaultProxy,

  setProxy: (config) => {
    set((s) => {
      const updated = { ...s.proxy, ...config };
      AsyncStorage.setItem('proxy_config', JSON.stringify(updated));
      return { proxy: updated };
    });
  },

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('proxy_config');
      if (saved) set({ proxy: JSON.parse(saved) });
    } catch {}
  },
}));
