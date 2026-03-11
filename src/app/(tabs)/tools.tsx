import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useLanguageStore } from '../../stores/languageStore';
import { useOfflineStore } from '../../stores/offlineStore';
import { useAuthStore } from '../../stores/authStore';

interface ToolItem {
  key: string;
  icon: string;
  color: string;
  route: string;
  badge?: string;
  requiredPlan?: 'pro' | 'team';
}

export default function ToolsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queueCount = useOfflineStore((s) => s.queue).filter((r) => r.status === 'queued').length;

  const cardBg = isDark ? colors.surface : colors.card;
  const padding = Platform.OS === 'web' ? 32 : 20;
  const plan = useAuthStore((s) => s.plan);
  const isProUser = plan === 'pro' || plan === 'team';
  const isTeamUser = plan === 'team';

  const canAccess = (item: ToolItem) => {
    if (!item.requiredPlan) return true;
    if (item.requiredPlan === 'pro') return isProUser;
    if (item.requiredPlan === 'team') return isTeamUser;
    return true;
  };

  const sections: { titleKey: string; items: ToolItem[] }[] = [
    {
      titleKey: 'requestTools',
      items: [
        { key: 'newCollection', icon: 'folder-plus-outline', color: '#58A6FF', route: '/collection/new' },
        { key: 'newEndpoint', icon: 'plus-network-outline', color: '#3FB950', route: '/endpoint/new' },
        { key: 'websocketTesting', icon: 'lan-connect', color: '#F778BA', route: '/websocket', requiredPlan: 'pro' },
        { key: 'sseTesting', icon: 'broadcast', color: '#FFD60A', route: '/sse', requiredPlan: 'pro' },
        { key: 'templates', icon: 'file-document-outline', color: '#64D2FF', route: '/templates' },
        { key: 'mockServer', icon: 'server-network', color: '#FF9500', route: '/mockserver', requiredPlan: 'pro' },
        { key: 'quickSend', icon: 'send-outline', color: '#30D158', route: '/quicksend' },
        { key: 'requestChaining', icon: 'link-variant', color: '#BC8CFF', route: '/chaining', requiredPlan: 'pro' },
        { key: 'benchmark', icon: 'speedometer', color: '#FF6961', route: '/benchmark', requiredPlan: 'pro' },
        { key: 'graphqlExplorer', icon: 'graphql', color: '#E535AB', route: '/graphqlexplorer', requiredPlan: 'pro' },
        { key: 'grpcClient', icon: 'server-network-off', color: '#00BCD4', route: '/grpc', requiredPlan: 'pro' },
        { key: 'mqttClient', icon: 'access-point-network', color: '#9C27B0', route: '/mqtt', requiredPlan: 'pro' },
        { key: 'soapClient', icon: 'xml', color: '#607D8B', route: '/soap', requiredPlan: 'pro' },
        { key: 'webhookTesting', icon: 'webhook', color: '#E91E63', route: '/webhook', requiredPlan: 'pro' },
        { key: 'loadTesting', icon: 'chart-timeline-variant-shimmer', color: '#FF5722', route: '/loadtest', requiredPlan: 'pro' },
        { key: 'performanceWaterfall', icon: 'chart-waterfall', color: '#00BCD4', route: '/waterfall', requiredPlan: 'pro' },
        { key: 'requestInterceptor', icon: 'radar', color: '#795548', route: '/interceptor', requiredPlan: 'pro' },
        { key: 'timeoutConfig', icon: 'timer-outline', color: '#FF6961', route: '/requesttimeout' },
      ],
    },
    {
      titleKey: 'analysisTools',
      items: [
        { key: 'analytics', icon: 'chart-bar', color: '#BC8CFF', route: '/analytics' },
        { key: 'compareRequests', icon: 'compare', color: '#64D2FF', route: '/compare' },
        { key: 'globalSearch', icon: 'magnify', color: '#8B949E', route: '/search' },
        { key: 'aiAnalysis', icon: 'robot-outline', color: '#FF9500', route: '/aianalysis', requiredPlan: 'pro' },
        { key: 'apiDocs', icon: 'file-document-multiple-outline', color: '#3FB950', route: '/apidocs', requiredPlan: 'pro' },
        { key: 'responseViewer', icon: 'eye-outline', color: '#64D2FF', route: '/responseviewer' },
        { key: 'requestHistory', icon: 'history', color: '#D29922', route: '/history' },
        { key: 'jsonPathEvaluator', icon: 'code-json', color: '#FF9500', route: '/jsonpath', requiredPlan: 'pro' },
        { key: 'testReport', icon: 'file-chart-outline', color: '#E535AB', route: '/testreport', requiredPlan: 'pro' },
        { key: 'dataDrivenTesting', icon: 'table-large', color: '#00BCD4', route: '/datadriven', requiredPlan: 'pro' },
        { key: 'contractTesting', icon: 'file-check-outline', color: '#4CAF50', route: '/contracttest', requiredPlan: 'pro' },
        { key: 'responseDiff', icon: 'swap-horizontal-bold', color: '#FF5722', route: '/responsediff', requiredPlan: 'pro' },
        { key: 'scheduledRuns', icon: 'clock-outline', color: '#607D8B', route: '/scheduledruns', requiredPlan: 'pro' },
        { key: 'apiChangelog', icon: 'timeline-text-outline', color: '#795548', route: '/changelog', requiredPlan: 'pro' },
        { key: 'apiGateway', icon: 'speedometer-slow', color: '#FF9800', route: '/ratelimit', requiredPlan: 'pro' },
        { key: 'cloudMonitoring', icon: 'cloud-search-outline', color: '#2196F3', route: '/cloudmonitor', requiredPlan: 'pro' },
        { key: 'certPinning', icon: 'shield-search', color: '#009688', route: '/certpin', requiredPlan: 'pro' },
        { key: 'securityScanning', icon: 'shield-alert-outline', color: '#F44336', route: '/securityscan', requiredPlan: 'pro' },
        { key: 'apiGovernance', icon: 'gavel', color: '#6D4C41', route: '/governance', requiredPlan: 'pro' },
        { key: 'openApiValidation', icon: 'check-decagram-outline', color: '#4CAF50', route: '/openapivalid', requiredPlan: 'pro' },
        { key: 'trendAnalytics', icon: 'trending-up', color: '#E91E63', route: '/trendanalytics', requiredPlan: 'pro' },
        { key: 'visualDiff', icon: 'compare-horizontal', color: '#3F51B5', route: '/visualdiff', requiredPlan: 'pro' },
        { key: 'testExecution', icon: 'test-tube', color: '#FF5722', route: '/testexec', requiredPlan: 'pro' },
        { key: 'annotations', icon: 'comment-text-multiple-outline', color: '#00BCD4', route: '/annotations', requiredPlan: 'pro' },
        { key: 'graphqlSubscriptions', icon: 'antenna', color: '#A371F7', route: '/graphqlsubs', requiredPlan: 'pro' },
        { key: 'responseTransform', icon: 'swap-horizontal-variant', color: '#FF9800', route: '/responsetransform', requiredPlan: 'pro' },
        { key: 'syntaxHighlight', icon: 'code-tags', color: '#E535AB', route: '/syntaxhighlight', requiredPlan: 'pro' },
        { key: 'codeGenerator', icon: 'code-braces', color: '#00BCD4', route: '/codegen', requiredPlan: 'pro' },
        { key: 'aiTypeGen', icon: 'language-typescript', color: '#3178C6', route: '/aitypegen', requiredPlan: 'pro' },
      ],
    },
    {
      titleKey: 'configTools',
      items: [
        { key: 'environments', icon: 'swap-horizontal', color: '#D29922', route: '/environments' },
        { key: 'cookieManager', icon: 'cookie-outline', color: '#FF9500', route: '/cookies' },
        { key: 'proxySettings', icon: 'shield-lock-outline', color: '#BC8CFF', route: '/proxy', requiredPlan: 'pro' },
        { key: 'sslCertificates', icon: 'certificate-outline', color: '#58A6FF', route: '/sslconfig', requiredPlan: 'pro' },
        { key: 'importData', icon: 'import', color: '#58A6FF', route: '/import' },
        { key: 'harImport', icon: 'web', color: '#FF9500', route: '/harimport', requiredPlan: 'pro' },
        { key: 'workspaces', icon: 'briefcase-outline', color: '#FF9500', route: '/workspaces', requiredPlan: 'pro' },
        { key: 'dynamicVariables', icon: 'variable', color: '#E535AB', route: '/dynamicvars', requiredPlan: 'pro' },
        { key: 'variableQuickLook', icon: 'eye-settings-outline', color: '#FF9800', route: '/variablelookup' },
        { key: 'keyboardShortcuts', icon: 'keyboard-outline', color: '#795548', route: '/keyboardshortcuts' },
        { key: 'snippetLibrary', icon: 'code-brackets', color: '#4CAF50', route: '/snippets', requiredPlan: 'pro' },
        { key: 'variableEncryption', icon: 'shield-lock-outline', color: '#9C27B0', route: '/varencrypt', requiredPlan: 'pro' },
        { key: 'bulkOperations', icon: 'checkbox-multiple-marked-outline', color: '#FF5722', route: '/bulkops', requiredPlan: 'pro' },
        { key: 'plugins', icon: 'puzzle-outline', color: '#3F51B5', route: '/plugins', requiredPlan: 'pro' },
        { key: 'smartSuggestions', icon: 'lightbulb-on-outline', color: '#FFC107', route: '/smartsuggest', requiredPlan: 'pro' },
        { key: 'cloudAuth', icon: 'cloud-lock-outline', color: '#FF9800', route: '/awsauth', requiredPlan: 'pro' },
        { key: 'fakeDataGenerator', icon: 'auto-fix', color: '#E91E63', route: '/fakegen', requiredPlan: 'pro' },
      ],
    },
    {
      titleKey: 'mobileTools',
      items: [
        { key: 'quickActions', icon: 'lightning-bolt', color: '#FFD60A', route: '/quickactions' },
        { key: 'curlImport', icon: 'console-line', color: '#3FB950', route: '/curlimport' },
        { key: 'qrShare', icon: 'qrcode', color: '#58A6FF', route: '/qrshare', requiredPlan: 'pro' },
        { key: 'scanDetect', icon: 'text-recognition', color: '#BC8CFF', route: '/camerascan', requiredPlan: 'pro' },
        { key: 'fileUpload', icon: 'file-upload-outline', color: '#FF9500', route: '/fileupload' },
      ],
    },
    {
      titleKey: 'authTools',
      items: [
        { key: 'oauth2Flow', icon: 'shield-key-outline', color: '#58A6FF', route: '/oauth2', requiredPlan: 'pro' },
      ],
    },
    {
      titleKey: 'testingTools',
      items: [
        { key: 'prePostScripts', icon: 'script-text-outline', color: '#BC8CFF', route: '/prerequest', requiredPlan: 'pro' },
        { key: 'assertionBuilder', icon: 'check-decagram-outline', color: '#3FB950', route: '/assertions', requiredPlan: 'pro' },
        { key: 'postmanCollectionImport', icon: 'application-import', color: '#FF6961', route: '/postmanimport', requiredPlan: 'pro' },
      ],
    },
    {
      titleKey: 'iosFeatures',
      items: [
        { key: 'iosWidgets', icon: 'widgets-outline', color: '#58A6FF', route: '/ioswidget', requiredPlan: 'pro' },
        { key: 'appleWatch', icon: 'watch-variant', color: '#3FB950', route: '/watchcompanion', requiredPlan: 'pro' },
        { key: 'pushAlerts', icon: 'bell-ring-outline', color: '#FF6961', route: '/pushnotif', requiredPlan: 'pro' },
        { key: 'shareExtension', icon: 'share-variant-outline', color: '#BC8CFF', route: '/shareext', requiredPlan: 'pro' },
        { key: 'responseDownload', icon: 'download-circle-outline', color: '#FFD60A', route: '/responsedownload' },
      ],
    },
    {
      titleKey: 'networkTools',
      items: [
        { key: 'offlineQueue', icon: 'cloud-off-outline', color: isOnline ? '#3FB950' : '#FF6961', route: '/offlinequeue', badge: queueCount > 0 ? String(queueCount) : undefined },
        { key: 'networkStatus', icon: 'network-outline', color: '#58A6FF', route: '/networkstatus' },
        { key: 'teamSync', icon: 'account-group-outline', color: '#58A6FF', route: '/teamsync', requiredPlan: 'team' },
        { key: 'gitSync', icon: 'git', color: '#F44336', route: '/gitsync', requiredPlan: 'team' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
      >
        <View style={[styles.header, { paddingHorizontal: padding }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('tools')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('allToolsDesc')}</Text>
        </View>

        {/* Network Status Banner */}
        <View style={{ paddingHorizontal: padding, marginTop: 16 }}>
          <View style={[styles.statusBanner, { backgroundColor: isOnline ? '#3FB95012' : '#FF696118' }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#3FB950' : '#FF6961' }]} />
            <Text style={[styles.statusText, { color: isOnline ? '#3FB950' : '#FF6961' }]}>
              {isOnline ? t('online') : t('offline')}
            </Text>
            {queueCount > 0 && (
              <Text style={[styles.queueBadgeText, { color: '#FF9500' }]}>
                {queueCount} {t('queuedRequests').toLowerCase()}
              </Text>
            )}
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.titleKey} style={{ paddingHorizontal: padding, marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t(section.titleKey)}</Text>
            <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
              {section.items.map((item, i) => {
                const locked = !canAccess(item);
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={locked ? 0.4 : 0.6}
                    onPress={() => locked ? router.push('/paywall') : router.push(item.route as any)}
                    style={[
                      styles.toolRow,
                      i < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                      locked && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.toolIcon, { backgroundColor: item.color + '18' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={[styles.toolName, { color: colors.text }]}>{t(item.key)}</Text>
                      <Text style={[styles.toolDesc, { color: colors.textTertiary }]}>{t(item.key + 'Desc')}</Text>
                    </View>
                    {locked && (
                      <View style={[styles.planBadge, { backgroundColor: item.requiredPlan === 'team' ? '#58A6FF' : '#FF9500' }]}>
                        <MaterialCommunityIcons name="lock" size={10} color="#FFF" />
                        <Text style={styles.planBadgeText}>{item.requiredPlan === 'team' ? 'TEAM' : 'PRO'}</Text>
                      </View>
                    )}
                    {item.badge && !locked && (
                      <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <MaterialCommunityIcons name={locked ? 'lock-outline' : 'chevron-right'} size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: { paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2, letterSpacing: -0.2 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600' },
  queueBadgeText: { fontSize: 13, marginLeft: 'auto' },

  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: { flex: 1 },
  toolName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  toolDesc: { fontSize: 13, marginTop: 2, letterSpacing: -0.1 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
