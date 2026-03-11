import React, { useState, useEffect } from 'react';
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

type Tab = 'pre' | 'post';

const PRE_SNIPPETS = [
  { label: 'Set Header', code: 'pm.request.headers["Authorization"] = "Bearer " + pm.env.get("token");' },
  { label: 'Set Variable', code: 'pm.env.set("myVar", "value");' },
  { label: 'Generate UUID', code: 'pm.env.set("uuid", crypto.randomUUID());' },
  { label: 'Timestamp', code: 'pm.env.set("timestamp", Date.now().toString());' },
  { label: 'Basic Auth', code: 'pm.request.headers["Authorization"] = "Basic " + btoa(user + ":" + pass);' },
  { label: 'HMAC Sign', code: '// const sig = hmacSHA256(body, secret);\npm.request.headers["X-Signature"] = sig;' },
];

const POST_SNIPPETS = [
  { label: 'Extract Field', code: 'const data = JSON.parse(pm.response.body);\npm.env.set("token", data.access_token);' },
  { label: 'Set Env Var', code: 'pm.env.set("result", pm.response.body);' },
  { label: 'Assert Status', code: 'pm.test("Status is 200", () => pm.response.status === 200);' },
  { label: 'Assert Contains', code: 'pm.test("Has data", () => pm.response.body.includes("data"));' },
  { label: 'Log Time', code: 'console.log("Response time: " + pm.response.responseTime + "ms");' },
];

const PRE_VARS = ['{{url}}', '{{method}}', '{{headers}}', '{{body}}', '{{env.*}}'];
const POST_VARS = ['{{status}}', '{{responseBody}}', '{{responseTime}}', '{{responseHeaders}}', '{{env.*}}'];

const TEMPLATES = [
  { name: 'Auth Token Refresh', tab: 'pre' as Tab, code: '// Auto-refresh token if expired\nconst exp = pm.env.get("token_expiry");\nif (Date.now() > Number(exp)) {\n  // fetch new token...\n  pm.env.set("token", newToken);\n  pm.env.set("token_expiry", Date.now() + 3600000);\n}\npm.request.headers["Authorization"] = "Bearer " + pm.env.get("token");' },
  { name: 'Request Logging', tab: 'pre' as Tab, code: '// Log request details\nconsole.log("[" + pm.request.method + "] " + pm.request.url);\nconsole.log("Headers:", JSON.stringify(pm.request.headers, null, 2));\nif (pm.request.body) console.log("Body:", pm.request.body);' },
  { name: 'Response Validation', tab: 'post' as Tab, code: '// Validate response structure\nconst data = JSON.parse(pm.response.body);\npm.test("Status 2xx", () => pm.response.status >= 200 && pm.response.status < 300);\npm.test("Has data field", () => data.hasOwnProperty("data"));\npm.test("Fast response", () => pm.response.responseTime < 1000);\nconsole.log("All validations passed!");' },
  { name: 'Dynamic Headers', tab: 'pre' as Tab, code: '// Add dynamic headers\npm.request.headers["X-Request-ID"] = crypto.randomUUID();\npm.request.headers["X-Timestamp"] = new Date().toISOString();\npm.request.headers["X-Client"] = "Fetchlab/1.0";' },
];

export default function PreRequestScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;

  const [tab, setTab] = useState<Tab>('pre');
  const [script, setScript] = useState('');
  const [output, setOutput] = useState<{ text: string; type: 'log' | 'pass' | 'fail' }[]>([]);
  const [showVars, setShowVars] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    loadScript();
  }, [tab]);

  const loadScript = async () => {
    const saved = await AsyncStorage.getItem(`prerequest_scripts_${tab}`);
    setScript(saved || '');
    setOutput([]);
  };

  const saveScript = async () => {
    await AsyncStorage.setItem(`prerequest_scripts_${tab}`, script);
    Alert.alert('Saved', `${tab === 'pre' ? 'Pre-request' : 'Post-response'} script saved`);
  };

  const insertSnippet = (code: string) => {
    setScript((s) => (s ? s + '\n\n' + code : code));
  };

  const runScript = () => {
    const logs: { text: string; type: 'log' | 'pass' | 'fail' }[] = [];
    const mockPm = {
      env: {
        _store: {} as Record<string, string>,
        get: function (k: string) { return this._store[k] || ''; },
        set: function (k: string, v: string) { this._store[k] = v; logs.push({ text: `ENV SET: ${k} = ${v}`, type: 'log' }); },
      },
      request: { method: 'GET', url: 'https://api.example.com', headers: {} as Record<string, string>, body: '{}' },
      response: { status: 200, body: '{"data": "test", "success": true}', responseTime: 142, headers: {} },
      test: (name: string, fn: () => boolean) => {
        try {
          const result = fn();
          logs.push({ text: `${result ? 'PASS' : 'FAIL'}: ${name}`, type: result ? 'pass' : 'fail' });
        } catch (e: any) {
          logs.push({ text: `FAIL: ${name} — ${e.message}`, type: 'fail' });
        }
      },
    };

    // Security: validate script before execution
    const BLOCKED = ['fetch', 'XMLHttpRequest', 'WebSocket', 'import', 'require', 'eval', 'Function', 'setTimeout', 'setInterval', 'process', 'global', 'globalThis', 'window', 'AsyncStorage', 'SecureStore', 'supabase', 'document', 'navigator'];
    for (const kw of BLOCKED) {
      const regex = new RegExp(`(?<!['".\`\\w])${kw}(?!['".\`\\w])`, 'g');
      if (regex.test(script)) {
        logs.push({ text: `SECURITY: "${kw}" is not allowed in scripts`, type: 'fail' });
        setOutput(logs);
        setShowOutput(true);
        return;
      }
    }

    try {
      const mockConsole = { log: (...args: any[]) => logs.push({ text: args.join(' '), type: 'log' }) };
      const fn = new Function('pm', 'console', 'btoa', 'atob', 'crypto', 'fetch', 'eval', 'Function', 'process', 'globalThis', script);
      fn(mockPm, mockConsole, (s: string) => Buffer.from(s).toString('base64'), (s: string) => Buffer.from(s, 'base64').toString(), { randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }) }, undefined, undefined, undefined, undefined, undefined);
      if (logs.length === 0) logs.push({ text: 'Script executed successfully (no output)', type: 'log' });
    } catch (e: any) {
      logs.push({ text: `ERROR: ${e.message}`, type: 'fail' });
    }

    setOutput(logs);
    setShowOutput(true);
  };

  const snippets = tab === 'pre' ? PRE_SNIPPETS : POST_SNIPPETS;
  const vars = tab === 'pre' ? PRE_VARS : POST_VARS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Pre/Post Scripts', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tab Selector */}
        <View style={[styles.tabRow, { backgroundColor: cardBg }]}>
          {(['pre', 'post'] as Tab[]).map((t2) => (
            <TouchableOpacity
              key={t2}
              onPress={() => setTab(t2)}
              style={[styles.tab, tab === t2 && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: tab === t2 ? '#FFF' : colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
                {t2 === 'pre' ? 'Pre-Request' : 'Post-Response'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Script Editor */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.editorHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Script Editor</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{script.split('\n').length} lines</Text>
          </View>
          <TextInput
            style={[styles.editor, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
            value={script}
            onChangeText={setScript}
            multiline
            placeholder={tab === 'pre' ? '// Pre-request script...' : '// Post-response script...'}
            placeholderTextColor={colors.textTertiary}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.editorActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95018' }]} onPress={runScript}>
              <MaterialCommunityIcons name="play" size={16} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontWeight: '600', fontSize: 13 }}>Run</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#58A6FF18' }]} onPress={saveScript}>
              <MaterialCommunityIcons name="content-save-outline" size={16} color="#58A6FF" />
              <Text style={{ color: '#58A6FF', fontWeight: '600', fontSize: 13 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF696118' }]} onPress={() => setScript('')}>
              <MaterialCommunityIcons name="eraser" size={16} color="#FF6961" />
              <Text style={{ color: '#FF6961', fontWeight: '600', fontSize: 13 }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Console Output */}
        {showOutput && output.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TouchableOpacity style={styles.editorHeader} onPress={() => setShowOutput(!showOutput)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Console Output</Text>
              <MaterialCommunityIcons name={showOutput ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.console, { backgroundColor: isDark ? colors.background : '#1a1a2e' }]}>
              {output.map((o, i) => (
                <Text key={i} style={{ color: o.type === 'pass' ? '#3FB950' : o.type === 'fail' ? '#FF6961' : '#8B949E', fontFamily: 'monospace', fontSize: 12, marginBottom: 2 }}>
                  {o.type === 'pass' ? '  ' : o.type === 'fail' ? '  ' : '> '}{o.text}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Snippets */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Snippets</Text>
          <View style={styles.snippetRow}>
            {snippets.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[styles.snippetChip, { backgroundColor: colors.primary + '18' }]}
                onPress={() => insertSnippet(s.code)}
              >
                <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Variables */}
        <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setShowVars(!showVars)}>
          <View style={styles.editorHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Available Variables</Text>
            <MaterialCommunityIcons name={showVars ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
          </View>
          {showVars && (
            <View style={styles.varsGrid}>
              {vars.map((v) => (
                <View key={v} style={[styles.varChip, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}>
                  <Text style={{ color: '#FFD60A', fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Templates */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Templates</Text>
          {TEMPLATES.filter((tmpl) => tmpl.tab === tab).map((tmpl) => (
            <TouchableOpacity
              key={tmpl.name}
              style={[styles.templateRow, { borderBottomColor: colors.divider }]}
              onPress={() => setScript(tmpl.code)}
            >
              <MaterialCommunityIcons name="file-code-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{tmpl.name}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  tabRow: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editor: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 160, marginTop: 8 },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  console: { borderRadius: 10, padding: 12, marginTop: 8 },
  snippetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  snippetChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  varsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  varChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
