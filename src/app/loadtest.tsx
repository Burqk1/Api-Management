import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface LiveMetrics {
  requestsPerSecond: number;
  activeUsers: number;
  successRate: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  errorCount: number;
  totalRequests: number;
  totalSuccess: number;
}

interface HeaderPair { key: string; value: string }

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
const DURATIONS = [5, 10, 30, 60];

function getMethodColor(method: string): string {
  const map: Record<string, string> = {
    GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', DELETE: '#FF6961',
  };
  return map[method] || '#8B949E';
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

export default function LoadTestScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<typeof METHODS[number]>('GET');
  const [headers, setHeaders] = useState<HeaderPair[]>([{ key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [virtualUsers, setVirtualUsers] = useState('10');
  const [duration, setDuration] = useState(10);
  const [rampUp, setRampUp] = useState('2');
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const abortRef = useRef(false);
  const timesRef = useRef<number[]>([]);
  const successRef = useRef(0);
  const errorRef = useRef(0);
  const totalRef = useRef(0);
  const activeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...headers];
    next[idx] = { ...next[idx], [field]: val };
    setHeaders(next);
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));

  const resetMetrics = () => {
    timesRef.current = [];
    successRef.current = 0;
    errorRef.current = 0;
    totalRef.current = 0;
    activeRef.current = 0;
    startTimeRef.current = Date.now();
  };

  const computeMetrics = (): LiveMetrics => {
    const times = [...timesRef.current].sort((a, b) => a - b);
    const elapsedSec = Math.max((Date.now() - startTimeRef.current) / 1000, 0.1);
    const total = totalRef.current;
    return {
      requestsPerSecond: Math.round((total / elapsedSec) * 100) / 100,
      activeUsers: activeRef.current,
      successRate: total > 0 ? Math.round((successRef.current / total) * 10000) / 100 : 0,
      avgTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      minTime: times[0] || 0,
      maxTime: times[times.length - 1] || 0,
      p95Time: percentile(times, 0.95),
      errorCount: errorRef.current,
      totalRequests: total,
      totalSuccess: successRef.current,
    };
  };

  const sendRequest = async () => {
    const headerObj: Record<string, string> = {};
    headers.filter((h) => h.key.trim()).forEach((h) => { headerObj[h.key] = h.value; });
    const opts: RequestInit = { method, headers: headerObj };
    if ((method === 'POST' || method === 'PUT') && body.trim()) {
      opts.body = body;
      if (!headerObj['Content-Type']) headerObj['Content-Type'] = 'application/json';
    }
    const start = Date.now();
    activeRef.current++;
    try {
      const res = await fetch(url, opts);
      await res.text();
      const time = Date.now() - start;
      timesRef.current.push(time);
      if (res.status >= 200 && res.status < 400) successRef.current++;
      else errorRef.current++;
    } catch {
      timesRef.current.push(Date.now() - start);
      errorRef.current++;
    }
    totalRef.current++;
    activeRef.current--;
  };

  const startTest = useCallback(async () => {
    if (!url.trim()) return;
    const vu = Math.min(100, Math.max(1, parseInt(virtualUsers) || 10));
    const rampSec = Math.max(0, parseInt(rampUp) || 0);

    abortRef.current = false;
    resetMetrics();
    setRunning(true);
    setCompleted(false);
    setMetrics(null);
    setElapsed(0);

    intervalRef.current = setInterval(() => {
      setMetrics(computeMetrics());
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);

    const endTime = startTimeRef.current + duration * 1000;
    const workers: Promise<void>[] = [];

    for (let i = 0; i < vu; i++) {
      const delay = rampSec > 0 ? (rampSec * 1000 * i) / vu : 0;
      workers.push(
        new Promise<void>((resolve) => {
          setTimeout(async () => {
            while (Date.now() < endTime && !abortRef.current) {
              await sendRequest();
            }
            resolve();
          }, delay);
        })
      );
    }

    await Promise.all(workers);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const final = computeMetrics();
    setMetrics(final);
    setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    setRunning(false);
    setCompleted(true);
  }, [url, method, headers, body, virtualUsers, duration, rampUp]);

  const stopTest = () => {
    abortRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMetrics(computeMetrics());
    setRunning(false);
    setCompleted(true);
  };

  const getBarWidth = (value: number, max: number): `${number}%` => max > 0 ? `${Math.max(2, Math.round((value / max) * 100))}%` : '2%';

  return (
    <>
      <Stack.Screen options={{ title: 'Load Test' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* URL & Method */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Target</Text>
          <View style={[styles.configCard, { backgroundColor: cardBg }]}>
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, { backgroundColor: method === m ? getMethodColor(m) + '20' : 'transparent', borderColor: method === m ? getMethodColor(m) : 'transparent', borderWidth: 1.5 }]}
                  onPress={() => setMethod(m)}
                >
                  <Text style={{ color: method === m ? getMethodColor(m) : colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.urlInput, { backgroundColor: inputBg, color: colors.text }]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://api.example.com/endpoint"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Headers */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Headers</Text>
          <View style={[styles.configCard, { backgroundColor: cardBg }]}>
            {headers.map((h, i) => (
              <View key={i} style={[styles.headerRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                <TextInput style={[styles.headerInput, { backgroundColor: inputBg, color: colors.text }]} value={h.key} onChangeText={(v) => updateHeader(i, 'key', v)} placeholder="Key" placeholderTextColor={colors.textTertiary} />
                <TextInput style={[styles.headerInput, { backgroundColor: inputBg, color: colors.text }]} value={h.value} onChangeText={(v) => updateHeader(i, 'value', v)} placeholder="Value" placeholderTextColor={colors.textTertiary} />
                {headers.length > 1 && (
                  <TouchableOpacity onPress={() => removeHeader(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addHeaderBtn} onPress={addHeader}>
              <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Add Header</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {(method === 'POST' || method === 'PUT') && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Body</Text>
              <TextInput
                style={[styles.bodyInput, { backgroundColor: cardBg, color: colors.text }]}
                value={body}
                onChangeText={setBody}
                placeholder='{"key": "value"}'
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </>
          )}

          {/* Configuration */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Configuration</Text>
          <View style={[styles.configCard, { backgroundColor: cardBg }]}>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Virtual Users</Text>
              <TextInput style={[styles.configInput, { backgroundColor: inputBg, color: colors.text }]} value={virtualUsers} onChangeText={setVirtualUsers} keyboardType="number-pad" placeholder="10" placeholderTextColor={colors.textTertiary} />
            </View>
            <View style={[styles.configRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Ramp-up (s)</Text>
              <TextInput style={[styles.configInput, { backgroundColor: inputBg, color: colors.text }]} value={rampUp} onChangeText={setRampUp} keyboardType="number-pad" placeholder="2" placeholderTextColor={colors.textTertiary} />
            </View>
          </View>

          {/* Duration Selector */}
          <View style={styles.presetsRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.presetBtn, { backgroundColor: duration === d ? colors.primary + '20' : cardBg, borderColor: duration === d ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setDuration(d)}
              >
                <Text style={{ color: duration === d ? colors.primary : colors.text, fontSize: 14, fontWeight: '700' }}>{d}s</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start / Stop Buttons */}
          {!running ? (
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.primary, opacity: url.trim() ? 1 : 0.4 }]}
              onPress={startTest}
              disabled={!url.trim() || running}
            >
              <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFF" />
              <Text style={styles.runBtnText}>Start Load Test</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#FF6961' }]} onPress={stopTest}>
              <MaterialCommunityIcons name="stop-circle" size={20} color="#FFF" />
              <Text style={styles.runBtnText}>Stop Test</Text>
            </TouchableOpacity>
          )}

          {/* Live Metrics */}
          {(running || completed) && metrics && (
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  {running ? 'Live Metrics' : 'Results Summary'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {running && <ActivityIndicator size="small" color={colors.primary} />}
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{elapsed}s / {duration}s</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBar, { backgroundColor: inputBg }]}>
                <View style={[styles.progressFill, { width: `${Math.round(Math.min(100, (elapsed / duration) * 100))}%` as `${number}%`, backgroundColor: running ? colors.primary : '#3FB950' }]} />
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {[
                  { label: 'Req/s', value: `${metrics.requestsPerSecond}`, color: '#58A6FF' },
                  { label: 'Active Users', value: `${metrics.activeUsers}`, color: colors.primary },
                  { label: 'Success Rate', value: `${metrics.successRate}%`, color: metrics.successRate >= 95 ? '#3FB950' : '#FF6961' },
                  { label: 'Errors', value: `${metrics.errorCount}`, color: metrics.errorCount > 0 ? '#FF6961' : '#3FB950' },
                  { label: 'Avg', value: `${metrics.avgTime}ms`, color: colors.primary },
                  { label: 'Min', value: `${metrics.minTime}ms`, color: '#3FB950' },
                  { label: 'Max', value: `${metrics.maxTime}ms`, color: '#FF6961' },
                  { label: 'P95', value: `${metrics.p95Time}ms`, color: '#BC8CFF' },
                ].map((s) => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Visual Bars (after completion) */}
              {completed && (
                <>
                  <Text style={[styles.subTitle, { color: colors.text }]}>Response Time Breakdown</Text>
                  <View style={[styles.configCard, { backgroundColor: cardBg, padding: 14, gap: 10 }]}>
                    {[
                      { label: 'Avg', value: metrics.avgTime, color: colors.primary },
                      { label: 'Min', value: metrics.minTime, color: '#3FB950' },
                      { label: 'P95', value: metrics.p95Time, color: '#BC8CFF' },
                      { label: 'Max', value: metrics.maxTime, color: '#FF6961' },
                    ].map((item) => (
                      <View key={item.label} style={styles.barRow}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', width: 32 }}>{item.label}</Text>
                        <View style={[styles.barBg, { backgroundColor: isDark ? colors.systemGray5 : '#E5E5EA' }]}>
                          <View style={[styles.barFill, { width: getBarWidth(item.value, metrics.maxTime), backgroundColor: item.color }]} />
                        </View>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', width: 55, textAlign: 'right' }}>{item.value}ms</Text>
                      </View>
                    ))}
                  </View>

                  {/* Summary Card */}
                  <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#3FB950" />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>
                      {metrics.totalRequests} requests in {elapsed}s | {metrics.totalSuccess} succeeded | {metrics.errorCount} errors | {metrics.requestsPerSecond} req/s
                    </Text>
                  </View>

                  {/* Export Buttons */}
                  <Text style={[styles.subTitle, { color: colors.text }]}>Export Results</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: '#58A6FF20' }]}
                      onPress={() => {
                        const k6Script = `import http from 'k6/http';\nimport { check, sleep } from 'k6';\n\nexport const options = {\n  vus: ${virtualUsers},\n  duration: '${duration}s',\n};\n\nexport default function () {\n  const res = http.${method.toLowerCase()}('${url}');\n  check(res, {\n    'status is 200': (r) => r.status === 200,\n    'response time < 500ms': (r) => r.timings.duration < 500,\n  });\n  sleep(1);\n}\n\n// Results: ${metrics.totalRequests} reqs, ${metrics.requestsPerSecond} req/s, avg ${metrics.avgTime}ms, p95 ${metrics.p95Time}ms`;
                        import('expo-clipboard').then((Clipboard) => Clipboard.setStringAsync(k6Script));
                      }}
                    >
                      <MaterialCommunityIcons name="file-code-outline" size={16} color="#58A6FF" />
                      <Text style={{ color: '#58A6FF', fontSize: 12, fontWeight: '700' }}>K6 Script</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: '#3FB95020' }]}
                      onPress={() => {
                        const jmx = `<?xml version="1.0" encoding="UTF-8"?>\n<jmeterTestPlan version="1.2">\n  <hashTree>\n    <TestPlan testname="Load Test">\n      <ThreadGroup testname="Users">\n        <stringProp name="num_threads">${virtualUsers}</stringProp>\n        <stringProp name="duration">${duration}</stringProp>\n        <stringProp name="ramp_time">${rampUp}</stringProp>\n      </ThreadGroup>\n      <HTTPSamplerProxy testname="${method} ${url}">\n        <stringProp name="domain">${url}</stringProp>\n        <stringProp name="method">${method}</stringProp>\n      </HTTPSamplerProxy>\n    </hashTree>\n  </hashTree>\n</jmeterTestPlan>\n<!-- Results: ${metrics.totalRequests} reqs, avg ${metrics.avgTime}ms, p95 ${metrics.p95Time}ms -->`;
                        import('expo-clipboard').then((Clipboard) => Clipboard.setStringAsync(jmx));
                      }}
                    >
                      <MaterialCommunityIcons name="xml" size={16} color="#3FB950" />
                      <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '700' }}>JMeter JMX</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: '#D2992220' }]}
                      onPress={() => {
                        const csv = `metric,value\ntotal_requests,${metrics.totalRequests}\nsuccess,${metrics.totalSuccess}\nerrors,${metrics.errorCount}\nreq_per_sec,${metrics.requestsPerSecond}\navg_ms,${metrics.avgTime}\nmin_ms,${metrics.minTime}\nmax_ms,${metrics.maxTime}\np95_ms,${metrics.p95Time}\nsuccess_rate,${metrics.successRate}%`;
                        import('expo-clipboard').then((Clipboard) => Clipboard.setStringAsync(csv));
                      }}
                    >
                      <MaterialCommunityIcons name="file-delimited-outline" size={16} color="#D29922" />
                      <Text style={{ color: '#D29922', fontSize: 12, fontWeight: '700' }}>CSV</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  subTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  configCard: { borderRadius: 14, overflow: 'hidden' },
  configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  configLabel: { fontSize: 15, fontWeight: '600' },
  configInput: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '600', textAlign: 'center', width: 80 },
  methodRow: { flexDirection: 'row', gap: 8, padding: 14, paddingBottom: 8 },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  urlInput: { marginHorizontal: 14, marginBottom: 14, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  headerInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontWeight: '500' },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 12, justifyContent: 'center' },
  bodyInput: { borderRadius: 14, padding: 14, fontSize: 13, fontWeight: '500', minHeight: 100, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  presetsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  presetBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  runBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginTop: 12 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
});
