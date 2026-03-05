import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useApiStore } from '../stores/apiStore';
import { useLanguageStore } from '../stores/languageStore';
import { METHOD_COLORS, getStatusColor } from '../types/api';

export default function CompareScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<'left' | 'right' | null>('left');

  const left = callLogs.find((l) => l.id === leftId);
  const right = callLogs.find((l) => l.id === rightId);
  const inputBg = isDark ? colors.surface : colors.card;
  const recentLogs = callLogs.slice(0, 30);

  const formatJson = (text?: string): string => {
    if (!text) return '';
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('compareRequests') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Selection row */}
        <View style={[styles.selectRow, { marginHorizontal: 20, marginTop: 12 }]}>
          <TouchableOpacity
            style={[styles.selectBtn, { backgroundColor: selecting === 'left' ? colors.primary + '20' : inputBg, flex: 1 }]}
            onPress={() => setSelecting('left')}
          >
            <Text style={[styles.selectLabel, { color: selecting === 'left' ? colors.primary : colors.textSecondary }]}>
              {left ? `${left.method} ${left.statusCode}` : t('selectLeft')}
            </Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.textTertiary} />
          <TouchableOpacity
            style={[styles.selectBtn, { backgroundColor: selecting === 'right' ? colors.primary + '20' : inputBg, flex: 1 }]}
            onPress={() => setSelecting('right')}
          >
            <Text style={[styles.selectLabel, { color: selecting === 'right' ? colors.primary : colors.textSecondary }]}>
              {right ? `${right.method} ${right.statusCode}` : t('selectRight')}
            </Text>
          </TouchableOpacity>
        </View>

        {selecting && (
          <View style={{ maxHeight: 200, marginHorizontal: 20, marginTop: 8 }}>
            <ScrollView style={[styles.logList, { backgroundColor: inputBg }]}>
              {recentLogs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={[styles.logRow, { borderBottomColor: colors.divider }]}
                  onPress={() => {
                    if (selecting === 'left') { setLeftId(log.id); setSelecting('right'); }
                    else { setRightId(log.id); setSelecting(null); }
                  }}
                >
                  <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] + '20' }]}>
                    <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>{log.method}</Text>
                  </View>
                  <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{log.endpointName}</Text>
                  <Text style={[styles.logMeta, { color: colors.textTertiary }]}>{log.statusCode} · {log.responseTime}ms</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Comparison */}
        {left && right && !selecting && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {/* Stats comparison */}
            <View style={[styles.compareCard, { backgroundColor: inputBg, marginTop: 12 }]}>
              <View style={styles.compareRow}>
                <Text style={[styles.compareVal, { color: getStatusColor(left.statusCode) }]}>{left.statusCode}</Text>
                <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>{t('status')}</Text>
                <Text style={[styles.compareVal, { color: getStatusColor(right.statusCode) }]}>{right.statusCode}</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={[styles.compareVal, { color: colors.text }]}>{left.responseTime}ms</Text>
                <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>{t('responseTimeLabel')}</Text>
                <Text style={[styles.compareVal, { color: colors.text }]}>{right.responseTime}ms</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={[styles.compareVal, { color: colors.text }]}>{(left.responseSize / 1024).toFixed(1)}KB</Text>
                <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>{t('size')}</Text>
                <Text style={[styles.compareVal, { color: colors.text }]}>{(right.responseSize / 1024).toFixed(1)}KB</Text>
              </View>
            </View>

            {/* Body diff */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('response')}</Text>
            <ScrollView horizontal>
              <View style={{ flexDirection: 'row', gap: 8, minWidth: '100%' }}>
                <ScrollView style={[styles.bodyPanel, { backgroundColor: inputBg }]} nestedScrollEnabled>
                  <Text style={[styles.bodyText, { color: colors.text }]} selectable>
                    {formatJson(left.responseBody) || t('noResponseBody')}
                  </Text>
                </ScrollView>
                <ScrollView style={[styles.bodyPanel, { backgroundColor: inputBg }]} nestedScrollEnabled>
                  <Text style={[styles.bodyText, { color: colors.text }]} selectable>
                    {formatJson(right.responseBody) || t('noResponseBody')}
                  </Text>
                </ScrollView>
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  selectLabel: { fontSize: 14, fontWeight: '600' },
  logList: { borderRadius: 12, maxHeight: 200 },
  logRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, minWidth: 40, alignItems: 'center' },
  methodText: { fontSize: 10, fontWeight: '700' },
  logName: { flex: 1, fontSize: 13, fontWeight: '500' },
  logMeta: { fontSize: 12 },
  compareCard: { borderRadius: 12, padding: 14, gap: 12 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareVal: { fontSize: 16, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  compareLabel: { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  bodyPanel: { flex: 1, borderRadius: 10, padding: 10, maxHeight: 400, minWidth: 150 },
  bodyText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11, lineHeight: 16,
  },
});
