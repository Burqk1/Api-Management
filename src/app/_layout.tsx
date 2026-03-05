import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../stores/themeStore';
import { useApiStore } from '../stores/apiStore';
import { useMonitorStore } from '../stores/monitorStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useLanguageStore } from '../stores/languageStore';
import { useMockStore } from '../stores/mockStore';
import { useOfflineStore } from '../stores/offlineStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';

export default function RootLayout() {
  const initialize = useThemeStore((s) => s.initialize);
  const initApi = useApiStore((s) => s.initialize);
  const initMonitor = useMonitorStore((s) => s.initialize);
  const initEnv = useEnvironmentStore((s) => s.initialize);
  const initLang = useLanguageStore((s) => s.initialize);
  const initMock = useMockStore((s) => s.initialize);
  const initOffline = useOfflineStore((s) => s.initialize);
  const initAuth = useAuthStore((s) => s.initialize);
  const initSync = useSyncStore((s) => s.initialize);
  const initSub = useSubscriptionStore((s) => s.initialize);
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    initialize();
    initApi();
    initMonitor();
    initEnv();
    initLang();
    initMock();
    initOffline();
    initAuth();
    initSync();
    initSub();

    // Show onboarding on first launch
    AsyncStorage.getItem('onboarding_done').then((val) => {
      if (!val) {
        setTimeout(() => router.push('/onboarding' as any), 500);
      }
    });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="endpoint/[id]"
          options={{ headerBackTitle: t('cancel'), title: t('testEndpoint') }}
        />
        <Stack.Screen
          name="collection/new"
          options={{ headerBackTitle: t('cancel'), title: t('newCollection'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="endpoint/new"
          options={{ headerBackTitle: t('cancel'), title: t('newEndpoint'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="runner/[collectionId]"
          options={{ headerBackTitle: t('cancel'), title: t('collectionRunner') }}
        />
        <Stack.Screen
          name="analytics"
          options={{ headerBackTitle: t('cancel'), title: t('analytics') }}
        />
        <Stack.Screen
          name="environments"
          options={{ headerBackTitle: t('cancel'), title: t('environments'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="log/[id]"
          options={{ headerBackTitle: t('cancel'), title: t('requestDetail') }}
        />
        <Stack.Screen
          name="websocket"
          options={{ headerBackTitle: t('cancel'), title: t('websocketTesting'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="search"
          options={{ headerBackTitle: t('cancel'), title: t('globalSearch'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="compare"
          options={{ headerBackTitle: t('cancel'), title: t('compareRequests') }}
        />
        <Stack.Screen
          name="mockserver"
          options={{ headerBackTitle: t('cancel'), title: t('mockServer'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="offlinequeue"
          options={{ headerBackTitle: t('cancel'), title: t('offlineQueue') }}
        />
        <Stack.Screen
          name="templates"
          options={{ headerBackTitle: t('cancel'), title: t('templates'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="quicksend"
          options={{ headerBackTitle: t('cancel'), title: t('quickSend'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth"
          options={{ headerBackTitle: t('cancel'), title: t('signIn'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerBackTitle: t('cancel'), title: t('profile') }}
        />
        <Stack.Screen
          name="paywall"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="aianalysis"
          options={{ headerBackTitle: t('cancel'), title: t('aiAnalysis') }}
        />
        <Stack.Screen
          name="chaining"
          options={{ headerBackTitle: t('cancel'), title: t('requestChaining'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="import"
          options={{ headerBackTitle: t('cancel'), title: t('importData'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
