import React, { useEffect, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTE_PLAN_MAP } from '../hooks/useRouteGuard';
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
import { useCookieStore } from '../stores/cookieStore';
import { useProxyStore } from '../stores/proxyStore';
import { useHistoryStore } from '../stores/historyStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useCostGuardStore } from '../stores/costGuardStore';

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
  const initCookie = useCookieStore((s) => s.initialize);
  const initProxy = useProxyStore((s) => s.initialize);
  const initHistory = useHistoryStore((s) => s.initialize);
  const initWorkspace = useWorkspaceStore((s) => s.initialize);
  const initCostGuard = useCostGuardStore((s) => s.initialize);
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const plan = useAuthStore((s) => s.plan);

  // Route guard: block deep link access to pro/team routes
  const screenListeners = useCallback(() => ({
    beforeRemove: () => {},
    focus: (e: any) => {
      const routeName = e?.target?.split('-')?.[0];
      if (!routeName) return;
      const required = ROUTE_PLAN_MAP[routeName];
      if (!required) return;
      const hasAccess =
        required === 'pro' ? (plan === 'pro' || plan === 'team') :
        required === 'team' ? plan === 'team' : true;
      if (!hasAccess) {
        router.replace('/paywall' as any);
      }
    },
  }), [plan, router]);

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
    initCookie();
    initProxy();
    initHistory();
    initWorkspace();
    initCostGuard();

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
        screenListeners={screenListeners}
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
        <Stack.Screen
          name="sse"
          options={{ headerBackTitle: t('cancel'), title: t('sseTesting'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="cookies"
          options={{ headerBackTitle: t('cancel'), title: t('cookieManager'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="apidocs"
          options={{ headerBackTitle: t('cancel'), title: t('apiDocs'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="proxy"
          options={{ headerBackTitle: t('cancel'), title: t('proxySettings'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="benchmark"
          options={{ headerBackTitle: t('cancel'), title: t('benchmark'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="sslconfig"
          options={{ headerBackTitle: t('cancel'), title: t('sslCertificates'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="endpointhistory"
          options={{ headerBackTitle: t('cancel'), title: t('endpointHistory') }}
        />
        <Stack.Screen
          name="graphqlexplorer"
          options={{ headerBackTitle: t('cancel'), title: t('graphqlExplorer'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="responseviewer"
          options={{ headerBackTitle: t('cancel'), title: t('responseViewer') }}
        />
        <Stack.Screen
          name="scripteditor"
          options={{ headerBackTitle: t('cancel'), title: t('scriptEditor'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="history"
          options={{ headerBackTitle: t('cancel'), title: t('requestHistory') }}
        />
        <Stack.Screen
          name="jsonpath"
          options={{ headerBackTitle: t('cancel'), title: t('jsonPathEvaluator') || 'JSONPath Evaluator', presentation: 'modal' }}
        />
        <Stack.Screen
          name="grpc"
          options={{ headerBackTitle: t('cancel'), title: t('grpcClient') || 'gRPC Client', presentation: 'modal' }}
        />
        <Stack.Screen
          name="datadriven"
          options={{ headerBackTitle: t('cancel'), title: t('dataDrivenTesting') || 'Data-Driven Testing', presentation: 'modal' }}
        />
        <Stack.Screen
          name="testreport"
          options={{ headerBackTitle: t('cancel'), title: t('testReport') || 'Test Report' }}
        />
        <Stack.Screen
          name="workspaces"
          options={{ headerBackTitle: t('cancel'), title: t('workspaces') || 'Workspaces', presentation: 'modal' }}
        />
        <Stack.Screen
          name="dynamicvars"
          options={{ headerBackTitle: t('cancel'), title: t('dynamicVariables') || 'Dynamic Variables', presentation: 'modal' }}
        />
        <Stack.Screen
          name="mqtt"
          options={{ headerBackTitle: t('cancel'), title: t('mqttClient') || 'MQTT Client', presentation: 'modal' }}
        />
        <Stack.Screen
          name="scheduledruns"
          options={{ headerBackTitle: t('cancel'), title: t('scheduledRuns') || 'Scheduled Runs', presentation: 'modal' }}
        />
        <Stack.Screen
          name="contracttest"
          options={{ headerBackTitle: t('cancel'), title: t('contractTesting') || 'Contract Testing', presentation: 'modal' }}
        />
        <Stack.Screen
          name="variablelookup"
          options={{ headerBackTitle: t('cancel'), title: t('variableQuickLook') || 'Variable Quick Look', presentation: 'modal' }}
        />
        <Stack.Screen
          name="responsediff"
          options={{ headerBackTitle: t('cancel'), title: t('responseDiff') || 'Response Diff', presentation: 'modal' }}
        />
        <Stack.Screen
          name="keyboardshortcuts"
          options={{ headerBackTitle: t('cancel'), title: t('keyboardShortcuts') || 'Keyboard Shortcuts', presentation: 'modal' }}
        />
        <Stack.Screen
          name="webhook"
          options={{ headerBackTitle: t('cancel'), title: t('webhookTesting') || 'Webhook Testing', presentation: 'modal' }}
        />
        <Stack.Screen
          name="snippets"
          options={{ headerBackTitle: t('cancel'), title: t('snippetLibrary') || 'Snippet Library', presentation: 'modal' }}
        />
        <Stack.Screen
          name="teamsync"
          options={{ headerBackTitle: t('cancel'), title: t('teamSync') || 'Team Sync', presentation: 'modal' }}
        />
        <Stack.Screen
          name="gitsync"
          options={{ headerBackTitle: t('cancel'), title: t('gitSync') || 'Git Sync', presentation: 'modal' }}
        />
        <Stack.Screen
          name="cloudmonitor"
          options={{ headerBackTitle: t('cancel'), title: t('cloudMonitoring') || 'Cloud Monitoring', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ratelimit"
          options={{ headerBackTitle: t('cancel'), title: t('apiGateway') || 'API Gateway / Rate Limit', presentation: 'modal' }}
        />
        <Stack.Screen
          name="loadtest"
          options={{ headerBackTitle: t('cancel'), title: t('loadTesting') || 'Load Testing', presentation: 'modal' }}
        />
        <Stack.Screen
          name="soap"
          options={{ headerBackTitle: t('cancel'), title: t('soapClient') || 'SOAP Client', presentation: 'modal' }}
        />
        <Stack.Screen
          name="certpin"
          options={{ headerBackTitle: t('cancel'), title: t('certPinning') || 'Certificate Pinning', presentation: 'modal' }}
        />
        <Stack.Screen
          name="changelog"
          options={{ headerBackTitle: t('cancel'), title: t('apiChangelog') || 'API Changelog' }}
        />
        <Stack.Screen
          name="waterfall"
          options={{ headerBackTitle: t('cancel'), title: t('performanceWaterfall') || 'Performance Waterfall', presentation: 'modal' }}
        />
        <Stack.Screen
          name="fakegen"
          options={{ headerBackTitle: t('cancel'), title: t('fakeDataGenerator') || 'Fake Data Generator', presentation: 'modal' }}
        />
        <Stack.Screen
          name="securityscan"
          options={{ headerBackTitle: t('cancel'), title: t('securityScanning') || 'Security Scanner', presentation: 'modal' }}
        />
        <Stack.Screen
          name="governance"
          options={{ headerBackTitle: t('cancel'), title: t('apiGovernance') || 'API Governance', presentation: 'modal' }}
        />
        <Stack.Screen
          name="openapivalid"
          options={{ headerBackTitle: t('cancel'), title: t('openApiValidation') || 'OpenAPI Validation', presentation: 'modal' }}
        />
        <Stack.Screen
          name="graphqlsubs"
          options={{ headerBackTitle: t('cancel'), title: t('graphqlSubscriptions') || 'GraphQL Subscriptions', presentation: 'modal' }}
        />
        <Stack.Screen
          name="annotations"
          options={{ headerBackTitle: t('cancel'), title: t('annotations') || 'Annotations', presentation: 'modal' }}
        />
        <Stack.Screen
          name="trendanalytics"
          options={{ headerBackTitle: t('cancel'), title: t('trendAnalytics') || 'Trend Analytics', presentation: 'modal' }}
        />
        <Stack.Screen
          name="visualdiff"
          options={{ headerBackTitle: t('cancel'), title: t('visualDiff') || 'Visual Diff', presentation: 'modal' }}
        />
        <Stack.Screen
          name="varencrypt"
          options={{ headerBackTitle: t('cancel'), title: t('variableEncryption') || 'Variable Encryption', presentation: 'modal' }}
        />
        <Stack.Screen
          name="bulkops"
          options={{ headerBackTitle: t('cancel'), title: t('bulkOperations') || 'Bulk Operations', presentation: 'modal' }}
        />
        <Stack.Screen
          name="plugins"
          options={{ headerBackTitle: t('cancel'), title: t('plugins') || 'Plugins', presentation: 'modal' }}
        />
        <Stack.Screen
          name="smartsuggest"
          options={{ headerBackTitle: t('cancel'), title: t('smartSuggestions') || 'Smart Suggestions', presentation: 'modal' }}
        />
        <Stack.Screen
          name="responsetransform"
          options={{ headerBackTitle: t('cancel'), title: t('responseTransform') || 'Response Transform', presentation: 'modal' }}
        />
        <Stack.Screen
          name="awsauth"
          options={{ headerBackTitle: t('cancel'), title: t('cloudAuth') || 'Cloud Auth', presentation: 'modal' }}
        />
        <Stack.Screen
          name="interceptor"
          options={{ headerBackTitle: t('cancel'), title: t('requestInterceptor') || 'Request Interceptor', presentation: 'modal' }}
        />
        <Stack.Screen
          name="testexec"
          options={{ headerBackTitle: t('cancel'), title: t('testExecution') || 'Test Execution', presentation: 'modal' }}
        />
        <Stack.Screen
          name="curlimport"
          options={{ headerBackTitle: t('cancel'), title: 'cURL Import', presentation: 'modal' }}
        />
        <Stack.Screen
          name="qrshare"
          options={{ headerBackTitle: t('cancel'), title: 'QR Share', presentation: 'modal' }}
        />
        <Stack.Screen
          name="quickactions"
          options={{ headerBackTitle: t('cancel'), title: 'Quick Actions', presentation: 'modal' }}
        />
        <Stack.Screen
          name="camerascan"
          options={{ headerBackTitle: t('cancel'), title: 'Scan & Detect', presentation: 'modal' }}
        />
        <Stack.Screen
          name="oauth2"
          options={{ headerBackTitle: t('cancel'), title: 'OAuth 2.0', presentation: 'modal' }}
        />
        <Stack.Screen
          name="prerequest"
          options={{ headerBackTitle: t('cancel'), title: 'Pre/Post Scripts', presentation: 'modal' }}
        />
        <Stack.Screen
          name="postmanimport"
          options={{ headerBackTitle: t('cancel'), title: 'Postman Import', presentation: 'modal' }}
        />
        <Stack.Screen
          name="fileupload"
          options={{ headerBackTitle: t('cancel'), title: 'File Upload', presentation: 'modal' }}
        />
        <Stack.Screen
          name="assertions"
          options={{ headerBackTitle: t('cancel'), title: 'Test Assertions', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ioswidget"
          options={{ headerBackTitle: t('cancel'), title: 'iOS Widgets', presentation: 'modal' }}
        />
        <Stack.Screen
          name="watchcompanion"
          options={{ headerBackTitle: t('cancel'), title: 'Apple Watch', presentation: 'modal' }}
        />
        <Stack.Screen
          name="pushnotif"
          options={{ headerBackTitle: t('cancel'), title: 'Push Notifications', presentation: 'modal' }}
        />
        <Stack.Screen
          name="shareext"
          options={{ headerBackTitle: t('cancel'), title: 'Share Extension', presentation: 'modal' }}
        />
        <Stack.Screen
          name="responsedownload"
          options={{ headerBackTitle: t('cancel'), title: 'Response Download', presentation: 'modal' }}
        />
        <Stack.Screen
          name="requesttimeout"
          options={{ headerBackTitle: t('cancel'), title: 'Request Timeout', presentation: 'modal' }}
        />
        <Stack.Screen
          name="syntaxhighlight"
          options={{ headerBackTitle: t('cancel'), title: 'Syntax Highlight', presentation: 'modal' }}
        />
        <Stack.Screen
          name="harimport"
          options={{ headerBackTitle: t('cancel'), title: 'HAR Import', presentation: 'modal' }}
        />
        <Stack.Screen
          name="networkstatus"
          options={{ headerBackTitle: t('cancel'), title: 'Network Status', presentation: 'modal' }}
        />
        <Stack.Screen
          name="codegen"
          options={{ headerBackTitle: t('cancel'), title: 'Code Generator', presentation: 'modal' }}
        />
        <Stack.Screen
          name="spotlight"
          options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="aitypegen"
          options={{ headerBackTitle: t('cancel'), title: 'Type Generator', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
