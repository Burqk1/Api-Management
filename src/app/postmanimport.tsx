import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { HttpMethod } from '../types/api';

interface ParsedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body?: string;
}

interface ParsedCollection {
  name: string;
  description?: string;
  requests: ParsedRequest[];
  folderCount: number;
}

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

function extractRequests(items: any[], results: ParsedRequest[], folderCount: { count: number }) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item.item) {
      folderCount.count++;
      extractRequests(item.item, results, folderCount);
    } else if (item.request) {
      const req = item.request;
      const method = (typeof req.method === 'string' ? req.method.toUpperCase() : 'GET') as HttpMethod;
      let url = '';
      if (typeof req.url === 'string') {
        url = req.url;
      } else if (req.url?.raw) {
        url = req.url.raw;
      }

      const headers: { key: string; value: string }[] = [];
      if (Array.isArray(req.header)) {
        for (const h of req.header) {
          if (h.key && h.value) headers.push({ key: h.key, value: h.value });
        }
      }

      const body = req.body?.raw || '';

      results.push({
        name: item.name || 'Unnamed Request',
        method: VALID_METHODS.includes(method) ? method : 'GET',
        url,
        headers,
        body,
      });
    }
  }
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', DELETE: '#FF6961',
  PATCH: '#BC8CFF', HEAD: '#64D2FF', OPTIONS: '#8B949E',
};

export default function PostmanImportScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const addCollection = useApiStore((s) => s.addCollection);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ParsedCollection | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setJsonText(text);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const res = await fetch(result.assets[0].uri);
        const text = await res.text();
        setJsonText(text);
      }
    } catch {
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const parseCollection = () => {
    try {
      const data = JSON.parse(jsonText);
      const info = data.info || {};
      const items = data.item || [];

      const requests: ParsedRequest[] = [];
      const folderCount = { count: 0 };
      extractRequests(items, requests, folderCount);

      if (requests.length === 0) {
        return Alert.alert('Error', 'No requests found in collection');
      }

      setParsed({
        name: info.name || 'Imported Collection',
        description: info.description,
        requests,
        folderCount: folderCount.count,
      });
    } catch {
      Alert.alert('Parse Error', 'Invalid JSON. Make sure this is a Postman Collection v2.1 export.');
    }
  };

  const importCollection = async () => {
    if (!parsed) return;
    setImporting(true);

    try {
      const col = addCollection({ name: parsed.name, description: parsed.description || '', color: '#58A6FF', icon: 'folder-outline', baseUrl: '' });

      for (const req of parsed.requests) {
        addEndpoint({
          collectionId: col.id,
          name: req.name,
          method: req.method,
          url: req.url,
          headers: req.headers.map((h) => ({ ...h, enabled: true })),
          body: req.body || '',
          assertions: [],
        });
      }

      setImportCount(parsed.requests.length);
      setImported(true);
    } catch (e: any) {
      Alert.alert('Import Error', e.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setJsonText('');
    setParsed(null);
    setImported(false);
    setImportCount(0);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Postman Import', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Success Card */}
        {imported && (
          <View style={[styles.card, { backgroundColor: '#3FB95018' }]}>
            <View style={styles.successRow}>
              <MaterialCommunityIcons name="check-circle" size={32} color="#3FB950" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#3FB950', fontSize: 17, fontWeight: '700' }}>Import Successful!</Text>
                <Text style={{ color: '#3FB950', fontSize: 13, marginTop: 2 }}>
                  {importCount} endpoints imported to "{parsed?.name}"
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: '#3FB95022' }]} onPress={reset}>
              <Text style={{ color: '#3FB950', fontWeight: '600' }}>Import Another</Text>
            </TouchableOpacity>
          </View>
        )}

        {!imported && (
          <>
            {/* Input Area */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Postman Collection JSON</Text>
              <TextInput
                style={[styles.jsonInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
                value={jsonText}
                onChangeText={setJsonText}
                multiline
                placeholder='Paste Postman Collection v2.1 JSON here...'
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#58A6FF18' }]} onPress={pasteFromClipboard}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#58A6FF" />
                  <Text style={{ color: '#58A6FF', fontWeight: '600', fontSize: 13 }}>Paste</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#BC8CFF18' }]} onPress={pickFile}>
                  <MaterialCommunityIcons name="file-upload-outline" size={16} color="#BC8CFF" />
                  <Text style={{ color: '#BC8CFF', fontWeight: '600', fontSize: 13 }}>Pick File</Text>
                </TouchableOpacity>
                {jsonText.trim() && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95018' }]} onPress={parseCollection}>
                    <MaterialCommunityIcons name="code-json" size={16} color="#3FB950" />
                    <Text style={{ color: '#3FB950', fontWeight: '600', fontSize: 13 }}>Parse</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Preview */}
            {parsed && (
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview</Text>
                <View style={styles.previewInfo}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{parsed.name}</Text>
                  {parsed.description && (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{parsed.description}</Text>
                  )}
                  <View style={styles.statsRow}>
                    <View style={[styles.statBadge, { backgroundColor: '#58A6FF18' }]}>
                      <Text style={{ color: '#58A6FF', fontSize: 12, fontWeight: '600' }}>
                        {parsed.requests.length} requests
                      </Text>
                    </View>
                    {parsed.folderCount > 0 && (
                      <View style={[styles.statBadge, { backgroundColor: '#FFD60A18' }]}>
                        <Text style={{ color: '#FFD60A', fontSize: 12, fontWeight: '600' }}>
                          {parsed.folderCount} folders
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Request List */}
                {parsed.requests.slice(0, 20).map((req, i) => (
                  <View
                    key={i}
                    style={[styles.reqRow, i < Math.min(parsed.requests.length, 20) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[req.method] || '#8B949E') + '22' }]}>
                      <Text style={{ color: METHOD_COLORS[req.method] || '#8B949E', fontSize: 10, fontWeight: '700' }}>
                        {req.method}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{req.name}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={1}>{req.url}</Text>
                    </View>
                  </View>
                ))}
                {parsed.requests.length > 20 && (
                  <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                    +{parsed.requests.length - 20} more...
                  </Text>
                )}

                {/* Import Button */}
                <TouchableOpacity
                  style={[styles.importBtn, { backgroundColor: colors.primary, opacity: importing ? 0.6 : 1 }]}
                  onPress={importCollection}
                  disabled={importing}
                >
                  {importing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="import" size={20} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                        Import {parsed.requests.length} Endpoints
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  jsonInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 12, fontFamily: 'monospace', minHeight: 150 },
  inputActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  previewInfo: { marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 48, alignItems: 'center' },
  importBtn: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  resetBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
});
