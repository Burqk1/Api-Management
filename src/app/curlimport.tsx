import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { HttpMethod, METHOD_COLORS, getStatusColor, generateId } from '../types/api';

const HISTORY_KEY = 'curl_import_history';

interface ParsedCurl {
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
}

interface ResponseData {
  status: number;
  time: number;
  headers: Record<string, string>;
  body: string;
}

function parseCurl(raw: string): ParsedCurl | null {
  const input = raw.trim().replace(/\\\n/g, ' ');
  if (!input.toLowerCase().startsWith('curl')) return null;

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: { key: string; value: string }[] = [];
  let body = '';

  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === inQuote) { inQuote = null; } else { current += ch; }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ') {
      if (current) { tokens.push(current); current = ''; }
    } else { current += ch; }
  }
  if (current) tokens.push(current);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'curl') continue;
    if (t === '-X' || t === '--request') { method = (tokens[++i] || 'GET').toUpperCase() as HttpMethod; continue; }
    if (t === '-H' || t === '--header') {
      const h = tokens[++i] || '';
      const idx = h.indexOf(':');
      if (idx > 0) headers.push({ key: h.slice(0, idx).trim(), value: h.slice(idx + 1).trim() });
      continue;
    }
    if (t === '-d' || t === '--data' || t === '--data-raw') {
      body = tokens[++i] || '';
      if (method === 'GET') method = 'POST';
      continue;
    }
    if (t === '-u' || t === '--user') {
      const creds = tokens[++i] || '';
      const encoded = btoa(creds);
      headers.push({ key: 'Authorization', value: `Basic ${encoded}` });
      continue;
    }
    if (['-k', '--insecure', '--compressed', '-s', '--silent', '-v', '--verbose', '-L', '--location'].includes(t)) continue;
    if (t.startsWith('-')) { if (!t.includes('=')) i++; continue; }
    if (!url && (t.startsWith('http://') || t.startsWith('https://') || t.includes('.'))) url = t;
  }

  if (!url) return null;
  return { method, url, headers, body };
}

export default function CurlImportScreen() {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? colors.surface : colors.card;
  const collections = useApiStore((s) => s.collections);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [curlInput, setCurlInput] = useState('');
  const [parsed, setParsed] = useState<ParsedCurl | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRespHeaders, setShowRespHeaders] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  React.useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((v) => { if (v) setHistory(JSON.parse(v)); });
  }, []);

  const saveHistory = useCallback(async (cmd: string) => {
    const next = [cmd, ...history.filter((h) => h !== cmd)].slice(0, 5);
    setHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, [history]);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) { setCurlInput(text); handleParse(text); }
  };

  const handleParse = (text?: string) => {
    const src = text ?? curlInput;
    const result = parseCurl(src);
    if (!result) { Alert.alert('Parse Error', 'Could not parse cURL command. Make sure it starts with "curl".'); return; }
    setParsed(result);
    setResponse(null);
  };

  const handleRun = async () => {
    if (!parsed) return;
    setLoading(true);
    setResponse(null);
    const hdrs: Record<string, string> = {};
    parsed.headers.forEach((h) => { hdrs[h.key] = h.value; });
    const start = Date.now();
    try {
      const res = await fetch(parsed.url, {
        method: parsed.method,
        headers: hdrs,
        body: ['GET', 'HEAD'].includes(parsed.method) ? undefined : parsed.body || undefined,
      });
      const time = Date.now() - start;
      const bodyText = await res.text();
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v: string, k: string) => { respHeaders[k] = v; });
      setResponse({ status: res.status, time, headers: respHeaders, body: bodyText });
      saveHistory(curlInput);
    } catch (e: any) {
      setResponse({ status: 0, time: Date.now() - start, headers: {}, body: `Error: ${e.message}` });
    } finally { setLoading(false); }
  };

  const handleSave = () => {
    if (!parsed || collections.length === 0) {
      Alert.alert('No Collections', 'Create a collection first to save endpoints.');
      return;
    }
    const buttons = collections.map((c) => ({
      text: c.name,
      onPress: () => {
        addEndpoint({
          name: `Imported: ${parsed.method} ${new URL(parsed.url).pathname}`,
          url: parsed.url,
          method: parsed.method,
          headers: parsed.headers.map((h) => ({ ...h, enabled: true })),
          body: parsed.body,
          collectionId: c.id,
          assertions: [],
        });
        Alert.alert('Saved', `Endpoint saved to "${c.name}".`);
      },
    }));
    buttons.push({ text: 'Cancel', onPress: () => {} });
    Alert.alert('Save to Collection', 'Choose a collection:', buttons);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'cURL Import' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Input Area */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
            placeholder="Paste your cURL command here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={curlInput}
            onChangeText={setCurlInput}
            textAlignVertical="top"
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handlePaste}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Paste from Clipboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#3FB950' }]} onPress={() => handleParse()}>
              <MaterialCommunityIcons name="code-tags-check" size={18} color="#fff" />
              <Text style={styles.btnText}>Parse</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Parsed Preview */}
        {parsed && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Parsed Request</Text>
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: METHOD_COLORS[parsed.method] + '22' }]}>
                <Text style={[styles.badgeText, { color: METHOD_COLORS[parsed.method] }]}>{parsed.method}</Text>
              </View>
              <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={2}>{parsed.url}</Text>
            </View>
            {parsed.headers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Headers ({parsed.headers.length})</Text>
                {parsed.headers.map((h, i) => (
                  <Text key={i} style={[styles.mono, { color: colors.text }]}>{h.key}: {h.value}</Text>
                ))}
              </View>
            )}
            {parsed.body ? (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Body</Text>
                <Text style={[styles.mono, { color: colors.text }]} numberOfLines={6}>{parsed.body}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: METHOD_COLORS[parsed.method] }]}
              onPress={handleRun}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <MaterialCommunityIcons name="play" size={20} color="#fff" />
                  <Text style={styles.runBtnText}>Run</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Response */}
        {response && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Response</Text>
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(response.status) + '22' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(response.status) }]}>
                  {response.status || 'ERR'}
                </Text>
              </View>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>{response.time}ms</Text>
            </View>
            <TouchableOpacity style={styles.section} onPress={() => setShowRespHeaders(!showRespHeaders)}>
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Headers ({Object.keys(response.headers).length})
                </Text>
                <MaterialCommunityIcons
                  name={showRespHeaders ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
            {showRespHeaders && Object.entries(response.headers).map(([k, v], i) => (
              <Text key={i} style={[styles.mono, { color: colors.text }]}>{k}: {v}</Text>
            ))}
            <View style={[styles.bodyBox, { backgroundColor: isDark ? '#0d1117' : '#f6f8fa', borderColor: colors.cardBorder }]}>
              <ScrollView horizontal>
                <Text style={[styles.mono, { color: colors.text }]} selectable>{response.body}</Text>
              </ScrollView>
            </View>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={handleSave}>
              <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Save to Collection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Imports</Text>
            {history.map((h, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.historyItem, { borderColor: colors.cardBorder }]}
                onPress={() => { setCurlInput(h); handleParse(h); }}
              >
                <MaterialCommunityIcons name="history" size={16} color={colors.textSecondary} />
                <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  card: { borderRadius: 14, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 100 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontWeight: '800', fontSize: 12 },
  urlText: { fontSize: 13, flex: 1 },
  section: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600' },
  mono: { fontSize: 12, fontFamily: 'monospace' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  runBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  timeText: { fontSize: 13 },
  bodyBox: { borderWidth: 1, borderRadius: 10, padding: 10, maxHeight: 240 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  historyText: { fontSize: 12, fontFamily: 'monospace', flex: 1 },
});
