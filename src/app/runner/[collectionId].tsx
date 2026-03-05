import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { METHOD_COLORS, RunnerResult, getStatusColor } from '../../types/api';

export default function CollectionRunnerScreen() {
  const { colors, isDark } = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);
  const activeEnv = useEnvironmentStore((s) => s.getActiveEnv);

  const collection = collections.find((c) => c.id === collectionId);
  const colEndpoints = endpoints.filter((e) => e.collectionId === collectionId);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [delayMs, setDelayMs] = useState(200);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const cardBg = isDark ? colors.surface : colors.card;

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const newResults: RunnerResult[] = [];

    for (let i = 0; i < colEndpoints.length; i++) {
      setCurrentIndex(i);
      const ep = colEndpoints[i];
      const resolvedUrl = resolveVariables(ep.url);
      const resolvedBody = resolveVariables(ep.body);

      const start = Date.now();
      let result: RunnerResult;

      try {
        const headerObj: Record<string, string> = {};
        ep.headers.filter((h) => h.enabled).forEach((h) => {
          headerObj[resolveVariables(h.key)] = resolveVariables(h.value);
        });

        const fetchOpts: RequestInit = { method: ep.method, headers: headerObj };
        if (['POST', 'PUT', 'PATCH'].includes(ep.method) && resolvedBody) {
          fetchOpts.body = resolvedBody;
          if (!headerObj['Content-Type']) headerObj['Content-Type'] = 'application/json';
        }

        const res = await fetch(resolvedUrl, fetchOpts);
        const elapsed = Date.now() - start;
        const resBody = await res.text();
        const success = res.status >= 200 && res.status < 400;

        // Run assertions
        let passed = 0;
        const totalAssertions = ep.assertions?.length || 0;
        (ep.assertions || []).forEach((a) => {
          let ok = false;
          switch (a.type) {
            case 'status':
              ok = res.status.toString() === a.expected;
              break;
            case 'body_contains':
              ok = resBody.includes(a.expected);
              break;
            case 'response_time':
              ok = elapsed <= parseInt(a.expected, 10);
              break;
            case 'header_exists':
              ok = res.headers.has(a.expected);
              break;
            case 'json_path':
              try {
                const json = JSON.parse(resBody);
                ok = a.expected.split('.').reduce((o: any, k: string) => o?.[k], json) !== undefined;
              } catch { ok = false; }
              break;
          }
          if (ok) passed++;
        });

        result = {
          endpointId: ep.id,
          endpointName: ep.name,
          method: ep.method,
          url: resolvedUrl,
          statusCode: res.status,
          responseTime: elapsed,
          success: success && (totalAssertions === 0 || passed === totalAssertions),
          assertionsPassed: passed,
          assertionsTotal: totalAssertions,
          timestamp: Date.now(),
        };

        addCallLog({
          endpointId: ep.id,
          endpointName: ep.name,
          collectionId: collectionId || '',
          url: resolvedUrl,
          method: ep.method,
          statusCode: res.status,
          responseTime: elapsed,
          responseSize: resBody.length,
          success,
          timestamp: Date.now(),
        });
      } catch (err: any) {
        const elapsed = Date.now() - start;
        result = {
          endpointId: ep.id,
          endpointName: ep.name,
          method: ep.method,
          url: resolvedUrl,
          statusCode: 0,
          responseTime: elapsed,
          success: false,
          assertionsPassed: 0,
          assertionsTotal: ep.assertions?.length || 0,
          timestamp: Date.now(),
          error: err.message,
        };
      }

      newResults.push(result);
      setResults([...newResults]);

      // Delay between requests
      if (i < colEndpoints.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setCurrentIndex(-1);
    setRunning(false);
  }, [colEndpoints, resolveVariables, delayMs]);

  const totalPassed = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;
  const totalTime = results.reduce((s, r) => s + r.responseTime, 0);
  const env = activeEnv();

  return (
    <>
      <Stack.Screen options={{ title: collection?.name ? `Run: ${collection.name}` : 'Collection Runner' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { maxWidth: 800, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
        >
          {/* Info Bar */}
          <View style={[styles.infoBar, { backgroundColor: cardBg }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.text }]}>{colEndpoints.length}</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Endpoints</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoItem}>
              <View style={styles.envBadge}>
                <View style={[styles.envDot, { backgroundColor: env?.color || colors.textTertiary }]} />
                <Text style={[styles.infoValue, { color: colors.text }]}>{env?.name || 'No Env'}</Text>
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Environment</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.text }]}>{delayMs}ms</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Delay</Text>
            </View>
          </View>

          {/* Delay Controls */}
          <View style={styles.delayRow}>
            <Text style={[styles.delayLabel, { color: colors.textSecondary }]}>Request Delay:</Text>
            {[0, 100, 200, 500, 1000].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDelayMs(d)}
                style={[styles.delayBtn, { backgroundColor: delayMs === d ? colors.primary : cardBg }]}
              >
                <Text style={[styles.delayBtnText, { color: delayMs === d ? '#FFF' : colors.textSecondary }]}>
                  {d === 0 ? 'None' : `${d}ms`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Run Button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: running ? colors.textTertiary : colors.primary }]}
            onPress={runAll}
            disabled={running || colEndpoints.length === 0}
          >
            {running ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.runBtnText}>Running {currentIndex + 1}/{colEndpoints.length}...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                <Text style={styles.runBtnText}>Run All Endpoints</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Summary */}
          {results.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#3FB950' }]}>{totalPassed}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Passed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#FF6961' }]}>{totalFailed}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Failed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#D29922' }]}>{totalTime}ms</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Time</Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
                <View style={[styles.progressFill, { width: `${(totalPassed / results.length) * 100}%`, backgroundColor: '#3FB950' }]} />
              </View>
            </View>
          )}

          {/* Results */}
          {results.map((r, i) => (
            <View key={i} style={[styles.resultCard, { backgroundColor: cardBg }]}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultStatus, { backgroundColor: r.success ? '#3FB95020' : '#FF696120' }]}>
                  <MaterialCommunityIcons
                    name={r.success ? 'check' : 'close'}
                    size={14}
                    color={r.success ? '#3FB950' : '#FF6961'}
                  />
                </View>
                <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[r.method] + '20' }]}>
                  <Text style={[styles.methodText, { color: METHOD_COLORS[r.method] }]}>{r.method}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, { color: colors.text }]}>{r.endpointName}</Text>
                  <Text style={[styles.resultUrl, { color: colors.textTertiary }]} numberOfLines={1}>{r.url}</Text>
                </View>
              </View>
              <View style={[styles.resultStats, { borderTopColor: colors.divider }]}>
                <View style={[styles.resultStatBadge, { backgroundColor: r.statusCode ? getStatusColor(r.statusCode) + '20' : '#FF696120' }]}>
                  <Text style={[styles.resultStatText, { color: r.statusCode ? getStatusColor(r.statusCode) : '#FF6961' }]}>
                    {r.statusCode || 'ERR'}
                  </Text>
                </View>
                <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{r.responseTime}ms</Text>
                {r.assertionsTotal > 0 && (
                  <Text style={[styles.resultAssertions, { color: r.assertionsPassed === r.assertionsTotal ? '#3FB950' : '#FF6961' }]}>
                    {r.assertionsPassed}/{r.assertionsTotal} assertions
                  </Text>
                )}
                {r.error && (
                  <Text style={[styles.resultError, { color: '#FF6961' }]} numberOfLines={1}>{r.error}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Running indicator */}
          {running && currentIndex >= 0 && currentIndex < colEndpoints.length && (
            <View style={[styles.runningCard, { backgroundColor: colors.primary + '10' }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.runningText, { color: colors.primary }]}>
                Testing: {colEndpoints[currentIndex].name}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 12, paddingBottom: 20 },

  infoBar: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 16, fontWeight: '700' },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoDivider: { width: 1, height: 28 },
  envBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  envDot: { width: 8, height: 8, borderRadius: 4 },

  delayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  delayLabel: { fontSize: 13, fontWeight: '500', marginRight: 4 },
  delayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  delayBtnText: { fontSize: 12, fontWeight: '600' },

  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  runBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  summaryCard: { borderRadius: 14, padding: 16, marginTop: 16 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  resultCard: { borderRadius: 14, padding: 12, marginTop: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultStatus: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  methodText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  resultName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  resultUrl: { fontSize: 11, marginTop: 1 },
  resultStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  resultStatBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  resultStatText: { fontSize: 12, fontWeight: '700' },
  resultTime: { fontSize: 13, fontWeight: '600' },
  resultAssertions: { fontSize: 12, fontWeight: '600' },
  resultError: { fontSize: 12, flex: 1 },

  runningCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginTop: 8 },
  runningText: { fontSize: 14, fontWeight: '600' },
});
