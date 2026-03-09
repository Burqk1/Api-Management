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

interface ToolItem {
  key: string;
  icon: string;
  color: string;
  route: string;
  badge?: string;
}

export default function ToolsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queueCount = useOfflineStore((s) => s.queue).filter((r) => r.status === 'queued').length;

  const cardBg = isDark ? colors.surface : colors.card;
  const padding = Platform.OS === 'web' ? 32 : 20;

  const sections: { titleKey: string; items: ToolItem[] }[] = [
    {
      titleKey: 'requestTools',
      items: [
        { key: 'newCollection', icon: 'folder-plus-outline', color: '#58A6FF', route: '/collection/new' },
        { key: 'newEndpoint', icon: 'plus-network-outline', color: '#3FB950', route: '/endpoint/new' },
        { key: 'websocketTesting', icon: 'lan-connect', color: '#F778BA', route: '/websocket' },
        { key: 'sseTesting', icon: 'broadcast', color: '#FFD60A', route: '/sse' },
        { key: 'templates', icon: 'file-document-outline', color: '#64D2FF', route: '/templates' },
        { key: 'mockServer', icon: 'server-network', color: '#FF9500', route: '/mockserver' },
        { key: 'quickSend', icon: 'send-outline', color: '#30D158', route: '/quicksend' },
        { key: 'requestChaining', icon: 'link-variant', color: '#BC8CFF', route: '/chaining' },
        { key: 'benchmark', icon: 'speedometer', color: '#FF6961', route: '/benchmark' },
        { key: 'graphqlExplorer', icon: 'graphql', color: '#E535AB', route: '/graphqlexplorer' },
        { key: 'grpcClient', icon: 'server-network-off', color: '#00BCD4', route: '/grpc' },
        { key: 'mqttClient', icon: 'access-point-network', color: '#9C27B0', route: '/mqtt' },
        { key: 'soapClient', icon: 'xml', color: '#607D8B', route: '/soap' },
        { key: 'webhookTesting', icon: 'webhook', color: '#E91E63', route: '/webhook' },
        { key: 'loadTesting', icon: 'chart-timeline-variant-shimmer', color: '#FF5722', route: '/loadtest' },
        { key: 'performanceWaterfall', icon: 'chart-waterfall', color: '#00BCD4', route: '/waterfall' },
        { key: 'requestInterceptor', icon: 'radar', color: '#795548', route: '/interceptor' },
      ],
    },
    {
      titleKey: 'analysisTools',
      items: [
        { key: 'analytics', icon: 'chart-bar', color: '#BC8CFF', route: '/analytics' },
        { key: 'compareRequests', icon: 'compare', color: '#64D2FF', route: '/compare' },
        { key: 'globalSearch', icon: 'magnify', color: '#8B949E', route: '/search' },
        { key: 'aiAnalysis', icon: 'robot-outline', color: '#FF9500', route: '/aianalysis' },
        { key: 'apiDocs', icon: 'file-document-multiple-outline', color: '#3FB950', route: '/apidocs' },
        { key: 'responseViewer', icon: 'eye-outline', color: '#64D2FF', route: '/responseviewer' },
        { key: 'requestHistory', icon: 'history', color: '#D29922', route: '/history' },
        { key: 'jsonPathEvaluator', icon: 'code-json', color: '#FF9500', route: '/jsonpath' },
        { key: 'testReport', icon: 'file-chart-outline', color: '#E535AB', route: '/testreport' },
        { key: 'dataDrivenTesting', icon: 'table-large', color: '#00BCD4', route: '/datadriven' },
        { key: 'contractTesting', icon: 'file-check-outline', color: '#4CAF50', route: '/contracttest' },
        { key: 'responseDiff', icon: 'swap-horizontal-bold', color: '#FF5722', route: '/responsediff' },
        { key: 'scheduledRuns', icon: 'clock-outline', color: '#607D8B', route: '/scheduledruns' },
        { key: 'apiChangelog', icon: 'timeline-text-outline', color: '#795548', route: '/changelog' },
        { key: 'apiGateway', icon: 'speedometer-slow', color: '#FF9800', route: '/ratelimit' },
        { key: 'cloudMonitoring', icon: 'cloud-search-outline', color: '#2196F3', route: '/cloudmonitor' },
        { key: 'certPinning', icon: 'shield-search', color: '#009688', route: '/certpin' },
        { key: 'securityScanning', icon: 'shield-alert-outline', color: '#F44336', route: '/securityscan' },
        { key: 'apiGovernance', icon: 'gavel', color: '#6D4C41', route: '/governance' },
        { key: 'openApiValidation', icon: 'check-decagram-outline', color: '#4CAF50', route: '/openapivalid' },
        { key: 'trendAnalytics', icon: 'trending-up', color: '#E91E63', route: '/trendanalytics' },
        { key: 'visualDiff', icon: 'compare-horizontal', color: '#3F51B5', route: '/visualdiff' },
        { key: 'testExecution', icon: 'test-tube', color: '#FF5722', route: '/testexec' },
        { key: 'annotations', icon: 'comment-text-multiple-outline', color: '#00BCD4', route: '/annotations' },
        { key: 'graphqlSubscriptions', icon: 'antenna', color: '#A371F7', route: '/graphqlsubs' },
        { key: 'responseTransform', icon: 'swap-horizontal-variant', color: '#FF9800', route: '/responsetransform' },
      ],
    },
    {
      titleKey: 'configTools',
      items: [
        { key: 'environments', icon: 'swap-horizontal', color: '#D29922', route: '/environments' },
        { key: 'cookieManager', icon: 'cookie-outline', color: '#FF9500', route: '/cookies' },
        { key: 'proxySettings', icon: 'shield-lock-outline', color: '#BC8CFF', route: '/proxy' },
        { key: 'sslCertificates', icon: 'certificate-outline', color: '#58A6FF', route: '/sslconfig' },
        { key: 'importData', icon: 'import', color: '#58A6FF', route: '/import' },
        { key: 'workspaces', icon: 'briefcase-outline', color: '#FF9500', route: '/workspaces' },
        { key: 'dynamicVariables', icon: 'variable', color: '#E535AB', route: '/dynamicvars' },
        { key: 'variableQuickLook', icon: 'eye-settings-outline', color: '#FF9800', route: '/variablelookup' },
        { key: 'keyboardShortcuts', icon: 'keyboard-outline', color: '#795548', route: '/keyboardshortcuts' },
        { key: 'snippetLibrary', icon: 'code-brackets', color: '#4CAF50', route: '/snippets' },
        { key: 'variableEncryption', icon: 'shield-lock-outline', color: '#9C27B0', route: '/varencrypt' },
        { key: 'bulkOperations', icon: 'checkbox-multiple-marked-outline', color: '#FF5722', route: '/bulkops' },
        { key: 'plugins', icon: 'puzzle-outline', color: '#3F51B5', route: '/plugins' },
        { key: 'smartSuggestions', icon: 'lightbulb-on-outline', color: '#FFC107', route: '/smartsuggest' },
        { key: 'cloudAuth', icon: 'cloud-lock-outline', color: '#FF9800', route: '/awsauth' },
        { key: 'fakeDataGenerator', icon: 'auto-fix', color: '#E91E63', route: '/fakegen' },
      ],
    },
    {
      titleKey: 'mobileTools',
      items: [
        { key: 'quickActions', icon: 'lightning-bolt', color: '#FFD60A', route: '/quickactions' },
        { key: 'curlImport', icon: 'console-line', color: '#3FB950', route: '/curlimport' },
        { key: 'qrShare', icon: 'qrcode', color: '#58A6FF', route: '/qrshare' },
        { key: 'scanDetect', icon: 'text-recognition', color: '#BC8CFF', route: '/camerascan' },
        { key: 'fileUpload', icon: 'file-upload-outline', color: '#FF9500', route: '/fileupload' },
      ],
    },
    {
      titleKey: 'authTools',
      items: [
        { key: 'oauth2Flow', icon: 'shield-key-outline', color: '#58A6FF', route: '/oauth2' },
        { key: 'biometricAuth', icon: 'face-recognition', color: '#3FB950', route: '/biometric' },
      ],
    },
    {
      titleKey: 'testingTools',
      items: [
        { key: 'prePostScripts', icon: 'script-text-outline', color: '#BC8CFF', route: '/prerequest' },
        { key: 'assertionBuilder', icon: 'check-decagram-outline', color: '#3FB950', route: '/assertions' },
        { key: 'postmanCollectionImport', icon: 'application-import', color: '#FF6961', route: '/postmanimport' },
      ],
    },
    {
      titleKey: 'iosFeatures',
      items: [
        { key: 'iosWidgets', icon: 'widgets-outline', color: '#58A6FF', route: '/ioswidget' },
        { key: 'appleWatch', icon: 'watch-variant', color: '#3FB950', route: '/watchcompanion' },
        { key: 'pushAlerts', icon: 'bell-ring-outline', color: '#FF6961', route: '/pushnotif' },
        { key: 'shareExtension', icon: 'share-variant-outline', color: '#BC8CFF', route: '/shareext' },
        { key: 'responseDownload', icon: 'download-circle-outline', color: '#FFD60A', route: '/responsedownload' },
      ],
    },
    {
      titleKey: 'networkTools',
      items: [
        { key: 'offlineQueue', icon: 'cloud-off-outline', color: isOnline ? '#3FB950' : '#FF6961', route: '/offlinequeue', badge: queueCount > 0 ? String(queueCount) : undefined },
        { key: 'teamSync', icon: 'account-group-outline', color: '#58A6FF', route: '/teamsync' },
        { key: 'gitSync', icon: 'git', color: '#F44336', route: '/gitsync' },
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
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.6}
                  onPress={() => router.push(item.route as any)}
                  style={[
                    styles.toolRow,
                    i < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                >
                  <View style={[styles.toolIcon, { backgroundColor: item.color + '18' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={[styles.toolName, { color: colors.text }]}>{t(item.key)}</Text>
                    <Text style={[styles.toolDesc, { color: colors.textTertiary }]}>{t(item.key + 'Desc')}</Text>
                  </View>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
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
});
