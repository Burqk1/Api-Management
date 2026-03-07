import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

type ScanMode = 'apikey' | 'curl' | 'url' | 'jwt';

const MODES: { key: ScanMode; icon: string; label: string; color: string; placeholder: string }[] = [
  { key: 'apikey', icon: 'key-outline', label: 'API Key', color: '#58A6FF', placeholder: 'sk-... or AKIA... or token...' },
  { key: 'curl', icon: 'console-line', label: 'cURL', color: '#3FB950', placeholder: 'curl -X GET https://...' },
  { key: 'url', icon: 'link-variant', label: 'URL', color: '#D29922', placeholder: 'https://api.example.com/v1/...' },
  { key: 'jwt', icon: 'shield-key-outline', label: 'JWT', color: '#BC8CFF', placeholder: 'eyJhbGciOiJIUzI1NiIs...' },
];

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp ? new Date(payload.exp * 1000) : null;
    const isExpired = exp ? exp.getTime() < Date.now() : false;
    return { header, payload, exp, isExpired };
  } catch { return null; }
}

function detectType(text: string): ScanMode {
  const t = text.trim();
  if (t.startsWith('curl ') || t.startsWith('curl\n')) return 'curl';
  if (t.startsWith('eyJ') && t.split('.').length === 3) return 'jwt';
  if (t.startsWith('http://') || t.startsWith('https://')) return 'url';
  return 'apikey';
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
}

export default function CameraScanScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [mode, setMode] = useState<ScanMode>('apikey');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setInput(text);
      const detected = detectType(text);
      setMode(detected);
      processInput(text, detected);
    }
  };

  const processInput = (text: string, m?: ScanMode) => {
    const currentMode = m || mode;
    const trimmed = text.trim();
    if (!trimmed) { setResult(null); return; }

    if (currentMode === 'jwt') {
      const decoded = decodeJWT(trimmed);
      setResult(decoded ? { type: 'jwt', ...decoded } : { type: 'error', message: 'Geçersiz JWT token' });
    } else if (currentMode === 'url') {
      try {
        const url = new URL(trimmed);
        setResult({
          type: 'url', protocol: url.protocol, host: url.host,
          pathname: url.pathname, params: Object.fromEntries(url.searchParams),
        });
      } catch { setResult({ type: 'error', message: 'Geçersiz URL' }); }
    } else if (currentMode === 'apikey') {
      const keyType = trimmed.startsWith('sk-') ? 'OpenAI' : trimmed.startsWith('AKIA') ? 'AWS' : trimmed.startsWith('xoxb-') ? 'Slack Bot' : trimmed.startsWith('ghp_') ? 'GitHub' : 'Unknown';
      setResult({ type: 'apikey', keyType, masked: maskKey(trimmed), length: trimmed.length });
    } else if (currentMode === 'curl') {
      setResult({ type: 'curl', preview: trimmed.slice(0, 200), length: trimmed.length });
    }
  };

  const copy = (text: string, id: string) => {
    Clipboard.setStringAsync(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Scan & Detect' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Mode Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeChip, { backgroundColor: mode === m.key ? m.color + '20' : cardBg, borderColor: mode === m.key ? m.color : 'transparent', borderWidth: 1.5 }]}
                  onPress={() => setMode(m.key)}
                >
                  <MaterialCommunityIcons name={m.icon as any} size={16} color={mode === m.key ? m.color : colors.textSecondary} />
                  <Text style={{ color: mode === m.key ? m.color : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Camera Placeholder */}
          <TouchableOpacity style={[styles.cameraBox, { backgroundColor: cardBg }]} onPress={pasteFromClipboard}>
            <MaterialCommunityIcons name="camera-outline" size={48} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 8 }}>Kamera ile okuma (yakında)</Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 12 }}>Panoya yapıştırmak için dokun</Text>
          </TouchableOpacity>

          {/* Manual Input */}
          <View style={[styles.inputCard, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.systemGray5 : '#F2F2F7', color: colors.text }]}
              value={input}
              onChangeText={(text) => { setInput(text); processInput(text); }}
              placeholder={MODES.find((m) => m.key === mode)?.placeholder}
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20', flex: 1 }]} onPress={pasteFromClipboard}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Yapıştır</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95020', flex: 1 }]} onPress={() => processInput(input)}>
                <MaterialCommunityIcons name="magnify" size={16} color="#3FB950" />
                <Text style={{ color: '#3FB950', fontSize: 13, fontWeight: '700' }}>Analiz Et</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Results */}
          {result && result.type === 'jwt' && (
            <View style={[styles.resultCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="shield-key" size={20} color="#BC8CFF" />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>JWT Token</Text>
                {result.isExpired ? (
                  <View style={[styles.badge, { backgroundColor: '#FF696120' }]}>
                    <Text style={{ color: '#FF6961', fontSize: 10, fontWeight: '700' }}>EXPIRED</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: '#3FB95020' }]}>
                    <Text style={{ color: '#3FB950', fontSize: 10, fontWeight: '700' }}>VALID</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Header</Text>
              <TouchableOpacity onPress={() => copy(JSON.stringify(result.header, null, 2), 'header')}>
                <Text style={[styles.codeText, { color: colors.text, backgroundColor: isDark ? colors.systemGray5 : '#F2F2F7' }]}>{JSON.stringify(result.header, null, 2)}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 }}>Payload</Text>
              <TouchableOpacity onPress={() => copy(JSON.stringify(result.payload, null, 2), 'payload')}>
                <Text style={[styles.codeText, { color: colors.text, backgroundColor: isDark ? colors.systemGray5 : '#F2F2F7' }]}>{JSON.stringify(result.payload, null, 2)}</Text>
              </TouchableOpacity>
              {result.exp && (
                <Text style={{ color: result.isExpired ? '#FF6961' : colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                  Expires: {result.exp.toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {result && result.type === 'url' && (
            <View style={[styles.resultCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="link-variant" size={20} color="#D29922" />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>URL Parsed</Text>
              </View>
              {[
                { label: 'Protocol', value: result.protocol },
                { label: 'Host', value: result.host },
                { label: 'Path', value: result.pathname },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.label}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{item.value}</Text>
                </View>
              ))}
              {Object.keys(result.params).length > 0 && (
                <>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 }}>Query Params</Text>
                  {Object.entries(result.params).map(([k, v]) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                      <Text style={{ color: '#58A6FF', fontSize: 12 }}>{k}</Text>
                      <Text style={{ color: colors.text, fontSize: 12 }}>{v as string}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {result && result.type === 'apikey' && (
            <View style={[styles.resultCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="key" size={20} color="#58A6FF" />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>API Key Detected</Text>
                <View style={[styles.badge, { backgroundColor: '#58A6FF20' }]}>
                  <Text style={{ color: '#58A6FF', fontSize: 10, fontWeight: '700' }}>{result.keyType}</Text>
                </View>
              </View>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{result.masked}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>{result.length} karakter</Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3FB95020', marginTop: 10 }]}
                onPress={() => { copy(input.trim(), 'key'); Alert.alert('Kopyalandı', 'API key panoya kopyalandı'); }}
              >
                <MaterialCommunityIcons name={copied === 'key' ? 'check' : 'content-copy'} size={16} color="#3FB950" />
                <Text style={{ color: '#3FB950', fontSize: 13, fontWeight: '700' }}>Kopyala</Text>
              </TouchableOpacity>
            </View>
          )}

          {result && result.type === 'error' && (
            <View style={[styles.resultCard, { backgroundColor: '#FF696110' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#FF6961" />
                <Text style={{ color: '#FF6961', fontSize: 14, fontWeight: '600' }}>{result.message}</Text>
              </View>
            </View>
          )}

          {!result && !input && (
            <View style={{ alignItems: 'center', padding: 30 }}>
              <MaterialCommunityIcons name="text-recognition" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>API key, cURL, URL veya JWT yapıştırın</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>Otomatik olarak algılanır ve analiz edilir</Text>
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
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cameraBox: { borderRadius: 14, padding: 40, alignItems: 'center', marginBottom: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#8B949E40' },
  inputCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  textInput: { borderRadius: 10, padding: 12, fontSize: 13, minHeight: 80, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  resultCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeText: { borderRadius: 8, padding: 10, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
