import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  lineLeft?: number;
  lineRight?: number;
  content: string;
}

function computeDiff(left: string, right: string): DiffLine[] {
  const linesA = left.split('\n');
  const linesB = right.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = linesA.length;
  const n = linesB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const diffs: { type: 'added' | 'removed' | 'unchanged'; a?: string; b?: string }[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diffs.unshift({ type: 'unchanged', a: linesA[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffs.unshift({ type: 'added', b: linesB[j - 1] });
      j--;
    } else {
      diffs.unshift({ type: 'removed', a: linesA[i - 1] });
      i--;
    }
  }

  let leftNum = 0, rightNum = 0;
  for (const d of diffs) {
    if (d.type === 'unchanged') {
      leftNum++; rightNum++;
      result.push({ type: 'unchanged', lineLeft: leftNum, lineRight: rightNum, content: d.a || '' });
    } else if (d.type === 'removed') {
      leftNum++;
      result.push({ type: 'removed', lineLeft: leftNum, content: d.a || '' });
    } else {
      rightNum++;
      result.push({ type: 'added', lineRight: rightNum, content: d.b || '' });
    }
  }

  return result;
}

export default function ResponseDiffScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [showInputs, setShowInputs] = useState(true);
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;

  const diffLines = useMemo(() => {
    if (!leftText.trim() && !rightText.trim()) return [];
    return computeDiff(leftText, rightText);
  }, [leftText, rightText]);

  const stats = useMemo(() => {
    const added = diffLines.filter((d) => d.type === 'added').length;
    const removed = diffLines.filter((d) => d.type === 'removed').length;
    const unchanged = diffLines.filter((d) => d.type === 'unchanged').length;
    return { added, removed, unchanged, total: diffLines.length };
  }, [diffLines]);

  const handleCopyDiff = async () => {
    const text = diffLines.map((d) => {
      const prefix = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' ';
      return `${prefix} ${d.content}`;
    }).join('\n');
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteLeft = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setLeftText(text);
  };

  const handlePasteRight = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setRightText(text);
  };

  const getDiffColor = (type: string) => {
    if (type === 'added') return '#3FB950';
    if (type === 'removed') return '#FF6961';
    return colors.text;
  };

  const getDiffBg = (type: string) => {
    if (type === 'added') return '#3FB95012';
    if (type === 'removed') return '#FF696112';
    return 'transparent';
  };

  return (
    <>
      <Stack.Screen options={{ title: t('responseDiff') || 'Response Diff' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Toggle Inputs */}
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: cardBg }]}
            onPress={() => setShowInputs(!showInputs)}
          >
            <MaterialCommunityIcons name={showInputs ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            <Text style={[styles.toggleText, { color: colors.text }]}>
              {showInputs ? 'Hide Inputs' : 'Show Inputs'}
            </Text>
          </TouchableOpacity>

          {showInputs && (
            <View style={{ gap: 8 }}>
              {/* Left Input */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.inputHeader}>
                  <Text style={[styles.inputLabel, { color: '#FF6961' }]}>Left (Original)</Text>
                  <TouchableOpacity onPress={handlePasteLeft} style={styles.pasteBtn}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={colors.primary} />
                    <Text style={[styles.pasteBtnText, { color: colors.primary }]}>Paste</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                  value={leftText}
                  onChangeText={setLeftText}
                  placeholder="Paste original response..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={6}
                />
              </View>

              {/* Right Input */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.inputHeader}>
                  <Text style={[styles.inputLabel, { color: '#3FB950' }]}>Right (New)</Text>
                  <TouchableOpacity onPress={handlePasteRight} style={styles.pasteBtn}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={colors.primary} />
                    <Text style={[styles.pasteBtnText, { color: colors.primary }]}>Paste</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                  value={rightText}
                  onChangeText={setRightText}
                  placeholder="Paste new response..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={6}
                />
              </View>
            </View>
          )}

          {/* Stats */}
          {diffLines.length > 0 && (
            <View style={[styles.statsRow, { marginTop: 12 }]}>
              <View style={[styles.statBadge, { backgroundColor: '#3FB95020' }]}>
                <Text style={[styles.statText, { color: '#3FB950' }]}>+{stats.added}</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: '#FF696120' }]}>
                <Text style={[styles.statText, { color: '#FF6961' }]}>-{stats.removed}</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: colors.textTertiary + '20' }]}>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>{stats.unchanged} unchanged</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={handleCopyDiff} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{copied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Diff View */}
          {diffLines.length > 0 && (
            <View style={[styles.diffContainer, { backgroundColor: cardBg, marginTop: 8 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: '100%' }}>
                  {diffLines.map((line, idx) => (
                    <View key={idx} style={[styles.diffRow, { backgroundColor: getDiffBg(line.type) }]}>
                      <Text style={[styles.lineNum, { color: colors.textTertiary }]}>
                        {line.lineLeft != null ? String(line.lineLeft).padStart(3) : '   '}
                      </Text>
                      <Text style={[styles.lineNum, { color: colors.textTertiary }]}>
                        {line.lineRight != null ? String(line.lineRight).padStart(3) : '   '}
                      </Text>
                      <Text style={[styles.diffPrefix, { color: getDiffColor(line.type) }]}>
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </Text>
                      <Text style={[styles.diffContent, { color: getDiffColor(line.type) }]} numberOfLines={1}>
                        {line.content}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {diffLines.length === 0 && leftText.trim() === '' && rightText.trim() === '' && (
            <View style={[styles.emptyState, { backgroundColor: cardBg, marginTop: 12 }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Compare Responses</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Paste two API responses above to see a line-by-line diff comparison.
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
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 14, padding: 14 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700' },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pasteBtnText: { fontSize: 13, fontWeight: '600' },
  textArea: {
    borderRadius: 10, padding: 12, fontSize: 13, minHeight: 100, textAlignVertical: 'top',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statText: { fontSize: 13, fontWeight: '700' },
  diffContainer: { borderRadius: 14, padding: 8, overflow: 'hidden' },
  diffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1, paddingHorizontal: 4 },
  lineNum: {
    width: 28, fontSize: 10, textAlign: 'right', marginRight: 4,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  diffPrefix: {
    width: 14, fontSize: 12, fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  diffContent: {
    flex: 1, fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  emptyState: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
