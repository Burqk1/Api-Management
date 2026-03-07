import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { ApiEndpoint, ApiCollection, getStatusColor, generateId } from '../types/api';

interface DataRow {
  [key: string]: string;
}

interface IterationResult {
  iteration: number;
  results: {
    endpointName: string;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    success: boolean;
    error?: string;
  }[];
}

function parseCSV(csv: string): DataRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: DataRow = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function parseJSONData(json: string): DataRow[] {
  const parsed = JSON.parse(json);
  if (Array.isArray(parsed)) return parsed;
  return [];
}

export default function DataDrivenScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [dataFormat, setDataFormat] = useState<'csv' | 'json'>('csv');
  const [dataInput, setDataInput] = useState('');
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<IterationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const loadData = () => {
    try {
      const rows = dataFormat === 'csv' ? parseCSV(dataInput) : parseJSONData(dataInput);
      if (rows.length === 0) {
        Alert.alert(t('error'), 'No data rows found');
        return;
      }
      setDataRows(rows);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    }
  };

  const replaceDataVars = (text: string, row: DataRow): string => {
    let result = text;
    Object.entries(row).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{data\\.${key}\\}\\}`, 'g'), value);
    });
    return result;
  };

  const runTests = async () => {
    if (!selectedCollectionId || dataRows.length === 0) return;

    const eps = endpoints.filter((e) => e.collectionId === selectedCollectionId);
    if (eps.length === 0) {
      Alert.alert(t('error'), 'No endpoints in selected collection');
      return;
    }

    setRunning(true);
    setResults([]);
    const total = dataRows.length * eps.length;
    setProgress({ current: 0, total });

    const allResults: IterationResult[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const iterationResult: IterationResult = { iteration: i + 1, results: [] };

      for (const ep of eps) {
        const url = resolveVariables(replaceDataVars(ep.url, row));
        const body = resolveVariables(replaceDataVars(ep.body || '', row));
        const headers: Record<string, string> = {};
        ep.headers.filter((h) => h.enabled).forEach((h) => {
          headers[resolveVariables(replaceDataVars(h.key, row))] = resolveVariables(replaceDataVars(h.value, row));
        });

        const start = Date.now();
        try {
          const res = await fetch(url, {
            method: ep.method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: ['POST', 'PUT', 'PATCH'].includes(ep.method) && body ? body : undefined,
          });

          const responseTime = Date.now() - start;
          const responseBody = await res.text();

          iterationResult.results.push({
            endpointName: ep.name,
            method: ep.method,
            url,
            statusCode: res.status,
            responseTime,
            success: res.ok,
          });

          addCallLog({
            endpointId: ep.id,
            endpointName: `${ep.name} [iter ${i + 1}]`,
            collectionId: ep.collectionId,
            url,
            method: ep.method,
            statusCode: res.status,
            responseTime,
            responseSize: responseBody.length,
            success: res.ok,
            timestamp: Date.now(),
            responseBody,
          });
        } catch (e: any) {
          iterationResult.results.push({
            endpointName: ep.name,
            method: ep.method,
            url,
            statusCode: 0,
            responseTime: Date.now() - start,
            success: false,
            error: e.message,
          });
        }

        setProgress((p) => ({ ...p, current: p.current + 1 }));
      }

      allResults.push(iterationResult);
      setResults([...allResults]);
    }

    setRunning(false);
  };

  const totalTests = results.reduce((sum, r) => sum + r.results.length, 0);
  const passedTests = results.reduce((sum, r) => sum + r.results.filter((x) => x.success).length, 0);

  return (
    <>
      <Stack.Screen options={{ title: t('dataDrivenTesting') || 'Data-Driven Testing' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Info */}
          <View style={[styles.card, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              {t('dataDrivenHint') || 'Load CSV or JSON data to run tests with multiple data sets. Use {{data.fieldName}} in URLs, headers, and body.'}
            </Text>
          </View>

          {/* Format Toggle */}
          <View style={styles.toggleRow}>
            {(['csv', 'json'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[styles.toggleBtn, { backgroundColor: dataFormat === fmt ? colors.primary : cardBg }]}
                onPress={() => setDataFormat(fmt)}
              >
                <Text style={[styles.toggleText, { color: dataFormat === fmt ? '#FFF' : colors.text }]}>
                  {fmt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Data Input */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={dataInput}
              onChangeText={setDataInput}
              placeholder={dataFormat === 'csv'
                ? 'name,email,age\nJohn,john@test.com,30\nJane,jane@test.com,25'
                : '[{"name":"John","email":"john@test.com"},{"name":"Jane","email":"jane@test.com"}]'
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.loadBtn, { backgroundColor: colors.primary + '20' }]}
            onPress={loadData}
          >
            <MaterialCommunityIcons name="database-import-outline" size={18} color={colors.primary} />
            <Text style={[styles.loadBtnText, { color: colors.primary }]}>{t('loadData') || 'Load Data'}</Text>
          </TouchableOpacity>

          {/* Data Preview */}
          {dataRows.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg, marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {dataRows.length} {t('iterations') || 'iterations'} | {Object.keys(dataRows[0]).length} {t('dataFields') || 'fields'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header */}
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.tableCellIndex, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.tableCellText, { color: colors.primary, fontWeight: '700' }]}>#</Text>
                    </View>
                    {Object.keys(dataRows[0]).map((key) => (
                      <View key={key} style={[styles.tableCell, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.tableCellText, { color: colors.primary, fontWeight: '700' }]}>{key}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Rows */}
                  {dataRows.slice(0, 10).map((row, i) => (
                    <View key={i} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.tableCellIndex]}>
                        <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>{i + 1}</Text>
                      </View>
                      {Object.values(row).map((val, j) => (
                        <View key={j} style={styles.tableCell}>
                          <Text style={[styles.tableCellText, { color: colors.text }]} numberOfLines={1}>{val}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {dataRows.length > 10 && (
                    <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                      +{dataRows.length - 10} more rows
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Collection Selection */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>{t('selectCollection') || 'Select Collection'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.chipRow}>
              {collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    styles.chip,
                    { backgroundColor: selectedCollectionId === col.id ? col.color + '30' : cardBg, borderColor: selectedCollectionId === col.id ? col.color : 'transparent', borderWidth: 1.5 },
                  ]}
                  onPress={() => setSelectedCollectionId(col.id)}
                >
                  <View style={[styles.chipDot, { backgroundColor: col.color }]} />
                  <Text style={[styles.chipText, { color: selectedCollectionId === col.id ? col.color : colors.text }]}>{col.name}</Text>
                  <Text style={[styles.chipCount, { color: colors.textTertiary }]}>
                    {endpoints.filter((e) => e.collectionId === col.id).length}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Run Button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: colors.primary, opacity: running || !selectedCollectionId || dataRows.length === 0 ? 0.5 : 1 }]}
            onPress={runTests}
            disabled={running || !selectedCollectionId || dataRows.length === 0}
          >
            <MaterialCommunityIcons name={running ? 'loading' : 'play'} size={20} color="#FFF" />
            <Text style={styles.runText}>{running ? `${t('running')}... ${progress.current}/${progress.total}` : t('runAllEndpoints') || 'Run All Endpoints'}</Text>
          </TouchableOpacity>

          {/* Progress */}
          {running && (
            <View style={[styles.progressBar, { backgroundColor: cardBg }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }]} />
            </View>
          )}

          {/* Results */}
          {results.length > 0 && (
            <View style={{ marginTop: 16 }}>
              {/* Summary */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{totalTests}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#3FB950' }]}>{passedTests}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('passed')}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#FF6961' }]}>{totalTests - passedTests}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('failed')}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('successRate')}</Text>
                  </View>
                </View>
              </View>

              {/* Iteration Details */}
              {results.map((iter) => (
                <View key={iter.iteration} style={[styles.card, { backgroundColor: cardBg, marginTop: 8 }]}>
                  <Text style={[styles.iterTitle, { color: colors.text }]}>
                    Iteration {iter.iteration}
                  </Text>
                  {iter.results.map((r, i) => (
                    <View key={i} style={[styles.resultRow, i < iter.results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                      <View style={[styles.methodBadge, { backgroundColor: getStatusColor(r.statusCode) + '20' }]}>
                        <Text style={[styles.methodText, { color: getStatusColor(r.statusCode) }]}>{r.method}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{r.endpointName}</Text>
                        <Text style={[styles.resultUrl, { color: colors.textTertiary }]} numberOfLines={1}>{r.url}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.resultStatus, { color: getStatusColor(r.statusCode) }]}>{r.statusCode || 'ERR'}</Text>
                        <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{r.responseTime}ms</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
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
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  card: { borderRadius: 14, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 20 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 140 },
  loadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  loadBtnText: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  tableRow: { flexDirection: 'row' },
  tableCell: { paddingHorizontal: 12, paddingVertical: 8, minWidth: 100, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#33333320' },
  tableCellIndex: { minWidth: 40 },
  tableCellText: { fontSize: 12 },
  moreText: { fontSize: 12, marginTop: 4, paddingLeft: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipCount: { fontSize: 12 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  runText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  iterTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  methodText: { fontSize: 11, fontWeight: '700' },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultUrl: { fontSize: 11, marginTop: 2 },
  resultStatus: { fontSize: 14, fontWeight: '700' },
  resultTime: { fontSize: 12, marginTop: 2 },
});
