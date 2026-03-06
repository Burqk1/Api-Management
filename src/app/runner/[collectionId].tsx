import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useLanguageStore } from '../../stores/languageStore';
import { METHOD_COLORS, RunnerResult, getStatusColor } from '../../types/api';

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"' && !inQuote) { inQuote = true; continue; }
      if (ch === '"' && inQuote) { inQuote = false; continue; }
      if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function parseDataJSON(json: string): Record<string, string>[] {
  const parsed = JSON.parse(json);
  if (Array.isArray(parsed)) return parsed.map((item) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) row[k] = String(v ?? '');
    return row;
  });
  return [];
}

function resolveDataVars(text: string, dataRow: Record<string, string>): string {
  return text.replace(/\{\{data\.(\w+)\}\}/g, (_, key) => dataRow[key] ?? `{{data.${key}}}`);
}

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

  const t = useLanguageStore((s) => s.t);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [delayMs, setDelayMs] = useState(200);

  // Data-driven testing
  const [dataRows, setDataRows] = useState<Record<string, string>[]>([]);
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [dataText, setDataText] = useState('');
  const [dataFormat, setDataFormat] = useState<'csv' | 'json'>('csv');
  const [currentIteration, setCurrentIteration] = useState(0);
  const [totalIterations, setTotalIterations] = useState(0);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const cardBg = isDark ? colors.surface : colors.card;

  const runEndpoint = async (ep: typeof colEndpoints[0], dataRow?: Record<string, string>) => {
    const resolve = (text: string) => {
      let resolved = resolveVariables(text);
      if (dataRow) resolved = resolveDataVars(resolved, dataRow);
      return resolved;
    };

    const resolvedUrl = resolve(ep.url);
    const resolvedBody = resolve(ep.body);
    const start = Date.now();

    try {
      const headerObj: Record<string, string> = {};
      ep.headers.filter((h) => h.enabled).forEach((h) => {
        headerObj[resolve(h.key)] = resolve(h.value);
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

      let passed = 0;
      const totalAssertions = ep.assertions?.length || 0;
      (ep.assertions || []).forEach((a) => {
        let ok = false;
        const expected = resolve(a.expected);
        switch (a.type) {
          case 'status': ok = res.status.toString() === expected; break;
          case 'body_contains': ok = resBody.includes(expected); break;
          case 'response_time': ok = elapsed <= parseInt(expected, 10); break;
          case 'header_exists': ok = res.headers.has(expected); break;
          case 'json_path':
            try { const json = JSON.parse(resBody); ok = expected.split('.').reduce((o: any, k: string) => o?.[k], json) !== undefined; } catch { ok = false; }
            break;
        }
        if (ok) passed++;
      });

      addCallLog({
        endpointId: ep.id, endpointName: ep.name, collectionId: collectionId || '',
        url: resolvedUrl, method: ep.method, statusCode: res.status,
        responseTime: elapsed, responseSize: resBody.length, success, timestamp: Date.now(),
      });

      return {
        endpointId: ep.id, endpointName: ep.name, method: ep.method, url: resolvedUrl,
        statusCode: res.status, responseTime: elapsed,
        success: success && (totalAssertions === 0 || passed === totalAssertions),
        assertionsPassed: passed, assertionsTotal: totalAssertions, timestamp: Date.now(),
      } as RunnerResult;
    } catch (err: any) {
      const elapsed = Date.now() - start;
      return {
        endpointId: ep.id, endpointName: ep.name, method: ep.method, url: resolvedUrl,
        statusCode: 0, responseTime: elapsed, success: false,
        assertionsPassed: 0, assertionsTotal: ep.assertions?.length || 0,
        timestamp: Date.now(), error: err.message,
      } as RunnerResult;
    }
  };

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const newResults: RunnerResult[] = [];
    const iterations = dataRows.length > 0 ? dataRows : [undefined];
    setTotalIterations(iterations.length);

    for (let iter = 0; iter < iterations.length; iter++) {
      setCurrentIteration(iter + 1);
      const dataRow = iterations[iter];

      for (let i = 0; i < colEndpoints.length; i++) {
        setCurrentIndex(i);
        const result = await runEndpoint(colEndpoints[i], dataRow);
        if (dataRow) {
          (result as any).iteration = iter + 1;
        }
        newResults.push(result);
        setResults([...newResults]);

        if (i < colEndpoints.length - 1 && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      // Delay between iterations
      if (iter < iterations.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setCurrentIndex(-1);
    setCurrentIteration(0);
    setRunning(false);
  }, [colEndpoints, resolveVariables, delayMs, dataRows]);

  const handleLoadData = () => {
    try {
      const rows = dataFormat === 'csv' ? parseCSV(dataText) : parseDataJSON(dataText);
      if (rows.length === 0) return;
      setDataRows(rows);
      setDataModalVisible(false);
      setDataText('');
    } catch {}
  };

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

          {/* Data-Driven Testing */}
          <View style={[styles.dataSection, { backgroundColor: cardBg }]}>
            <View style={styles.dataSectionHeader}>
              <MaterialCommunityIcons name="database-outline" size={18} color={colors.primary} />
              <Text style={[styles.dataSectionTitle, { color: colors.text }]}>{t('dataDrivenTesting')}</Text>
              <TouchableOpacity
                style={[styles.dataBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={() => setDataModalVisible(true)}
              >
                <MaterialCommunityIcons name="upload-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{t('loadData')}</Text>
              </TouchableOpacity>
            </View>
            {dataRows.length > 0 ? (
              <View style={styles.dataInfo}>
                <View style={[styles.dataInfoBadge, { backgroundColor: '#3FB95015' }]}>
                  <Text style={{ color: '#3FB950', fontSize: 13, fontWeight: '700' }}>
                    {dataRows.length} {t('iterations')}
                  </Text>
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  {t('dataFields')}: {Object.keys(dataRows[0]).join(', ')}
                </Text>
                <TouchableOpacity onPress={() => setDataRows([])}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>
                {t('dataDrivenHint')}
              </Text>
            )}
          </View>

          {/* Data Modal */}
          <Modal visible={dataModalVisible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => setDataModalVisible(false)}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('loadTestData')}</Text>
                <TouchableOpacity onPress={handleLoadData}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{t('load')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['csv', 'json'] as const).map((fmt) => (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.fmtBtn, { backgroundColor: dataFormat === fmt ? colors.primary : cardBg }]}
                      onPress={() => setDataFormat(fmt)}
                    >
                      <Text style={{ color: dataFormat === fmt ? '#FFF' : colors.text, fontSize: 14, fontWeight: '700' }}>
                        {fmt.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.dataInput, { backgroundColor: cardBg, color: colors.text }]}
                  value={dataText}
                  onChangeText={setDataText}
                  placeholder={dataFormat === 'csv'
                    ? 'name,email,age\nJohn,john@test.com,25\nJane,jane@test.com,30'
                    : '[{"name":"John","email":"john@test.com"},{"name":"Jane","email":"jane@test.com"}]'
                  }
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={[styles.hintBox, { backgroundColor: colors.primary + '10' }]}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, flex: 1 }}>
                    {t('dataDrivenUsage')}
                  </Text>
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* Run Button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: running ? colors.textTertiary : colors.primary }]}
            onPress={runAll}
            disabled={running || colEndpoints.length === 0}
          >
            {running ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.runBtnText}>
                  {dataRows.length > 0
                    ? `${t('running')} ${currentIteration}/${totalIterations} - ${currentIndex + 1}/${colEndpoints.length}`
                    : `${t('running')} ${currentIndex + 1}/${colEndpoints.length}...`}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                <Text style={styles.runBtnText}>
                  {dataRows.length > 0
                    ? `${t('runAllEndpoints')} (${dataRows.length} ${t('iterations')})`
                    : t('runAllEndpoints')}
                </Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.resultName, { color: colors.text }]}>{r.endpointName}</Text>
                    {(r as any).iteration && (
                      <View style={[styles.iterBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '700' }}>#{(r as any).iteration}</Text>
                      </View>
                    )}
                  </View>
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

  // Data-driven
  dataSection: { borderRadius: 14, padding: 14, marginTop: 12 },
  dataSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dataSectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  dataBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dataInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  dataInfoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  iterBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fmtBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  dataInput: { borderRadius: 12, padding: 14, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 200, textAlignVertical: 'top' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginTop: 14 },
});
