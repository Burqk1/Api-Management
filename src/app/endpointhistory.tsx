import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useHistoryStore } from '../stores/historyStore';
import { EndpointVersion, METHOD_COLORS } from '../types/api';

export default function EndpointHistoryScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const { endpointId } = useLocalSearchParams<{ endpointId: string }>();

  const endpoints = useApiStore((s) => s.endpoints);
  const updateEndpoint = useApiStore((s) => s.updateEndpoint);
  const allVersions = useHistoryStore((s) => s.versions);
  const versions = useMemo(
    () => allVersions.filter((v) => v.endpointId === (endpointId || '')).sort((a, b) => b.timestamp - a.timestamp),
    [allVersions, endpointId]
  );
  const deleteVersion = useHistoryStore((s) => s.deleteVersion);
  const clearEndpointHistory = useHistoryStore((s) => s.clearEndpointHistory);

  const endpoint = endpoints.find((e) => e.id === endpointId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffId, setDiffId] = useState<string | null>(null);

  const cardBg = isDark ? colors.surface : colors.card;

  const restoreVersion = (version: EndpointVersion) => {
    if (!endpoint) return;
    Alert.alert(t('restoreVersion'), t('restoreVersionConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('restore'),
        onPress: () => {
          updateEndpoint(endpoint.id, {
            ...version.snapshot,
            updatedAt: Date.now(),
          });
          router.back();
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert(t('clearHistory'), t('clearHistoryConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clear'), style: 'destructive', onPress: () => clearEndpointHistory(endpointId || '') },
    ]);
  };

  const getDiff = (v: EndpointVersion): { field: string; old: string; new: string }[] => {
    if (!endpoint) return [];
    const diffs: { field: string; old: string; new: string }[] = [];
    const snap = v.snapshot;

    if (snap.url !== endpoint.url) diffs.push({ field: 'URL', old: snap.url, new: endpoint.url });
    if (snap.method !== endpoint.method) diffs.push({ field: 'Method', old: snap.method, new: endpoint.method });
    if (snap.body !== endpoint.body) diffs.push({ field: 'Body', old: snap.body || '(empty)', new: endpoint.body || '(empty)' });
    if (snap.name !== endpoint.name) diffs.push({ field: 'Name', old: snap.name, new: endpoint.name });
    if (JSON.stringify(snap.headers) !== JSON.stringify(endpoint.headers)) diffs.push({ field: 'Headers', old: `${snap.headers.length} headers`, new: `${endpoint.headers.length} headers` });
    if (JSON.stringify(snap.assertions) !== JSON.stringify(endpoint.assertions)) diffs.push({ field: 'Assertions', old: `${snap.assertions.length} assertions`, new: `${endpoint.assertions.length} assertions` });
    if (snap.preRequestScript !== endpoint.preRequestScript) diffs.push({ field: 'Pre-Request', old: snap.preRequestScript ? 'Set' : 'None', new: endpoint.preRequestScript ? 'Set' : 'None' });
    if (snap.postRequestScript !== endpoint.postRequestScript) diffs.push({ field: 'Post-Request', old: snap.postRequestScript ? 'Set' : 'None', new: endpoint.postRequestScript ? 'Set' : 'None' });

    return diffs;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('mAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('hAgo')}`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      <Stack.Screen options={{ title: t('endpointHistory') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Current Endpoint */}
          {endpoint && (
            <View style={[styles.currentCard, { backgroundColor: cardBg }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 }}>{t('currentVersion')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[endpoint.method] || '#8B949E') + '20' }]}>
                  <Text style={{ color: METHOD_COLORS[endpoint.method] || '#8B949E', fontSize: 11, fontWeight: '800' }}>{endpoint.method}</Text>
                </View>
                <Text style={[styles.epName, { color: colors.text }]} numberOfLines={1}>{endpoint.name}</Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4, fontFamily: 'monospace' }} numberOfLines={1}>{endpoint.url}</Text>
            </View>
          )}

          {/* History Header */}
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('versionHistory')}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{versions.length} {t('versions')}</Text>
            {versions.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory} style={{ marginLeft: 'auto' }}>
                <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Timeline */}
          {versions.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="history" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>{t('noVersionHistory')}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{t('noVersionHistoryHint')}</Text>
            </View>
          )}

          {versions.map((v, i) => (
            <View key={v.id} style={styles.timelineItem}>
              {/* Timeline line */}
              <View style={styles.timelineLine}>
                <View style={[styles.timelineDot, { backgroundColor: i === 0 ? colors.primary : colors.textTertiary }]} />
                {i < versions.length - 1 && <View style={[styles.timelineConnector, { backgroundColor: colors.divider }]} />}
              </View>

              {/* Version Card */}
              <TouchableOpacity
                style={[styles.versionCard, { backgroundColor: cardBg }]}
                onPress={() => setExpandedId(expandedId === v.id ? null : v.id)}
                activeOpacity={0.7}
              >
                <View style={styles.versionHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[v.snapshot.method] || '#8B949E') + '20' }]}>
                        <Text style={{ color: METHOD_COLORS[v.snapshot.method] || '#8B949E', fontSize: 10, fontWeight: '800' }}>{v.snapshot.method}</Text>
                      </View>
                      <Text style={[styles.versionName, { color: colors.text }]} numberOfLines={1}>{v.snapshot.name}</Text>
                    </View>
                    <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>{timeAgo(v.timestamp)}</Text>
                  </View>
                  {v.label && (
                    <View style={[styles.labelBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{v.label}</Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name={expandedId === v.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </View>

                {/* Expanded Details */}
                {expandedId === v.id && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={2}>{v.snapshot.url}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 6 }}>{formatDate(v.timestamp)}</Text>

                    {/* Diff from current */}
                    <TouchableOpacity
                      style={[styles.diffBtn, { backgroundColor: isDark ? colors.systemGray5 : '#F2F2F7' }]}
                      onPress={() => setDiffId(diffId === v.id ? null : v.id)}
                    >
                      <MaterialCommunityIcons name="compare" size={14} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {diffId === v.id ? t('hideDiff') : t('showDiff')}
                      </Text>
                    </TouchableOpacity>

                    {diffId === v.id && (
                      <View style={styles.diffContainer}>
                        {getDiff(v).length === 0 ? (
                          <Text style={{ color: colors.textTertiary, fontSize: 12, fontStyle: 'italic' }}>{t('noChanges')}</Text>
                        ) : (
                          getDiff(v).map((d, di) => (
                            <View key={di} style={styles.diffRow}>
                              <Text style={[styles.diffField, { color: colors.textSecondary }]}>{d.field}</Text>
                              <View style={styles.diffValues}>
                                <Text style={styles.diffOld} numberOfLines={1}>{d.old}</Text>
                                <MaterialCommunityIcons name="arrow-right" size={12} color={colors.textTertiary} />
                                <Text style={styles.diffNew} numberOfLines={1}>{d.new}</Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                        onPress={() => restoreVersion(v)}
                      >
                        <MaterialCommunityIcons name="restore" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{t('restore')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FF696115' }]}
                        onPress={() => deleteVersion(v.id)}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={14} color="#FF6961" />
                        <Text style={{ color: '#FF6961', fontSize: 12, fontWeight: '600' }}>{t('delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  currentCard: { borderRadius: 14, padding: 14, marginBottom: 16 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  epName: { fontSize: 15, fontWeight: '700', flex: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineLine: { alignItems: 'center', width: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 14 },
  timelineConnector: { width: 2, flex: 1, marginTop: 4 },
  versionCard: { flex: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  versionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionName: { fontSize: 14, fontWeight: '600', flex: 1 },
  labelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  diffContainer: { marginTop: 8, gap: 6 },
  diffRow: { gap: 2 },
  diffField: { fontSize: 11, fontWeight: '700' },
  diffValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diffOld: { fontSize: 11, color: '#FF6961', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', maxWidth: '40%' },
  diffNew: { fontSize: 11, color: '#3FB950', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', maxWidth: '40%' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
