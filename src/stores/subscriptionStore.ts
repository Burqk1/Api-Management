import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, SubscriptionPlan } from './authStore';

interface FeatureGate {
  maxCollections: number;
  maxEndpointsPerCollection: number;
  maxRequestsPerDay: number;
  maxCallLogs: number;
  logRetentionDays: number;
  cloudSync: boolean;
  aiAnalysis: boolean;
  requestChaining: boolean;
  teamSharing: boolean;
  exportImport: boolean;
  advancedTools: boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, FeatureGate> = {
  free: {
    maxCollections: 3,
    maxEndpointsPerCollection: 20,
    maxRequestsPerDay: 50,
    maxCallLogs: 100,
    logRetentionDays: 7,
    cloudSync: false,
    aiAnalysis: false,
    requestChaining: false,
    teamSharing: false,
    exportImport: true,
    advancedTools: false,
  },
  pro: {
    maxCollections: Infinity,
    maxEndpointsPerCollection: Infinity,
    maxRequestsPerDay: Infinity,
    maxCallLogs: 5000,
    logRetentionDays: 90,
    cloudSync: true,
    aiAnalysis: true,
    requestChaining: true,
    teamSharing: false,
    exportImport: true,
    advancedTools: true,
  },
  team: {
    maxCollections: Infinity,
    maxEndpointsPerCollection: Infinity,
    maxRequestsPerDay: Infinity,
    maxCallLogs: 20000,
    logRetentionDays: 365,
    cloudSync: true,
    aiAnalysis: true,
    requestChaining: true,
    teamSharing: true,
    exportImport: true,
    advancedTools: true,
  },
};

interface SubscriptionState {
  dailyRequestCount: number;
  lastResetDate: string;

  getGates: () => FeatureGate;
  canMakeRequest: () => boolean;
  incrementRequestCount: () => void;
  canCreateCollection: (currentCount: number) => boolean;
  requiresPro: (feature: keyof FeatureGate) => boolean;
  initialize: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  dailyRequestCount: 0,
  lastResetDate: new Date().toDateString(),

  getGates: () => {
    const plan = useAuthStore.getState().plan;
    return PLAN_LIMITS[plan];
  },

  canMakeRequest: () => {
    const { dailyRequestCount, lastResetDate } = get();
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      set({ dailyRequestCount: 0, lastResetDate: today });
      return true;
    }
    const gates = get().getGates();
    return dailyRequestCount < gates.maxRequestsPerDay;
  },

  incrementRequestCount: () => {
    const today = new Date().toDateString();
    const { lastResetDate } = get();
    if (lastResetDate !== today) {
      set({ dailyRequestCount: 1, lastResetDate: today });
    } else {
      set((s) => ({ dailyRequestCount: s.dailyRequestCount + 1 }));
    }
    AsyncStorage.setItem('daily_req_count', JSON.stringify({
      count: get().dailyRequestCount,
      date: today,
    }));
  },

  canCreateCollection: (currentCount) => {
    return currentCount < get().getGates().maxCollections;
  },

  requiresPro: (feature) => {
    const gates = get().getGates();
    return !gates[feature];
  },

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('daily_req_count');
      if (saved) {
        const { count, date } = JSON.parse(saved);
        const today = new Date().toDateString();
        set({
          dailyRequestCount: date === today ? count : 0,
          lastResetDate: date === today ? date : today,
        });
      }
    } catch (e) { console.warn('[subscriptionStore] Failed to initialize:', e); }
  },
}));
