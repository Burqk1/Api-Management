import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface RateLimitResult {
  requestIndex: number;
  status: number;
  time: number;
  rateLimited: boolean;
  headers: Record<string, string>;
  timestamp: number;
}

export default function RateLimitScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [url, setUrl] = useState('');
  const [totalRequests, setTotalRequests] = useState('20');
  const [delayMs, setDelayMs] = useState('100');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RateLimitResult[]>([]);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const runTest = async () => {
    if (!url.trim()) return;
    setRunning(true);
    setResults([]);
    setProgress(0);
    abortRef.current = false;

    const total = parseInt(totalRequests) || 20;
    const delay = parseInt(delayMs) || 100;
    const allResults: RateLimitResult[] = [];

    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;
      try {
        const start = Date.now();
        const res = await fetch(url.trim(), { method: 'GET' });
        const elapsed = Date.now() - start;
        const headers: Record<string, string> = {};
        res.headers.forEach((v: string, k: string) => { headers[k] = v; });

        const rateLimited = res.status === 429 || res.status === 503;
        const result: RateLimitResult = {
          requestIndex: i + 1,
          status: res.status,
          time: elapsed,
          rateLimited,
          headers,
          timestamp: Date.now(),
        };
        allResults.push(result);
        setResults([...allResults]);
      } catch (err: any) {
        allResults.push({
          requestIndex: i + 1,
          status: 0,
          time: 0,
          rateLimited: false,
          headers: {},
          timestamp: Date.now(),
        });
        setResults([...allResults]);
      }
      setProgress(((i + 1) / total) * 100);
      if (delay > 0 && i < total - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    setRunning(false);
  };

  const stop = () => { abortRef.current = true; };

  const limitedCount = results.filter((r) => r.rateLimited).length;
  const successCount = results.filter((r) => r.status >= 200 && r.status < 400).length;

  // Extract rate limit headers
  const lastResult = results[results.length - 1];
  const rateLimitHeaders = lastResult ? Object.entries(lastResult.headers).filter(([k]) =>
    k.toLowerCase().includes('ratelimit') || k.toLowerCase().includes('rate-limit') ||
    k.toLowerCase().includes('retry-after') || k.toLowerCase().includes('x-rate')
  ) : [];

  return (
    <>
      <Stack.Screen options={{ title: t('apiGateway') || 'API Gateway / Rate Limit' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.infoBox, { backgroundColor: '#FF950012' }]}>
            <MaterialCommunityIcons name="speedometer-slow" size={18} color="#FF9500" />
            <Text style={{ color: '#FF9500', fontSize: 13, flex: 1 }}>
              Test how an API handles rapid requests. Detects rate limiting (429), extracts rate limit headers.
            </Text>
          </View>

          {/* Config */}
          <View style={[styles.card, { backgroundColor: cardBg, padding: 14, gap: 10 }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://api.example.com/endpoint"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>REQUESTS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={totalRequests}
                  onChangeText={setTotalRequests}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>DELAY (ms)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={delayMs}
                  onChangeText={setDelayMs}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Run Button */}
          {running ? (
            <View style={{ gap: 10 }}>
              <View style={[styles.progressBar, { backgroundColor: inputBg }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
              </View>
              <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#FF696115' }]} onPress={stop}>
                <MaterialCommunityIcons name="stop-circle-outline" size={20} color="#FF6961" />
                <Text style={{ color: '#FF6961', fontWeight: '700', fontSize: 16 }}>Stop Test</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.primary, opacity: url.trim() ? 1 : 0.4 }]}
              onPress={runTest}
              disabled={!url.trim()}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Run Rate Limit Test</Text>
            </TouchableOpacity>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              {/* Summary */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={[styles.statCard, { backgroundColor: '#3FB95012', flex: 1 }]}>
                  <Text style={{ color: '#3FB950', fontSize: 24, fontWeight: '800' }}>{successCount}</Text>
                  <Text style={{ color: '#3FB950', fontSize: 11 }}>Success</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FF696112', flex: 1 }]}>
                  <Text style={{ color: '#FF6961', fontSize: 24, fontWeight: '800' }}>{limitedCount}</Text>
                  <Text style={{ color: '#FF6961', fontSize: 11 }}>Rate Limited</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.primary + '12', flex: 1 }]}>
                  <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '800' }}>
                    {results.length > 0 ? Math.round(results.reduce((s, r) => s + r.time, 0) / results.length) : 0}ms
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 11 }}>Avg Time</Text>
                </View>
              </View>

              {/* Rate Limit Headers */}
              {rateLimitHeaders.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Rate Limit Headers</Text>
                  <View style={[styles.card, { backgroundColor: cardBg }]}>
                    {rateLimitHeaders.map(([k, v]) => (
                      <View key={k} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', flex: 1 }}>{k}</Text>
                        <Text style={{ color: colors.text, fontSize: 12 }}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Visual Timeline */}
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Request Timeline</Text>
              <View style={[styles.card, { backgroundColor: cardBg, padding: 14 }]}>
                <View style={styles.timeline}>
                  {results.map((r) => (
                    <View
                      key={r.requestIndex}
                      style={[styles.timelineBar, {
                        backgroundColor: r.rateLimited ? '#FF6961' : r.status === 0 ? '#8B949E' : '#3FB950',
                        height: Math.max(4, Math.min(40, r.time / 20)),
                      }]}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Request #1</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 10 }}>#{results.length}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3FB950' }} />
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Success</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6961' }} />
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Rate Limited</Text>
                  </View>
                </View>
              </View>
            </>
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
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 10 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  statCard: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  timeline: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 44 },
  timelineBar: { flex: 1, borderRadius: 2, minWidth: 3 },
});
