import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS } from '../types/api';

interface TestResult {
  endpointId: string;
  name: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  passed: boolean;
  assertions: { name: string; passed: boolean; message: string }[];
  error?: string;
  timestamp: number;
}

export default function TestExecScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { collections, endpoints: allStoreEndpoints } = useApiStore();

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pauseOnFail, setPauseOnFail] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const cardBg = isDark ? colors.surface : colors.card;

  const allEndpoints = selectedCollection
    ? allStoreEndpoints.filter((e) => e.collectionId === selectedCollection)
    : allStoreEndpoints;

  const totalEndpoints = allEndpoints.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  const runTests = async () => {
    abortRef.current = false;
    pauseRef.current = false;
    setRunning(true);
    setPaused(false);
    setResults([]);
    setCurrentIndex(0);

    for (let i = 0; i < allEndpoints.length; i++) {
      if (abortRef.current) break;
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        if (abortRef.current) break;
      }
      if (abortRef.current) break;

      setCurrentIndex(i);
      const ep = allEndpoints[i];
      const start = Date.now();

      try {
        const headersObj: Record<string, string> = {};
        ep.headers?.filter((h) => h.enabled).forEach((h) => { headersObj[h.key] = h.value; });

        const opts: RequestInit = { method: ep.method, headers: headersObj };
        if (['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.body) {
          opts.body = ep.body;
          if (!headersObj['Content-Type']) headersObj['Content-Type'] = 'application/json';
        }

        const res = await fetch(ep.url, opts);
        const body = await res.text();
        const duration = Date.now() - start;

        // Run assertions
        const assertions: TestResult['assertions'] = [];
        if (ep.assertions) {
          ep.assertions.forEach((a) => {
            let passed = false;
            let message = '';
            switch (a.type) {
              case 'status':
                passed = res.status === parseInt(a.expected);
                message = passed ? `Status ${res.status} matches` : `Expected ${a.expected}, got ${res.status}`;
                break;
              case 'body_contains':
                passed = body.includes(a.expected);
                message = passed ? 'Body contains expected text' : `Body does not contain "${a.expected}"`;
                break;
              case 'response_time':
                passed = duration < parseInt(a.expected);
                message = passed ? `${duration}ms < ${a.expected}ms` : `${duration}ms >= ${a.expected}ms`;
                break;
              case 'header_exists':
                passed = res.headers.has(a.expected);
                message = passed ? `Header "${a.expected}" exists` : `Header "${a.expected}" missing`;
                break;
              default:
                passed = true;
                message = 'Assertion not evaluated';
            }
            assertions.push({ name: `${a.type}: ${a.expected}`, passed, message });
          });
        }

        const allPassed = assertions.length === 0 ? res.status < 400 : assertions.every((a) => a.passed);
        const result: TestResult = {
          endpointId: ep.id, name: ep.name, method: ep.method, url: ep.url,
          status: res.status, duration, passed: allPassed, assertions, timestamp: Date.now(),
        };
        setResults((prev) => [...prev, result]);

        if (!allPassed && pauseOnFail) {
          pauseRef.current = true;
          setPaused(true);
        }
      } catch (e: any) {
        setResults((prev) => [...prev, {
          endpointId: ep.id, name: ep.name, method: ep.method, url: ep.url,
          status: 0, duration: Date.now() - start, passed: false, assertions: [],
          error: e.message, timestamp: Date.now(),
        }]);
      }
    }
    setRunning(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Test Execution' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Collection Select */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.colChip, { backgroundColor: !selectedCollection ? colors.primary + '20' : cardBg }]}
                onPress={() => setSelectedCollection(null)}
              >
                <Text style={{ color: !selectedCollection ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>All ({allStoreEndpoints.length})</Text>
              </TouchableOpacity>
              {collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.colChip, { backgroundColor: selectedCollection === col.id ? colors.primary + '20' : cardBg }]}
                  onPress={() => setSelectedCollection(col.id)}
                >
                  <Text style={{ color: selectedCollection === col.id ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{col.name} ({allStoreEndpoints.filter((e) => e.collectionId === col.id).length})</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Options */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
            onPress={() => { setPauseOnFail(!pauseOnFail); pauseRef.current = false; }}
          >
            <MaterialCommunityIcons name={pauseOnFail ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={pauseOnFail ? colors.primary : colors.textTertiary} />
            <Text style={{ color: colors.text, fontSize: 14 }}>Pause on failure (breakpoint)</Text>
          </TouchableOpacity>

          {/* Controls */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {!running ? (
              <TouchableOpacity style={[styles.runBtn, { backgroundColor: colors.primary, flex: 1, opacity: totalEndpoints > 0 ? 1 : 0.4 }]} onPress={runTests} disabled={totalEndpoints === 0}>
                <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                <Text style={styles.runBtnText}>Run Tests ({totalEndpoints})</Text>
              </TouchableOpacity>
            ) : (
              <>
                {paused ? (
                  <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#3FB950', flex: 1 }]} onPress={() => { pauseRef.current = false; setPaused(false); }}>
                    <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                    <Text style={styles.runBtnText}>Resume</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#D29922', flex: 1 }]} onPress={() => { pauseRef.current = true; setPaused(true); }}>
                    <MaterialCommunityIcons name="pause" size={20} color="#FFF" />
                    <Text style={styles.runBtnText}>Pause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#FF6961', flex: 1 }]} onPress={() => { abortRef.current = true; }}>
                  <MaterialCommunityIcons name="stop" size={20} color="#FFF" />
                  <Text style={styles.runBtnText}>Stop</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Progress */}
          {(running || results.length > 0) && (
            <>
              <View style={[styles.progressBar, { backgroundColor: isDark ? colors.systemGray5 : '#E5E5EA' }]}>
                <View style={[styles.progressFill, { width: `${totalEndpoints > 0 ? Math.round((results.length / totalEndpoints) * 100) : 0}%` as any, backgroundColor: failedCount > 0 ? '#D29922' : '#3FB950' }]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{results.length}/{totalEndpoints} completed</Text>
                {running && <ActivityIndicator size="small" color={colors.primary} />}
                {paused && <Text style={{ color: '#D29922', fontSize: 12, fontWeight: '600' }}>PAUSED</Text>}
              </View>

              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={[styles.statCard, { backgroundColor: '#3FB95015' }]}>
                  <Text style={[styles.statValue, { color: '#3FB950' }]}>{passedCount}</Text>
                  <Text style={{ color: '#3FB950', fontSize: 11 }}>Passed</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FF696115' }]}>
                  <Text style={[styles.statValue, { color: '#FF6961' }]}>{failedCount}</Text>
                  <Text style={{ color: '#FF6961', fontSize: 11 }}>Failed</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{passRate}%</Text>
                  <Text style={{ color: colors.primary, fontSize: 11 }}>Pass Rate</Text>
                </View>
              </View>

              {/* Results */}
              {results.map((result, i) => {
                const isExp = expanded.has(result.endpointId);
                return (
                  <TouchableOpacity
                    key={`${result.endpointId}-${i}`}
                    style={[styles.resultCard, { backgroundColor: cardBg, borderLeftColor: result.passed ? '#3FB950' : '#FF6961' }]}
                    onPress={() => toggleExpand(result.endpointId)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name={result.passed ? 'check-circle' : 'close-circle'} size={20} color={result.passed ? '#3FB950' : '#FF6961'} />
                      <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[result.method as keyof typeof METHOD_COLORS] || '#8B949E') + '20' }]}>
                        <Text style={{ color: METHOD_COLORS[result.method as keyof typeof METHOD_COLORS] || '#8B949E', fontSize: 9, fontWeight: '800' }}>{result.method}</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{result.name}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{result.duration}ms</Text>
                      <View style={[styles.statusBadge, { backgroundColor: result.status >= 200 && result.status < 400 ? '#3FB95020' : '#FF696120' }]}>
                        <Text style={{ color: result.status >= 200 && result.status < 400 ? '#3FB950' : '#FF6961', fontSize: 10, fontWeight: '700' }}>{result.status || 'ERR'}</Text>
                      </View>
                    </View>

                    {isExp && (
                      <View style={{ marginTop: 8, gap: 4 }}>
                        <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{result.url}</Text>
                        {result.error && <Text style={{ color: '#FF6961', fontSize: 11 }}>Error: {result.error}</Text>}
                        {result.assertions.map((a, j) => (
                          <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <MaterialCommunityIcons name={a.passed ? 'check' : 'close'} size={14} color={a.passed ? '#3FB950' : '#FF6961'} />
                            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>{a.name}</Text>
                            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{a.message}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {results.length === 0 && !running && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <MaterialCommunityIcons name="test-tube" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>Select a collection and run tests</Text>
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
  colChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  runBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  resultCard: { borderRadius: 10, padding: 10, marginBottom: 4, borderLeftWidth: 3 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
