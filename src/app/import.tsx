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
import { parseHAR } from '../utils/harParser';

type ImportFormat = 'postman' | 'insomnia' | 'openapi' | 'curl' | 'har';

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
    { key: 'har', label: 'HAR', icon: 'web', color: '#58A6FF' },
  ];

  const parsePostmanAuth = (auth: any): any => {
    if (!auth) return undefined;
    const type = auth.type;
    if (type === 'bearer') {
      const token = auth.bearer?.find((b: any) => b.key === 'token')?.value || '';
      return { type: 'bearer', bearer: { token } };
    }
    if (type === 'basic') {
      const username = auth.basic?.find((b: any) => b.key === 'username')?.value || '';
      const password = auth.basic?.find((b: any) => b.key === 'password')?.value || '';
      return { type: 'basic', basic: { username, password } };
    }
    if (type === 'apikey') {
      const key = auth.apikey?.find((b: any) => b.key === 'key')?.value || '';
      const value = auth.apikey?.find((b: any) => b.key === 'value')?.value || '';
      const inField = auth.apikey?.find((b: any) => b.key === 'in')?.value || 'header';
      return { type: 'apikey', apikey: { key, value, addTo: inField === 'query' ? 'query' : 'header' } };
    }
    if (type === 'oauth2') {
      const get = (k: string) => auth.oauth2?.find((b: any) => b.key === k)?.value || '';
      return {
        type: 'oauth2',
        oauth2: {
          grantType: get('grant_type') || 'authorization_code',
          authUrl: get('authUrl'),
          tokenUrl: get('accessTokenUrl'),
          clientId: get('clientId'),
          clientSecret: get('clientSecret'),
          scope: get('scope'),
          redirectUri: get('redirect_uri'),
          accessToken: get('accessToken'),
        },
      };
    }
    return undefined;
  };

  const parsePostman = (data: any) => {
    // Support both v2.0 and v2.1 formats
    const collectionAuth = data.auth ? parsePostmanAuth(data.auth) : undefined;
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

        // Replace Postman variables {{var}} — keep as-is (compatible with our env system)

        const headers = (req.header || []).map((h: any) => ({
          key: h.key || '',
          value: h.value || '',
          enabled: !h.disabled,
        }));

        // Body handling
        let body = '';
        let bodyType: any = 'none';
        let formData: any[] | undefined;
        let isGraphQL = false;
        let graphqlQuery = '';
        let graphqlVariables = '';

        if (req.body) {
          const bMode = req.body.mode;
          if (bMode === 'raw') {
            body = req.body.raw || '';
            const lang = req.body.options?.raw?.language;
            bodyType = lang === 'json' ? 'json' : 'raw';
          } else if (bMode === 'formdata') {
            bodyType = 'form-data';
            formData = (req.body.formdata || []).map((f: any) => ({
              key: f.key || '',
              value: f.value || '',
              type: f.type === 'file' ? 'file' : 'text',
              enabled: !f.disabled,
            }));
          } else if (bMode === 'urlencoded') {
            bodyType = 'x-www-form-urlencoded';
            body = (req.body.urlencoded || [])
              .map((u: any) => `${encodeURIComponent(u.key)}=${encodeURIComponent(u.value || '')}`)
              .join('&');
          } else if (bMode === 'graphql') {
            isGraphQL = true;
            bodyType = 'graphql';
            graphqlQuery = req.body.graphql?.query || '';
            graphqlVariables = req.body.graphql?.variables || '';
          }
        }

        // Auth (item-level overrides collection-level)
        const auth = req.auth ? parsePostmanAuth(req.auth) : collectionAuth;

        // Pre-request & test scripts
        let preRequestScript = '';
        let postRequestScript = '';
        for (const ev of (item.event || [])) {
          if (ev.listen === 'prerequest' && ev.script?.exec) {
            preRequestScript = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : ev.script.exec;
          }
          if (ev.listen === 'test' && ev.script?.exec) {
            postRequestScript = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : ev.script.exec;
          }
        }

        // Convert Postman tests to assertions
        const assertions: any[] = [];
        if (postRequestScript) {
          const statusMatch = postRequestScript.match(/status\)\.to\.(?:equal|eql)\((\d+)\)/);
          if (statusMatch) {
            assertions.push({ id: generateId(), type: 'status', expected: statusMatch[1] });
          }
          const bodyMatch = postRequestScript.match(/to\.(?:include|contain)\(['"](.+?)['"]\)/);
          if (bodyMatch) {
            assertions.push({ id: generateId(), type: 'body_contains', expected: bodyMatch[1] });
          }
          const timeMatch = postRequestScript.match(/responseTime\)\.to\.be\.below\((\d+)\)/);
          if (timeMatch) {
            assertions.push({ id: generateId(), type: 'response_time', expected: timeMatch[1] });
          }
        }

        addEndpoint({
          name: item.name || url,
          url,
          method,
          headers,
          body,
          bodyType,
          formData,
          collectionId,
          assertions,
          auth,
          preRequestScript: preRequestScript || undefined,
          postRequestScript: postRequestScript || undefined,
          isGraphQL: isGraphQL || undefined,
          graphqlQuery: graphqlQuery || undefined,
          graphqlVariables: graphqlVariables || undefined,
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

  const resolveRef = (obj: any, root: any): any => {
    if (obj && obj.$ref && typeof obj.$ref === 'string') {
      const parts = obj.$ref.replace('#/', '').split('/');
      let resolved = root;
      for (const p of parts) resolved = resolved?.[p];
      return resolved || obj;
    }
    return obj;
  };

  const generateExampleFromSchema = (schema: any, root: any, depth = 0): any => {
    if (!schema || depth > 5) return '';
    schema = resolveRef(schema, root);
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum?.length) return schema.enum[0];
    switch (schema.type) {
      case 'string': return schema.format === 'email' ? 'user@example.com' : schema.format === 'date-time' ? new Date().toISOString() : 'string';
      case 'number': case 'integer': return schema.minimum ?? 0;
      case 'boolean': return true;
      case 'array': {
        const itemSchema = resolveRef(schema.items, root);
        return itemSchema ? [generateExampleFromSchema(itemSchema, root, depth + 1)] : [];
      }
      case 'object': {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(schema.properties || {})) {
          result[key] = generateExampleFromSchema(val as any, root, depth + 1);
        }
        return result;
      }
      default: return '';
    }
  };

  const parseOpenAPI = (data: any) => {
    const title = data.info?.title || 'OpenAPI Import';
    const version = data.info?.version || '';
    // Support both OAS 3.x servers and Swagger 2.0 host+basePath
    let baseUrl = '';
    if (data.servers?.[0]?.url) {
      baseUrl = data.servers[0].url;
    } else if (data.host) {
      const scheme = data.schemes?.[0] || 'https';
      baseUrl = `${scheme}://${data.host}${data.basePath || ''}`;
    }
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    const col = addCollection({
      name: title + (version ? ` v${version}` : ''),
      description: data.info?.description || '',
      color: '#6BA539',
      icon: 'api',
      baseUrl,
    });

    // Parse global security for default auth
    const securitySchemes = data.components?.securitySchemes || data.securityDefinitions || {};
    const globalSecurity = data.security?.[0];
    const getAuthFromSecurity = (sec: any): any => {
      if (!sec) return undefined;
      const schemeName = Object.keys(sec)[0];
      if (!schemeName) return undefined;
      const scheme = securitySchemes[schemeName];
      if (!scheme) return undefined;
      if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        return { type: 'bearer', bearer: { token: '' } };
      }
      if (scheme.type === 'http' && scheme.scheme === 'basic') {
        return { type: 'basic', basic: { username: '', password: '' } };
      }
      if (scheme.type === 'apiKey') {
        return { type: 'apikey', apikey: { key: scheme.name || 'api_key', value: '', addTo: scheme.in === 'query' ? 'query' : 'header' } };
      }
      if (scheme.type === 'oauth2') {
        const flows = scheme.flows || {};
        const flow = flows.authorizationCode || flows.clientCredentials || flows.implicit || flows.password || {};
        return {
          type: 'oauth2',
          oauth2: {
            grantType: flows.authorizationCode ? 'authorization_code' : flows.clientCredentials ? 'client_credentials' : 'authorization_code',
            authUrl: flow.authorizationUrl || '',
            tokenUrl: flow.tokenUrl || '',
            clientId: '',
            scope: Object.keys(flow.scopes || {}).join(' '),
          },
        };
      }
      return undefined;
    };

    const defaultAuth = getAuthFromSecurity(globalSecurity);

    let count = 0;
    const paths = data.paths || {};
    for (const [path, pathItem] of Object.entries(paths)) {
      const pathParams = (pathItem as any).parameters || [];
      for (const [method, rawSpec] of Object.entries(pathItem as Record<string, any>)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
        const spec = resolveRef(rawSpec, data);

        // Build headers from parameters
        const headers: { key: string; value: string; enabled: boolean }[] = [];
        const allParams = [...pathParams, ...(spec.parameters || [])].map((p: any) => resolveRef(p, data));

        // Build URL with query params
        let fullUrl = baseUrl + path;
        const queryParams = allParams.filter((p: any) => p.in === 'query');
        if (queryParams.length > 0) {
          fullUrl += '?' + queryParams.map((p: any) => `${p.name}=${p.example || p.schema?.example || ''}`).join('&');
        }

        // Header params
        allParams.filter((p: any) => p.in === 'header').forEach((p: any) => {
          headers.push({ key: p.name, value: p.example || p.schema?.example || '', enabled: true });
        });

        // Replace path params with examples
        allParams.filter((p: any) => p.in === 'path').forEach((p: any) => {
          const example = p.example || p.schema?.example || `{${p.name}}`;
          fullUrl = fullUrl.replace(`{${p.name}}`, String(example));
        });

        // Request body
        let body = '';
        let bodyType: any = 'none';
        const reqBody = resolveRef(spec.requestBody, data);
        if (reqBody?.content) {
          if (reqBody.content['application/json']) {
            bodyType = 'json';
            const schema = resolveRef(reqBody.content['application/json'].schema, data);
            const example = reqBody.content['application/json'].example || (schema ? generateExampleFromSchema(schema, data) : '');
            body = typeof example === 'string' ? example : JSON.stringify(example, null, 2);
          } else if (reqBody.content['multipart/form-data']) {
            bodyType = 'form-data';
          } else if (reqBody.content['application/x-www-form-urlencoded']) {
            bodyType = 'x-www-form-urlencoded';
          }
        }
        // Swagger 2.0 body parameter
        const bodyParam = allParams.find((p: any) => p.in === 'body');
        if (bodyParam && !body) {
          bodyType = 'json';
          const schema = resolveRef(bodyParam.schema, data);
          const example = schema ? generateExampleFromSchema(schema, data) : '';
          body = typeof example === 'string' ? example : JSON.stringify(example, null, 2);
        }

        // Content-Type header
        if (bodyType === 'json' && !headers.find(h => h.key.toLowerCase() === 'content-type')) {
          headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
        }

        // Auth (operation-level overrides global)
        const opSecurity = spec.security?.[0];
        const auth = opSecurity !== undefined ? getAuthFromSecurity(opSecurity) : defaultAuth;

        addEndpoint({
          name: spec.summary || spec.operationId || `${method.toUpperCase()} ${path}`,
          url: fullUrl,
          method: method.toUpperCase() as HttpMethod,
          headers,
          body,
          bodyType,
          collectionId: col.id,
          assertions: [],
          auth,
        });
        count++;
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
      } else if (format === 'har') {
        const entries = parseHAR(jsonText);
        const col = addCollection({
          name: 'HAR Import',
          description: `Imported ${entries.length} requests from HAR file`,
          color: '#58A6FF',
          icon: 'web',
          baseUrl: '',
        });
        for (const entry of entries) {
          addEndpoint({
            name: entry.name,
            url: entry.url,
            method: entry.method,
            headers: entry.headers,
            body: entry.body,
            collectionId: col.id,
            assertions: [],
          });
        }
        count = entries.length;
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
