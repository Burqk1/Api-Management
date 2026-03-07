import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useHistoryStore } from '../stores/historyStore';

interface ChangeEntry {
  id: string;
  endpointId: string;
  endpointName: string;
  collectionName: string;
  changeType: 'created' | 'modified' | 'deleted' | 'method_changed' | 'url_changed' | 'headers_changed' | 'body_changed' | 'auth_changed';
  description: string;
  timestamp: number;
  details?: { field: string; from: string; to: string }[];
}

const CHANGE_ICONS: Record<string, { icon: string; color: string }> = {
  created: { icon: 'plus-circle', color: '#3FB950' },
  modified: { icon: 'pencil-circle', color: '#58A6FF' },
  deleted: { icon: 'minus-circle', color: '#FF6961' },
  method_changed: { icon: 'swap-horizontal-circle', color: '#D29922' },
  url_changed: { icon: 'link-variant', color: '#BC8CFF' },
  headers_changed: { icon: 'format-header-3', color: '#FF9500' },
  body_changed: { icon: 'code-json', color: '#64D2FF' },
  auth_changed: { icon: 'shield-outline', color: '#F778BA' },
};

export default function ChangelogScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const endpoints = useApiStore((s) => s.endpoints);
  const collections = useApiStore((s) => s.collections);
  const versions = useHistoryStore((s) => s.versions);
  const callLogs = useApiStore((s) => s.callLogs);

  const cardBg = isDark ? colors.surface : colors.card;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Build changelog from version history and call logs
  const changelog = useMemo(() => {
    const changes: ChangeEntry[] = [];

    // From version history - detect changes
    for (const version of versions) {
      const ep = endpoints.find((e) => e.id === version.endpointId);
      const col = collections.find((c) => c.id === ep?.collectionId);

      const details: { field: string; from: string; to: string }[] = [];
      let changeType: ChangeEntry['changeType'] = 'modified';

      if (ep) {
        if (version.snapshot.method !== ep.method) {
          changeType = 'method_changed';
          details.push({ field: 'Method', from: version.snapshot.method, to: ep.method });
        }
        if (version.snapshot.url !== ep.url) {
          changeType = 'url_changed';
          details.push({ field: 'URL', from: version.snapshot.url.slice(0, 60), to: ep.url.slice(0, 60) });
        }
        const oldHeaders = (version.snapshot.headers || []).length;
        const newHeaders = ep.headers.length;
        if (oldHeaders !== newHeaders) {
          changeType = details.length === 0 ? 'headers_changed' : changeType;
          details.push({ field: 'Headers', from: `${oldHeaders} headers`, to: `${newHeaders} headers` });
        }
        if (version.snapshot.body !== ep.body) {
          changeType = details.length === 0 ? 'body_changed' : changeType;
          details.push({ field: 'Body', from: 'Changed', to: 'Updated' });
        }
        if (JSON.stringify(version.snapshot.auth) !== JSON.stringify(ep.auth)) {
          changeType = details.length === 0 ? 'auth_changed' : changeType;
          details.push({ field: 'Auth', from: version.snapshot.auth?.type || 'none', to: ep.auth?.type || 'none' });
        }
      }

      if (details.length > 0) {
        changes.push({
          id: version.id,
          endpointId: version.endpointId,
          endpointName: version.snapshot.name || ep?.name || 'Unknown',
          collectionName: col?.name || 'Unknown',
          changeType,
          description: details.map((d) => `${d.field}: ${d.from} → ${d.to}`).join(', '),
          timestamp: version.timestamp,
          details,
        });
      }
    }

    // From endpoints creation (sorted by createdAt)
    for (const ep of endpoints) {
      const col = collections.find((c) => c.id === ep.collectionId);
      changes.push({
        id: `created-${ep.id}`,
        endpointId: ep.id,
        endpointName: ep.name,
        collectionName: col?.name || 'Unknown',
        changeType: 'created',
        description: `${ep.method} ${ep.url}`,
        timestamp: ep.createdAt,
      });
    }

    // Sort by timestamp descending
    return changes.sort((a, b) => b.timestamp - a.timestamp);
  }, [versions, endpoints, collections]);

  const filteredChanges = filterType ? changelog.filter((c) => c.changeType === filterType) : changelog;

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; items: ChangeEntry[] }[] = [];
    for (const change of filteredChanges) {
      const date = new Date(change.timestamp).toLocaleDateString();
      const existing = groups.find((g) => g.date === date);
      if (existing) existing.items.push(change);
      else groups.push({ date, items: [change] });
    }
    return groups;
  }, [filteredChanges]);

  const filterTypes = [
    { key: null, label: 'All' },
    { key: 'created', label: 'Created' },
    { key: 'modified', label: 'Modified' },
    { key: 'method_changed', label: 'Method' },
    { key: 'url_changed', label: 'URL' },
    { key: 'headers_changed', label: 'Headers' },
    { key: 'body_changed', label: 'Body' },
    { key: 'auth_changed', label: 'Auth' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t('apiChangelog') || 'API Changelog' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={[styles.statCard, { backgroundColor: '#3FB95012', flex: 1 }]}>
              <Text style={{ color: '#3FB950', fontSize: 22, fontWeight: '800' }}>{endpoints.length}</Text>
              <Text style={{ color: '#3FB950', fontSize: 11 }}>Endpoints</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#58A6FF12', flex: 1 }]}>
              <Text style={{ color: '#58A6FF', fontSize: 22, fontWeight: '800' }}>{versions.length}</Text>
              <Text style={{ color: '#58A6FF', fontSize: 11 }}>Versions</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#D2992212', flex: 1 }]}>
              <Text style={{ color: '#D29922', fontSize: 22, fontWeight: '800' }}>{changelog.length}</Text>
              <Text style={{ color: '#D29922', fontSize: 11 }}>Changes</Text>
            </View>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {filterTypes.map((ft) => (
                <TouchableOpacity
                  key={String(ft.key)}
                  onPress={() => setFilterType(ft.key)}
                  style={[styles.filterChip, { backgroundColor: filterType === ft.key ? colors.primary + '20' : cardBg }]}
                >
                  <Text style={{ color: filterType === ft.key ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Timeline */}
          {grouped.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="history" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>No Changes</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                Changes will appear here as you modify endpoints.
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.date} style={{ marginBottom: 16 }}>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{group.date}</Text>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                  {group.items.map((change, i) => {
                    const iconInfo = CHANGE_ICONS[change.changeType] || CHANGE_ICONS.modified;
                    const isExpanded = expandedId === change.id;
                    return (
                      <TouchableOpacity
                        key={change.id}
                        onPress={() => setExpandedId(isExpanded ? null : change.id)}
                        style={[styles.changeRow, i < group.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                      >
                        <View style={[styles.changeIcon, { backgroundColor: iconInfo.color + '18' }]}>
                          <MaterialCommunityIcons name={iconInfo.icon as any} size={18} color={iconInfo.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{change.endpointName}</Text>
                          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{change.collectionName}</Text>
                          {isExpanded && change.details && (
                            <View style={{ marginTop: 8, gap: 4 }}>
                              {change.details.map((d, j) => (
                                <View key={j} style={styles.diffRow}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', width: 60 }}>{d.field}</Text>
                                  <Text style={{ color: '#FF6961', fontSize: 11 }} numberOfLines={1}>{d.from}</Text>
                                  <MaterialCommunityIcons name="arrow-right" size={12} color={colors.textTertiary} />
                                  <Text style={{ color: '#3FB950', fontSize: 11 }} numberOfLines={1}>{d.to}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
                          {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
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
  card: { borderRadius: 14, overflow: 'hidden' },
  statCard: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dateLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  changeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 8 },
});
