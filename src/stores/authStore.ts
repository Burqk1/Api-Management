import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type SubscriptionPlan = 'free' | 'pro' | 'team';

interface AuthState {
  user: User | null;
  session: Session | null;
  plan: SubscriptionPlan;
  loading: boolean;

  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setPlan: (plan: SubscriptionPlan) => void;
  isPro: () => boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  plan: 'free',
  loading: true,

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user, session: data.session });
    return {};
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user, session: data.session });
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, plan: 'free' });
  },

  setPlan: (plan) => set({ plan }),

  isPro: () => {
    const { plan } = get();
    return plan === 'pro' || plan === 'team';
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ user: session.user, session });
        // Fetch subscription from Supabase profile
        const { data } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', session.user.id)
          .single();
        if (data?.plan) set({ plan: data.plan });
      }
    } catch {}
    set({ loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
  },
}));
