import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../types/api';

export interface EnvVariable {
  key: string;
  value: string;
}

export interface Environment {
  id: string;
  name: string;
  color: string;
  variables: EnvVariable[];
  createdAt: number;
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvId: string | null;
  lastResponse: Record<string, any> | null;
  addEnvironment: (data: Omit<Environment, 'id' | 'createdAt'>) => void;
  updateEnvironment: (id: string, data: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnv: (id: string | null) => void;
  getActiveEnv: () => Environment | null;
  setLastResponse: (data: Record<string, any>) => void;
  resolveVariables: (text: string) => string;
  initialize: () => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvId: null,
  lastResponse: null,

  addEnvironment: (data) => {
    const env: Environment = { ...data, id: generateId(), createdAt: Date.now() };
    set((s) => {
      const updated = [...s.environments, env];
      AsyncStorage.setItem('environments', JSON.stringify(updated));
      return { environments: updated };
    });
  },

  updateEnvironment: (id, data) => {
    set((s) => {
      const updated = s.environments.map((e) => (e.id === id ? { ...e, ...data } : e));
      AsyncStorage.setItem('environments', JSON.stringify(updated));
      return { environments: updated };
    });
  },

  deleteEnvironment: (id) => {
    set((s) => {
      const updated = s.environments.filter((e) => e.id !== id);
      const activeEnvId = s.activeEnvId === id ? null : s.activeEnvId;
      AsyncStorage.setItem('environments', JSON.stringify(updated));
      AsyncStorage.setItem('active_env', JSON.stringify(activeEnvId));
      return { environments: updated, activeEnvId };
    });
  },

  setActiveEnv: (id) => {
    AsyncStorage.setItem('active_env', JSON.stringify(id));
    set({ activeEnvId: id });
  },

  getActiveEnv: () => {
    const { environments, activeEnvId } = get();
    return environments.find((e) => e.id === activeEnvId) || null;
  },

  setLastResponse: (data) => set({ lastResponse: data }),

  // Replace {{VAR_NAME}} and {{response.path}} with values
  resolveVariables: (text) => {
    const env = get().getActiveEnv();
    const lastResp = get().lastResponse;

    // First resolve response chaining: {{response.path.to.field}}
    let resolved = text.replace(/\{\{response\.([^}]+)\}\}/g, (match, path) => {
      if (!lastResp) return match;
      try {
        const val = path.split('.').reduce((o: any, k: string) => o?.[k], lastResp);
        return val !== undefined ? String(val) : match;
      } catch { return match; }
    });

    // Then resolve environment variables
    if (env) {
      resolved = resolved.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const v = env.variables.find((v: EnvVariable) => v.key === key);
        return v ? v.value : match;
      });
    }
    return resolved;
  },

  initialize: async () => {
    try {
      const [envData, activeData] = await Promise.all([
        AsyncStorage.getItem('environments'),
        AsyncStorage.getItem('active_env'),
      ]);
      set({
        environments: envData ? JSON.parse(envData) : [],
        activeEnvId: activeData ? JSON.parse(activeData) : null,
      });
    } catch {}
  },
}));
