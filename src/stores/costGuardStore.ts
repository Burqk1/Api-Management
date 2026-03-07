import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

// --- Plan Limitleri ---
const PLAN_LIMITS = {
  free: {
    aiRequestsPerDay: 0,
    maxCollections: 3,
    maxEndpointsPerCollection: 20,
    maxCallLogs: 100,
    maxStorageMB: 50,
    mockServerRoutes: 3,
    loadTestMaxUsers: 5,
  },
  pro: {
    aiRequestsPerDay: 10,
    maxCollections: Infinity,
    maxEndpointsPerCollection: Infinity,
    maxCallLogs: 5000,
    maxStorageMB: 500,
    mockServerRoutes: Infinity,
    loadTestMaxUsers: 100,
  },
  team: {
    aiRequestsPerDay: 30,
    maxCollections: Infinity,
    maxEndpointsPerCollection: Infinity,
    maxCallLogs: 20000,
    maxStorageMB: 2000,
    mockServerRoutes: Infinity,
    loadTestMaxUsers: 500,
  },
};

// --- AI Cache ---
interface CachedAIResponse {
  promptHash: string;
  response: string;
  timestamp: number;
  model: string;
}

const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat
const AI_CACHE_MAX = 50;

// --- Store ---
interface CostGuardState {
  // AI günlük kullanım
  aiDailyCount: number;
  aiLastResetDate: string;
  aiCache: CachedAIResponse[];

  // Kullanım istatistikleri
  totalAIRequests: number;
  totalAITokensEstimate: number;
  storageUsageMB: number;

  // AI Rate Limiting
  canUseAI: () => boolean;
  getRemainingAIRequests: () => number;
  getAIDailyLimit: () => number;
  incrementAIUsage: (tokensEstimate?: number) => void;
  resetDailyIfNeeded: () => void;

  // AI Cache
  getCachedResponse: (promptHash: string) => string | null;
  setCachedResponse: (promptHash: string, response: string, model: string) => void;
  clearExpiredCache: () => void;

  // AI Model seçimi (maliyet optimizasyonu)
  getOptimalModel: (promptType: string) => { model: string; maxTokens: number };

  // Storage limitleri
  getMaxCallLogs: () => number;
  getMaxCollections: () => number;
  canCreateCollection: (currentCount: number) => boolean;
  canAddEndpoint: (currentCount: number) => boolean;

  // Kullanım raporu
  getUsageReport: () => {
    aiUsed: number;
    aiLimit: number;
    aiPercentage: number;
    plan: string;
    storageUsed: number;
    storageLimit: number;
  };

  // Persistence
  initialize: () => Promise<void>;
  persist: () => void;
}

// Basit hash fonksiyonu (cache key için)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const STORAGE_KEY = 'cost_guard_data';

export const useCostGuardStore = create<CostGuardState>((set, get) => ({
  aiDailyCount: 0,
  aiLastResetDate: new Date().toDateString(),
  aiCache: [],
  totalAIRequests: 0,
  totalAITokensEstimate: 0,
  storageUsageMB: 0,

  // --- AI Rate Limiting ---
  canUseAI: () => {
    get().resetDailyIfNeeded();
    const plan = useAuthStore.getState().plan;
    const limit = PLAN_LIMITS[plan].aiRequestsPerDay;
    return get().aiDailyCount < limit;
  },

  getRemainingAIRequests: () => {
    get().resetDailyIfNeeded();
    const plan = useAuthStore.getState().plan;
    const limit = PLAN_LIMITS[plan].aiRequestsPerDay;
    return Math.max(0, limit - get().aiDailyCount);
  },

  getAIDailyLimit: () => {
    const plan = useAuthStore.getState().plan;
    return PLAN_LIMITS[plan].aiRequestsPerDay;
  },

  incrementAIUsage: (tokensEstimate = 500) => {
    get().resetDailyIfNeeded();
    set((s) => ({
      aiDailyCount: s.aiDailyCount + 1,
      totalAIRequests: s.totalAIRequests + 1,
      totalAITokensEstimate: s.totalAITokensEstimate + tokensEstimate,
    }));
    get().persist();
  },

  resetDailyIfNeeded: () => {
    const today = new Date().toDateString();
    if (get().aiLastResetDate !== today) {
      set({ aiDailyCount: 0, aiLastResetDate: today });
      get().persist();
    }
  },

  // --- AI Cache ---
  getCachedResponse: (promptHash: string) => {
    const cached = get().aiCache.find(
      (c) => c.promptHash === promptHash && (Date.now() - c.timestamp) < AI_CACHE_TTL
    );
    return cached?.response || null;
  },

  setCachedResponse: (promptHash, response, model) => {
    set((s) => {
      const filtered = s.aiCache.filter((c) => c.promptHash !== promptHash);
      const newCache = [
        { promptHash, response, timestamp: Date.now(), model },
        ...filtered,
      ].slice(0, AI_CACHE_MAX);
      return { aiCache: newCache };
    });
    get().persist();
  },

  clearExpiredCache: () => {
    set((s) => ({
      aiCache: s.aiCache.filter((c) => (Date.now() - c.timestamp) < AI_CACHE_TTL),
    }));
  },

  // --- AI Model Optimizasyonu ---
  getOptimalModel: (promptType: string) => {
    // Basit sorgular için ucuz model, karmaşık sorgular için güçlü model
    const cheapPrompts = ['analyzeError', 'explainResponse'];
    const expensivePrompts = ['generateDocs', 'optimizeSuggestion', 'custom'];

    if (cheapPrompts.includes(promptType)) {
      return { model: 'claude-haiku-4-5-20251001', maxTokens: 512 };
    }
    if (expensivePrompts.includes(promptType)) {
      return { model: 'claude-sonnet-4-20250514', maxTokens: 1024 };
    }
    // suggestFix vb. → orta model
    return { model: 'claude-haiku-4-5-20251001', maxTokens: 768 };
  },

  // --- Storage Limitleri ---
  getMaxCallLogs: () => {
    const plan = useAuthStore.getState().plan;
    return PLAN_LIMITS[plan].maxCallLogs;
  },

  getMaxCollections: () => {
    const plan = useAuthStore.getState().plan;
    return PLAN_LIMITS[plan].maxCollections;
  },

  canCreateCollection: (currentCount) => {
    return currentCount < get().getMaxCollections();
  },

  canAddEndpoint: (currentCount) => {
    const plan = useAuthStore.getState().plan;
    return currentCount < PLAN_LIMITS[plan].maxEndpointsPerCollection;
  },

  // --- Kullanım Raporu ---
  getUsageReport: () => {
    const plan = useAuthStore.getState().plan;
    const limits = PLAN_LIMITS[plan];
    const { aiDailyCount, storageUsageMB } = get();
    return {
      aiUsed: aiDailyCount,
      aiLimit: limits.aiRequestsPerDay,
      aiPercentage: limits.aiRequestsPerDay > 0 ? Math.round((aiDailyCount / limits.aiRequestsPerDay) * 100) : 0,
      plan,
      storageUsed: storageUsageMB,
      storageLimit: limits.maxStorageMB,
    };
  },

  // --- Persistence ---
  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        set({
          aiDailyCount: data.aiDailyCount || 0,
          aiLastResetDate: data.aiLastResetDate || new Date().toDateString(),
          aiCache: data.aiCache || [],
          totalAIRequests: data.totalAIRequests || 0,
          totalAITokensEstimate: data.totalAITokensEstimate || 0,
          storageUsageMB: data.storageUsageMB || 0,
        });
        get().resetDailyIfNeeded();
        get().clearExpiredCache();
      }
    } catch {}
  },

  persist: () => {
    const { aiDailyCount, aiLastResetDate, aiCache, totalAIRequests, totalAITokensEstimate, storageUsageMB } = get();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      aiDailyCount, aiLastResetDate, aiCache, totalAIRequests, totalAITokensEstimate, storageUsageMB,
    }));
  },
}));

// Hash fonksiyonunu export et (aianalysis'te kullanacağız)
export { simpleHash };
