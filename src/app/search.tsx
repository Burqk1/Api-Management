import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useApiStore } from '../stores/apiStore';
import { useLanguageStore } from '../stores/languageStore';
import { METHOD_COLORS } from '../types/api';

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const search = useApiStore((s) => s.search);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.trim().length < 2) return null;
    return search(query.trim());
  }, [query, search]);

  const inputBg = isDark ? colors.surface : colors.card;
  const total = results ? results.collections.length + results.endpoints.length + results.logs.length : 0;

  return (
    <>
      <Stack.Screen options={{ title: t('globalSearch') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.searchBar, { backgroundColor: inputBg, marginHorizontal: 20, marginTop: 12 }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {results && (
          <Text style={[styles.resultCount, { color: colors.textSecondary, marginHorizontal: 20 }]}>
            {total} {t('resultsFound')}
          </Text>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {results && results.collections.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('collections')}</Text>
              <View style={[styles.card, { backgroundColor: inputBg }]}>
                {results.collections.map((col, i) => (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.row, i < results.collections.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: col.color + '20' }]}>
                      <MaterialCommunityIcons name={(col.icon as any) || 'folder-outline'} size={18} color={col.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{col.name}</Text>
                      {col.baseUrl ? <Text style={[styles.rowSub, { color: colors.textTertiary }]}>{col.baseUrl}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {results && results.endpoints.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('endpoints')}</Text>
              <View style={[styles.card, { backgroundColor: inputBg }]}>
                {results.endpoints.map((ep, i) => (
                  <TouchableOpacity
                    key={ep.id}
                    onPress={() => router.push(`/endpoint/${ep.id}` as any)}
                    style={[styles.row, i < results.endpoints.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[ep.method] + '20' }]}>
                      <Text style={[styles.methodText, { color: METHOD_COLORS[ep.method] }]}>{ep.method}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{ep.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>{ep.url}</Text>
                    </View>
                    {ep.isFavorite && <MaterialCommunityIcons name="star" size={14} color="#FFD60A" />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {results && results.logs.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentActivity')}</Text>
              <View style={[styles.card, { backgroundColor: inputBg }]}>
                {results.logs.slice(0, 20).map((log, i) => (
                  <TouchableOpacity
                    key={log.id}
                    onPress={() => router.push(`/log/${log.id}` as any)}
                    style={[styles.row, i < Math.min(results.logs.length, 20) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] + '20' }]}>
                      <Text style={[styles.methodText, { color: METHOD_COLORS[log.method] }]}>{log.method}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{log.endpointName}</Text>
                      <Text style={[styles.rowSub, { color: colors.textTertiary }]}>{log.statusCode} · {log.responseTime}ms</Text>
                    </View>
                    <View style={[styles.dot, { backgroundColor: log.success ? '#3FB950' : '#FF6961' }]} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {results && total === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResults')}</Text>
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
  resultCount: { fontSize: 13, marginTop: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginTop: 16, marginBottom: 8 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 46, alignItems: 'center' },
  methodText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
});
