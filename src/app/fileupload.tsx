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
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface SelectedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

interface FormField {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  file?: SelectedFile;
}

export default function FileUploadScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;

  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'POST' | 'PUT' | 'PATCH'>('POST');
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', key: '', value: '', type: 'text' },
  ]);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; time: number; body: string } | null>(null);

  const methods: ('POST' | 'PUT' | 'PATCH')[] = ['POST', 'PUT', 'PATCH'];

  const addField = (type: 'text' | 'file') => {
    setFields((f) => [...f, { id: Date.now().toString(), key: '', value: '', type }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((f) => f.map((field) => (field.id === id ? { ...field, ...updates } : field)));
  };

  const removeField = (id: string) => {
    setFields((f) => f.filter((field) => field.id !== id));
  };

  const pickFile = async (fieldId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        updateField(fieldId, {
          file: { name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType || 'application/octet-stream' },
          value: asset.name,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const sendRequest = async () => {
    if (!url.trim()) return Alert.alert('Error', 'URL is required');
    setLoading(true);
    setResponse(null);
    const start = Date.now();

    try {
      const formData = new FormData();
      for (const field of fields) {
        if (!field.key.trim()) continue;
        if (field.type === 'file' && field.file) {
          formData.append(field.key, {
            uri: field.file.uri,
            name: field.file.name,
            type: field.file.mimeType || 'application/octet-stream',
          } as any);
        } else {
          formData.append(field.key, field.value);
        }
      }

      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) headerObj[h.key] = h.value;
      });

      const res = await fetch(url.trim(), {
        method,
        body: formData,
        headers: headerObj,
      });

      const body = await res.text();
      setResponse({ status: res.status, time: Date.now() - start, body });
    } catch (err: any) {
      setResponse({ status: 0, time: Date.now() - start, body: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s: number) => (s >= 200 && s < 300 ? '#3FB950' : s >= 400 ? '#FF6961' : '#FFD60A');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'File Upload', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* URL & Method */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.methodRow}>
            {methods.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.methodPill, method === m && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.methodText, { color: method === m ? '#FFF' : colors.textSecondary }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.urlInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
            placeholder="https://api.example.com/upload"
            placeholderTextColor={colors.textTertiary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Form Fields */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Form Data (multipart/form-data)</Text>
          {fields.map((field) => (
            <View key={field.id} style={[styles.fieldRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.fieldHeader}>
                <View style={[styles.typeBadge, { backgroundColor: field.type === 'file' ? '#58A6FF22' : '#3FB95022' }]}>
                  <MaterialCommunityIcons
                    name={field.type === 'file' ? 'file-outline' : 'form-textbox'}
                    size={14}
                    color={field.type === 'file' ? '#58A6FF' : '#3FB950'}
                  />
                  <Text style={{ color: field.type === 'file' ? '#58A6FF' : '#3FB950', fontSize: 11, fontWeight: '600' }}>
                    {field.type.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeField(field.id)}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.cardBorder }]}
                placeholder="Field name"
                placeholderTextColor={colors.textTertiary}
                value={field.key}
                onChangeText={(v) => updateField(field.id, { key: v })}
              />
              {field.type === 'file' ? (
                <TouchableOpacity
                  style={[styles.filePicker, { borderColor: colors.cardBorder }]}
                  onPress={() => pickFile(field.id)}
                >
                  <MaterialCommunityIcons name="attachment" size={18} color={colors.primary} />
                  <Text style={{ color: field.file ? colors.text : colors.textTertiary, flex: 1 }} numberOfLines={1}>
                    {field.file ? field.file.name : 'Choose file...'}
                  </Text>
                  {field.file && (
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{formatSize(field.file.size)}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Value"
                  placeholderTextColor={colors.textTertiary}
                  value={field.value}
                  onChangeText={(v) => updateField(field.id, { value: v })}
                />
              )}
            </View>
          ))}
          <View style={styles.addRow}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#3FB95018' }]} onPress={() => addField('text')}>
              <MaterialCommunityIcons name="form-textbox" size={16} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontWeight: '600', fontSize: 13 }}>Text Field</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#58A6FF18' }]} onPress={() => addField('file')}>
              <MaterialCommunityIcons name="file-plus-outline" size={16} color="#58A6FF" />
              <Text style={{ color: '#58A6FF', fontWeight: '600', fontSize: 13 }}>File Field</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra Headers */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Headers</Text>
            <TouchableOpacity onPress={() => setHeaders((h) => [...h, { key: '', value: '' }])}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {headers.map((h, i) => (
            <View key={i} style={[styles.hdrRow, { borderBottomColor: colors.divider }]}>
              <TextInput
                style={[styles.hdrInput, { color: colors.text, borderColor: colors.cardBorder }]}
                placeholder="Key"
                placeholderTextColor={colors.textTertiary}
                value={h.key}
                onChangeText={(v) => setHeaders((hs) => hs.map((hh, idx) => (idx === i ? { ...hh, key: v } : hh)))}
              />
              <TextInput
                style={[styles.hdrInput, { color: colors.text, borderColor: colors.cardBorder, flex: 1 }]}
                placeholder="Value"
                placeholderTextColor={colors.textTertiary}
                value={h.value}
                onChangeText={(v) => setHeaders((hs) => hs.map((hh, idx) => (idx === i ? { ...hh, value: v } : hh)))}
              />
              <TouchableOpacity onPress={() => setHeaders((hs) => hs.filter((_, idx) => idx !== i))}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          {headers.length === 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Content-Type will be set automatically</Text>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={sendRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
              <Text style={styles.sendText}>Upload & Send</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Response */}
        {response && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.resHeader}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(response.status) + '22' }]}>
                <Text style={{ color: getStatusColor(response.status), fontWeight: '700', fontSize: 15 }}>
                  {response.status || 'ERR'}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{response.time}ms</Text>
            </View>
            <ScrollView
              horizontal
              style={[styles.resBody, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
            >
              <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 12, padding: 12 }}>
                {response.body.substring(0, 3000)}
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
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  methodPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  methodText: { fontSize: 13, fontWeight: '700' },
  urlInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'monospace' },
  fieldRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 6 },
  filePicker: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hdrRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  hdrInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, minWidth: 80 },
  sendBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  resBody: { borderRadius: 10, maxHeight: 300 },
});
