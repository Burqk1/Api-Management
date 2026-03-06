import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { BenchmarkResult, generateId } from '../types/api';

export default function BenchmarkScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const endpoints = useApiStore((s) => s.endpoints);
  const collections = useApiStore((s) => s.collections);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState('50');
  const [concurrency, setConcurrency] = useState('5');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [showEndpoints, setShowEndpoints] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const selectedEp = endpoints.find((e) => e.id === selectedEndpoint);

  const runBenchmark = useCallback(async () => {
    if (!selectedEp) return;
    const count = parseInt(requestCount) || 50;
    const conc = parseInt(concurrency) || 5;

    setRunning(true);
    setProgress(0);
    setResult(null);

    const resolvedUrl = resolveVariables(selectedEp.url);
    const headerObj: Record<string, string> = {};
    selectedEp.headers.filter((h) => h.enabled).forEach((h) => {
      headerObj[resolveVariables(h.key)] = resolveVariables(h.value);
    });

    if (selectedEp.auth?.type === 'bearer' && selectedEp.auth.bearer?.token) {
      headerObj['Authorization'] = `Bearer ${resolveVariables(selectedEp.auth.bearer.token)}`;
    }

    const resolvedBody = selectedEp.body ? resolveVariables(selectedEp.body) : undefined;
    const results: BenchmarkResult['results'] = [];
    let completed = 0;
    const overallStart = Date.now();

    const runSingle = async (): Promise<void> => {
      const start = Date.now();
      try {
        const opts: RequestInit = { method: selectedEp.method, headers: headerObj };
        if (['POST', 'PUT', 'PATCH'].includes(selectedEp.method) && resolvedBody) {
          opts.body = resolvedBody;
          if (!headerObj['Content-Type']) headerObj['Content-Type'] = 'application/json';
        }
        const res = await fetch(resolvedUrl, opts);
        const body = await res.text();
        results.push({
          statusCode: res.status,
          responseTime: Date.now() - start,
          success: res.status >= 200 && res.status < 400,
          size: body.length,
        });
      } catch {
        results.push({
          statusCode: 0,
          responseTime: Date.now() - start,
          success: false,
          size: 0,
        });
      }
      completed++;
      setProgress(completed / count);
    };

    // Run with concurrency limit
    const queue = Array.from({ length: count }, (_, i) => i);
    const workers = Array.from({ length: Math.min(conc, count) }, async () => {
      while (queue.length > 0) {
        queue.shift();
        await runSingle();
      }
    });

    await Promise.all(workers);
    const totalTime = Date.now() - overallStart;

    // Calculate stats
    const times = results.map((r) => r.responseTime).sort((a, b) => a - b);
    const successCount = results.filter((r) => r.success).length;

    const stats: BenchmarkResult['stats'] = {
      min: times[0] || 0,
      max: times[times.length - 1] || 0,
      avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      median: times[Math.floor(times.length / 2)] || 0,
      p95: times[Math.floor(times.length * 0.95)] || 0,
      p99: times[Math.floor(times.length * 0.99)] || 0,
      successRate: (successCount / results.length) * 100,
      requestsPerSecond: Math.round((results.length / totalTime) * 1000 * 100) / 100,
      totalTime,
      errorCount: results.length - successCount,
    };

    const benchmarkResult: BenchmarkResult = {
      id: generateId(),
      endpointId: selectedEp.id,
      endpointName: selectedEp.name,
      url: resolvedUrl,
      method: selectedEp.method,
      totalRequests: count,
      concurrency: conc,
      results,
      stats,
      timestamp: Date.now(),
    };

    setResult(benchmarkResult);
    setRunning(false);
  }, [selectedEp, requestCount, concurrency, resolveVariables]);

  const getBarHeight = (time: number, max: number) => Math.max(4, (time / max) * 120);

  return (
    <>
      <Stack.Screen options={{ title: t('benchmark') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Endpoint Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('selectEndpoint')}</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: cardBg }]}
            onPress={() => setShowEndpoints(!showEndpoints)}
          >
            <View style={{ flex: 1 }}>
              {selectedEp ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.methodBadge, { backgroundColor: getMethodColor(selectedEp.method) + '20' }]}>
                    <Text style={{ color: getMethodColor(selectedEp.method), fontSize: 11, fontWeight: '800' }}>
                      {selectedEp.method}
                    </Text>
                  </View>
                  <Text style={[styles.epName, { color: colors.text }]} numberOfLines={1}>{selectedEp.name}</Text>
                </View>
              ) : (
                <Text style={{ color: colors.textTertiary }}>{t('selectEndpoint')}</Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {showEndpoints && (
            <View style={[styles.dropdown, { backgroundColor: cardBg }]}>
              <ScrollView style={{ maxHeight: 250 }}>
                {endpoints.map((ep) => {
                  const col = collections.find((c) => c.id === ep.collectionId);
                  return (
                    <TouchableOpacity
                      key={ep.id}
                      style={[styles.dropdownItem, selectedEndpoint === ep.id && { backgroundColor: colors.primary + '15' }]}
                      onPress={() => { setSelectedEndpoint(ep.id); setShowEndpoints(false); }}
                    >
                      <View style={[styles.methodBadge, { backgroundColor: getMethodColor(ep.method) + '20' }]}>
                        <Text style={{ color: getMethodColor(ep.method), fontSize: 10, fontWeight: '800' }}>{ep.method}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.epName, { color: colors.text }]} numberOfLines={1}>{ep.name}</Text>
                        {col && <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{col.name}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {endpoints.length === 0 && (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>{t('noEndpointsYet')}</Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Configuration */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>{t('benchmarkConfig')}</Text>
          <View style={[styles.configCard, { backgroundColor: cardBg }]}>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: colors.text }]}>{t('totalRequests')}</Text>
              <TextInput
                style={[styles.configInput, { backgroundColor: inputBg, color: colors.text }]}
                value={requestCount}
                onChangeText={setRequestCount}
                keyboardType="number-pad"
                placeholder="50"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.configRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>{t('concurrency')}</Text>
              <TextInput
                style={[styles.configInput, { backgroundColor: inputBg, color: colors.text }]}
                value={concurrency}
                onChangeText={setConcurrency}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            {[{ n: '10', c: '1', label: 'Light' }, { n: '50', c: '5', label: 'Medium' }, { n: '100', c: '10', label: 'Heavy' }, { n: '500', c: '20', label: 'Stress' }].map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.presetBtn, {
                  backgroundColor: requestCount === p.n && concurrency === p.c ? colors.primary + '20' : cardBg,
                  borderColor: requestCount === p.n && concurrency === p.c ? colors.primary : 'transparent',
                  borderWidth: 1.5,
                }]}
                onPress={() => { setRequestCount(p.n); setConcurrency(p.c); }}
              >
                <Text style={{ color: requestCount === p.n && concurrency === p.c ? colors.primary : colors.text, fontSize: 13, fontWeight: '600' }}>
                  {p.label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{p.n}x{p.c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Run Button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: colors.primary, opacity: selectedEp && !running ? 1 : 0.4 }]}
            onPress={runBenchmark}
            disabled={!selectedEp || running}
          >
            {running ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialCommunityIcons name="speedometer" size={20} color="#FFF" />
            )}
            <Text style={styles.runBtnText}>{running ? `${Math.round(progress * 100)}%` : t('runBenchmark')}</Text>
          </TouchableOpacity>

          {/* Progress Bar */}
          {running && (
            <View style={[styles.progressBar, { backgroundColor: inputBg }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          )}

          {/* Results */}
          {result && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('benchmarkResults')}</Text>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {[
                  { label: t('avgTime'), value: `${result.stats.avg}ms`, color: colors.primary },
                  { label: 'Min', value: `${result.stats.min}ms`, color: '#3FB950' },
                  { label: 'Max', value: `${result.stats.max}ms`, color: '#FF6961' },
                  { label: 'Median', value: `${result.stats.median}ms`, color: '#D29922' },
                  { label: 'P95', value: `${result.stats.p95}ms`, color: '#BC8CFF' },
                  { label: 'P99', value: `${result.stats.p99}ms`, color: '#F778BA' },
                  { label: t('successRate'), value: `${result.stats.successRate.toFixed(1)}%`, color: result.stats.successRate >= 95 ? '#3FB950' : '#FF6961' },
                  { label: 'RPS', value: `${result.stats.requestsPerSecond}`, color: '#58A6FF' },
                ].map((s) => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Response Time Distribution */}
              <Text style={[styles.subTitle, { color: colors.text }]}>{t('responseTimeDistribution')}</Text>
              <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContent}>
                  {result.results.slice(0, 100).map((r, i) => (
                    <View key={i} style={styles.barCol}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: getBarHeight(r.responseTime, result.stats.max),
                            backgroundColor: r.success ? (r.responseTime > result.stats.p95 ? '#D29922' : '#3FB950') : '#FF6961',
                          },
                        ]}
                      />
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3FB950' }]} />
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{t('successful')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#D29922' }]} />
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>&gt;P95</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF6961' }]} />
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{t('failed')}</Text>
                  </View>
                </View>
              </View>

              {/* Status Code Breakdown */}
              <Text style={[styles.subTitle, { color: colors.text }]}>{t('statusCodes')}</Text>
              <View style={[styles.statusList, { backgroundColor: cardBg }]}>
                {Object.entries(
                  result.results.reduce((acc, r) => {
                    const code = r.statusCode || 'Error';
                    acc[code] = (acc[code] || 0) + 1;
                    return acc;
                  }, {} as Record<string | number, number>)
                ).map(([code, count]) => (
                  <View key={code} style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(Number(code)) }]}>
                      <Text style={{ color: getStatusFg(Number(code)), fontSize: 12, fontWeight: '700' }}>{code}</Text>
                    </View>
                    <View style={[styles.statusBarBg, { backgroundColor: isDark ? colors.systemGray5 : '#E5E5EA' }]}>
                      <View style={[styles.statusBarFill, { width: `${((count as number) / result.totalRequests) * 100}%`, backgroundColor: getStatusFg(Number(code)) }]} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', minWidth: 35, textAlign: 'right' }}>
                      {count as number}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {result.totalRequests} {t('totalRequests').toLowerCase()} {t('in')} {(result.stats.totalTime / 1000).toFixed(2)}s
                  {' | '}{result.stats.errorCount} {t('errors')} {' | '}{result.stats.requestsPerSecond} req/s
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', PATCH: '#BC8CFF',
    DELETE: '#FF6961', HEAD: '#8B949E', OPTIONS: '#F778BA',
  };
  return colors[method] || '#8B949E';
}

function getStatusBg(code: number): string {
  if (code >= 200 && code < 300) return '#3FB95020';
  if (code >= 300 && code < 400) return '#58A6FF20';
  if (code >= 400 && code < 500) return '#D2992220';
  return '#FF696120';
}

function getStatusFg(code: number): string {
  if (code >= 200 && code < 300) return '#3FB950';
  if (code >= 300 && code < 400) return '#58A6FF';
  if (code >= 400 && code < 500) return '#D29922';
  return '#FF6961';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  subTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  selector: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 8 },
  dropdown: { borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  epName: { fontSize: 14, fontWeight: '600' },
  configCard: { borderRadius: 14, overflow: 'hidden' },
  configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  configLabel: { fontSize: 15, fontWeight: '600' },
  configInput: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '600', textAlign: 'center', width: 80 },
  presetsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  presetBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  runBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  chartCard: { borderRadius: 14, padding: 14 },
  chartContent: { alignItems: 'flex-end', gap: 2, minHeight: 130, paddingBottom: 4 },
  barCol: { justifyContent: 'flex-end' },
  bar: { width: 4, borderRadius: 2, minHeight: 4 },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  statusList: { borderRadius: 14, padding: 14, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  statusBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  statusBarFill: { height: '100%', borderRadius: 3 },
  summaryCard: { borderRadius: 12, padding: 14, marginTop: 12, alignItems: 'center' },
});
