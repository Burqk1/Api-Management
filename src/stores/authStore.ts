import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getCustomerInfo,
  planFromCustomerInfo,
  addCustomerInfoListener,
} from '../lib/revenueCat';
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
  setPlan: (plan: SubscriptionPlan) => Promise<void>;
  syncPlanFromRevenueCat: () => Promise<void>;
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

    if (data.user) {
      set({ user: data.user, session: data.session });
      // Sync RevenueCat with Supabase user ID
      try {
        const customerInfo = await loginRevenueCat(data.user.id);
        const plan = planFromCustomerInfo(customerInfo);
        set({ plan });
        // Mirror plan to Supabase backend
        await supabase.from('profiles').update({ plan }).eq('id', data.user.id);
      } catch (e) {
        console.warn('[authStore] RevenueCat login failed:', e);
      }
    }
    return {};
  },

  signOut: async () => {
    try { await logoutRevenueCat(); } catch (e) { console.warn('[authStore] RC logout:', e); }
    await supabase.auth.signOut();
    set({ user: null, session: null, plan: 'free' });
  },

  setPlan: async (plan) => {
    const user = get().user;
    if (!user) return;
    // Backend mirror — RevenueCat is the source of truth for subscriptions
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('id', user.id);
      if (error) {
        console.warn('[authStore] Failed to update plan on server:', error.message);
        return;
      }
      set({ plan });
    } catch (e) {
      console.warn('[authStore] setPlan failed:', e);
    }
  },

  syncPlanFromRevenueCat: async () => {
    try {
      const info = await getCustomerInfo();
      const plan = planFromCustomerInfo(info);
      const currentPlan = get().plan;
      if (plan !== currentPlan) {
        set({ plan });
        const user = get().user;
        if (user) {
          await supabase.from('profiles').update({ plan }).eq('id', user.id);
        }
      }
    } catch (e) {
      console.warn('[authStore] syncPlanFromRevenueCat failed:', e);
    }
  },

  isPro: () => {
    const { plan } = get();
    return plan === 'pro' || plan === 'team';
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Initialize RevenueCat (with user ID if logged in)
      await initRevenueCat(session?.user?.id);

      if (session) {
        set({ user: session.user, session });

        // RevenueCat is source of truth for plan
        try {
          const info = await getCustomerInfo();
          const plan = planFromCustomerInfo(info);
          set({ plan });
          // Sync to Supabase backend
          await supabase.from('profiles').update({ plan }).eq('id', session.user.id);
        } catch {
          // Fallback: fetch plan from Supabase profile
          const { data } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', session.user.id)
            .single();
          if (data?.plan) set({ plan: data.plan });
        }
      }
    } catch (e) { console.warn('[authStore] Failed to initialize:', e); }
    set({ loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });

    // Listen for subscription changes (renewal, expiration, upgrade)
    addCustomerInfoListener((info) => {
      const plan = planFromCustomerInfo(info);
      set({ plan });
      const user = get().user;
      if (user) {
        supabase.from('profiles').update({ plan }).eq('id', user.id);
      }
    });
  },
}));
