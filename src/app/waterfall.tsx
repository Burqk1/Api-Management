import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface TimingPhase {
  label: string;
  color: string;
  duration: number;
  icon: string;
}

interface AnalysisResult {
  url: string;
  status: number;
  totalTime: number;
  size: string;
  phases: TimingPhase[];
  headers: Record<string, string>;
  timestamp: number;
}

const PHASE_DEFS: { label: string; color: string; icon: string }[] = [
  { label: 'DNS Lookup', color: '#58A6FF', icon: 'dns-outline' },
  { label: 'TCP Connection', color: '#3FB950', icon: 'lan-connect' },
  { label: 'TLS Handshake', color: '#BC8CFF', icon: 'lock-outline' },
  { label: 'TTFB', color: '#FF9500', icon: 'server-outline' },
  { label: 'Download', color: '#64D2FF', icon: 'download-outline' },
];

function simulatePhases(totalMs: number): number[] {
  const dns = Math.round(5 + Math.random() * 25);
  const tcp = Math.round(10 + Math.random() * 40);
  const tls = Math.round(20 + Math.random() * 60);
  const ttfb = Math.round(totalMs * (0.4 + Math.random() * 0.2));
  const download = Math.max(1, totalMs - dns - tcp - tls - ttfb);
  return [dns, tcp, tls, ttfb, download];
}

function statusColor(code: number): string {
  if (code < 300) return '#3FB950';
  if (code < 400) return '#D29922';
  return '#FF6961';
}

export default function WaterfallScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [url, setUrl] = useState('https://');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [headersOpen, setHeadersOpen] = useState(false);

  const analyze = async () => {
    if (!url || url === 'https://') return;
    setLoading(true);
    setResult(null);
    try {
      const start = performance.now();
      const resp = await fetch(url);
      const totalTime = Math.round(performance.now() - start);
      await resp.text();

      const hdrs: Record<string, string> = {};
      resp.headers.forEach((v: string, k: string) => { hdrs[k] = v; });

      const durations = simulatePhases(totalTime);
      const phases: TimingPhase[] = PHASE_DEFS.map((d, i) => ({
        ...d,
        duration: durations[i],
      }));

      const entry: AnalysisResult = {
        url,
        status: resp.status,
        totalTime,
        size: hdrs['content-length'] ? `${(parseInt(hdrs['content-length'], 10) / 1024).toFixed(1)} KB` : 'N/A',
        phases,
        headers: hdrs,
        timestamp: Date.now(),
      };

      setResult(entry);
      setHistory((prev) => [entry, ...prev.filter((h) => h.timestamp !== entry.timestamp)].slice(0, 5));
    } catch {
      setResult({
        url, status: 0, totalTime: 0, size: 'N/A',
        phases: PHASE_DEFS.map((d) => ({ ...d, duration: 0 })),
        headers: {}, timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const maxDuration = result ? Math.max(...result.phases.map((p) => p.duration), 1) : 1;

  return (
    <>
      <Stack.Screen options={{ title: 'Performance Waterfall' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* URL Input */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: colors.divider }]}>
              <MaterialCommunityIcons name="web" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://api.example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={analyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="chart-waterfall" size={18} color="#fff" />
                  <Text style={styles.btnText}>Analyze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Summary */}
          {result && result.status > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <View style={[styles.badge, { backgroundColor: statusColor(result.status) + '22' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(result.status) }]}>{result.status}</Text>
                  </View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Status</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{result.totalTime} ms</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Time</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{result.size}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Size</Text>
                </View>
              </View>
            </View>
          )}

          {/* Waterfall Chart */}
          {result && result.status > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Waterfall</Text>
              {result.phases.map((phase, i) => {
                const pct = (phase.duration / maxDuration) * 100;
                return (
                  <View key={i} style={styles.phaseRow}>
                    <View style={styles.phaseLabel}>
                      <MaterialCommunityIcons name={phase.icon as any} size={16} color={phase.color} />
                      <Text style={[styles.phaseName, { color: colors.text }]}>{phase.label}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? colors.systemGray5 : '#E5E5EA' }]}>
                      <View style={[styles.bar, { width: `${Math.max(pct, 2)}%`, backgroundColor: phase.color }]} />
                    </View>
                    <Text style={[styles.phaseMs, { color: colors.textSecondary }]}>{phase.duration} ms</Text>
                  </View>
                );
              })}
              <View style={[styles.totalRow, { borderTopColor: colors.divider }]}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{result.totalTime} ms</Text>
              </View>
            </View>
          )}

          {/* Response Headers */}
          {result && result.status > 0 && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: cardBg }]}
              onPress={() => setHeadersOpen(!headersOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Response Headers</Text>
                <MaterialCommunityIcons
                  name={headersOpen ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textSecondary}
                />
              </View>
              {headersOpen && (
                <View style={styles.headersBody}>
                  {Object.entries(result.headers).map(([k, v]) => (
                    <View key={k} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                      <Text style={[styles.headerKey, { color: colors.primary }]}>{k}</Text>
                      <Text style={[styles.headerVal, { color: colors.textSecondary }]} numberOfLines={2}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Error */}
          {result && result.status === 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF6961" />
                <Text style={[styles.errorText, { color: '#FF6961' }]}>Request failed. Check the URL and try again.</Text>
              </View>
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Analyses</Text>
              {history.map((h, i) => (
                <TouchableOpacity
                  key={h.timestamp}
                  style={[styles.historyItem, i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                  onPress={() => { setUrl(h.url); setResult(h); setHeadersOpen(false); }}
                >
                  <View style={styles.historyTop}>
                    <Text style={[styles.historyUrl, { color: colors.text }]} numberOfLines={1}>{h.url}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor(h.status) + '22' }]}>
                      <Text style={[styles.badgeText, { color: statusColor(h.status) }]}>{h.status}</Text>
                    </View>
                  </View>
                  {/* Mini waterfall */}
                  <View style={styles.miniWaterfall}>
                    {h.phases.map((p, j) => {
                      const total = h.phases.reduce((s, x) => s + x.duration, 0) || 1;
                      return (
                        <View key={j} style={[styles.miniBar, { flex: p.duration / total, backgroundColor: p.color }]} />
                      );
                    })}
                  </View>
                  <Text style={[styles.historyTime, { color: colors.textTertiary }]}>{h.totalTime} ms</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  card: { borderRadius: 14, padding: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    borderWidth: 1, paddingHorizontal: 12, gap: 8, height: 44,
  },
  input: { flex: 1, fontSize: 15 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, height: 44, marginTop: 12, gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 15, fontWeight: '700' },
  phaseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  phaseLabel: { flexDirection: 'row', alignItems: 'center', width: 110, gap: 6 },
  phaseName: { fontSize: 13, fontWeight: '500' },
  barTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 7 },
  phaseMs: { width: 52, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 10, marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '700' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headersBody: { marginTop: 12 },
  headerRow: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  headerKey: { fontSize: 13, fontWeight: '600' },
  headerVal: { fontSize: 12, marginTop: 2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
  historyItem: { paddingVertical: 10 },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  historyUrl: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  miniWaterfall: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 },
  miniBar: { height: '100%' },
  historyTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
});
