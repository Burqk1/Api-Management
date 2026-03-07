import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';
import { generateId } from '../types/api';

interface WebhookEntry {
  id: string;
  timestamp: number;
  method: string;
  headers: Record<string, string>;
  body: string;
}

const METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as const;
const METHOD_COLORS: Record<string, string> = {
  GET: '#61AFFE',
  POST: '#49CC90',
  PUT: '#FCA130',
  PATCH: '#50E3C2',
  DELETE: '#F93E3E',
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function WebhookScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [webhookId] = useState(() => generateUUID());
  const webhookUrl = `https://webhook.devtoolbox.app/${webhookId}`;

  const [entries, setEntries] = useState<WebhookEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Manual entry fields
  const [showManual, setShowManual] = useState(false);
  const [manualMethod, setManualMethod] = useState<string>('POST');
  const [manualBody, setManualBody] = useState('{"event": "user.created", "data": {"id": 1}}');
  const [manualHeaders, setManualHeaders] = useState('{"Content-Type": "application/json"}');

  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const copyUrl = async () => {
    await Clipboard.setStringAsync(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addEntry = (method: string, body: string, headers: Record<string, string>) => {
    const entry: WebhookEntry = {
      id: generateId(),
      timestamp: Date.now(),
      method,
      headers,
      body,
    };
    setEntries((prev) => [entry, ...prev]);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  const sendTestWebhook = () => {
    addEntry('POST', JSON.stringify({
      event: 'test.webhook',
      timestamp: new Date().toISOString(),
      data: { id: Math.floor(Math.random() * 1000), status: 'active' },
    }, null, 2), {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhookId,
      'X-Request-Id': generateUUID().slice(0, 8),
      'User-Agent': 'DevToolbox/1.0',
    });
  };

  const addManualEntry = () => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(manualHeaders); } catch { /* keep empty */ }
    addEntry(manualMethod, manualBody, parsedHeaders);
    setShowManual(false);
  };

  const toggleHeaderExpand = (id: string) => {
    setExpandedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Auto-refresh simulation
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        const methods = ['POST', 'PUT', 'PATCH'];
        const m = methods[Math.floor(Math.random() * methods.length)];
        addEntry(m, JSON.stringify({
          event: 'auto.simulated',
          timestamp: new Date().toISOString(),
          payload: { value: Math.floor(Math.random() * 100) },
        }, null, 2), {
          'Content-Type': 'application/json',
          'X-Webhook-Id': webhookId,
        });
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, webhookId]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const formatBody = (body: string) => {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Webhook Testing' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Webhook URL Card */}
          <View style={[styles.urlCard, { backgroundColor: cardBg, marginTop: 12 }]}>
            <View style={styles.urlHeader}>
              <MaterialCommunityIcons name="webhook" size={20} color={colors.primary} />
              <Text style={[styles.urlLabel, { color: colors.text }]}>Webhook URL</Text>
            </View>
            <Text
              style={[styles.urlText, { color: colors.textSecondary, backgroundColor: inputBg }]}
              selectable
              numberOfLines={2}
            >
              {webhookUrl}
            </Text>
            <View style={styles.urlActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={copyUrl}
              >
                <MaterialCommunityIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.actionBtnText}>{copied ? 'Copied!' : 'Copy URL'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#49CC90' }]}
                onPress={sendTestWebhook}
              >
                <MaterialCommunityIcons name="send" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Send Test</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: cardBg }]}
              onPress={() => setShowManual(!showManual)}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.controlBtnText, { color: colors.text }]}>Manual Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: cardBg }]}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <MaterialCommunityIcons
                name={autoRefresh ? 'toggle-switch' : 'toggle-switch-off'}
                size={22}
                color={autoRefresh ? colors.primary : colors.textTertiary}
              />
              <Text style={[styles.controlBtnText, { color: colors.text }]}>Auto-Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: entries.length > 0 ? '#FF696120' : cardBg }]}
              onPress={() => setEntries([])}
              disabled={entries.length === 0}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={entries.length > 0 ? '#FF6961' : colors.textTertiary}
              />
              <Text style={[styles.controlBtnText, { color: entries.length > 0 ? '#FF6961' : colors.textTertiary }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manual Entry Form */}
          {showManual && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Add Manual Webhook</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setManualMethod(m)}
                      style={[styles.methodChip, {
                        backgroundColor: manualMethod === m ? (METHOD_COLORS[m] || colors.primary) + '30' : inputBg,
                      }]}
                    >
                      <Text style={[styles.methodChipText, {
                        color: manualMethod === m ? METHOD_COLORS[m] || colors.primary : colors.textSecondary,
                      }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                style={[styles.formInput, { backgroundColor: inputBg, color: colors.text }]}
                value={manualHeaders}
                onChangeText={setManualHeaders}
                placeholder='{"Content-Type": "application/json"}'
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <TextInput
                style={[styles.formBodyInput, { backgroundColor: inputBg, color: colors.text }]}
                value={manualBody}
                onChangeText={setManualBody}
                placeholder='{"key": "value"}'
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.systemGray5, flex: 1 }]}
                  onPress={() => setShowManual(false)}
                >
                  <Text style={[styles.formBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={addManualEntry}
                >
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>Add Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: autoRefresh ? '#3FB950' : '#8B949E' }]} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {autoRefresh ? 'Listening...' : 'Idle'}
            </Text>
            <Text style={[styles.statusCount, { color: colors.textTertiary }]}>
              {entries.length} received
            </Text>
          </View>

          {/* Empty State */}
          {entries.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="webhook" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No webhooks received yet.{'\n'}Send a test or enable auto-refresh.
              </Text>
            </View>
          )}

          {/* Webhook Entries */}
          {entries.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, { backgroundColor: cardBg }]}>
              <View style={styles.entryHeader}>
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[entry.method] || '#8B949E') + '20' }]}>
                  <Text style={[styles.methodBadgeText, { color: METHOD_COLORS[entry.method] || '#8B949E' }]}>
                    {entry.method}
                  </Text>
                </View>
                <Text style={[styles.entryTime, { color: colors.textTertiary }]}>{formatTime(entry.timestamp)}</Text>
              </View>

              {/* Headers (expandable) */}
              <TouchableOpacity
                style={styles.headerToggle}
                onPress={() => toggleHeaderExpand(entry.id)}
              >
                <MaterialCommunityIcons
                  name={expandedHeaders.has(entry.id) ? 'chevron-down' : 'chevron-right'}
                  size={16}
                  color={colors.textTertiary}
                />
                <Text style={[styles.headerToggleText, { color: colors.textSecondary }]}>
                  Headers ({Object.keys(entry.headers).length})
                </Text>
              </TouchableOpacity>
              {expandedHeaders.has(entry.id) && (
                <View style={[styles.headersBlock, { backgroundColor: inputBg }]}>
                  {Object.entries(entry.headers).map(([key, val]) => (
                    <Text key={key} style={[styles.headerLine, { color: colors.text }]} selectable>
                      <Text style={{ color: colors.primary, fontWeight: '600' }}>{key}</Text>: {val}
                    </Text>
                  ))}
                </View>
              )}

              {/* Body */}
              <View style={[styles.bodyBlock, { backgroundColor: inputBg }]}>
                <Text style={[styles.bodyText, { color: colors.text }]} selectable>
                  {formatBody(entry.body)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  urlCard: { borderRadius: 14, padding: 16, gap: 10 },
  urlHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urlLabel: { fontSize: 16, fontWeight: '700' },
  urlText: {
    fontSize: 12, borderRadius: 8, padding: 10, letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  urlActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flex: 1, justifyContent: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  controlsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flex: 1, justifyContent: 'center' },
  controlBtnText: { fontSize: 11, fontWeight: '600' },

  formCard: { borderRadius: 14, padding: 14, gap: 8, marginTop: 12 },
  formTitle: { fontSize: 15, fontWeight: '700' },
  methodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  methodChipText: { fontSize: 12, fontWeight: '700' },
  formInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  formBodyInput: {
    borderRadius: 10, padding: 12, minHeight: 80, fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18,
  },
  formBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  formBtnText: { fontSize: 15, fontWeight: '600' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  statusCount: { fontSize: 12, marginLeft: 'auto' },

  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  entryCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  methodBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  methodBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  entryTime: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  headerToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  headerToggleText: { fontSize: 12, fontWeight: '600' },
  headersBlock: { borderRadius: 8, padding: 10, marginBottom: 8 },
  headerLine: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },

  bodyBlock: { borderRadius: 8, padding: 10 },
  bodyText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },
});
