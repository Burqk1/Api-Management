import React, { useState } from 'react';
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
import { generateMarkdownDocs, generateOpenAPISpec } from '../utils/apiDocs';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

type DocFormat = 'markdown' | 'openapi';

export default function ApiDocsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const callLogs = useApiStore((s) => s.callLogs);

  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [format, setFormat] = useState<DocFormat>('markdown');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const generateDocs = () => {
    if (!selectedCol) return;
    const col = collections.find((c) => c.id === selectedCol);
    if (!col) return;

    const colEndpoints = endpoints.filter((e) => e.collectionId === selectedCol);

    if (format === 'markdown') {
      setGenerated(generateMarkdownDocs(col, colEndpoints, callLogs));
    } else {
      const spec = generateOpenAPISpec(col, colEndpoints, callLogs);
      setGenerated(JSON.stringify(spec, null, 2));
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: generated });
    } catch {}
  };

  return (
    <>
      <Stack.Screen options={{ title: t('apiDocs') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Collection Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('selectCollection')}</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {collections.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>{t('noCollections')}</Text>
            ) : (
              collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    styles.colRow,
                    selectedCol === col.id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setSelectedCol(col.id)}
                >
                  <View style={[styles.colDot, { backgroundColor: col.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.colName, { color: colors.text }]}>{col.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {endpoints.filter((e) => e.collectionId === col.id).length} {t('endpointsCount')}
                    </Text>
                  </View>
                  {selectedCol === col.id && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Format Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>{t('docFormat')}</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity
              style={[styles.formatBtn, { backgroundColor: format === 'markdown' ? colors.primary + '20' : cardBg, borderColor: format === 'markdown' ? colors.primary : 'transparent', borderWidth: 2 }]}
              onPress={() => setFormat('markdown')}
            >
              <MaterialCommunityIcons name="language-markdown" size={28} color={format === 'markdown' ? colors.primary : colors.textSecondary} />
              <Text style={{ color: format === 'markdown' ? colors.primary : colors.text, fontWeight: '600', fontSize: 13 }}>Markdown</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formatBtn, { backgroundColor: format === 'openapi' ? '#6BA53920' : cardBg, borderColor: format === 'openapi' ? '#6BA539' : 'transparent', borderWidth: 2 }]}
              onPress={() => setFormat('openapi')}
            >
              <MaterialCommunityIcons name="api" size={28} color={format === 'openapi' ? '#6BA539' : colors.textSecondary} />
              <Text style={{ color: format === 'openapi' ? '#6BA539' : colors.text, fontWeight: '600', fontSize: 13 }}>OpenAPI 3.0</Text>
            </TouchableOpacity>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.genBtn, { backgroundColor: colors.primary, opacity: selectedCol ? 1 : 0.4 }]}
            onPress={generateDocs}
            disabled={!selectedCol}
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#FFF" />
            <Text style={styles.genBtnText}>{t('generateDocumentation')}</Text>
          </TouchableOpacity>

          {/* Output */}
          {generated.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.outputHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('output')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: inputBg }]} onPress={handleCopy}>
                    <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color={copied ? '#3FB950' : colors.textSecondary} />
                    <Text style={{ color: copied ? '#3FB950' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {copied ? t('copied') : t('copyCode')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: inputBg }]} onPress={handleShare}>
                    <MaterialCommunityIcons name="share-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('share')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView
                horizontal
                style={[styles.outputBox, { backgroundColor: cardBg }]}
                contentContainerStyle={{ padding: 14 }}
              >
                <Text
                  style={[styles.outputText, { color: colors.text }]}
                  selectable
                >
                  {generated}
                </Text>
              </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  card: { borderRadius: 14, overflow: 'hidden' },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  colDot: { width: 10, height: 10, borderRadius: 5 },
  colName: { fontSize: 15, fontWeight: '600' },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  genBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  outputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  outputBox: { borderRadius: 12, maxHeight: 400 },
  outputText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },
});
