import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { generateId } from '../types/api';
import * as Clipboard from 'expo-clipboard';

type Tab = 'share' | 'scan';

const METHOD_COLORS: Record<string, string> = {
  GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922',
  PATCH: '#BC8CFF', DELETE: '#F85149', HEAD: '#8B949E', OPTIONS: '#F778BA',
};

const QRGrid = ({ data, size = 200 }: { data: string; size?: number }) => {
  const gridSize = 15;
  const cellSize = size / gridSize;
  const cells = useMemo(() => {
    const result: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
    }
    for (let r = 0; r < gridSize; r++) {
      result[r] = [];
      for (let c = 0; c < gridSize; c++) {
        const isBorder = r < 2 || c < 2 || r >= gridSize - 2 || c >= gridSize - 2;
        const seed = (hash + r * gridSize + c) * 2654435761;
        result[r][c] = isBorder ? (r + c) % 2 === 0 : (seed >>> 0) % 3 !== 0;
      }
    }
    return result;
  }, [data]);

  return (
    <View style={{ width: size, height: size, flexDirection: 'column' }}>
      {cells.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((filled, c) => (
            <View key={c} style={{ width: cellSize, height: cellSize, backgroundColor: filled ? '#000' : '#fff' }} />
          ))}
        </View>
      ))}
    </View>
  );
};

export default function QRShareScreen() {
  const { colors, isDark } = useTheme();
  const { collections, endpoints, addCollection, addEndpoint } = useApiStore();
  const [tab, setTab] = useState<Tab>('share');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasteData, setPasteData] = useState('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const cardBg = isDark ? colors.surface : colors.card;

  const getEndpointCount = (colId: string) =>
    endpoints.filter((e) => e.collectionId === colId).length;

  const encodeCollection = (colId: string): string | null => {
    const col = collections.find((c) => c.id === colId);
    if (!col) return null;
    const eps = endpoints.filter((e) => e.collectionId === colId);
    const payload = JSON.stringify({ collection: col, endpoints: eps });
    try {
      const encoded = btoa(unescape(encodeURIComponent(payload)));
      if (encoded.length > 4000) return null;
      return encoded;
    } catch { return null; }
  };

  const decodeData = (raw: string) => {
    try {
      const json = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
      if (json.collection && json.endpoints) return json;
    } catch {}
    try {
      const json = JSON.parse(raw.trim());
      if (json.collection && json.endpoints) return json;
    } catch {}
    return null;
  };

  const handleImport = (data: any) => {
    const { collection, endpoints: eps } = data;
    const newColId = generateId();
    addCollection({ name: collection.name, description: collection.description || '', color: collection.color || '#58A6FF', icon: collection.icon || 'folder', baseUrl: collection.baseUrl || '' });
    const addedCol = useApiStore.getState().collections.find((c) => c.name === collection.name);
    const colId = addedCol?.id || newColId;
    (eps || []).forEach((ep: any) => {
      addEndpoint({ name: ep.name, url: ep.url, method: ep.method, headers: ep.headers || [], body: ep.body || '', collectionId: colId, assertions: ep.assertions || [] });
    });
    setImportSuccess(true);
    setImportPreview(null);
    setPasteData('');
    setTimeout(() => setImportSuccess(false), 2500);
  };

  const handlePaste = () => {
    const decoded = decodeData(pasteData);
    if (!decoded) { Alert.alert('Error', 'Invalid share data. Please check and try again.'); return; }
    setImportPreview(decoded);
  };

  const selectedData = selectedId ? encodeCollection(selectedId) : null;
  const selectedCol = selectedId ? collections.find((c) => c.id === selectedId) : null;
  const selectedEpCount = selectedId ? getEndpointCount(selectedId) : 0;
  const tooLarge = selectedId && !selectedData;

  const methodBreakdown = (eps: any[]) => {
    const counts: Record<string, number> = {};
    eps.forEach((e) => { counts[e.method] = (counts[e.method] || 0) + 1; });
    return counts;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'QR Share' }} />
      <View style={[styles.tabBar, { backgroundColor: cardBg }]}>
        {(['share', 'scan'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && { backgroundColor: colors.primary }]} onPress={() => { setTab(t); setSelectedId(null); setImportPreview(null); setImportSuccess(false); }}>
            <MaterialCommunityIcons name={t === 'share' ? 'qrcode' : 'camera'} size={18} color={tab === t ? '#fff' : colors.text} />
            <Text style={[styles.tabText, { color: tab === t ? '#fff' : colors.text }]}>{t === 'share' ? 'Share' : 'Scan'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'share' && !selectedId && (
          <>
            <Text style={[styles.heading, { color: colors.text }]}>Select a Collection</Text>
            {collections.map((col) => (
              <TouchableOpacity key={col.id} style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setSelectedId(col.id)}>
                <View style={[styles.iconCircle, { backgroundColor: col.color + '22' }]}>
                  <MaterialCommunityIcons name={(col.icon as any) || 'folder'} size={22} color={col.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.colName, { color: colors.text }]}>{col.name}</Text>
                  <Text style={[styles.colSub, { color: colors.textSecondary }]}>{getEndpointCount(col.id)} endpoints</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {collections.length === 0 && <Text style={[styles.empty, { color: colors.textSecondary }]}>No collections yet.</Text>}
          </>
        )}

        {tab === 'share' && selectedId && (
          <View style={styles.qrContainer}>
            <TouchableOpacity style={styles.backRow} onPress={() => setSelectedId(null)}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 6 }}>Back</Text>
            </TouchableOpacity>
            {tooLarge ? (
              <View style={[styles.warningBox, { backgroundColor: '#F8514920' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#F85149" />
                <Text style={[styles.warningText, { color: '#F85149' }]}>Collection is too large for QR code ({selectedEpCount} endpoints). Try reducing the number of endpoints.</Text>
              </View>
            ) : (
              <>
                <View style={[styles.qrWrapper, { backgroundColor: '#fff' }]}>
                  <QRGrid data={selectedData!} size={220} />
                </View>
                <Text style={[styles.qrLabel, { color: colors.text }]}>{selectedCol?.name}</Text>
                <Text style={[styles.qrSub, { color: colors.textSecondary }]}>{selectedEpCount} endpoints</Text>
                <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.primary }]} onPress={async () => {
                  const link = `apimanager://import?data=${selectedData}`;
                  await Clipboard.setStringAsync(link);
                  Alert.alert('Copied', 'Share link copied to clipboard.');
                }}>
                  <MaterialCommunityIcons name="content-copy" size={18} color="#fff" />
                  <Text style={styles.copyText}>Copy Link</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {tab === 'scan' && (
          <View style={styles.scanContainer}>
            <View style={[styles.cameraPlaceholder, { backgroundColor: isDark ? '#1a1a2e' : '#e8e8f0' }]}>
              <MaterialCommunityIcons name="camera" size={48} color={colors.textSecondary} />
              <Text style={[styles.cameraText, { color: colors.textSecondary }]}>Camera scanning not available</Text>
              <Text style={[styles.cameraSub, { color: colors.textSecondary }]}>Paste shared data below instead</Text>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>Manual Import</Text>
            <TextInput
              style={[styles.pasteInput, { backgroundColor: cardBg, color: colors.text, borderColor: isDark ? '#333' : '#ddd' }]}
              placeholder="Paste shared data string here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={pasteData}
              onChangeText={setPasteData}
            />
            <TouchableOpacity style={[styles.parseBtn, { backgroundColor: colors.primary }]} onPress={handlePaste} disabled={!pasteData.trim()}>
              <MaterialCommunityIcons name="file-search-outline" size={18} color="#fff" />
              <Text style={styles.copyText}>Parse Data</Text>
            </TouchableOpacity>

            {importPreview && (
              <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Import Preview</Text>
                <Text style={[styles.previewName, { color: colors.primary }]}>{importPreview.collection.name}</Text>
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>{importPreview.endpoints.length} endpoints</Text>
                <View style={styles.methodRow}>
                  {Object.entries(methodBreakdown(importPreview.endpoints)).map(([m, c]) => (
                    <View key={m} style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[m] || '#888') + '22' }]}>
                      <Text style={{ color: METHOD_COLORS[m] || '#888', fontSize: 12, fontWeight: '600' }}>{m} {c as number}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={[styles.importBtn, { backgroundColor: '#3FB950' }]} onPress={() => handleImport(importPreview)}>
                  <MaterialCommunityIcons name="download" size={18} color="#fff" />
                  <Text style={styles.copyText}>Import Collection</Text>
                </TouchableOpacity>
              </View>
            )}

            {importSuccess && (
              <View style={[styles.successBox, { backgroundColor: '#3FB95020' }]}>
                <MaterialCommunityIcons name="check-circle" size={28} color="#3FB950" />
                <Text style={{ color: '#3FB950', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Imported successfully!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', margin: 16, borderRadius: 14, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  colName: { fontSize: 15, fontWeight: '600' },
  colSub: { fontSize: 13, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  qrContainer: { alignItems: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  qrWrapper: { padding: 16, borderRadius: 14, marginBottom: 16 },
  qrLabel: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  qrSub: { fontSize: 14, marginTop: 2, marginBottom: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, gap: 8 },
  copyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  warningBox: { padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  warningText: { flex: 1, fontSize: 14 },
  scanContainer: { gap: 0 },
  cameraPlaceholder: { height: 200, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cameraText: { fontSize: 15, fontWeight: '600', marginTop: 10 },
  cameraSub: { fontSize: 13, marginTop: 4 },
  pasteInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  parseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 8, marginBottom: 20 },
  previewCard: { padding: 16, borderRadius: 14, marginBottom: 16 },
  previewTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  previewName: { fontSize: 18, fontWeight: '700' },
  previewSub: { fontSize: 14, marginTop: 2, marginBottom: 10, color: '#8B949E' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  methodBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 8 },
  successBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, marginTop: 8 },
});
