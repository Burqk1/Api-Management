import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

const METHOD_COLORS: Record<string, string> = {
  GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', DELETE: '#FF6961',
  PATCH: '#BC8CFF', HEAD: '#64D2FF', OPTIONS: '#8B949E',
};

type ExportFormat = 'json' | 'text' | 'csv' | 'har';

export default function ResponseDownloadScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const callLogs = useApiStore((s) => s.callLogs);

  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [exported, setExported] = useState<string | null>(null);

  const toggleLog = (id: string) => {
    setSelectedLogs((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (selectedLogs.length === callLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(callLogs.map((l) => l.id));
    }
  };

  const getStatusColor = (s: number) => (s >= 200 && s < 300 ? '#3FB950' : s >= 400 ? '#FF6961' : '#FFD60A');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const exportData = () => {
    if (selectedLogs.length === 0) return Alert.alert('Error', 'Select at least one response');
    const logs = callLogs.filter((l) => selectedLogs.includes(l.id));
    let output = '';

    switch (format) {
      case 'json':
        output = JSON.stringify(logs.map((l) => ({
          method: l.method,
          url: l.url,
          statusCode: l.statusCode,
          responseTime: l.responseTime,
          responseSize: l.responseSize,
          timestamp: new Date(l.timestamp).toISOString(),
          responseBody: l.responseBody,
        })), null, 2);
        break;

      case 'text':
        output = logs.map((l) =>
          `--- ${l.method} ${l.url} ---\nStatus: ${l.statusCode}\nTime: ${l.responseTime}ms\nSize: ${l.responseSize || 0} bytes\nDate: ${new Date(l.timestamp).toISOString()}\n\n${l.responseBody || '(no body)'}`
        ).join('\n\n========\n\n');
        break;

      case 'csv':
        output = 'Method,URL,Status,Time(ms),Size(bytes),Timestamp\n' +
          logs.map((l) =>
            `${l.method},"${l.url}",${l.statusCode},${l.responseTime},${l.responseSize || 0},${new Date(l.timestamp).toISOString()}`
          ).join('\n');
        break;

      case 'har':
        const har = {
          log: {
            version: '1.2',
            creator: { name: 'Fetchlab', version: '1.0.0' },
            entries: logs.map((l) => ({
              startedDateTime: new Date(l.timestamp).toISOString(),
              time: l.responseTime,
              request: { method: l.method, url: l.url, httpVersion: 'HTTP/1.1', headers: [], queryString: [], cookies: [], headersSize: -1, bodySize: -1 },
              response: { status: l.statusCode, statusText: '', httpVersion: 'HTTP/1.1', headers: [], cookies: [], content: { size: l.responseSize || 0, mimeType: 'application/json', text: l.responseBody || '' }, redirectURL: '', headersSize: -1, bodySize: l.responseSize || 0 },
              cache: {},
              timings: { send: 0, wait: l.responseTime, receive: 0 },
            })),
          },
        };
        output = JSON.stringify(har, null, 2);
        break;
    }

    setExported(output);
  };

  const copyToClipboard = async () => {
    if (!exported) return;
    await Clipboard.setStringAsync(exported);
    Alert.alert('Copied', `${format.toUpperCase()} data copied to clipboard (${formatSize(exported.length)})`);
  };

  const formats: { key: ExportFormat; label: string; icon: string; desc: string }[] = [
    { key: 'json', label: 'JSON', icon: 'code-json', desc: 'Structured JSON with full data' },
    { key: 'text', label: 'Text', icon: 'text-box-outline', desc: 'Human-readable plain text' },
    { key: 'csv', label: 'CSV', icon: 'file-delimited-outline', desc: 'Spreadsheet-compatible CSV' },
    { key: 'har', label: 'HAR', icon: 'web', desc: 'HTTP Archive format (DevTools)' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Response Download', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Format Selector */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Format</Text>
          <View style={styles.formatGrid}>
            {formats.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => { setFormat(f.key); setExported(null); }}
                style={[
                  styles.formatItem,
                  format === f.key && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                  format !== f.key && { backgroundColor: isDark ? colors.background : colors.systemGray5, borderColor: 'transparent' },
                ]}
              >
                <MaterialCommunityIcons name={f.icon as any} size={22} color={format === f.key ? colors.primary : colors.textSecondary} />
                <Text style={{ color: format === f.key ? colors.primary : colors.text, fontSize: 14, fontWeight: '700' }}>{f.label}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 10, textAlign: 'center' }}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Response Selector */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.selectHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Select Responses ({selectedLogs.length})
            </Text>
            <TouchableOpacity onPress={selectAll}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                {selectedLogs.length === callLogs.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {callLogs.slice(0, 30).map((log) => {
            const isSelected = selectedLogs.includes(log.id);
            return (
              <TouchableOpacity
                key={log.id}
                style={[styles.logRow, { borderBottomColor: colors.divider }]}
                onPress={() => toggleLog(log.id)}
              >
                <MaterialCommunityIcons
                  name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[log.method] || '#8B949E') + '22' }]}>
                  <Text style={{ color: METHOD_COLORS[log.method] || '#8B949E', fontSize: 9, fontWeight: '700' }}>{log.method}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {log.endpointName || log.url}
                  </Text>
                  <View style={styles.logMeta}>
                    <Text style={{ color: getStatusColor(log.statusCode), fontSize: 11, fontWeight: '600' }}>{log.statusCode}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{log.responseTime}ms</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{formatSize(log.responseSize || 0)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {callLogs.length === 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 13, paddingVertical: 16 }}>No request logs yet. Send some requests first.</Text>
          )}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={exportData}
        >
          <MaterialCommunityIcons name="download" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
            Export {selectedLogs.length} Response{selectedLogs.length !== 1 ? 's' : ''} as {format.toUpperCase()}
          </Text>
        </TouchableOpacity>

        {/* Exported Data */}
        {exported && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.exportHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Exported Data</Text>
              <View style={styles.exportActions}>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{formatSize(exported.length)}</Text>
                <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.primary + '18' }]} onPress={copyToClipboard}>
                  <MaterialCommunityIcons name="content-copy" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              horizontal
              style={[styles.preview, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
            >
              <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 11, padding: 12 }}>
                {exported.substring(0, 2000)}{exported.length > 2000 ? '\n...' : ''}
              </Text>
            </ScrollView>
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
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  formatGrid: { flexDirection: 'row', gap: 8 },
  formatItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 4, borderWidth: 2 },
  selectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  logMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  exportBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  exportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  exportActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  preview: { borderRadius: 10, maxHeight: 250 },
});
