import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useLanguageStore } from '../../stores/languageStore';
import { METHOD_COLORS, getStatusColor } from '../../types/api';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import JsonHighlight from '../../components/JsonHighlight';

export default function LogDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const callLogs = useApiStore((s) => s.callLogs);
  const t = useLanguageStore((s) => s.t);

  const log = callLogs.find((l) => l.id === id);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('response');

  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;

  const formatJson = (text: string): string => {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  if (!log) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>{t('logNotFound')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: log.endpointName || log.url }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { maxWidth: 800, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
        >
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] + '20' }]}>
              <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>{log.method}</Text>
            </View>
            {log.statusCode > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.statusCode) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(log.statusCode) }]}>{log.statusCode}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {log.responseTime}ms · {(log.responseSize / 1024).toFixed(1)}KB
            </Text>
          </View>

          {/* URL */}
          <TouchableOpacity
            style={[styles.urlCard, { backgroundColor: inputBg }]}
            onPress={() => copyText(log.url)}
          >
            <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={3}>{log.url}</Text>
            <MaterialCommunityIcons name="content-copy" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Info Row */}
          <View style={[styles.infoRow, { backgroundColor: inputBg }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('status')}</Text>
              <Text style={[styles.infoValue, { color: log.success ? '#3FB950' : '#FF6961' }]}>
                {log.success ? t('successful') : t('failed')}
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('responseTimeLabel')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{log.responseTime}ms</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('size')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{(log.responseSize / 1024).toFixed(1)}KB</Text>
            </View>
          </View>

          {/* Timestamp */}
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {new Date(log.timestamp).toLocaleString()}
          </Text>

          {/* Error */}
          {log.errorMessage && (
            <View style={[styles.errorCard, { backgroundColor: '#FF696118' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF6961" />
              <Text style={[styles.errorText, { color: '#FF6961' }]}>{log.errorMessage}</Text>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabBar}>
            {(['request', 'response'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                  {tab === 'request' ? t('request') : t('response')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Request Tab */}
          {activeTab === 'request' && (
            <View style={{ gap: 12 }}>
              {log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('headers')}</Text>
                  <View style={[styles.codeCard, { backgroundColor: inputBg }]}>
                    {Object.entries(log.requestHeaders).map(([k, v]) => (
                      <View key={k} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.headerKey, { color: colors.primary }]}>{k}</Text>
                        <Text style={[styles.headerVal, { color: colors.text }]} numberOfLines={2}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {log.requestBody ? (
                <View>
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('body')}</Text>
                    <TouchableOpacity onPress={() => copyText(log.requestBody!)}>
                      <MaterialCommunityIcons name="content-copy" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Text style={[styles.codeText, { backgroundColor: inputBg, color: colors.text }]} selectable>
                      {formatJson(log.requestBody)}
                    </Text>
                  </ScrollView>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: inputBg }]}>
                  <Text style={{ color: colors.textTertiary }}>{t('noRequestBody')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Response Tab */}
          {activeTab === 'response' && (
            <View style={{ gap: 12 }}>
              {log.responseHeaders && Object.keys(log.responseHeaders).length > 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('headers')}</Text>
                  <View style={[styles.codeCard, { backgroundColor: inputBg }]}>
                    {Object.entries(log.responseHeaders).map(([k, v]) => (
                      <View key={k} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.headerKey, { color: colors.primary }]}>{k}</Text>
                        <Text style={[styles.headerVal, { color: colors.text }]} numberOfLines={2}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {log.responseBody ? (
                <View>
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('body')}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => {
                        Share.share({ message: log.responseBody!, title: log.endpointName });
                      }}>
                        <MaterialCommunityIcons name="share-variant" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => copyText(log.responseBody!)}>
                        <MaterialCommunityIcons name="content-copy" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.codeText, { backgroundColor: inputBg }]}>
                    {(() => {
                      try { JSON.parse(log.responseBody!); return <JsonHighlight json={log.responseBody!} colors={colors} />; } catch {
                        return <Text style={{ color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18 }} selectable>{formatJson(log.responseBody!)}</Text>;
                      }
                    })()}
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: inputBg }]}>
                  <Text style={{ color: colors.textTertiary }}>{t('noResponseBody')}</Text>
                </View>
              )}
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
  scroll: { paddingTop: 12, paddingBottom: 20 },

  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  methodBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  methodText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 13 },

  urlCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  urlText: { flex: 1, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  infoRow: { flexDirection: 'row', borderRadius: 12, padding: 14, marginBottom: 8 },
  infoItem: { flex: 1, alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '700' },
  infoDivider: { width: 1, height: '100%' },

  timestamp: { fontSize: 12, textAlign: 'center', marginBottom: 12 },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },

  tabBar: { flexDirection: 'row', gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#38383A40', marginBottom: 12 },
  tab: { paddingBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  codeCard: { borderRadius: 12, padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerKey: { fontSize: 12, fontWeight: '600', minWidth: 80 },
  headerVal: { fontSize: 12, flex: 1 },

  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, lineHeight: 18, padding: 14, borderRadius: 12, minWidth: '100%',
  },

  emptyCard: { borderRadius: 12, padding: 30, alignItems: 'center' },
});
