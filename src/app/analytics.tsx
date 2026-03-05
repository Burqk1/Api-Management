import React, { useMemo, useState } from 'react';
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
import { useTheme } from '../hooks/useTheme';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS, HttpMethod, getStatusColor } from '../types/api';
import { useLanguageStore } from '../stores/languageStore';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const callLogs = useApiStore((s) => s.callLogs);
  const t = useLanguageStore((s) => s.t);
  const [range, setRange] = useState<TimeRange>('7d');
  const [filterMethod, setFilterMethod] = useState<HttpMethod | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const cardBg = isDark ? colors.surface : colors.card;

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      '24h': 86400000,
      '7d': 7 * 86400000,
      '30d': 30 * 86400000,
      'all': Infinity,
    };
    const cutoff = now - ranges[range];
    return callLogs.filter((l) => {
      if (l.timestamp < cutoff) return false;
      if (filterMethod && l.method !== filterMethod) return false;
      if (filterStatus) {
        if (filterStatus === 'err' && l.statusCode !== 0) return false;
        if (filterStatus === '2xx' && (l.statusCode < 200 || l.statusCode >= 300)) return false;
        if (filterStatus === '3xx' && (l.statusCode < 300 || l.statusCode >= 400)) return false;
        if (filterStatus === '4xx' && (l.statusCode < 400 || l.statusCode >= 500)) return false;
        if (filterStatus === '5xx' && l.statusCode < 500) return false;
      }
      return true;
    });
  }, [callLogs, range, filterMethod, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l) => l.success).length;
    const failed = total - success;
    const avgTime = total > 0 ? Math.round(filteredLogs.reduce((s, l) => s + l.responseTime, 0) / total) : 0;
    const fastest = total > 0 ? Math.min(...filteredLogs.map((l) => l.responseTime)) : 0;
    const slowest = total > 0 ? Math.max(...filteredLogs.map((l) => l.responseTime)) : 0;
    const p95 = total > 0 ? (() => {
      const sorted = [...filteredLogs].sort((a, b) => a.responseTime - b.responseTime);
      return sorted[Math.floor(sorted.length * 0.95)]?.responseTime || 0;
    })() : 0;
    return { total, success, failed, avgTime, fastest, slowest, p95 };
  }, [filteredLogs]);

  // Status code breakdown
  const statusBreakdown = useMemo(() => {
    const groups: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'err': 0 };
    filteredLogs.forEach((l) => {
      if (l.statusCode === 0) groups['err']++;
      else if (l.statusCode < 300) groups['2xx']++;
      else if (l.statusCode < 400) groups['3xx']++;
      else if (l.statusCode < 500) groups['4xx']++;
      else groups['5xx']++;
    });
    return groups;
  }, [filteredLogs]);

  // Method breakdown
  const methodBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      groups[l.method] = (groups[l.method] || 0) + 1;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filteredLogs]);

  // Top endpoints
  const topEndpoints = useMemo(() => {
    const map: Record<string, { name: string; count: number; avgTime: number; success: number; total: number }> = {};
    filteredLogs.forEach((l) => {
      const key = l.endpointId || l.url;
      if (!map[key]) map[key] = { name: l.endpointName || l.url, count: 0, avgTime: 0, success: 0, total: 0 };
      map[key].count++;
      map[key].total += l.responseTime;
      if (l.success) map[key].success++;
    });
    return Object.values(map)
      .map((e) => ({ ...e, avgTime: Math.round(e.total / e.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredLogs]);

  // Daily calls chart (last 7 days)
  const dailyChart = useMemo(() => {
    const days: { label: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayLogs = callLogs.filter((l) => l.timestamp >= date.getTime() && l.timestamp < nextDay.getTime());
      days.push({
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        success: dayLogs.filter((l) => l.success).length,
        failed: dayLogs.filter((l) => !l.success).length,
      });
    }
    return days;
  }, [callLogs]);

  const maxDailyTotal = Math.max(...dailyChart.map((d) => d.success + d.failed), 1);

  // Response time bars
  const responseBars = useMemo(() => {
    const recent = filteredLogs.slice(0, 30).reverse();
    if (recent.length === 0) return [];
    const max = Math.max(...recent.map((l) => l.responseTime), 1);
    return recent.map((l) => ({
      height: Math.max((l.responseTime / max) * 60, 3),
      color: l.success ? '#3FB950' : '#FF6961',
      time: l.responseTime,
    }));
  }, [filteredLogs]);

  const total = stats.total || 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
      >
        {/* Time Range */}
        <View style={styles.rangeRow}>
          {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={[styles.rangeBtn, { backgroundColor: range === r ? colors.primary : cardBg }]}
            >
              <Text style={[styles.rangeBtnText, { color: range === r ? '#FFF' : colors.textSecondary }]}>
                {r === 'all' ? 'All' : r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setFilterMethod(filterMethod === m ? null : m)}
                style={[styles.filterChip, { backgroundColor: filterMethod === m ? METHOD_COLORS[m] + '30' : cardBg }]}
              >
                <Text style={[styles.filterChipText, { color: filterMethod === m ? METHOD_COLORS[m] : colors.textSecondary }]}>{m}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 1, backgroundColor: colors.divider, marginHorizontal: 4 }} />
            {(['2xx', '3xx', '4xx', '5xx', 'err'] as const).map((s) => {
              const c = s === '2xx' ? '#3FB950' : s === '3xx' ? '#58A6FF' : s === '4xx' ? '#D29922' : s === '5xx' ? '#FF6961' : '#8B949E';
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterStatus(filterStatus === s ? null : s)}
                  style={[styles.filterChip, { backgroundColor: filterStatus === s ? c + '30' : cardBg }]}
                >
                  <Text style={[styles.filterChipText, { color: filterStatus === s ? c : colors.textSecondary }]}>{s.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Calls', value: stats.total.toString(), icon: 'trending-up', color: '#58A6FF' },
            { label: 'Success', value: stats.success.toString(), icon: 'check-circle-outline', color: '#3FB950' },
            { label: 'Failed', value: stats.failed.toString(), icon: 'alert-circle-outline', color: '#FF6961' },
            { label: 'Avg Time', value: `${stats.avgTime}ms`, icon: 'clock-fast', color: '#D29922' },
            { label: 'P95', value: `${stats.p95}ms`, icon: 'speedometer', color: '#BC8CFF' },
            { label: 'Fastest', value: `${stats.fastest}ms`, icon: 'flash-outline', color: '#3FB950' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily Activity Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Activity (7 days)</Text>
        <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
          <View style={styles.dailyBars}>
            {dailyChart.map((day, i) => {
              const successH = Math.max(((day.success) / maxDailyTotal) * 80, 0);
              const failedH = Math.max(((day.failed) / maxDailyTotal) * 80, 0);
              return (
                <View key={i} style={styles.dailyBarCol}>
                  <View style={styles.dailyBarStack}>
                    {failedH > 0 && <View style={[styles.dailyBar, { height: failedH, backgroundColor: '#FF6961' }]} />}
                    {successH > 0 && <View style={[styles.dailyBar, { height: successH, backgroundColor: '#3FB950' }]} />}
                    {successH === 0 && failedH === 0 && <View style={[styles.dailyBar, { height: 3, backgroundColor: colors.textTertiary + '40' }]} />}
                  </View>
                  <Text style={[styles.dailyLabel, { color: colors.textTertiary }]}>{day.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3FB950' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Success</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6961' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Response Time Chart */}
        {responseBars.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Response Times</Text>
            <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
              <View style={styles.respBars}>
                {responseBars.map((bar, i) => (
                  <View key={i} style={[styles.respBar, { height: bar.height, backgroundColor: bar.color }]} />
                ))}
              </View>
              <View style={styles.respStats}>
                <Text style={[styles.respStatText, { color: colors.textTertiary }]}>
                  Min: {stats.fastest}ms
                </Text>
                <Text style={[styles.respStatText, { color: colors.textTertiary }]}>
                  Avg: {stats.avgTime}ms
                </Text>
                <Text style={[styles.respStatText, { color: colors.textTertiary }]}>
                  Max: {stats.slowest}ms
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Status Code Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Codes</Text>
        <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
          {/* Horizontal bar chart */}
          {Object.entries(statusBreakdown).filter(([, v]) => v > 0).map(([code, count]) => {
            const pct = Math.round((count / total) * 100);
            const barColor = code === '2xx' ? '#3FB950' : code === '3xx' ? '#58A6FF' : code === '4xx' ? '#D29922' : code === '5xx' ? '#FF6961' : '#8B949E';
            return (
              <View key={code} style={styles.hBarRow}>
                <Text style={[styles.hBarLabel, { color: barColor }]}>{code.toUpperCase()}</Text>
                <View style={styles.hBarTrack}>
                  <View style={[styles.hBarFill, { width: `${Math.max(pct, 3)}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.hBarValue, { color: colors.text }]}>{count}</Text>
                <Text style={[styles.hBarPct, { color: colors.textTertiary }]}>{pct}%</Text>
              </View>
            );
          })}
          {stats.total === 0 && (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No data yet</Text>
          )}
        </View>

        {/* Method Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Methods</Text>
        <View style={[styles.methodGrid, {}]}>
          {methodBreakdown.map(([method, count]) => {
            const methodColor = METHOD_COLORS[method as keyof typeof METHOD_COLORS] || '#8B949E';
            return (
              <View key={method} style={[styles.methodCard, { backgroundColor: cardBg }]}>
                <View style={[styles.methodDot, { backgroundColor: methodColor }]} />
                <Text style={[styles.methodName, { color: methodColor }]}>{method}</Text>
                <Text style={[styles.methodCount, { color: colors.text }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Top Endpoints */}
        {topEndpoints.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Endpoints</Text>
            <View style={[styles.listCard, { backgroundColor: cardBg }]}>
              {topEndpoints.map((ep, i) => (
                <View
                  key={i}
                  style={[
                    styles.topRow,
                    i < topEndpoints.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                >
                  <Text style={[styles.topRank, { color: colors.textTertiary }]}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{ep.name}</Text>
                    <Text style={[styles.topMeta, { color: colors.textTertiary }]}>
                      {ep.count} calls · avg {ep.avgTime}ms · {Math.round((ep.success / ep.count) * 100)}% success
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 12, paddingBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 20, letterSpacing: -0.3 },

  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  rangeBtnText: { fontSize: 13, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statCard: { borderRadius: 12, padding: 12, gap: 4, minWidth: '30%', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '500' },

  chartCard: { borderRadius: 14, padding: 16 },
  dailyBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 100, gap: 8 },
  dailyBarCol: { flex: 1, alignItems: 'center', gap: 6 },
  dailyBarStack: { flexDirection: 'column-reverse', alignItems: 'center', width: '100%' },
  dailyBar: { width: '80%', borderRadius: 3, minHeight: 2 },
  dailyLabel: { fontSize: 11, fontWeight: '500' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 12 },

  respBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70 },
  respBar: { flex: 1, borderRadius: 2, minWidth: 4 },
  respStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  respStatText: { fontSize: 11, fontWeight: '500' },

  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  hBarLabel: { fontSize: 13, fontWeight: '700', width: 36 },
  hBarTrack: { flex: 1, height: 14, backgroundColor: '#38383A20', borderRadius: 4, overflow: 'hidden' },
  hBarFill: { height: '100%', borderRadius: 4 },
  hBarValue: { fontSize: 14, fontWeight: '700', width: 36, textAlign: 'right' },
  hBarPct: { fontSize: 12, width: 36, textAlign: 'right' },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodCard: { borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 80 },
  methodDot: { width: 8, height: 8, borderRadius: 4 },
  methodName: { fontSize: 12, fontWeight: '700' },
  methodCount: { fontSize: 14, fontWeight: '700' },

  listCard: { borderRadius: 14, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  topRank: { fontSize: 14, fontWeight: '700', width: 28 },
  topName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  topMeta: { fontSize: 12, marginTop: 2 },

  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
});
