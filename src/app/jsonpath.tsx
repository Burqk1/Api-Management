import React, { useState, useCallback } from 'react';
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

function evaluateJsonPath(obj: any, path: string): any {
  try {
    const parts = path
      .replace(/^\$\.?/, '')
      .split(/\.|\[/)
      .filter(Boolean)
      .map((p) => p.replace(/\]$/, '').replace(/^['"]|['"]$/g, ''));

    let current: any = obj;
    for (const part of parts) {
      if (part === '*' && Array.isArray(current)) {
        return current;
      }
      if (current === null || current === undefined) return undefined;
      if (part.match(/^\d+$/)) {
        current = current[parseInt(part, 10)];
      } else {
        current = current[part];
      }
    }
    return current;
  } catch {
    return undefined;
  }
}

export default function JsonPathScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [jsonInput, setJsonInput] = useState('{\n  "users": [\n    { "name": "Alice", "age": 30 },\n    { "name": "Bob", "age": 25 }\n  ],\n  "total": 2\n}');
  const [pathInput, setPathInput] = useState('$.users[0].name');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const evaluate = useCallback(() => {
    setError('');
    setResult('');
    try {
      const obj = JSON.parse(jsonInput);
      const value = evaluateJsonPath(obj, pathInput);
      if (value === undefined) {
        setError('No match found');
      } else {
        setResult(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
      }
    } catch (e: any) {
      setError(e.message || 'Invalid JSON');
    }
  }, [jsonInput, pathInput]);

  const quickPaths = [
    '$.users',
    '$.users[0]',
    '$.users[0].name',
    '$.users[*]',
    '$.total',
  ];

  return (
    <>
      <Stack.Screen options={{ title: t('jsonPathEvaluator') || 'JSONPath Evaluator' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* JSON Input */}
          <Text style={[styles.label, { color: colors.text }]}>JSON</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={jsonInput}
              onChangeText={setJsonInput}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textTertiary}
              placeholder="Paste JSON here..."
            />
          </View>

          {/* Path Input */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>JSONPath</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.pathInput, { backgroundColor: inputBg, color: colors.text }]}
              value={pathInput}
              onChangeText={setPathInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textTertiary}
              placeholder="$.path.to.value"
            />
          </View>

          {/* Quick Paths */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={styles.quickRow}>
              {quickPaths.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.quickChip, { backgroundColor: cardBg }]}
                  onPress={() => setPathInput(p)}
                >
                  <Text style={[styles.quickText, { color: colors.primary }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Evaluate Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={evaluate}
          >
            <MaterialCommunityIcons name="play" size={20} color="#FFF" />
            <Text style={styles.btnText}>{t('evaluate') || 'Evaluate'}</Text>
          </TouchableOpacity>

          {/* Result */}
          {(result || error) && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>
                  {error ? 'Error' : 'Result'}
                </Text>
                {result && (
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(result)}>
                    <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.resultBox, { backgroundColor: error ? '#FF696115' : '#3FB95015' }]}>
                <Text style={[styles.resultText, { color: error ? '#FF6961' : '#3FB950' }]}>
                  {error || result}
                </Text>
              </View>
            </View>
          )}

          {/* Help */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>JSONPath Syntax</Text>
            {[
              ['$', 'Root object'],
              ['$.store', 'Access property'],
              ['$.store.books[0]', 'Array index'],
              ['$.store.books[*]', 'All items in array'],
              ['$.a.b.c', 'Nested property'],
            ].map(([syntax, desc]) => (
              <View key={syntax} style={styles.helpRow}>
                <Text style={[styles.helpSyntax, { color: colors.primary }]}>{syntax}</Text>
                <Text style={[styles.helpDesc, { color: colors.textSecondary }]}>{desc}</Text>
              </View>
            ))}
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
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  card: { borderRadius: 14, padding: 14 },
  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 150 },
  pathInput: { borderRadius: 10, padding: 12, fontSize: 15, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  quickText: { fontSize: 13, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  resultBox: { borderRadius: 12, padding: 14 },
  resultText: { fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 20 },
  helpTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  helpSyntax: { fontSize: 13, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minWidth: 150 },
  helpDesc: { fontSize: 13, flex: 1 },
});
