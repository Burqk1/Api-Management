import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export default function TrendAnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);

  const [range, setRange] = useState<TimeRange>('7d');
  const cardBg = isDark ? colors.surface : colors.card;

  const rangeMs: Record<TimeRange, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, all: Infinity };

  const filtered = useMemo(() => {
    const cutoff = Date.now() - rangeMs[range];
    return callLogs.filter((h) => h.timestamp >= cutoff);
  }, [callLogs, range]);

  // Compute stats
  const totalRequests = filtered.length;
  const successCount = filtered.filter((h) => h.statusCode >= 200 && h.statusCode < 400).length;
  const errorCount = filtered.filter((h) => h.statusCode >= 400).length;
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0;
  const avgResponseTime = totalRequests > 0 ? Math.round(filtered.reduce((sum, h) => sum + (h.responseTime || 0), 0) / totalRequests) : 0;
  const p95 = (() => {
    const sorted = filtered.map((h) => h.responseTime || 0).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  })();

  // Health score (0-100)
  const healthScore = Math.max(0, Math.min(100, Math.round(
    successRate * 0.4 + Math.max(0, 100 - avgResponseTime / 10) * 0.3 + Math.min(100, totalRequests) * 0.3
  )));

  const healthColor = healthScore >= 80 ? '#3FB950' : healthScore >= 50 ? '#D29922' : '#FF6961';
  const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 50 ? 'Fair' : 'Poor';

  // Status distribution
  const statusGroups = useMemo(() => {
    const groups = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    filtered.forEach((h) => {
      if (h.statusCode >= 200 && h.statusCode < 300) groups['2xx']++;
      else if (h.statusCode >= 300 && h.statusCode < 400) groups['3xx']++;
      else if (h.statusCode >= 400 && h.statusCode < 500) groups['4xx']++;
      else if (h.statusCode >= 500) groups['5xx']++;
    });
    return groups;
  }, [filtered]);

  // Method distribution
  const methodGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    filtered.forEach((h) => { groups[h.method] = (groups[h.method] || 0) + 1; });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Time series (buckets for chart)
  const timeBuckets = useMemo(() => {
    const bucketCount = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 12;
    const bucketSize = rangeMs[range] === Infinity ? (Date.now() / bucketCount) : (rangeMs[range] / bucketCount);
    const now = Date.now();
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      start: now - (bucketCount - i) * bucketSize,
      count: 0, avgTime: 0, errors: 0,
    }));
    filtered.forEach((h) => {
      const idx = Math.floor((h.timestamp - (now - bucketCount * bucketSize)) / bucketSize);
      if (idx >= 0 && idx < bucketCount) {
        buckets[idx].count++;
        buckets[idx].avgTime += h.responseTime || 0;
        if (h.statusCode >= 400) buckets[idx].errors++;
      }
    });
    buckets.forEach((b) => { if (b.count > 0) b.avgTime = Math.round(b.avgTime / b.count); });
    return buckets;
  }, [filtered, range]);

  const maxCount = Math.max(...timeBuckets.map((b) => b.count), 1);
  const maxTime = Math.max(...timeBuckets.map((b) => b.avgTime), 1);

  // Top slowest endpoints
  const slowest = useMemo(() => {
    const map: Record<string, { url: string; method: string; totalTime: number; count: number }> = {};
    filtered.forEach((h) => {
      const key = `${h.method} ${h.url}`;
      if (!map[key]) map[key] = { url: h.url, method: h.method, totalTime: 0, count: 0 };
      map[key].totalTime += h.responseTime || 0;
      map[key].count++;
    });
    return Object.values(map)
      .map((e) => ({ ...e, avg: Math.round(e.totalTime / e.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [filtered]);

  const METHOD_COLORS: Record<string, string> = { GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', PATCH: '#BC8CFF', DELETE: '#FF6961', HEAD: '#8B949E', OPTIONS: '#64D2FF' };

  return (
    <>
      <Stack.Screen options={{ title: 'Trend Analytics' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Time Range */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['24h', '7d', '30d', 'all'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeBtn, { backgroundColor: range === r ? colors.primary + '20' : cardBg, borderColor: range === r ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setRange(r)}
              >
                <Text style={{ color: range === r ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Health Score */}
          <View style={[styles.healthCard, { backgroundColor: cardBg }]}>
            <View style={[styles.healthBadge, { backgroundColor: healthColor + '20' }]}>
              <Text style={[styles.healthScore, { color: healthColor }]}>{healthScore}</Text>
              <Text style={{ color: healthColor, fontSize: 10, fontWeight: '600' }}>/ 100</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.healthTitle, { color: colors.text }]}>API Health: {healthLabel}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{totalRequests} requests in selected period</Text>
            </View>
            <MaterialCommunityIcons name="heart-pulse" size={24} color={healthColor} />
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            {[
              { label: 'Success Rate', value: `${successRate}%`, color: successRate >= 90 ? '#3FB950' : '#FF6961' },
              { label: 'Avg Response', value: `${avgResponseTime}ms`, color: avgResponseTime < 500 ? '#3FB950' : '#D29922' },
              { label: 'P95 Response', value: `${p95}ms`, color: '#BC8CFF' },
              { label: 'Errors', value: `${errorCount}`, color: errorCount > 0 ? '#FF6961' : '#3FB950' },
            ].map((m) => (
              <View key={m.label} style={[styles.metricCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Request Volume Chart */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Volume</Text>
          <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
            <View style={styles.chartArea}>
              {timeBuckets.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.bar, { height: `${Math.max(4, (b.count / maxCount) * 100)}%` as any, backgroundColor: b.errors > b.count / 2 ? '#FF6961' : colors.primary }]} />
                </View>
              ))}
            </View>
          </View>

          {/* Response Time Trend */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Avg Response Time</Text>
          <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
            <View style={styles.chartArea}>
              {timeBuckets.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.bar, { height: `${Math.max(4, (b.avgTime / maxTime) * 100)}%` as any, backgroundColor: b.avgTime > 1000 ? '#FF6961' : b.avgTime > 500 ? '#D29922' : '#3FB950' }]} />
                </View>
              ))}
            </View>
          </View>

          {/* Status Distribution */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Codes</Text>
          <View style={[styles.distCard, { backgroundColor: cardBg }]}>
            {[
              { label: '2xx Success', value: statusGroups['2xx'], color: '#3FB950' },
              { label: '3xx Redirect', value: statusGroups['3xx'], color: '#58A6FF' },
              { label: '4xx Client Error', value: statusGroups['4xx'], color: '#D29922' },
              { label: '5xx Server Error', value: statusGroups['5xx'], color: '#FF6961' },
            ].map((s) => (
              <View key={s.label} style={styles.distRow}>
                <View style={[styles.distDot, { backgroundColor: s.color }]} />
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{s.label}</Text>
                <Text style={{ color: s.color, fontSize: 14, fontWeight: '700' }}>{s.value}</Text>
                <View style={[styles.distBar, { backgroundColor: colors.systemGray5 }]}>
                  <View style={{ width: `${totalRequests > 0 ? Math.max(2, (s.value / totalRequests) * 100) : 0}%` as any, height: '100%', backgroundColor: s.color, borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>

          {/* Method Distribution */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Methods</Text>
          <View style={[styles.distCard, { backgroundColor: cardBg }]}>
            {methodGroups.map(([method, count]) => (
              <View key={method} style={styles.distRow}>
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[method] || '#8B949E') + '20' }]}>
                  <Text style={{ color: METHOD_COLORS[method] || '#8B949E', fontSize: 10, fontWeight: '800' }}>{method}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{count} requests</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0}%</Text>
              </View>
            ))}
          </View>

          {/* Slowest Endpoints */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Slowest Endpoints</Text>
          {slowest.map((ep, i) => (
            <View key={i} style={[styles.slowCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[ep.method] || '#8B949E') + '20' }]}>
                  <Text style={{ color: METHOD_COLORS[ep.method] || '#8B949E', fontSize: 9, fontWeight: '800' }}>{ep.method}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>{ep.url}</Text>
                <Text style={{ color: ep.avg > 1000 ? '#FF6961' : '#D29922', fontSize: 14, fontWeight: '700' }}>{ep.avg}ms</Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>{ep.count} calls</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  healthCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, marginBottom: 16 },
  healthBadge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  healthScore: { fontSize: 24, fontWeight: '800' },
  healthTitle: { fontSize: 17, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metricCard: { width: '48%', borderRadius: 12, padding: 14, alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  chartCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  chartArea: { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 2 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 2, minHeight: 2 },
  distCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distDot: { width: 8, height: 8, borderRadius: 4 },
  distBar: { width: 60, height: 6, borderRadius: 3, overflow: 'hidden' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, minWidth: 40, alignItems: 'center' },
  slowCard: { borderRadius: 12, padding: 12, marginBottom: 6 },
});
