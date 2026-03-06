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
  globalVariables: EnvVariable[];
  addEnvironment: (data: Omit<Environment, 'id' | 'createdAt'>) => void;
  updateEnvironment: (id: string, data: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnv: (id: string | null) => void;
  getActiveEnv: () => Environment | null;
  setLastResponse: (data: Record<string, any>) => void;
  setGlobalVariables: (vars: EnvVariable[]) => void;
  resolveVariables: (text: string) => string;
  initialize: () => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvId: null,
  lastResponse: null,
  globalVariables: [],

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

  setGlobalVariables: (vars) => {
    AsyncStorage.setItem('global_variables', JSON.stringify(vars));
    set({ globalVariables: vars });
  },

  // Replace {{VAR_NAME}} and {{response.path}} with values
  // Resolution order: response > env-specific > global
  resolveVariables: (text) => {
    const env = get().getActiveEnv();
    const globalVars = get().globalVariables;
    const lastResp = get().lastResponse;

    // First resolve response chaining: {{response.path.to.field}}
    let resolved = text.replace(/\{\{response\.([^}]+)\}\}/g, (match, path) => {
      if (!lastResp) return match;
      try {
        const val = path.split('.').reduce((o: any, k: string) => o?.[k], lastResp);
        return val !== undefined ? String(val) : match;
      } catch { return match; }
    });

    // Resolve environment variables (env-specific overrides global)
    resolved = resolved.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      // Check env-specific first
      if (env) {
        const v = env.variables.find((v: EnvVariable) => v.key === key);
        if (v) return v.value;
      }
      // Fall back to global
      const g = globalVars.find((v: EnvVariable) => v.key === key);
      return g ? g.value : match;
    });

    return resolved;
  },

  initialize: async () => {
    try {
      const [envData, activeData, globalData] = await Promise.all([
        AsyncStorage.getItem('environments'),
        AsyncStorage.getItem('active_env'),
        AsyncStorage.getItem('global_variables'),
      ]);
      set({
        environments: envData ? JSON.parse(envData) : [],
        activeEnvId: activeData ? JSON.parse(activeData) : null,
        globalVariables: globalData ? JSON.parse(globalData) : [],
      });
    } catch {}
  },
}));
