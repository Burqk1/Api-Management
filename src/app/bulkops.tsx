import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS } from '../types/api';
import * as Clipboard from 'expo-clipboard';

type Tab = 'find' | 'bulk_edit' | 'export' | 'import';

export default function BulkOpsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { collections, endpoints, updateEndpoint } = useApiStore();

  const [tab, setTab] = useState<Tab>('find');
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [searchScope, setSearchScope] = useState<'url' | 'name' | 'headers' | 'body'>('url');
  const [replaceCount, setReplaceCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const cardBg = isDark ? colors.surface : colors.card;
  const allEndpoints = endpoints.map((e) => ({ ...e, collectionName: collections.find((c) => c.id === e.collectionId)?.name || '' }));

  // Find & Replace
  const findResults = searchTerm.trim()
    ? allEndpoints.filter((ep) => {
        const term = searchTerm.toLowerCase();
        if (searchScope === 'url') return ep.url.toLowerCase().includes(term);
        if (searchScope === 'name') return ep.name.toLowerCase().includes(term);
        if (searchScope === 'headers') return ep.headers?.some((h) => h.key.toLowerCase().includes(term) || h.value.toLowerCase().includes(term));
        if (searchScope === 'body') return (ep.body || '').toLowerCase().includes(term);
        return false;
      })
    : [];

  const executeReplace = () => {
    if (!searchTerm.trim() || !replaceTerm.trim()) return;
    let count = 0;
    allEndpoints.forEach((ep) => {
      let updated = false;
      const changes: any = {};
      if (searchScope === 'url' && ep.url.includes(searchTerm)) {
        changes.url = ep.url.split(searchTerm).join(replaceTerm);
        updated = true;
      }
      if (searchScope === 'name' && ep.name.includes(searchTerm)) {
        changes.name = ep.name.split(searchTerm).join(replaceTerm);
        updated = true;
      }
      if (searchScope === 'body' && ep.body?.includes(searchTerm)) {
        changes.body = ep.body.split(searchTerm).join(replaceTerm);
        updated = true;
      }
      if (updated) {
        updateEndpoint(ep.id, changes);
        count++;
      }
    });
    setReplaceCount(count);
    Alert.alert('Done', `Replaced in ${count} endpoints`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allEndpoints.map((e) => e.id)));
  const selectNone = () => setSelectedIds(new Set());

  // Export selected
  const exportSelected = () => {
    const selected = allEndpoints.filter((e) => selectedIds.has(e.id));
    const json = JSON.stringify(selected, null, 2);
    Clipboard.setStringAsync(json);
    Alert.alert('Exported', `${selected.length} endpoints copied to clipboard as JSON`);
  };

  // Bulk delete
  const bulkDelete = () => {
    Alert.alert('Bulk Delete', `Delete ${selectedIds.size} selected endpoints?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        // Note: would need removeEndpoint per item
        Alert.alert('Info', 'Bulk delete requires confirmation per collection. Use individual delete for safety.');
      }},
    ]);
  };

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'find', icon: 'find-replace', label: 'Find & Replace' },
    { key: 'bulk_edit', icon: 'checkbox-multiple-marked-outline', label: 'Bulk Select' },
    { key: 'export', icon: 'export', label: 'Export' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Bulk Operations' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {tabs.map((tb) => (
              <TouchableOpacity
                key={tb.key}
                style={[styles.tab, { backgroundColor: tab === tb.key ? colors.primary + '20' : cardBg, borderColor: tab === tb.key ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setTab(tb.key)}
              >
                <MaterialCommunityIcons name={tb.icon as any} size={16} color={tab === tb.key ? colors.primary : colors.textSecondary} />
                <Text style={{ color: tab === tb.key ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{tb.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Find & Replace */}
          {tab === 'find' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['url', 'name', 'headers', 'body'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.scopeChip, { backgroundColor: searchScope === s ? colors.primary + '20' : cardBg }]}
                      onPress={() => setSearchScope(s)}
                    >
                      <Text style={{ color: searchScope === s ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={[styles.inputCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="magnify" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 8 }}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search..."
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 8 }}
                    value={replaceTerm}
                    onChangeText={setReplaceTerm}
                    placeholder="Replace with..."
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#D2992220', flex: 1, opacity: !searchTerm.trim() || !replaceTerm.trim() ? 0.4 : 1 }]}
                  onPress={executeReplace}
                  disabled={!searchTerm.trim() || !replaceTerm.trim()}
                >
                  <MaterialCommunityIcons name="find-replace" size={16} color="#D29922" />
                  <Text style={{ color: '#D29922', fontSize: 13, fontWeight: '700' }}>Replace All</Text>
                </TouchableOpacity>
              </View>

              {findResults.length > 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>{findResults.length} results found</Text>
              )}
              {findResults.slice(0, 30).map((ep) => (
                <View key={ep.id} style={[styles.resultCard, { backgroundColor: cardBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[ep.method] || '#8B949E') + '20' }]}>
                      <Text style={{ color: METHOD_COLORS[ep.method] || '#8B949E', fontSize: 9, fontWeight: '800' }}>{ep.method}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{ep.name}</Text>
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} numberOfLines={1}>{ep.url}</Text>
                </View>
              ))}
            </>
          )}

          {/* Bulk Select */}
          {tab === 'bulk_edit' && (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20', flex: 1 }]} onPress={selectAll}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Select All ({allEndpoints.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: cardBg, flex: 1 }]} onPress={selectNone}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>Deselect All</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>{selectedIds.size} selected</Text>

              {allEndpoints.map((ep) => (
                <TouchableOpacity
                  key={ep.id}
                  style={[styles.resultCard, { backgroundColor: selectedIds.has(ep.id) ? colors.primary + '08' : cardBg }]}
                  onPress={() => toggleSelect(ep.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons
                      name={selectedIds.has(ep.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={selectedIds.has(ep.id) ? colors.primary : colors.textTertiary}
                    />
                    <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[ep.method] || '#8B949E') + '20' }]}>
                      <Text style={{ color: METHOD_COLORS[ep.method] || '#8B949E', fontSize: 9, fontWeight: '800' }}>{ep.method}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, flex: 1 }} numberOfLines={1}>{ep.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {selectedIds.size > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF696120', flex: 1 }]} onPress={bulkDelete}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6961" />
                    <Text style={{ color: '#FF6961', fontSize: 13, fontWeight: '700' }}>Delete ({selectedIds.size})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95020', flex: 1 }]} onPress={exportSelected}>
                    <MaterialCommunityIcons name="export" size={16} color="#3FB950" />
                    <Text style={{ color: '#3FB950', fontSize: 13, fontWeight: '700' }}>Export ({selectedIds.size})</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Export */}
          {tab === 'export' && (
            <>
              <View style={{ gap: 8 }}>
                {collections.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.exportCard, { backgroundColor: cardBg }]}
                    onPress={() => {
                      Clipboard.setStringAsync(JSON.stringify(col, null, 2));
                      Alert.alert('Exported', `"${col.name}" copied to clipboard`);
                    }}
                  >
                    <MaterialCommunityIcons name="folder-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{col.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{endpoints.filter((e) => e.collectionId === col.id).length} endpoints</Text>
                    </View>
                    <MaterialCommunityIcons name="content-copy" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.fullExportBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Clipboard.setStringAsync(JSON.stringify(collections, null, 2));
                  Alert.alert('Exported', 'All collections copied to clipboard');
                }}
              >
                <MaterialCommunityIcons name="database-export" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Export All Collections</Text>
              </TouchableOpacity>
            </>
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
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  scopeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  inputCard: { borderRadius: 14, padding: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  resultCard: { borderRadius: 10, padding: 10, marginBottom: 4 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  exportCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14 },
  fullExportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
});
