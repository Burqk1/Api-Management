import React, { useMemo } from 'react';
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
import { useApiStore } from '../../stores/apiStore';
import { useMonitorStore } from '../../stores/monitorStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useLanguageStore } from '../../stores/languageStore';
import { METHOD_COLORS } from '../../types/api';


export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const callLogs = useApiStore((s) => s.callLogs);
  const getTotalCalls = useApiStore((s) => s.getTotalCalls);
  const getAvgResponseTime = useApiStore((s) => s.getAvgResponseTime);
  const getSuccessRate = useApiStore((s) => s.getSuccessRate);
  const getCallsToday = useApiStore((s) => s.getCallsToday);
  const checks = useMonitorStore((s) => s.checks);
  const getUpCount = useMonitorStore((s) => s.getUpCount);
  const getDownCount = useMonitorStore((s) => s.getDownCount);
  const activeEnv = useEnvironmentStore((s) => s.getActiveEnv)();
  const t = useLanguageStore((s) => s.t);

  const favorites = useApiStore((s) => s.getFavorites)();
  const recentLogs = useMemo(() => callLogs.slice(0, 15), [callLogs]);

  const stats = useMemo(() => ({
    totalCalls: getTotalCalls(),
    avgResponse: getAvgResponseTime(),
    successRate: getSuccessRate(),
    callsToday: getCallsToday(),
    upCount: getUpCount(),
    downCount: getDownCount(),
    collections: collections.length,
    endpoints: endpoints.length,
  }), [callLogs, collections, endpoints, checks]);

  // Response time distribution for mini chart
  const responseBars = useMemo(() => {
    const recent = callLogs.slice(0, 20).reverse();
    if (recent.length === 0) return [];
    const max = Math.max(...recent.map((l) => l.responseTime), 1);
    return recent.map((l) => ({
      height: Math.max((l.responseTime / max) * 40, 3),
      color: l.success ? '#3FB950' : '#FF6961',
    }));
  }, [callLogs]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('mAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('hAgo')}`;
    return d.toLocaleDateString();
  };

  const padding = Platform.OS === 'web' ? 32 : 20;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: padding }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('dashboard')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('apiManagementOverview')}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, { paddingHorizontal: padding }]}>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3FB95018' }]}>
              <MaterialCommunityIcons name="arrow-up-bold" size={18} color="#3FB950" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalCalls}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('totalCalls')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#58A6FF18' }]}>
              <MaterialCommunityIcons name="clock-fast" size={18} color="#58A6FF" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgResponse}ms</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('avgResponse')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3FB95018' }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#3FB950" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.successRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('successRate')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#D2992218' }]}>
              <MaterialCommunityIcons name="calendar-today" size={18} color="#D29922" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.callsToday}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('today')}</Text>
          </View>
        </View>

        {/* Monitor Status */}
        <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('monitorStatus')}</Text>
          <View style={[styles.monitorBar, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            <View style={styles.monitorRow}>
              <View style={styles.monitorItem}>
                <View style={[styles.monitorDot, { backgroundColor: '#3FB950' }]} />
                <Text style={[styles.monitorValue, { color: colors.text }]}>{stats.upCount}</Text>
                <Text style={[styles.monitorLabel, { color: colors.textSecondary }]}>{t('up')}</Text>
              </View>
              <View style={[styles.monitorDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.monitorItem}>
                <View style={[styles.monitorDot, { backgroundColor: '#FF6961' }]} />
                <Text style={[styles.monitorValue, { color: colors.text }]}>{stats.downCount}</Text>
                <Text style={[styles.monitorLabel, { color: colors.textSecondary }]}>{t('down')}</Text>
              </View>
              <View style={[styles.monitorDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.monitorItem}>
                <View style={[styles.monitorDot, { backgroundColor: '#58A6FF' }]} />
                <Text style={[styles.monitorValue, { color: colors.text }]}>{stats.collections}</Text>
                <Text style={[styles.monitorLabel, { color: colors.textSecondary }]}>{t('collections')}</Text>
              </View>
              <View style={[styles.monitorDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.monitorItem}>
                <View style={[styles.monitorDot, { backgroundColor: '#BC8CFF' }]} />
                <Text style={[styles.monitorValue, { color: colors.text }]}>{stats.endpoints}</Text>
                <Text style={[styles.monitorLabel, { color: colors.textSecondary }]}>{t('endpoints')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Response Time Chart */}
        {responseBars.length > 0 && (
          <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('responseTimes')}</Text>
            <View style={[styles.chartCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
              <View style={styles.barsContainer}>
                {responseBars.map((bar, i) => (
                  <View
                    key={i}
                    style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]}
                  />
                ))}
              </View>
              <View style={styles.chartLabels}>
                <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>{t('oldest')}</Text>
                <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>{t('latest')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Environment */}
        <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.envBar, { backgroundColor: isDark ? colors.surface : colors.card }]}
            onPress={() => router.push('/environments' as any)}
          >
            <View style={[styles.envDot, { backgroundColor: activeEnv?.color || colors.textTertiary }]} />
            <Text style={[styles.envName, { color: colors.text }]}>
              {activeEnv?.name || t('noEnvironment')}
            </Text>
            <Text style={[styles.envVarCount, { color: colors.textSecondary }]}>
              {activeEnv ? `${activeEnv.variables.length} ${t('vars')}` : t('tapToConfigure')}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Favorites */}
        {favorites.length > 0 && (
          <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('favorites')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {favorites.map((ep) => (
                  <TouchableOpacity
                    key={ep.id}
                    style={[styles.favCard, { backgroundColor: isDark ? colors.surface : colors.card }]}
                    onPress={() => router.push(`/endpoint/${ep.id}` as any)}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[ep.method] + '20' }]}>
                      <Text style={[styles.methodText, { color: METHOD_COLORS[ep.method] }]}>{ep.method}</Text>
                    </View>
                    <Text style={[styles.favName, { color: colors.text }]} numberOfLines={1}>{ep.name}</Text>
                    <MaterialCommunityIcons name="star" size={12} color="#FFD60A" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickActions')}</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/collection/new' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#58A6FF18' }]}>
                <MaterialCommunityIcons name="folder-plus-outline" size={22} color="#58A6FF" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('newCollection')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/endpoint/new' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3FB95018' }]}>
                <MaterialCommunityIcons name="plus-network-outline" size={22} color="#3FB950" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('newEndpoint')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/analytics' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#BC8CFF18' }]}>
                <MaterialCommunityIcons name="chart-bar" size={22} color="#BC8CFF" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('analytics')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/environments' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#D2992218' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#D29922" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('environments')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/websocket' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F778BA18' }]}>
                <MaterialCommunityIcons name="lan-connect" size={22} color="#F778BA" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>WebSocket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/search' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#8B949E18' }]}>
                <MaterialCommunityIcons name="magnify" size={22} color="#8B949E" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('globalSearch')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/mockserver' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF950018' }]}>
                <MaterialCommunityIcons name="server-network" size={22} color="#FF9500" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('mockServer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => router.push('/compare' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#64D2FF18' }]}>
                <MaterialCommunityIcons name="compare" size={22} color="#64D2FF" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t('compareRequests')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentActivity')}</Text>
          {recentLogs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
              <MaterialCommunityIcons name="history" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noApiCallsYet')}
              </Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
              {recentLogs.map((log, i) => (
                <TouchableOpacity
                  key={log.id}
                  activeOpacity={0.6}
                  onPress={() => router.push(`/log/${log.id}` as any)}
                  style={[
                    styles.logRow,
                    i < recentLogs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                >
                  <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] + '20' }]}>
                    <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>
                      {log.method}
                    </Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>
                      {log.endpointName || log.url}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.textTertiary }]}>
                      {log.statusCode} · {log.responseTime}ms · {formatTime(log.timestamp)}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: log.success ? '#3FB950' : '#FF6961' }]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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

  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 13, fontWeight: '500', letterSpacing: -0.1 },

  // Monitor bar
  monitorBar: { borderRadius: 14, padding: 16 },
  monitorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  monitorItem: { alignItems: 'center', gap: 4 },
  monitorDot: { width: 8, height: 8, borderRadius: 4 },
  monitorValue: { fontSize: 20, fontWeight: '700' },
  monitorLabel: { fontSize: 12, fontWeight: '500' },
  monitorDivider: { width: 1, height: 36 },

  // Chart
  chartCard: { borderRadius: 14, padding: 16 },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 50,
  },
  bar: { flex: 1, borderRadius: 3, minWidth: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLabel: { fontSize: 11, fontWeight: '500' },

  // Environment bar
  envBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  envDot: { width: 10, height: 10, borderRadius: 5 },
  envName: { fontSize: 15, fontWeight: '600', flex: 1 },
  envVarCount: { fontSize: 13, fontWeight: '500' },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    minWidth: '28%',
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '28%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },

  // Activity
  emptyCard: {
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, textAlign: 'center', letterSpacing: -0.2 },
  listCard: { borderRadius: 14, overflow: 'hidden' },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  methodText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  logInfo: { flex: 1 },
  logName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  logMeta: { fontSize: 12, marginTop: 2, letterSpacing: -0.1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  favCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, paddingRight: 14, minWidth: 120 },
  favName: { fontSize: 13, fontWeight: '600', maxWidth: 100 },

});
