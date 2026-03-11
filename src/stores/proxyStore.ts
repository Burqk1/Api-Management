import { create } from 'zustand';
import { ProxyConfig } from '../types/api';
import { setSecure, getSecure } from '../utils/secureStorage';

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
      // Proxy config may contain auth credentials — store securely
      setSecure('proxy_config', JSON.stringify(updated)).catch((e) =>
        console.warn('[proxyStore] Failed to save proxy config:', e)
      );
      return { proxy: updated };
    });
  },

  initialize: async () => {
    try {
      const saved = await getSecure('proxy_config');
      if (saved) set({ proxy: JSON.parse(saved) });
    } catch (e) { console.warn('[proxyStore] Failed to initialize:', e); }
  },
}));
