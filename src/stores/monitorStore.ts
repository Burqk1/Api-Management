import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { MonitorCheck, MonitorPing, generateId } from '../types/api';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function sendDownAlert(name: string, url: string) {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${name} is DOWN`,
        body: `Health check failed for ${url}`,
        sound: true,
      },
      trigger: null,
    });
  } catch (e) { console.warn('[monitorStore] Failed to send alert:', e); }
}

interface MonitorState {
  checks: MonitorCheck[];
  notificationsEnabled: boolean;
  addCheck: (data: Omit<MonitorCheck, 'id' | 'consecutiveFailures' | 'history'>) => void;
  updateCheck: (id: string, data: Partial<MonitorCheck>) => void;
  removeCheck: (id: string) => void;
  addPing: (checkId: string, ping: MonitorPing) => void;
  getUpCount: () => number;
  getDownCount: () => number;
  setNotificationsEnabled: (enabled: boolean) => void;
  initialize: () => Promise<void>;
}

const MAX_PING_HISTORY = 50;

export const useMonitorStore = create<MonitorState>((set, get) => ({
  checks: [],
  notificationsEnabled: true,

  addCheck: (data) => {
    const check: MonitorCheck = {
      ...data,
      id: generateId(),
      consecutiveFailures: 0,
      history: [],
    };
    set((s) => {
      const updated = [...s.checks, check];
      AsyncStorage.setItem('monitors', JSON.stringify(updated));
      return { checks: updated };
    });
  },

  updateCheck: (id, data) => {
    set((s) => {
      const updated = s.checks.map((c) => (c.id === id ? { ...c, ...data } : c));
      AsyncStorage.setItem('monitors', JSON.stringify(updated));
      return { checks: updated };
    });
  },

  removeCheck: (id) => {
    set((s) => {
      const updated = s.checks.filter((c) => c.id !== id);
      AsyncStorage.setItem('monitors', JSON.stringify(updated));
      return { checks: updated };
    });
  },

  addPing: (checkId, ping) => {
    const state = get();
    const check = state.checks.find((c) => c.id === checkId);

    // Send notification if transitioning from up to down
    if (check && check.isUp !== false && !ping.success && state.notificationsEnabled) {
      sendDownAlert(check.endpointName, check.url);
    }

    set((s) => {
      const updated = s.checks.map((c) => {
        if (c.id !== checkId) return c;
        const history = [ping, ...c.history].slice(0, MAX_PING_HISTORY);
        return {
          ...c,
          history,
          lastCheck: ping.timestamp,
          lastStatus: ping.statusCode,
          lastResponseTime: ping.responseTime,
          isUp: ping.success,
          consecutiveFailures: ping.success ? 0 : c.consecutiveFailures + 1,
        };
      });
      AsyncStorage.setItem('monitors', JSON.stringify(updated));
      return { checks: updated };
    });
  },

  getUpCount: () => get().checks.filter((c) => c.enabled && c.isUp === true).length,
  getDownCount: () => get().checks.filter((c) => c.enabled && c.isUp === false).length,

  setNotificationsEnabled: (enabled) => {
    AsyncStorage.setItem('monitor_notifications', JSON.stringify(enabled));
    set({ notificationsEnabled: enabled });
  },

  initialize: async () => {
    try {
      const [saved, notifSaved] = await Promise.all([
        AsyncStorage.getItem('monitors'),
        AsyncStorage.getItem('monitor_notifications'),
      ]);
      const state: Partial<MonitorState> = {};
      if (saved) state.checks = JSON.parse(saved);
      if (notifSaved !== null) state.notificationsEnabled = JSON.parse(notifSaved);
      set(state);
    } catch (e) { console.warn('[monitorStore] Failed to initialize:', e); }
  },
}));
