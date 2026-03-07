import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { HttpMethod, METHOD_COLORS } from '../types/api';
import JsonHighlight from '../components/JsonHighlight';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function QuickSendScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    time: number;
    size: number;
    body: string;
    headers: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'response'>('response');

  const cardBg = isDark ? colors.surface : colors.card;

  const handleSend = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    setError('');

    const resolved = resolveVariables(url.trim());
    const start = Date.now();

    try {
      // Parse headers
      const reqHeaders: Record<string, string> = {};
      if (headersText.trim()) {
        headersText.split('\n').forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            reqHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        });
      }

      const opts: RequestInit = { method, headers: reqHeaders };
      if (bodyText.trim() && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        opts.body = bodyText;
      }

      const res = await fetch(resolved, opts);
      const resBody = await res.text();
      const elapsed = Date.now() - start;

      // Collect response headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v: string, k: string) => {
        resHeaders[k] = v;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: elapsed,
        size: resBody.length,
        body: resBody,
        headers: resHeaders,
      });
      setActiveTab('response');

      addCallLog({
        endpointId: '',
        endpointName: 'Quick Send',
        collectionId: '',
        url: resolved,
        method,
        statusCode: res.status,
        responseTime: elapsed,
        responseSize: resBody.length,
        success: res.status >= 200 && res.status < 400,
        timestamp: Date.now(),
        responseBody: resBody.slice(0, 50000),
      });
    } catch (err: any) {
      const elapsed = Date.now() - start;
      setError(err.message || 'Request failed');
      addCallLog({
        endpointId: '',
        endpointName: 'Quick Send',
        collectionId: '',
        url: resolved,
        method,
        statusCode: 0,
        responseTime: elapsed,
        responseSize: 0,
        success: false,
        timestamp: Date.now(),
        errorMessage: err.message,
      });
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!response) return;
    const summary = `${method} ${url}\nStatus: ${response.status} ${response.statusText}\nTime: ${response.time}ms\nSize: ${(response.size / 1024).toFixed(1)}KB\n\n${response.body.slice(0, 2000)}`;
    await Share.share({ message: summary, title: 'Quick Send Result' });
  };

  const isSuccess = response && response.status >= 200 && response.status < 400;

  return (
    <>
      <Stack.Screen options={{ title: t('quickSend') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Method Selection */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('method')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[
                      styles.methodChip,
                      { backgroundColor: method === m ? METHOD_COLORS[m] + '25' : colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        { color: method === m ? METHOD_COLORS[m] : colors.textSecondary },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* URL Input */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>URL</Text>
            <View style={styles.urlRow}>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.background, color: colors.text }]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://api.example.com/endpoint"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          </View>

          {/* Tabs: Headers / Body */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('headers')}
              style={[styles.tab, activeTab === 'headers' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'headers' ? colors.primary : colors.textSecondary }]}>
                {t('headers')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('body')}
              style={[styles.tab, activeTab === 'body' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'body' ? colors.primary : colors.textSecondary }]}>
                {t('body')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('response')}
              style={[styles.tab, activeTab === 'response' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'response' ? colors.primary : colors.textSecondary }]}>
                {t('response')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'headers' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                Key: Value (one per line)
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                value={headersText}
                onChangeText={setHeadersText}
                placeholder={'Content-Type: application/json\nAuthorization: Bearer token'}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {activeTab === 'body' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, minHeight: 150 }]}
                value={bodyText}
                onChangeText={setBodyText}
                placeholder={'{\n  "key": "value"\n}'}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {activeTab === 'response' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {!response && !error && !loading && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="send-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t('sendRequest')}
                  </Text>
                </View>
              )}
              {error && (
                <View style={[styles.errorBox, { backgroundColor: '#FF696112' }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF6961" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {response && (
                <>
                  {/* Status Bar */}
                  <View style={[styles.statusBar, { backgroundColor: isSuccess ? '#3FB95012' : '#FF696112' }]}>
                    <Text style={[styles.statusCode, { color: isSuccess ? '#3FB950' : '#FF6961' }]}>
                      {response.status} {response.statusText}
                    </Text>
                    <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
                      {response.time}ms  ·  {(response.size / 1024).toFixed(1)}KB
                    </Text>
                    <TouchableOpacity onPress={handleShare}>
                      <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Response Headers */}
                  {Object.keys(response.headers).length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{t('headers')}</Text>
                      {Object.entries(response.headers).map(([k, v]) => (
                        <Text key={k} style={[styles.headerLine, { color: colors.textTertiary }]}>
                          <Text style={{ color: colors.primary }}>{k}</Text>: {v}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Response Body */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{t('body')}</Text>
                    <View style={[styles.bodyBox, { backgroundColor: colors.background }]}>
                      {(() => {
                        try {
                          JSON.parse(response.body);
                          return <JsonHighlight json={response.body} colors={colors} />;
                        } catch {
                          return (
                            <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace' }} selectable>
                              {response.body.slice(0, 10000)}
                            </Text>
                          );
                        }
                      })()}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Send Button */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: url.trim() ? 1 : 0.4 }]}
            onPress={handleSend}
            disabled={!url.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                <Text style={styles.sendText}>{t('send')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  subLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 8 },

  methodRow: { flexDirection: 'row', gap: 6 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  methodText: { fontSize: 12, fontWeight: '700' },

  urlRow: { flexDirection: 'row', gap: 8 },
  urlInput: { flex: 1, fontSize: 14, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },

  tabRow: { flexDirection: 'row', marginBottom: 12, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },

  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 100 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  errorText: { color: '#FF6961', fontSize: 13, fontWeight: '600', flex: 1 },

  statusBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, gap: 8 },
  statusCode: { fontSize: 15, fontWeight: '700' },
  statusMeta: { fontSize: 13, flex: 1 },

  headerLine: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },

  bodyBox: { borderRadius: 10, padding: 12, maxHeight: 400 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 40 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  sendText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
