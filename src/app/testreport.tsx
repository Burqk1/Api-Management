import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { getStatusColor, RunnerResult } from '../types/api';
import { generateHTMLReport, generateJUnitXML } from '../utils/testReport';
import * as Clipboard from 'expo-clipboard';

type ReportFormat = 'html' | 'junit';

export default function TestReportScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);

  const [format, setFormat] = useState<ReportFormat>('html');
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;

  // Build results from recent logs
  const results: RunnerResult[] = useMemo(() => {
    return callLogs.slice(0, 50).map((log) => ({
      endpointId: log.endpointId,
      endpointName: log.endpointName,
      method: log.method,
      url: log.url,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      success: log.success,
      assertionsPassed: log.success ? 1 : 0,
      assertionsTotal: 1,
      timestamp: log.timestamp,
    }));
  }, [callLogs]);

  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;
  const avgTime = total > 0 ? Math.round(results.reduce((s, r) => s + r.responseTime, 0) / total) : 0;

  const reportContent = useMemo(() => {
    if (format === 'html') return generateHTMLReport(results, 'API Test Suite');
    return generateJUnitXML(results, 'API Test Suite');
  }, [format, results]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('testReport') || 'Test Report' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            {[
              { label: 'Total', value: total, color: colors.primary },
              { label: t('passed'), value: passed, color: '#3FB950' },
              { label: t('failed'), value: failed, color: '#FF6961' },
              { label: 'Avg Time', value: `${avgTime}ms`, color: '#BC8CFF' },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Success Bar */}
          <View style={[styles.progressOuter, { backgroundColor: cardBg }]}>
            <View style={[styles.progressInner, { width: `${total > 0 ? (passed / total) * 100 : 0}%` }]} />
          </View>

          {/* Results Table */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Results ({total})</Text>
            {results.slice(0, 30).map((r, i) => (
              <View
                key={i}
                style={[styles.resultRow, i < Math.min(results.length, 30) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
              >
                <View style={[styles.methodBadge, { backgroundColor: getStatusColor(r.statusCode) + '20' }]}>
                  <Text style={[styles.methodText, { color: getStatusColor(r.statusCode) }]}>{r.method}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{r.endpointName}</Text>
                </View>
                <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{r.responseTime}ms</Text>
                <MaterialCommunityIcons
                  name={r.success ? 'check-circle' : 'close-circle'}
                  size={18}
                  color={r.success ? '#3FB950' : '#FF6961'}
                />
              </View>
            ))}
          </View>

          {/* Export Format */}
          <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>{t('exportFormat') || 'Export Format'}</Text>
          <View style={styles.formatRow}>
            {([
              { key: 'html' as const, label: 'HTML Report', icon: 'language-html5', color: '#E44D26' },
              { key: 'junit' as const, label: 'JUnit XML', icon: 'xml', color: '#6BA539' },
            ]).map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatCard, { backgroundColor: format === f.key ? f.color + '20' : cardBg, borderColor: format === f.key ? f.color : 'transparent', borderWidth: 2 }]}
                onPress={() => setFormat(f.key)}
              >
                <MaterialCommunityIcons name={f.icon as any} size={24} color={f.color} />
                <Text style={[styles.formatLabel, { color: format === f.key ? f.color : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview</Text>
              <TouchableOpacity onPress={handleCopy} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{copied ? t('copied') : t('copyCode')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              <Text style={[styles.codeText, { color: colors.text }]} selectable>{reportContent.slice(0, 3000)}</Text>
            </ScrollView>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  progressOuter: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressInner: { height: '100%', backgroundColor: '#3FB950', borderRadius: 3 },
  card: { borderRadius: 14, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  methodText: { fontSize: 11, fontWeight: '700' },
  resultName: { fontSize: 14, fontWeight: '500' },
  resultTime: { fontSize: 12 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  formatLabel: { fontSize: 13, fontWeight: '700' },
  codeText: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 10, lineHeight: 15 },
});
