import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

type Source = 'statusCode' | 'responseBody' | 'responseTime' | 'responseSize';
type Operator = 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'matchesRegex' | 'exists';

interface Assertion {
  id: string;
  source: Source;
  operator: Operator;
  value: string;
}

interface TestResult {
  assertion: Assertion;
  passed: boolean;
  actual: string;
}

const SOURCES: { key: Source; label: string; icon: string }[] = [
  { key: 'statusCode', label: 'Status Code', icon: 'numeric' },
  { key: 'responseBody', label: 'Response Body', icon: 'code-json' },
  { key: 'responseTime', label: 'Response Time', icon: 'timer-outline' },
  { key: 'responseSize', label: 'Response Size', icon: 'database-outline' },
];

const OPERATORS: { key: Operator; label: string }[] = [
  { key: 'equals', label: '==' },
  { key: 'notEquals', label: '!=' },
  { key: 'contains', label: 'contains' },
  { key: 'notContains', label: '!contains' },
  { key: 'greaterThan', label: '>' },
  { key: 'lessThan', label: '<' },
  { key: 'matchesRegex', label: 'regex' },
  { key: 'exists', label: 'exists' },
];

const QUICK_TEMPLATES: { name: string; assertion: Omit<Assertion, 'id'> }[] = [
  { name: 'Status 200 OK', assertion: { source: 'statusCode', operator: 'equals', value: '200' } },
  { name: 'Fast Response', assertion: { source: 'responseTime', operator: 'lessThan', value: '500' } },
  { name: 'Has Body', assertion: { source: 'responseBody', operator: 'exists', value: '' } },
  { name: 'JSON Valid', assertion: { source: 'responseBody', operator: 'contains', value: '{' } },
  { name: 'Not Error', assertion: { source: 'statusCode', operator: 'lessThan', value: '400' } },
];

function evaluate(assertion: Assertion, log: any): TestResult {
  let actual = '';
  switch (assertion.source) {
    case 'statusCode': actual = String(log.statusCode ?? ''); break;
    case 'responseBody': actual = log.responseBody ?? ''; break;
    case 'responseTime': actual = String(log.responseTime ?? ''); break;
    case 'responseSize': actual = String(log.responseSize ?? 0); break;
  }

  let passed = false;
  const numActual = Number(actual);
  const numExpected = Number(assertion.value);

  switch (assertion.operator) {
    case 'equals': passed = actual === assertion.value; break;
    case 'notEquals': passed = actual !== assertion.value; break;
    case 'contains': passed = actual.includes(assertion.value); break;
    case 'notContains': passed = !actual.includes(assertion.value); break;
    case 'greaterThan': passed = numActual > numExpected; break;
    case 'lessThan': passed = numActual < numExpected; break;
    case 'matchesRegex':
      try { passed = new RegExp(assertion.value).test(actual); } catch { passed = false; }
      break;
    case 'exists': passed = actual !== '' && actual !== 'undefined' && actual !== 'null'; break;
  }

  return { assertion, passed, actual: actual.length > 60 ? actual.substring(0, 60) + '...' : actual };
}

export default function AssertionsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);
  const cardBg = isDark ? colors.surface : colors.card;

  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [source, setSource] = useState<Source>('statusCode');
  const [operator, setOperator] = useState<Operator>('equals');
  const [value, setValue] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedLog, setSelectedLog] = useState<number>(0);
  const [saveName, setSaveName] = useState('');

  const addAssertion = () => {
    if (operator !== 'exists' && !value.trim()) return Alert.alert('Error', 'Value is required');
    setAssertions((a) => [...a, { id: Date.now().toString(), source, operator, value }]);
    setValue('');
  };

  const removeAssertion = (id: string) => setAssertions((a) => a.filter((x) => x.id !== id));

  const moveAssertion = (id: string, dir: -1 | 1) => {
    setAssertions((a) => {
      const idx = a.findIndex((x) => x.id === id);
      if ((idx === 0 && dir === -1) || (idx === a.length - 1 && dir === 1)) return a;
      const copy = [...a];
      [copy[idx], copy[idx + dir]] = [copy[idx + dir], copy[idx]];
      return copy;
    });
  };

  const runTests = () => {
    if (assertions.length === 0) return Alert.alert('Error', 'Add at least one assertion');
    if (callLogs.length === 0) return Alert.alert('Error', 'No request logs found');
    const log = callLogs[selectedLog];
    setResults(assertions.map((a) => evaluate(a, log)));
  };

  const saveSet = async () => {
    if (!saveName.trim()) return Alert.alert('Error', 'Enter a name');
    await AsyncStorage.setItem(`assertions_${saveName}`, JSON.stringify(assertions));
    Alert.alert('Saved', `Assertion set "${saveName}" saved`);
    setSaveName('');
  };

  const passCount = results.filter((r) => r.passed).length;
  const passPercent = results.length > 0 ? (passCount / results.length) * 100 : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Test Assertions', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Builder */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Build Assertion</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Source</Text>
          <View style={styles.chipRow}>
            {SOURCES.map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setSource(s.key)}
                style={[styles.chip, source === s.key && { backgroundColor: colors.primary }]}
              >
                <MaterialCommunityIcons name={s.icon as any} size={14} color={source === s.key ? '#FFF' : colors.textSecondary} />
                <Text style={{ color: source === s.key ? '#FFF' : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 }}>Operator</Text>
          <View style={styles.chipRow}>
            {OPERATORS.map((o) => (
              <TouchableOpacity
                key={o.key}
                onPress={() => setOperator(o.key)}
                style={[styles.chip, operator === o.key && { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: operator === o.key ? '#FFF' : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {operator !== 'exists' && (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
              value={value}
              onChangeText={setValue}
              placeholder="Expected value"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
          )}

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addAssertion}>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Add Assertion</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Templates */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Templates</Text>
          <View style={styles.chipRow}>
            {QUICK_TEMPLATES.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.name}
                style={[styles.chip, { backgroundColor: '#3FB95018' }]}
                onPress={() => setAssertions((a) => [...a, { ...tmpl.assertion, id: Date.now().toString() + Math.random() }])}
              >
                <MaterialCommunityIcons name="plus" size={12} color="#3FB950" />
                <Text style={{ color: '#3FB950', fontSize: 11, fontWeight: '600' }}>{tmpl.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Assertion List */}
        {assertions.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assertions ({assertions.length})</Text>
            {assertions.map((a, i) => (
              <View key={a.id} style={[styles.assertionRow, i < assertions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                    {SOURCES.find((s) => s.key === a.source)?.label} {OPERATORS.find((o) => o.key === a.operator)?.label} {a.value}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => moveAssertion(a.id, -1)}>
                  <MaterialCommunityIcons name="arrow-up" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveAssertion(a.id, 1)}>
                  <MaterialCommunityIcons name="arrow-down" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeAssertion(a.id)}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#FF6961" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Test Against Log */}
        {assertions.length > 0 && callLogs.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Against</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.chipRow}>
                {callLogs.slice(0, 10).map((log, i) => (
                  <TouchableOpacity
                    key={log.id}
                    onPress={() => setSelectedLog(i)}
                    style={[styles.chip, selectedLog === i && { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: selectedLog === i ? '#FFF' : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
                      {log.method} {log.statusCode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.runBtn, { backgroundColor: '#3FB950' }]} onPress={runTests}>
              <MaterialCommunityIcons name="play" size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Run Tests</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Results</Text>
            <View style={styles.summaryRow}>
              <Text style={{ color: '#3FB950', fontWeight: '700', fontSize: 15 }}>{passCount} passed</Text>
              <Text style={{ color: colors.textTertiary }}>/</Text>
              <Text style={{ color: results.length - passCount > 0 ? '#FF6961' : colors.textTertiary, fontWeight: '700', fontSize: 15 }}>
                {results.length - passCount} failed
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}>
              <View style={[styles.progressFill, { width: `${passPercent}%`, backgroundColor: passPercent === 100 ? '#3FB950' : '#FFD60A' }]} />
            </View>
            {results.map((r, i) => (
              <View key={i} style={[styles.resultRow, { borderBottomColor: colors.divider }]}>
                <MaterialCommunityIcons
                  name={r.passed ? 'check-circle' : 'close-circle'}
                  size={20}
                  color={r.passed ? '#3FB950' : '#FF6961'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                    {SOURCES.find((s) => s.key === r.assertion.source)?.label} {OPERATORS.find((o) => o.key === r.assertion.operator)?.label} {r.assertion.value}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Actual: {r.actual}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Save Set */}
        {assertions.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Save Assertion Set</Text>
            <View style={styles.saveRow}>
              <TextInput
                style={[styles.saveInput, { color: colors.text, borderColor: colors.cardBorder }]}
                value={saveName}
                onChangeText={setSaveName}
                placeholder="Set name..."
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveSet}>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginTop: 12 },
  addBtn: { borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  assertionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  runBtn: { borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 14 },
  progressFill: { height: 6, borderRadius: 3 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  saveRow: { flexDirection: 'row', gap: 8 },
  saveInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  saveBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
