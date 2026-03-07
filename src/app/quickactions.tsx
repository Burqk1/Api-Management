import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS, HttpMethod, getStatusColor } from '../types/api';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

type ToolId = 'json' | 'base64' | 'urlenc' | 'jwt' | 'timestamp' | 'uuid';

const QUICK_TOOLS: { id: ToolId; label: string; icon: string; color: string }[] = [
  { id: 'json', label: 'JSON Format', icon: 'code-json', color: '#D29922' },
  { id: 'base64', label: 'Base64', icon: 'lock-outline', color: '#58A6FF' },
  { id: 'urlenc', label: 'URL Encode', icon: 'link-variant', color: '#3FB950' },
  { id: 'jwt', label: 'JWT Decode', icon: 'shield-key-outline', color: '#BC8CFF' },
  { id: 'timestamp', label: 'Timestamp', icon: 'clock-outline', color: '#F778BA' },
  { id: 'uuid', label: 'UUID Gen', icon: 'identifier', color: '#FF6961' },
];

export default function QuickActionsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const callLogs = useApiStore((s) => s.callLogs);
  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [quickGetUrl, setQuickGetUrl] = useState('');
  const [quickGetResult, setQuickGetResult] = useState<{ status: number; time: number } | null>(null);
  const [statusUrl, setStatusUrl] = useState('');
  const [statusResult, setStatusResult] = useState<{ status: number; time: number } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [rerunResults, setRerunResults] = useState<Record<string, { status: number; time: number }>>({});
  const [expandedTool, setExpandedTool] = useState<ToolId | null>(null);
  const [toolInput, setToolInput] = useState('');
  const [toolOutput, setToolOutput] = useState('');
  const [encodeMode, setEncodeMode] = useState(true);

  const recentLogs = callLogs.slice(0, 5);

  const fireRequest = useCallback(async (url: string, method: string = 'GET'): Promise<{ status: number; time: number }> => {
    const start = Date.now();
    const res = await fetch(url, { method });
    return { status: res.status, time: Date.now() - start };
  }, []);

  const handleQuickGet = async () => {
    if (!quickGetUrl.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading('quickget');
    try {
      const result = await fireRequest(quickGetUrl.trim());
      setQuickGetResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { setQuickGetResult({ status: 0, time: 0 }); }
    setLoading(null);
  };

  const handleLastRequest = async () => {
    if (callLogs.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const last = callLogs[0];
    setLoading('last');
    try {
      const result = await fireRequest(last.url, last.method);
      setRerunResults((p) => ({ ...p, last: result }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { setRerunResults((p) => ({ ...p, last: { status: 0, time: 0 } })); }
    setLoading(null);
  };

  const handleStatusCheck = async () => {
    if (!statusUrl.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading('status');
    try {
      const result = await fireRequest(statusUrl.trim(), 'HEAD');
      setStatusResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { setStatusResult({ status: 0, time: 0 }); }
    setLoading(null);
  };

  const handleRerun = async (logId: string, url: string, method: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(logId);
    try {
      const result = await fireRequest(url, method);
      setRerunResults((p) => ({ ...p, [logId]: result }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { setRerunResults((p) => ({ ...p, [logId]: { status: 0, time: 0 } })); }
    setLoading(null);
  };

  const handleToolToggle = (id: ToolId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedTool === id) { setExpandedTool(null); return; }
    setExpandedTool(id);
    setToolInput('');
    setToolOutput('');
    setEncodeMode(true);
    if (id === 'timestamp') setToolOutput(`Current: ${Math.floor(Date.now() / 1000)}`);
    if (id === 'uuid') {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
      setToolOutput(uuid);
    }
  };

  const processToolInput = (text: string) => {
    setToolInput(text);
    try {
      switch (expandedTool) {
        case 'json': setToolOutput(JSON.stringify(JSON.parse(text), null, 2)); break;
        case 'base64':
          setToolOutput(encodeMode ? btoa(text) : atob(text));
          break;
        case 'urlenc':
          setToolOutput(encodeMode ? encodeURIComponent(text) : decodeURIComponent(text));
          break;
        case 'jwt': {
          const parts = text.split('.');
          if (parts.length >= 2) {
            const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            setToolOutput(`Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`);
          }
          break;
        }
        case 'timestamp': {
          const num = parseInt(text, 10);
          if (!isNaN(num)) {
            const ms = num > 1e12 ? num : num * 1000;
            setToolOutput(`${new Date(ms).toISOString()}\nCurrent: ${Math.floor(Date.now() / 1000)}`);
          }
          break;
        }
        default: break;
      }
    } catch { setToolOutput('Invalid input'); }
  };

  const copyOutput = async () => {
    if (!toolOutput) return;
    await Clipboard.setStringAsync(toolOutput);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const StatusBadge = ({ status, time }: { status: number; time: number }) => (
    <View style={[styles.badge, { backgroundColor: status >= 200 && status < 400 ? '#3FB95020' : '#FF696120' }]}>
      <Text style={{ color: getStatusColor(status || 500), fontWeight: '700', fontSize: 13 }}>
        {status || 'ERR'} - {time}ms
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('quickActions') || 'Quick Actions' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

          {/* Pinned Actions */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Pinned Actions</Text>
          <View style={styles.grid}>
            {/* Quick GET */}
            <View style={[styles.pinnedCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#3FB950" />
              <Text style={[styles.pinnedLabel, { color: colors.text }]}>Quick GET</Text>
              <TextInput
                style={[styles.miniInput, { backgroundColor: inputBg, color: colors.text }]}
                placeholder="URL..."
                placeholderTextColor={colors.textTertiary}
                value={quickGetUrl}
                onChangeText={setQuickGetUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.goBtn, { backgroundColor: '#3FB950' }]} onPress={handleQuickGet}>
                {loading === 'quickget' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.goBtnText}>GO</Text>}
              </TouchableOpacity>
              {quickGetResult && <StatusBadge status={quickGetResult.status} time={quickGetResult.time} />}
            </View>

            {/* Paste cURL */}
            <TouchableOpacity
              style={[styles.pinnedCard, { backgroundColor: cardBg }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/curlimport' as any); }}
            >
              <MaterialCommunityIcons name="console" size={24} color="#58A6FF" />
              <Text style={[styles.pinnedLabel, { color: colors.text }]}>Paste cURL</Text>
              <Text style={[styles.pinnedSub, { color: colors.textTertiary }]}>Import from clipboard</Text>
            </TouchableOpacity>

            {/* Last Request */}
            <TouchableOpacity style={[styles.pinnedCard, { backgroundColor: cardBg }]} onPress={handleLastRequest}>
              <MaterialCommunityIcons name="history" size={24} color="#D29922" />
              <Text style={[styles.pinnedLabel, { color: colors.text }]}>Last Request</Text>
              {callLogs.length > 0 ? (
                <Text style={[styles.pinnedSub, { color: colors.textTertiary }]} numberOfLines={1}>
                  {callLogs[0].method} {callLogs[0].url.slice(0, 24)}...
                </Text>
              ) : (
                <Text style={[styles.pinnedSub, { color: colors.textTertiary }]}>No history</Text>
              )}
              {loading === 'last' && <ActivityIndicator size="small" color="#D29922" />}
              {rerunResults.last && <StatusBadge status={rerunResults.last.status} time={rerunResults.last.time} />}
            </TouchableOpacity>

            {/* Status Check */}
            <View style={[styles.pinnedCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#F778BA" />
              <Text style={[styles.pinnedLabel, { color: colors.text }]}>Status Check</Text>
              <TextInput
                style={[styles.miniInput, { backgroundColor: inputBg, color: colors.text }]}
                placeholder="URL..."
                placeholderTextColor={colors.textTertiary}
                value={statusUrl}
                onChangeText={setStatusUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.goBtn, { backgroundColor: '#F778BA' }]} onPress={handleStatusCheck}>
                {loading === 'status' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.goBtnText}>CHECK</Text>}
              </TouchableOpacity>
              {statusResult && <StatusBadge status={statusResult.status} time={statusResult.time} />}
            </View>
          </View>

          {/* Recent Endpoints */}
          {recentLogs.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Recent Endpoints</Text>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                {recentLogs.map((log, i) => {
                  const methodColor = METHOD_COLORS[log.method as keyof typeof METHOD_COLORS] || '#8B949E';
                  const result = rerunResults[log.id];
                  return (
                    <TouchableOpacity
                      key={log.id}
                      style={[styles.logRow, i < recentLogs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                      onPress={() => handleRerun(log.id, log.url, log.method)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.methodBadge, { backgroundColor: methodColor + '20' }]}>
                        <Text style={[styles.methodText, { color: methodColor }]}>{log.method}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{log.endpointName || 'Unnamed'}</Text>
                        <Text style={[styles.logUrl, { color: colors.textTertiary }]} numberOfLines={1}>{log.url}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {loading === log.id ? (
                          <ActivityIndicator size="small" color={methodColor} />
                        ) : result ? (
                          <StatusBadge status={result.status} time={result.time} />
                        ) : (
                          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{log.responseTime}ms</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Quick Tools */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Quick Tools</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {QUICK_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[styles.toolChip, { backgroundColor: expandedTool === tool.id ? tool.color : cardBg, borderColor: tool.color }]}
                onPress={() => handleToolToggle(tool.id)}
              >
                <MaterialCommunityIcons name={tool.icon as any} size={16} color={expandedTool === tool.id ? '#fff' : tool.color} />
                <Text style={{ color: expandedTool === tool.id ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {expandedTool && (
            <View style={[styles.toolCard, { backgroundColor: cardBg }]}>
              {(expandedTool === 'base64' || expandedTool === 'urlenc') && (
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, encodeMode && { backgroundColor: colors.primary }]}
                    onPress={() => { setEncodeMode(true); setToolInput(''); setToolOutput(''); }}
                  >
                    <Text style={{ color: encodeMode ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Encode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !encodeMode && { backgroundColor: colors.primary }]}
                    onPress={() => { setEncodeMode(false); setToolInput(''); setToolOutput(''); }}
                  >
                    <Text style={{ color: !encodeMode ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Decode</Text>
                  </TouchableOpacity>
                </View>
              )}
              {expandedTool === 'uuid' ? (
                <View style={{ gap: 10 }}>
                  <Text style={[styles.outputText, { color: colors.text }]}>{toolOutput}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.goBtn, { backgroundColor: '#FF6961', flex: 1 }]} onPress={() => {
                      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = (Math.random() * 16) | 0;
                        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
                      });
                      setToolOutput(uuid);
                    }}>
                      <Text style={styles.goBtnText}>Generate New</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.goBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={copyOutput}>
                      <Text style={styles.goBtnText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <TextInput
                    style={[styles.toolInput, { backgroundColor: inputBg, color: colors.text }]}
                    placeholder={expandedTool === 'jwt' ? 'Paste JWT...' : expandedTool === 'timestamp' ? 'Enter timestamp...' : 'Paste input...'}
                    placeholderTextColor={colors.textTertiary}
                    value={toolInput}
                    onChangeText={processToolInput}
                    multiline
                    textAlignVertical="top"
                  />
                  {toolOutput.length > 0 && (
                    <>
                      <Text style={[styles.outputText, { color: colors.text }]}>{toolOutput}</Text>
                      <TouchableOpacity style={[styles.goBtn, { backgroundColor: colors.primary, alignSelf: 'flex-end' }]} onPress={copyOutput}>
                        <Text style={styles.goBtnText}>Copy</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pinnedCard: {
    width: '47%' as any,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    flexGrow: 1,
  },
  pinnedLabel: { fontSize: 15, fontWeight: '700' },
  pinnedSub: { fontSize: 12 },
  miniInput: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 4, fontSize: 12 },
  goBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  methodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  methodText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  logName: { fontSize: 14, fontWeight: '600' },
  logUrl: { fontSize: 11, marginTop: 2 },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  toolCard: { borderRadius: 14, padding: 16, gap: 12 },
  toolInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 60,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  outputText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
});
