import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { HttpMethod } from '../types/api';

interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: { name: string; value: string }[];
    queryString: { name: string; value: string }[];
    postData?: { mimeType: string; text: string };
  };
  response: {
    status: number;
    statusText: string;
    headers: { name: string; value: string }[];
    content: { size: number; mimeType: string; text?: string };
  };
}

interface ParsedHar {
  version: string;
  creator: { name: string; version: string };
  entries: HarEntry[];
  pages?: { title: string }[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', DELETE: '#FF6961',
  PATCH: '#BC8CFF', HEAD: '#8B949E', OPTIONS: '#F778BA',
};

export default function HarImportScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const addCollection = useApiStore((s) => s.addCollection);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [rawJson, setRawJson] = useState('');
  const [parsed, setParsed] = useState<ParsedHar | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [imported, setImported] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      setRawJson(content);
      parseHar(content);
    } catch {
      Alert.alert('Error', 'Failed to read HAR file');
    }
  };

  const parseHar = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data.log || !data.log.entries) {
        Alert.alert('Error', 'Invalid HAR format. Expected { log: { entries: [...] } }');
        return;
      }
      setParsed(data.log);
      setSelectedEntries(data.log.entries.map((_: any, i: number) => i));
      setImported(false);
    } catch {
      Alert.alert('Error', 'Invalid JSON');
    }
  };

  const toggleEntry = (idx: number) => {
    setSelectedEntries((s) => s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]);
  };

  const selectAll = () => {
    if (!parsed) return;
    const filtered = getFilteredEntries();
    const allSelected = filtered.every((_, i) => selectedEntries.includes(getOriginalIndex(i)));
    if (allSelected) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filtered.map((_, i) => getOriginalIndex(i)));
    }
  };

  const getFilteredEntries = (): HarEntry[] => {
    if (!parsed) return [];
    if (!filterMethod) return parsed.entries;
    return parsed.entries.filter((e) => e.request.method === filterMethod);
  };

  const getOriginalIndex = (filteredIdx: number): number => {
    if (!parsed || !filterMethod) return filteredIdx;
    let count = 0;
    for (let i = 0; i < parsed.entries.length; i++) {
      if (parsed.entries[i].request.method === filterMethod) {
        if (count === filteredIdx) return i;
        count++;
      }
    }
    return filteredIdx;
  };

  const importEntries = () => {
    if (!parsed || selectedEntries.length === 0) {
      return Alert.alert('Error', 'Select at least one entry');
    }

    const col = addCollection({
      name: `HAR Import ${new Date().toLocaleDateString()}`,
      description: `Imported from HAR file (${parsed.creator.name} ${parsed.creator.version})`,
      color: '#FF9500',
      icon: 'web',
      baseUrl: '',
    });

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    selectedEntries.forEach((idx) => {
      const entry = parsed.entries[idx];
      if (!entry) return;

      const method = validMethods.includes(entry.request.method.toUpperCase())
        ? entry.request.method.toUpperCase() as HttpMethod
        : 'GET';

      const url = new URL(entry.request.url);
      const name = url.pathname.replace(/^\//, '').split('/').pop() || url.hostname;

      addEndpoint({
        collectionId: col.id,
        name: name || `${method} ${url.pathname}`,
        method,
        url: entry.request.url,
        headers: (entry.request.headers || [])
          .filter((h) => !h.name.startsWith(':'))
          .slice(0, 20)
          .map((h) => ({ key: h.name, value: h.value, enabled: true })),
        body: entry.request.postData?.text || '',
        assertions: [],
      });
    });

    setImported(true);
    Alert.alert('Success', `Imported ${selectedEntries.length} entries into "${col.name}"`);
  };

  const getStatusColor = (s: number) => (s >= 200 && s < 300 ? '#3FB950' : s >= 400 ? '#FF6961' : '#FFD60A');
  const filteredEntries = getFilteredEntries();
  const methods = parsed ? [...new Set(parsed.entries.map((e) => e.request.method))] : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'HAR Import', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={[styles.card, { backgroundColor: '#FF950018' }]}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="web" size={20} color="#FF9500" />
            <Text style={{ color: '#FF9500', fontSize: 13, flex: 1 }}>
              Import HTTP Archive (HAR) files from Chrome DevTools, Firefox, or Charles Proxy.
            </Text>
          </View>
        </View>

        {/* Import Success */}
        {imported && (
          <View style={[styles.card, { backgroundColor: '#3FB95018' }]}>
            <View style={styles.successRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontSize: 15, fontWeight: '700' }}>
                {selectedEntries.length} entries imported!
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setParsed(null); setRawJson(''); setImported(false); }}>
              <Text style={{ color: '#3FB950', fontSize: 13 }}>Import another</Text>
            </TouchableOpacity>
          </View>
        )}

        {!imported && (
          <>
            {/* Pick File */}
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: cardBg }]} onPress={pickFile}>
              <MaterialCommunityIcons name="file-upload-outline" size={32} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Pick .har File</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>or paste HAR JSON below</Text>
            </TouchableOpacity>

            {/* Paste JSON */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Paste HAR JSON</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
                value={rawJson}
                onChangeText={setRawJson}
                placeholder='{ "log": { "entries": [...] } }'
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.parseBtn, { backgroundColor: colors.primary }]}
                onPress={() => parseHar(rawJson)}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Parse HAR</Text>
              </TouchableOpacity>
            </View>

            {/* Parsed Preview */}
            {parsed && (
              <>
                {/* Stats */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>HAR Summary</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{parsed.entries.length}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Entries</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{methods.length}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Methods</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{selectedEntries.length}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Selected</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 8 }}>
                    Creator: {parsed.creator.name} {parsed.creator.version}
                  </Text>
                </View>

                {/* Method Filter */}
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    onPress={() => setFilterMethod(null)}
                    style={[styles.filterPill, !filterMethod && { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: !filterMethod ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>All</Text>
                  </TouchableOpacity>
                  {methods.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setFilterMethod(filterMethod === m ? null : m)}
                      style={[
                        styles.filterPill,
                        filterMethod === m && { backgroundColor: METHOD_COLORS[m] || '#8B949E' },
                        filterMethod !== m && { backgroundColor: isDark ? colors.surface : colors.systemGray5 },
                      ]}
                    >
                      <Text style={{ color: filterMethod === m ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={selectAll}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                      {selectedEntries.length === filteredEntries.length ? 'Deselect' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Entry List */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                  {filteredEntries.slice(0, 50).map((entry, fIdx) => {
                    const origIdx = getOriginalIndex(fIdx);
                    const isSelected = selectedEntries.includes(origIdx);
                    let pathname = '';
                    try { pathname = new URL(entry.request.url).pathname; } catch { pathname = entry.request.url; }

                    return (
                      <TouchableOpacity
                        key={origIdx}
                        style={[styles.entryRow, { borderBottomColor: colors.divider }]}
                        onPress={() => toggleEntry(origIdx)}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textTertiary}
                        />
                        <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[entry.request.method] || '#8B949E') + '22' }]}>
                          <Text style={{ color: METHOD_COLORS[entry.request.method] || '#8B949E', fontSize: 9, fontWeight: '700' }}>
                            {entry.request.method}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {pathname}
                          </Text>
                          <View style={styles.entryMeta}>
                            <Text style={{ color: getStatusColor(entry.response.status), fontSize: 11, fontWeight: '600' }}>
                              {entry.response.status}
                            </Text>
                            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{Math.round(entry.time)}ms</Text>
                            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                              {entry.response.content.size > 0 ? `${(entry.response.content.size / 1024).toFixed(1)}KB` : '—'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <Text style={{ color: colors.textTertiary, fontSize: 13, paddingVertical: 16 }}>No entries match filter</Text>
                  )}
                </View>

                {/* Import Button */}
                <TouchableOpacity
                  style={[styles.importBtn, { backgroundColor: colors.primary }]}
                  onPress={importEntries}
                >
                  <MaterialCommunityIcons name="import" size={20} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                    Import {selectedEntries.length} Entries
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
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
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickBtn: { borderRadius: 14, padding: 24, alignItems: 'center', gap: 6, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(128,128,128,0.15)', borderStyle: 'dashed' },
  textInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 100, maxHeight: 180 },
  parseBtn: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  entryMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  importBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
});
