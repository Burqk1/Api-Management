import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

const SNIPPETS = [
  { label: 'Set env variable', code: 'pm.environment.set("key", "value");' },
  { label: 'Get env variable', code: 'pm.environment.get("key");' },
  { label: 'Test status code', code: 'pm.test("Status 200", () => pm.response.to.have.status(200));' },
  { label: 'Test body contains', code: 'pm.test("Has field", () => pm.expect(pm.response.json().field).to.exist);' },
  { label: 'Test response time', code: 'pm.test("Fast", () => pm.expect(pm.response.responseTime).to.be.below(500));' },
  { label: 'Log to console', code: 'console.log(pm.response.json());' },
  { label: 'Set header', code: 'pm.request.headers.add({key: "X-Custom", value: "value"});' },
  { label: 'Parse JSON', code: 'const data = pm.response.json();' },
];

const AVAILABLE_VARS = [
  { name: 'pm.environment', desc: 'Access environment variables (.get, .set, .unset)' },
  { name: 'pm.request', desc: 'Access request data (.url, .headers, .body, .method)' },
  { name: 'pm.response', desc: 'Access response data (.json(), .text(), .code, .responseTime)' },
  { name: 'pm.test()', desc: 'Define a test with name and callback' },
  { name: 'pm.expect()', desc: 'Chai-style assertion' },
  { name: 'pm.variables', desc: 'Access collection & global variables' },
  { name: 'console.log()', desc: 'Log output to the console panel' },
];

export default function ScriptEditorScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const { endpointId, type } = useLocalSearchParams<{ endpointId: string; type: 'pre' | 'post' }>();

  const endpoints = useApiStore((s) => s.endpoints);
  const updateEndpoint = useApiStore((s) => s.updateEndpoint);

  const endpoint = endpoints.find((e) => e.id === endpointId);
  const isPre = type === 'pre';

  const initialScript = isPre
    ? (endpoint?.preRequestScript || '')
    : (endpoint?.postRequestScript || '');

  const [script, setScript] = useState(initialScript);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [saved, setSaved] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const insertSnippet = (code: string) => {
    setScript((prev) => {
      if (prev && !prev.endsWith('\n')) return prev + '\n' + code;
      return prev + code;
    });
  };

  const handleSave = () => {
    if (!endpoint) return;
    const update = isPre
      ? { preRequestScript: script }
      : { postRequestScript: script };
    updateEndpoint(endpoint.id, update);
    setSaved(true);
    setConsoleOutput((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${t('scriptSaved')}`]);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearConsole = () => setConsoleOutput([]);

  return (
    <>
      <Stack.Screen options={{ title: isPre ? t('preRequestScript') : t('postRequestScript') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Header Info */}
            {endpoint && (
              <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons
                    name={isPre ? 'script-text-play-outline' : 'script-text-outline'}
                    size={20}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>
                      {isPre ? t('preRequestScript') : t('postRequestScript')}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {endpoint.name} — {endpoint.method} {endpoint.url}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Code Editor */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="code-braces" size={16} color={colors.text} />
              {'  '}{t('scriptEditor')}
            </Text>
            <View style={[styles.editorContainer, { backgroundColor: cardBg, borderColor: colors.inputBorder }]}>
              <View style={[styles.editorHeader, { borderBottomColor: colors.divider }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
                  JAVASCRIPT
                </Text>
                <View style={[styles.lineCountBadge, { backgroundColor: inputBg }]}>
                  <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
                    {script.split('\n').length} lines
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.codeInput, { color: colors.text, backgroundColor: inputBg }]}
                value={script}
                onChangeText={setScript}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder={isPre ? '// Pre-request script...' : '// Post-request script...'}
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="top"
              />
            </View>

            {/* Snippet Library */}
            <TouchableOpacity
              style={[styles.collapsibleHeader, { backgroundColor: cardBg }]}
              onPress={() => setShowSnippets(!showSnippets)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="puzzle-outline" size={18} color={colors.primary} />
              <Text style={[styles.collapsibleTitle, { color: colors.text }]}>{t('snippets')}</Text>
              <MaterialCommunityIcons
                name={showSnippets ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textTertiary}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            {showSnippets && (
              <View style={[styles.snippetsContainer, { backgroundColor: cardBg }]}>
                {SNIPPETS.map((snippet, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.snippetItem, { backgroundColor: inputBg }]}
                    onPress={() => insertSnippet(snippet.code)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.snippetLabel, { color: colors.text }]}>{snippet.label}</Text>
                      <Text style={[styles.snippetCode, { color: colors.textSecondary }]} numberOfLines={1}>
                        {snippet.code}
                      </Text>
                    </View>
                    <View style={[styles.insertBadge, { backgroundColor: colors.primary + '15' }]}>
                      <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>{t('insertSnippet')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Console Output */}
            <View style={[styles.consoleSection, { backgroundColor: cardBg }]}>
              <View style={styles.consoleHeader}>
                <MaterialCommunityIcons name="console" size={18} color={colors.secondary} />
                <Text style={[styles.collapsibleTitle, { color: colors.text }]}>{t('console')}</Text>
                {consoleOutput.length > 0 && (
                  <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: inputBg }]}
                    onPress={clearConsole}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{t('clearConsole')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.consoleOutput, { backgroundColor: isDark ? '#0D1117' : '#1E1E1E' }]}>
                {consoleOutput.length === 0 ? (
                  <Text style={styles.consolePlaceholder}>{'>'} No console output yet...</Text>
                ) : (
                  consoleOutput.map((line, i) => (
                    <Text key={i} style={styles.consoleLine}>{'>'} {line}</Text>
                  ))
                )}
              </View>
            </View>

            {/* Available Variables Reference */}
            <TouchableOpacity
              style={[styles.collapsibleHeader, { backgroundColor: cardBg }]}
              onPress={() => setShowVars(!showVars)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="variable" size={18} color={colors.warning} />
              <Text style={[styles.collapsibleTitle, { color: colors.text }]}>{t('availableVars')}</Text>
              <MaterialCommunityIcons
                name={showVars ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textTertiary}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            {showVars && (
              <View style={[styles.varsContainer, { backgroundColor: cardBg }]}>
                {AVAILABLE_VARS.map((v, i) => (
                  <View key={i} style={[styles.varItem, i < AVAILABLE_VARS.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={[styles.varName, { color: colors.primary }]}>{v.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{v.desc}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saved ? colors.secondary : colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={saved ? 'check-circle-outline' : 'content-save-outline'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.saveBtnText}>
                {saved ? t('scriptSaved') : t('saveScript')}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  infoCard: { borderRadius: 14, padding: 14, marginBottom: 16 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  editorContainer: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    minHeight: 200,
    maxHeight: 400,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
  },
  collapsibleTitle: { fontSize: 14, fontWeight: '700' },
  snippetsContainer: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  snippetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 10,
  },
  snippetLabel: { fontSize: 13, fontWeight: '600' },
  snippetCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  insertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  consoleSection: { borderRadius: 14, marginBottom: 16, overflow: 'hidden' },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  consoleOutput: {
    minHeight: 80,
    padding: 12,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  consolePlaceholder: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#6A737D',
  },
  consoleLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#3FB950',
    marginBottom: 4,
  },
  varsContainer: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  varItem: { paddingVertical: 10 },
  varName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
