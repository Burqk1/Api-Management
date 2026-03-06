import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useApiStore } from '../stores/apiStore';
import { useLanguageStore } from '../stores/languageStore';
import { HttpMethod, METHOD_COLORS, getStatusColor } from '../types/api';

const METHOD_FILTERS: ('ALL' | HttpMethod)[] = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);
  const clearCallLogs = useApiStore((s) => s.clearCallLogs);

  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | HttpMethod>('ALL');

  const cardBg = isDark ? colors.surface : colors.card;

  const filteredLogs = useMemo(() => {
    let logs = [...callLogs].sort((a, b) => b.timestamp - a.timestamp);

    if (methodFilter !== 'ALL') {
      logs = logs.filter((l) => l.method === methodFilter);
    }

    if (query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.url.toLowerCase().includes(q) ||
          l.endpointName.toLowerCase().includes(q)
      );
    }

    return logs;
  }, [callLogs, methodFilter, query]);

  const handleClearAll = () => {
    Alert.alert(t('clearAll'), t('requestHistoryDesc'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clearAll'), style: 'destructive', onPress: () => clearCallLogs() },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('requestHistory'),
          headerRight: () =>
            callLogs.length > 0 ? (
              <TouchableOpacity onPress={handleClearAll} style={{ marginRight: 8 }}>
                <Text style={{ color: '#FF6961', fontSize: 14, fontWeight: '600' }}>{t('clearAll')}</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, marginHorizontal: 20, marginTop: 12 }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Method Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillContainer}
        >
          {METHOD_FILTERS.map((method) => {
            const isActive = methodFilter === method;
            const pillColor = method === 'ALL' ? colors.primary : METHOD_COLORS[method];
            return (
              <TouchableOpacity
                key={method}
                onPress={() => setMethodFilter(method)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? pillColor + '20' : cardBg,
                    borderColor: isActive ? pillColor : 'transparent',
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? pillColor : colors.textSecondary },
                  ]}
                >
                  {method === 'ALL' ? t('allMethods') : method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results Count */}
        <Text style={[styles.resultCount, { color: colors.textSecondary, marginHorizontal: 20 }]}>
          {filteredLogs.length} {t('resultsFound')}
        </Text>

        {/* Log List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {filteredLogs.length > 0 ? (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {filteredLogs.map((log, i) => (
                <TouchableOpacity
                  key={log.id}
                  onPress={() => router.push(`/log/${log.id}` as any)}
                  style={[
                    styles.row,
                    i < filteredLogs.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.divider,
                    },
                  ]}
                >
                  <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] + '20' }]}>
                    <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>{log.method}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {log.endpointName}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      {log.url}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    {log.statusCode > 0 && (
                      <Text style={[styles.statusCode, { color: getStatusColor(log.statusCode) }]}>
                        {log.statusCode}
                      </Text>
                    )}
                    <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                      {log.responseTime}ms
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                      {getRelativeTime(log.timestamp)}
                    </Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: log.success ? '#3FB950' : '#FF6961' }]} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noRequestHistory')}</Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t('noRequestHistoryHint')}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  pillContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  resultCount: { fontSize: 13, marginTop: 10, marginBottom: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 46, alignItems: 'center', alignSelf: 'center' as const, justifyContent: 'center' as const },
  methodText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  statusCode: { fontSize: 13, fontWeight: '700' },
  rowMeta: { fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});
