import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useMonitorStore } from '../../stores/monitorStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useLanguageStore } from '../../stores/languageStore';
import { useAuthStore } from '../../stores/authStore';
import { METHOD_COLORS } from '../../types/api';
import { EmptyState } from '../../components/ui/EmptyState';

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'goodNight';
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
};

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
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);

  const favorites = useApiStore((s) => s.getFavorites)();
  const recentLogs = useMemo(() => callLogs.slice(0, 10), [callLogs]);

  // Animated entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

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

  // Sparkline data from last 20 calls
  const sparkline = useMemo(() => {
    const recent = callLogs.slice(0, 20).reverse();
    if (recent.length < 2) return [];
    const max = Math.max(...recent.map((l) => l.responseTime), 1);
    return recent.map((l) => ({
      height: Math.max((l.responseTime / max) * 32, 2),
      color: l.statusCode < 400 ? '#3FB950' : '#FF6961',
      time: l.responseTime,
    }));
  }, [callLogs]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('mAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('hAgo')}`;
    return new Date(ts).toLocaleDateString();
  };

  const padding = Platform.OS === 'web' ? 32 : 20;
  const cardBg = isDark ? colors.surface : colors.card;
  const greeting = t(getGreeting());
  const userName = user?.email?.split('@')[0] || '';

  const QUICK_ACTIONS = [
    { key: 'quickSend', icon: 'send-outline', color: '#30D158', route: '/quicksend' },
    { key: 'newCollection', icon: 'folder-plus-outline', color: '#58A6FF', route: '/collection/new' },
    { key: 'analytics', icon: 'chart-bar', color: '#BC8CFF', route: '/analytics' },
    { key: 'environments', icon: 'swap-horizontal', color: '#D29922', route: '/environments' },
    { key: 'globalSearch', icon: 'magnify', color: '#8B949E', route: '/search' },
    { key: 'requestHistory', icon: 'history', color: '#D29922', route: '/history' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header with Greeting */}
          <View style={[styles.header, { paddingHorizontal: padding }]}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                  {greeting}{userName ? `, ${userName}` : ''} 👋
                </Text>
                <Text style={[styles.title, { color: colors.text }]}>{t('dashboard')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.spotlightBtn, { backgroundColor: cardBg }]}
                onPress={() => router.push('/spotlight' as any)}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {plan !== 'free' && (
                <View style={[styles.proBadge, { backgroundColor: plan === 'team' ? '#58A6FF' : '#FF9500' }]}>
                  <Text style={styles.proBadgeText}>{plan.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Gradient Stat Cards */}
          <View style={[styles.statsGrid, { paddingHorizontal: padding }]}>
            <LinearGradient
              colors={isDark ? ['#1a3a2a', '#0d1f16'] : ['#e8f5e9', '#c8e6c9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#3FB95025' }]}>
                  <MaterialCommunityIcons name="arrow-up-bold" size={16} color="#3FB950" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? '#8fdf9f' : '#2e7d32' }]}>{t('totalCalls')}</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#fff' : '#1b5e20' }]}>{stats.totalCalls.toLocaleString()}</Text>
              {sparkline.length > 0 && (
                <View style={styles.miniSparkline}>
                  {sparkline.slice(-8).map((s, i) => (
                    <View key={i} style={[styles.sparkBar, { height: s.height, backgroundColor: '#3FB95060' }]} />
                  ))}
                </View>
              )}
            </LinearGradient>

            <LinearGradient
              colors={isDark ? ['#1a2a3a', '#0d1620'] : ['#e3f2fd', '#bbdefb']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#58A6FF25' }]}>
                  <MaterialCommunityIcons name="clock-fast" size={16} color="#58A6FF" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? '#8fc4ff' : '#1565c0' }]}>{t('avgResponse')}</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#fff' : '#0d47a1' }]}>{stats.avgResponse}<Text style={styles.statUnit}>ms</Text></Text>
            </LinearGradient>

            <LinearGradient
              colors={isDark ? ['#2a1a3a', '#160d20'] : ['#f3e5f5', '#e1bee7']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#BC8CFF25' }]}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#BC8CFF" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? '#d4b3ff' : '#6a1b9a' }]}>{t('successRate')}</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#fff' : '#4a148c' }]}>{stats.successRate}<Text style={styles.statUnit}>%</Text></Text>
              {/* Mini progress ring */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(stats.successRate, 100)}%`, backgroundColor: '#BC8CFF' }]} />
              </View>
            </LinearGradient>

            <LinearGradient
              colors={isDark ? ['#3a2a1a', '#201610'] : ['#fff3e0', '#ffe0b2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#D2992225' }]}>
                  <MaterialCommunityIcons name="calendar-today" size={16} color="#D29922" />
                </View>
                <Text style={[styles.statLabel, { color: isDark ? '#f0c866' : '#e65100' }]}>{t('today')}</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#fff' : '#bf360c' }]}>{stats.callsToday}</Text>
            </LinearGradient>
          </View>

          {/* Monitor Status */}
          <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('monitorStatus')}</Text>
            <View style={[styles.monitorBar, { backgroundColor: cardBg }]}>
              <View style={styles.monitorRow}>
                {[
                  { value: stats.upCount, label: t('up'), color: '#3FB950' },
                  { value: stats.downCount, label: t('down'), color: '#FF6961' },
                  { value: stats.collections, label: t('collections'), color: '#58A6FF' },
                  { value: stats.endpoints, label: t('endpoints'), color: '#BC8CFF' },
                ].map((item, i) => (
                  <React.Fragment key={item.label}>
                    {i > 0 && <View style={[styles.monitorDivider, { backgroundColor: colors.divider }]} />}
                    <View style={styles.monitorItem}>
                      <View style={[styles.monitorDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.monitorValue, { color: colors.text }]}>{item.value}</Text>
                      <Text style={[styles.monitorLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          {/* Active Environment */}
          <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
            <TouchableOpacity
              style={[styles.envBar, { backgroundColor: cardBg }]}
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
                      style={[styles.favCard, { backgroundColor: cardBg }]}
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
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.actionBtn, { backgroundColor: cardBg }]}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>{t(action.key)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Response Time Chart */}
          {sparkline.length > 0 && (
            <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('responseTimes')}</Text>
              <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
                <View style={styles.barsContainer}>
                  {sparkline.map((bar, i) => (
                    <View key={i} style={styles.barWrapper}>
                      <View style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]} />
                    </View>
                  ))}
                </View>
                <View style={styles.chartLabels}>
                  <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>{t('oldest')}</Text>
                  <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>{t('latest')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent Activity */}
          <View style={{ paddingHorizontal: padding, marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('recentActivity')}</Text>
              {recentLogs.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/history' as any)}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>{t('seeAll') || 'See All'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentLogs.length === 0 ? (
              <EmptyState
                icon="rocket-launch-outline"
                title={t('noApiCallsYet')}
                subtitle={t('sendFirstRequest') || 'Send your first API request to see activity here'}
                actionLabel={t('quickSend')}
                onAction={() => router.push('/quicksend' as any)}
                color="#58A6FF"
              />
            ) : (
              <View style={[styles.listCard, { backgroundColor: cardBg }]}>
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
                      <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>{log.method}</Text>
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>
                        {log.endpointName || log.url}
                      </Text>
                      <Text style={[styles.logMeta, { color: colors.textTertiary }]}>
                        {log.statusCode} · {log.responseTime}ms · {formatTime(log.timestamp)}
                      </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: log.statusCode < 400 ? '#3FB950' : '#FF6961' }]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: { paddingTop: 8, paddingBottom: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2, marginBottom: 2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  spotlightBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  seeAll: { fontSize: 14, fontWeight: '600' },

  // Gradient Stat Cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  statCardGradient: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  statUnit: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 12, fontWeight: '600', letterSpacing: -0.1 },
  miniSparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 20, marginTop: 4 },
  sparkBar: { flex: 1, borderRadius: 2, minWidth: 3 },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },

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
    gap: 3,
    height: 40,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minWidth: 4 },
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
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center' },

  // Activity
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
