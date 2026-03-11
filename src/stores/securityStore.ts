import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityState {
  biometricEnabled: boolean;
  isLocked: boolean;
  lastUnlockTime: number | null;
  autoLockTimeout: number; // minutes, 0 = immediate
  setBiometricEnabled: (enabled: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setAutoLockTimeout: (minutes: number) => void;
  unlock: () => void;
  checkShouldLock: () => boolean;
  initialize: () => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  biometricEnabled: false,
  isLocked: false,
  lastUnlockTime: null,
  autoLockTimeout: 0,

  setBiometricEnabled: (enabled) => {
    AsyncStorage.setItem('security_biometric', JSON.stringify(enabled));
    set({ biometricEnabled: enabled, isLocked: enabled });
  },

  setIsLocked: (locked) => set({ isLocked: locked }),

  setAutoLockTimeout: (minutes) => {
    AsyncStorage.setItem('security_auto_lock', JSON.stringify(minutes));
    set({ autoLockTimeout: minutes });
  },

  unlock: () => {
    set({ isLocked: false, lastUnlockTime: Date.now() });
  },

  checkShouldLock: () => {
    const { biometricEnabled, lastUnlockTime, autoLockTimeout } = get();
    if (!biometricEnabled) return false;
    if (!lastUnlockTime) return true;
    const elapsed = (Date.now() - lastUnlockTime) / 60000;
    return elapsed > autoLockTimeout;
  },

  initialize: async () => {
    try {
      const [bio, timeout] = await Promise.all([
        AsyncStorage.getItem('security_biometric'),
        AsyncStorage.getItem('security_auto_lock'),
      ]);
      const biometricEnabled = bio ? JSON.parse(bio) : false;
      set({
        biometricEnabled,
        isLocked: biometricEnabled,
        autoLockTimeout: timeout ? JSON.parse(timeout) : 0,
      });
    } catch (e) { console.warn('[securityStore] Failed to initialize:', e); }
  },
}));
