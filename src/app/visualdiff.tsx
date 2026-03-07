import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS, HttpMethod } from '../types/api';

export default function VisualDiffScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);

  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<'a' | 'b'>('a');

  const cardBg = isDark ? colors.surface : colors.card;

  const entryA = callLogs.find((h) => h.id === selectedA);
  const entryB = callLogs.find((h) => h.id === selectedB);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // Group history by endpoint URL
  const grouped = useMemo(() => {
    const map: Record<string, typeof callLogs> = {};
    callLogs.forEach((h) => {
      const key = `${h.method} ${h.url}`;
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return Object.entries(map)
      .map(([key, items]) => ({ key, items: items.sort((a, b) => b.timestamp - a.timestamp) }))
      .sort((a, b) => b.items[0].timestamp - a.items[0].timestamp);
  }, [callLogs]);

  // Compute diff between two response bodies
  const computeDiff = (a: string, b: string) => {
    const linesA = a.split('\n');
    const linesB = b.split('\n');
    const maxLen = Math.max(linesA.length, linesB.length);
    const result: { lineA: string; lineB: string; status: 'same' | 'changed' | 'added' | 'removed' }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const la = linesA[i] ?? '';
      const lb = linesB[i] ?? '';
      if (la === lb) result.push({ lineA: la, lineB: lb, status: 'same' });
      else if (i >= linesA.length) result.push({ lineA: '', lineB: lb, status: 'added' });
      else if (i >= linesB.length) result.push({ lineA: la, lineB: '', status: 'removed' });
      else result.push({ lineA: la, lineB: lb, status: 'changed' });
    }
    return result;
  };

  const diff = entryA && entryB
    ? computeDiff(entryA.responseBody || '', entryB.responseBody || '')
    : [];

  const diffStats = {
    same: diff.filter((d) => d.status === 'same').length,
    changed: diff.filter((d) => d.status === 'changed').length,
    added: diff.filter((d) => d.status === 'added').length,
    removed: diff.filter((d) => d.status === 'removed').length,
  };

  const statusColor = (s: number) => s >= 200 && s < 300 ? '#3FB950' : s >= 300 && s < 400 ? '#D29922' : '#FF6961';

  return (
    <>
      <Stack.Screen options={{ title: 'Visual Diff Timeline' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Selection Controls */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.selBtn, { backgroundColor: selecting === 'a' ? '#58A6FF20' : cardBg, borderColor: selecting === 'a' ? '#58A6FF' : 'transparent', borderWidth: 1.5 }]}
              onPress={() => setSelecting('a')}
            >
              <Text style={{ color: '#58A6FF', fontSize: 12, fontWeight: '700' }}>A: {entryA ? `${entryA.method} ${entryA.statusCode}` : 'Select...'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selBtn, { backgroundColor: selecting === 'b' ? '#3FB95020' : cardBg, borderColor: selecting === 'b' ? '#3FB950' : 'transparent', borderWidth: 1.5 }]}
              onPress={() => setSelecting('b')}
            >
              <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '700' }}>B: {entryB ? `${entryB.method} ${entryB.statusCode}` : 'Select...'}</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>History Timeline</Text>
          {grouped.map((group) => (
            <View key={group.key} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{group.key}</Text>
              {group.items.slice(0, 10).map((item) => {
                const isA = selectedA === item.id;
                const isB = selectedB === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.timelineItem, {
                      backgroundColor: isA ? '#58A6FF10' : isB ? '#3FB95010' : cardBg,
                      borderLeftColor: isA ? '#58A6FF' : isB ? '#3FB950' : 'transparent',
                      borderLeftWidth: isA || isB ? 3 : 0,
                    }]}
                    onPress={() => {
                      if (selecting === 'a') { setSelectedA(item.id); setSelecting('b'); }
                      else { setSelectedB(item.id); }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[item.method as HttpMethod] || '#8B949E') + '20' }]}>
                        <Text style={{ color: METHOD_COLORS[item.method as HttpMethod] || '#8B949E', fontSize: 9, fontWeight: '800' }}>{item.method}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(item.statusCode) + '20' }]}>
                        <Text style={{ color: statusColor(item.statusCode), fontSize: 10, fontWeight: '700' }}>{item.statusCode}</Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.responseTime || 0}ms</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 10, marginLeft: 'auto' }}>{formatTime(item.timestamp)}</Text>
                    </View>
                    {(isA || isB) && (
                      <View style={[styles.selectedTag, { backgroundColor: isA ? '#58A6FF' : '#3FB950' }]}>
                        <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{isA ? 'A' : 'B'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Diff View */}
          {entryA && entryB && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Diff Results</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Same', value: diffStats.same, color: '#8B949E' },
                  { label: 'Changed', value: diffStats.changed, color: '#D29922' },
                  { label: 'Added', value: diffStats.added, color: '#3FB950' },
                  { label: 'Removed', value: diffStats.removed, color: '#FF6961' },
                ].map((s) => (
                  <View key={s.label} style={[styles.diffStat, { backgroundColor: s.color + '15' }]}>
                    <Text style={{ color: s.color, fontSize: 14, fontWeight: '800' }}>{s.value}</Text>
                    <Text style={{ color: s.color, fontSize: 10 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Comparison headers */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#58A6FF' }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>A: {entryA.statusCode} ({entryA.responseTime}ms)</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3FB950' }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>B: {entryB.statusCode} ({entryB.responseTime}ms)</Text>
                </View>
              </View>

              {/* Diff lines */}
              <View style={[styles.diffCard, { backgroundColor: cardBg }]}>
                {diff.slice(0, 100).map((line, i) => {
                  const bgColor = line.status === 'changed' ? '#D2992210' : line.status === 'added' ? '#3FB95010' : line.status === 'removed' ? '#FF696110' : 'transparent';
                  return (
                    <View key={i} style={[styles.diffLine, { backgroundColor: bgColor }]}>
                      <Text style={{ color: colors.textTertiary, fontSize: 10, width: 24, textAlign: 'right' }}>{i + 1}</Text>
                      {line.status === 'same' ? (
                        <Text style={[styles.diffText, { color: colors.textSecondary }]} numberOfLines={1}>{line.lineA}</Text>
                      ) : (
                        <View style={{ flex: 1 }}>
                          {line.lineA ? <Text style={[styles.diffText, { color: '#FF6961' }]} numberOfLines={1}>- {line.lineA}</Text> : null}
                          {line.lineB ? <Text style={[styles.diffText, { color: '#3FB950' }]} numberOfLines={1}>+ {line.lineB}</Text> : null}
                        </View>
                      )}
                    </View>
                  );
                })}
                {diff.length > 100 && (
                  <Text style={{ color: colors.textTertiary, fontSize: 11, textAlign: 'center', padding: 8 }}>... {diff.length - 100} more lines</Text>
                )}
              </View>
            </>
          )}

          {callLogs.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <MaterialCommunityIcons name="history" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No request history yet</Text>
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
  selBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  timelineItem: { borderRadius: 10, padding: 10, marginBottom: 4, position: 'relative' },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  selectedTag: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  diffStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  diffCard: { borderRadius: 12, overflow: 'hidden' },
  diffLine: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 2, minHeight: 20 },
  diffText: { fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
