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

type DocFormat = 'markdown' | 'openapi' | 'html';

function generateHTMLDocs(col: any, eps: any[]): string {
  const mc: Record<string, string> = { GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7' };
  const rows = eps.map((ep) => {
    const c = mc[ep.method] || '#999';
    const hdr = (ep.headers || []).filter((h: any) => h.enabled).map((h: any) => `<tr><td><code>${h.key}</code></td><td><code>${h.value}</code></td></tr>`).join('');
    const body = ep.body ? `<h4>Request Body</h4><pre class="cb"><code>${ep.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>` : '';
    return `<div class="ep" id="ep-${ep.id}"><div class="eh"><span class="m" style="background:${c}">${ep.method}</span><span class="en">${ep.name}</span></div><div class="eu"><code>${ep.url}</code></div>${ep.notes ? `<p class="nt">${ep.notes}</p>` : ''}${hdr ? `<h4>Headers</h4><table class="ht"><tr><th>Key</th><th>Value</th></tr>${hdr}</table>` : ''}${body}</div>`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${col.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.6}.c{max-width:900px;margin:0 auto;padding:40px 20px}h1{font-size:32px;color:#f0f6fc;margin-bottom:8px}.ds{color:#8b949e;font-size:16px;margin-bottom:32px}.bu{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-family:monospace;color:#58a6ff}.toc{background:#161b22;border-radius:12px;padding:20px;margin-bottom:32px}.toc h3{color:#f0f6fc;margin-bottom:12px}.toc a{color:#58a6ff;text-decoration:none;display:flex;align-items:center;gap:8px;padding:6px 0}.ms{display:inline-block;width:60px;text-align:center;padding:2px 0;border-radius:4px;color:#fff;font-size:11px;font-weight:700}.ep{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px}.eh{display:flex;align-items:center;gap:12px;margin-bottom:8px}.m{color:#fff;padding:4px 12px;border-radius:6px;font-weight:700;font-size:13px}.en{font-size:20px;font-weight:700;color:#f0f6fc}.eu{font-family:monospace;color:#8b949e;margin-bottom:12px;font-size:14px}.nt{color:#8b949e;margin-bottom:12px;font-style:italic}h4{color:#f0f6fc;font-size:14px;margin:16px 0 8px}.ht{width:100%;border-collapse:collapse}.ht th,.ht td{text-align:left;padding:8px 12px;border-bottom:1px solid #30363d}.ht th{color:#8b949e;font-size:12px;text-transform:uppercase}.ht code{color:#58a6ff}.cb{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto}.cb code{color:#c9d1d9;font-size:13px;white-space:pre-wrap}</style></head><body><div class="c"><h1>${col.name}</h1><p class="ds">${col.description || 'API Documentation'}</p>${col.baseUrl ? `<div class="bu">Base URL: ${col.baseUrl}</div>` : ''}<div class="toc"><h3>Endpoints (${eps.length})</h3>${eps.map((ep) => `<a href="#ep-${ep.id}"><span class="ms" style="background:${mc[ep.method]||'#999'}">${ep.method}</span>${ep.name}</a>`).join('')}</div>${rows}<div style="text-align:center;color:#484f58;margin-top:40px;font-size:13px">Generated from API Management App</div></div></body></html>`;
}

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
    } else if (format === 'openapi') {
      const spec = generateOpenAPISpec(col, colEndpoints, callLogs);
      setGenerated(JSON.stringify(spec, null, 2));
    } else {
      setGenerated(generateHTMLDocs(col, colEndpoints));
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
            <TouchableOpacity
              style={[styles.formatBtn, { backgroundColor: format === 'html' ? '#E44D2620' : cardBg, borderColor: format === 'html' ? '#E44D26' : 'transparent', borderWidth: 2 }]}
              onPress={() => setFormat('html')}
            >
              <MaterialCommunityIcons name="language-html5" size={28} color={format === 'html' ? '#E44D26' : colors.textSecondary} />
              <Text style={{ color: format === 'html' ? '#E44D26' : colors.text, fontWeight: '600', fontSize: 13 }}>HTML</Text>
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
