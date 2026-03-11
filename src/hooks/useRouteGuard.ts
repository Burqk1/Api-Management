/**
 * Route Guard Hook
 * Validates that user has the required plan before accessing a protected route.
 * Redirects to paywall if plan is insufficient.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore, SubscriptionPlan } from '../stores/authStore';

export const ROUTE_PLAN_MAP: Record<string, SubscriptionPlan> = {
  // Pro-only routes
  oauth2: 'pro',
  prerequest: 'pro',
  assertions: 'pro',
  postmanimport: 'pro',
  graphqlexplorer: 'pro',
  scripteditor: 'pro',
  benchmark: 'pro',
  sslconfig: 'pro',
  grpc: 'pro',
  datadriven: 'pro',
  jsonpath: 'pro',
  chaining: 'pro',
  webhook: 'pro',
  contracttest: 'pro',
  responsediff: 'pro',
  loadtest: 'pro',
  soap: 'pro',
  certpin: 'pro',
  changelog: 'pro',
  waterfall: 'pro',
  securityscan: 'pro',
  governance: 'pro',
  openapivalid: 'pro',
  graphqlsubs: 'pro',
  annotations: 'pro',
  trendanalytics: 'pro',
  visualdiff: 'pro',
  varencrypt: 'pro',
  bulkops: 'pro',
  plugins: 'pro',
  smartsuggest: 'pro',
  responsetransform: 'pro',
  awsauth: 'pro',
  interceptor: 'pro',
  testexec: 'pro',
  mqtt: 'pro',
  scheduledruns: 'pro',
  variablelookup: 'pro',
  keyboardshortcuts: 'pro',
  snippets: 'pro',
  fakegen: 'pro',
  dynamicvars: 'pro',
  qrshare: 'pro',
  camerascan: 'pro',
  aitypegen: 'pro',
  aianalysis: 'pro',
  ioswidget: 'pro',
  watchcompanion: 'pro',
  pushnotif: 'pro',
  shareext: 'pro',
  sse: 'pro',
  codegen: 'pro',
  harimport: 'pro',
  syntaxhighlight: 'pro',
  // Team-only routes
  teamsync: 'team',
  gitsync: 'team',
};

export function useRouteGuard(routeName: string) {
  const router = useRouter();
  const plan = useAuthStore((s) => s.plan);

  useEffect(() => {
    const required = ROUTE_PLAN_MAP[routeName];
    if (!required) return; // Free route

    const hasAccess =
      required === 'pro' ? (plan === 'pro' || plan === 'team') :
      required === 'team' ? plan === 'team' :
      true;

    if (!hasAccess) {
      router.replace('/paywall' as any);
    }
  }, [routeName, plan]);
}
