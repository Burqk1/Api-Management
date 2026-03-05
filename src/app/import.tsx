import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { generateId, HttpMethod } from '../types/api';

type ImportFormat = 'postman' | 'insomnia' | 'openapi' | 'curl';

export default function ImportScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const addCollection = useApiStore((s) => s.addCollection);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [format, setFormat] = useState<ImportFormat>('postman');
  const [jsonText, setJsonText] = useState('');
  const [result, setResult] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const formats: { key: ImportFormat; label: string; icon: string; color: string }[] = [
    { key: 'postman', label: 'Postman', icon: 'alpha-p-box', color: '#FF6C37' },
    { key: 'insomnia', label: 'Insomnia', icon: 'alpha-i-box', color: '#7B6BCC' },
    { key: 'openapi', label: 'OpenAPI', icon: 'api', color: '#6BA539' },
    { key: 'curl', label: 'cURL', icon: 'console', color: '#8B949E' },
  ];

  const parsePostman = (data: any) => {
    const col = addCollection({
      name: data.info?.name || 'Imported Collection',
      description: data.info?.description || '',
      color: '#FF6C37',
      icon: 'folder-outline',
      baseUrl: '',
    });

    let count = 0;
    const processItems = (items: any[], collectionId: string) => {
      for (const item of items) {
        if (item.item) {
          processItems(item.item, collectionId);
          continue;
        }
        const req = item.request;
        if (!req) continue;

        const method = (req.method || 'GET').toUpperCase() as HttpMethod;
        let url = '';
        if (typeof req.url === 'string') url = req.url;
        else if (req.url?.raw) url = req.url.raw;

        const headers = (req.header || []).map((h: any) => ({
          key: h.key || '',
          value: h.value || '',
          enabled: !h.disabled,
        }));

        let body = '';
        if (req.body?.raw) body = req.body.raw;

        addEndpoint({
          name: item.name || url,
          url,
          method,
          headers,
          body,
          collectionId,
          assertions: [],
        });
        count++;
      }
    };

    processItems(data.item || [], col.id);
    return count;
  };

  const parseInsomnia = (data: any) => {
    const resources = data.resources || [];
    const workspaces = resources.filter((r: any) => r._type === 'workspace');
    const requests = resources.filter((r: any) => r._type === 'request');

    const ws = workspaces[0];
    const col = addCollection({
      name: ws?.name || 'Insomnia Import',
      description: ws?.description || '',
      color: '#7B6BCC',
      icon: 'folder-outline',
      baseUrl: '',
    });

    for (const req of requests) {
      addEndpoint({
        name: req.name || req.url || 'Unnamed',
        url: req.url || '',
        method: (req.method || 'GET').toUpperCase() as HttpMethod,
        headers: (req.headers || []).map((h: any) => ({ key: h.name, value: h.value, enabled: true })),
        body: req.body?.text || '',
        collectionId: col.id,
        assertions: [],
      });
    }
    return requests.length;
  };

  const parseOpenAPI = (data: any) => {
    const title = data.info?.title || 'OpenAPI Import';
    const baseUrl = data.servers?.[0]?.url || '';
    const col = addCollection({
      name: title,
      description: data.info?.description || '',
      color: '#6BA539',
      icon: 'api',
      baseUrl,
    });

    let count = 0;
    const paths = data.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, spec] of Object.entries(methods as Record<string, any>)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
          addEndpoint({
            name: spec.summary || spec.operationId || `${method.toUpperCase()} ${path}`,
            url: baseUrl + path,
            method: method.toUpperCase() as HttpMethod,
            headers: [],
            body: '',
            collectionId: col.id,
            assertions: [],
          });
          count++;
        }
      }
    }
    return count;
  };

  const parseCurl = (text: string) => {
    const col = addCollection({
      name: 'cURL Import',
      description: '',
      color: '#8B949E',
      icon: 'console',
      baseUrl: '',
    });

    // Parse multiple curl commands separated by newlines
    const commands = text.split(/\n(?=curl\s)/i).filter((c) => c.trim());
    let count = 0;

    for (const cmd of commands) {
      let method: HttpMethod = 'GET';
      let url = '';
      const headers: { key: string; value: string; enabled: boolean }[] = [];
      let body = '';

      // Extract method
      const methodMatch = cmd.match(/-X\s+(\w+)/);
      if (methodMatch) method = methodMatch[1].toUpperCase() as HttpMethod;

      // Extract URL
      const urlMatch = cmd.match(/curl\s+['"]?([^\s'"]+)/i) || cmd.match(/['"]?(https?:\/\/[^\s'"]+)/);
      if (urlMatch) url = urlMatch[1];

      // Extract headers
      const headerMatches = cmd.matchAll(/-H\s+['"]([^'"]+)['"]/g);
      for (const m of headerMatches) {
        const idx = m[1].indexOf(':');
        if (idx > 0) {
          headers.push({ key: m[1].slice(0, idx).trim(), value: m[1].slice(idx + 1).trim(), enabled: true });
        }
      }

      // Extract body
      const bodyMatch = cmd.match(/-d\s+['"](.+?)['"]/s) || cmd.match(/--data\s+['"](.+?)['"]/s);
      if (bodyMatch) {
        body = bodyMatch[1];
        if (method === 'GET') method = 'POST';
      }

      if (url) {
        addEndpoint({
          name: url.split('?')[0].split('/').pop() || url,
          url,
          method,
          headers,
          body,
          collectionId: col.id,
          assertions: [],
        });
        count++;
      }
    }
    return count;
  };

  const handleImport = () => {
    if (!jsonText.trim()) return;
    try {
      let count = 0;
      if (format === 'curl') {
        count = parseCurl(jsonText);
      } else {
        const data = JSON.parse(jsonText);
        if (format === 'postman') count = parsePostman(data);
        else if (format === 'insomnia') count = parseInsomnia(data);
        else if (format === 'openapi') count = parseOpenAPI(data);
      }

      setResult(`${t('imported')} ${count} ${t('endpointsCount')}`);
      Alert.alert(t('imported'), `${count} ${t('endpointsCount')} ${t('imported').toLowerCase()}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setResult(`${t('error')}: ${err.message}`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('importData') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Format Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('selectFormat')}</Text>
          <View style={styles.formatRow}>
            {formats.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatCard, { backgroundColor: format === f.key ? f.color + '20' : cardBg, borderColor: format === f.key ? f.color : 'transparent', borderWidth: 2 }]}
                onPress={() => setFormat(f.key)}
              >
                <MaterialCommunityIcons name={f.icon as any} size={28} color={f.color} />
                <Text style={[styles.formatLabel, { color: format === f.key ? f.color : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
            {format === 'curl' ? t('pasteCurl') : t('pasteJson')}
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={jsonText}
              onChangeText={setJsonText}
              placeholder={format === 'curl'
                ? 'curl -X GET https://api.example.com/users \\\n  -H "Authorization: Bearer token"'
                : '{\n  "info": { "name": "My Collection" },\n  "item": [...]\n}'
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {result ? (
            <View style={[styles.resultBox, { backgroundColor: result.startsWith('Error') ? '#FF696112' : '#3FB95012' }]}>
              <Text style={{ color: result.startsWith('Error') ? '#FF6961' : '#3FB950', fontSize: 14, fontWeight: '600' }}>{result}</Text>
            </View>
          ) : null}

          {/* Import Button */}
          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: colors.primary, opacity: jsonText.trim() ? 1 : 0.4 }]}
            onPress={handleImport}
            disabled={!jsonText.trim()}
          >
            <MaterialCommunityIcons name="import" size={20} color="#FFF" />
            <Text style={styles.importText}>{t('importData')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  formatLabel: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 200 },
  resultBox: { borderRadius: 10, padding: 12, marginBottom: 12 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  importText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
