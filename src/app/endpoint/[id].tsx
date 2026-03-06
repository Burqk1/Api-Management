import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useMonitorStore } from '../../stores/monitorStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { HttpMethod, METHOD_COLORS, ApiHeader, TestAssertion, AuthConfig, AuthType, BodyType, FormDataField, OAuth2Config, OAuth2GrantType, getStatusColor, generateId } from '../../types/api';
import { useLanguageStore } from '../../stores/languageStore';
import { useCookieStore } from '../../stores/cookieStore';
import * as Clipboard from 'expo-clipboard';
import { endpointToCurl, parseCurl } from '../../utils/curl';
import { generateCode, CodeLang } from '../../utils/codeGen';
import { tryValidateSchema } from '../../utils/schemaValidator';
import JsonHighlight from '../../components/JsonHighlight';
import { Share } from 'react-native';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const ASSERTION_TYPES = [
  { type: 'status' as const, label: 'Status Code', placeholder: '200' },
  { type: 'body_contains' as const, label: 'Body Contains', placeholder: 'success' },
  { type: 'response_time' as const, label: 'Max Response Time (ms)', placeholder: '500' },
  { type: 'header_exists' as const, label: 'Header Exists', placeholder: 'content-type' },
  { type: 'json_path' as const, label: 'JSON Path Exists', placeholder: 'data.id' },
  { type: 'schema' as const, label: 'JSON Schema', placeholder: '{"type":"object","required":["id"]}' },
];

const OAUTH2_GRANT_TYPES: { value: OAuth2GrantType; label: string }[] = [
  { value: 'authorization_code', label: 'Authorization Code' },
  { value: 'client_credentials', label: 'Client Credentials' },
  { value: 'password', label: 'Password' },
  { value: 'implicit', label: 'Implicit' },
];

export default function EndpointDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const endpoints = useApiStore((s) => s.endpoints);
  const updateEndpoint = useApiStore((s) => s.updateEndpoint);
  const deleteEndpoint = useApiStore((s) => s.deleteEndpoint);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const callLogs = useApiStore((s) => s.callLogs);
  const monitorChecks = useMonitorStore((s) => s.checks);
  const addMonitorCheck = useMonitorStore((s) => s.addCheck);
  const removeMonitorCheck = useMonitorStore((s) => s.removeCheck);
  const toggleFavorite = useApiStore((s) => s.toggleFavorite);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);
  const setLastResponse = useEnvironmentStore((s) => s.setLastResponse);
  const activeEnv = useEnvironmentStore((s) => s.getActiveEnv);
  const parseCookiesFromHeaders = useCookieStore((s) => s.parseCookiesFromHeaders);
  const getCookieHeader = useCookieStore((s) => s.getCookieHeader);

  const endpoint = endpoints.find((e) => e.id === id);

  const [url, setUrl] = useState(endpoint?.url || '');
  const [method, setMethod] = useState<HttpMethod>(endpoint?.method || 'GET');
  const [body, setBody] = useState(endpoint?.body || '');
  const [bodyType, setBodyType] = useState<BodyType>(endpoint?.bodyType || 'json');
  const [formData, setFormData] = useState<FormDataField[]>(endpoint?.formData || []);
  const [headers, setHeaders] = useState<ApiHeader[]>(endpoint?.headers || []);
  const [assertions, setAssertions] = useState<TestAssertion[]>(endpoint?.assertions || []);
  const [auth, setAuth] = useState<AuthConfig>(endpoint?.auth || { type: 'none' });
  const [preRequestScript, setPreRequestScript] = useState(endpoint?.preRequestScript || '');
  const [isGraphQL, setIsGraphQL] = useState(endpoint?.isGraphQL || false);
  const [graphqlQuery, setGraphqlQuery] = useState(endpoint?.graphqlQuery || '');
  const [graphqlVariables, setGraphqlVariables] = useState(endpoint?.graphqlVariables || '');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const t = useLanguageStore((s) => s.t);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  } | null>(null);
  const [prevResponse, setPrevResponse] = useState<string | null>(null);
  const [assertionResults, setAssertionResults] = useState<{ id: string; passed: boolean }[]>([]);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'auth' | 'pre-req' | 'assertions' | 'graphql'>('headers');
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'diff'>('body');
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlInput, setCurlInput] = useState('');
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [codeLang, setCodeLang] = useState<CodeLang>('javascript');

  const isMonitored = monitorChecks.some((c) => c.endpointId === id);
  const env = activeEnv();

  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;

  const addHeader = () => {
    if (!newHeaderKey.trim()) return;
    setHeaders([...headers, { key: newHeaderKey.trim(), value: newHeaderValue.trim(), enabled: true }]);
    setNewHeaderKey('');
    setNewHeaderValue('');
  };

  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));

  const addAssertion = (type: TestAssertion['type']) => {
    setAssertions([...assertions, { id: generateId(), type, expected: '', passed: undefined }]);
  };

  const updateAssertion = (aId: string, expected: string) => {
    setAssertions(assertions.map((a) => (a.id === aId ? { ...a, expected } : a)));
  };

  const removeAssertion = (aId: string) => setAssertions(assertions.filter((a) => a.id !== aId));

  const getOAuth2 = (): OAuth2Config => auth.oauth2 || { grantType: 'authorization_code', clientId: '' };

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    if (response) setPrevResponse(response.body);
    setResponse(null);
    setError('');
    setAssertionResults([]);

    // Save changes
    if (endpoint) {
      updateEndpoint(endpoint.id, { url, method, body, bodyType, formData, headers, assertions, auth, preRequestScript, isGraphQL, graphqlQuery, graphqlVariables });
    }

    // Run pre-request script
    if (preRequestScript.trim()) {
      try {
        const scriptFn = new Function('variables', 'headers', preRequestScript);
        const scriptHeaders: Record<string, string> = {};
        scriptFn({}, scriptHeaders);
        Object.entries(scriptHeaders).forEach(([k, v]) => {
          if (typeof v === 'string') {
            setHeaders((prev) => [...prev, { key: k, value: v, enabled: true }]);
          }
        });
      } catch {}
    }

    let resolvedUrl = resolveVariables(url);
    let resolvedBody = resolveVariables(body);

    // Handle GraphQL mode
    if (isGraphQL && graphqlQuery.trim()) {
      const gqlBody: any = { query: resolveVariables(graphqlQuery) };
      try {
        if (graphqlVariables.trim()) gqlBody.variables = JSON.parse(resolveVariables(graphqlVariables));
      } catch {}
      resolvedBody = JSON.stringify(gqlBody);
    }

    const headerObj: Record<string, string> = {};
    headers.filter((h) => h.enabled).forEach((h) => {
      headerObj[resolveVariables(h.key)] = resolveVariables(h.value);
    });

    // Apply cookies
    const cookieHeader = getCookieHeader(resolvedUrl);
    if (cookieHeader) headerObj['Cookie'] = cookieHeader;

    // Apply auth
    if (auth.type === 'bearer' && auth.bearer?.token) {
      headerObj['Authorization'] = `Bearer ${resolveVariables(auth.bearer.token)}`;
    } else if (auth.type === 'oauth2' && auth.oauth2) {
      let token: string | undefined = auth.oauth2.accessToken;
      // If no token or expired, try to fetch one
      if (!token || (auth.oauth2.tokenExpiry && auth.oauth2.tokenExpiry < Date.now())) {
        try {
          token = (await fetchOAuth2Token(auth.oauth2, resolveVariables)) ?? undefined;
          if (token) {
            setAuth({ ...auth, oauth2: { ...auth.oauth2, accessToken: token, tokenExpiry: Date.now() + 3600000 } });
          }
        } catch {}
      }
      if (token) headerObj['Authorization'] = `Bearer ${token}`;
    } else if (auth.type === 'basic' && auth.basic) {
      const encoded = btoa(`${resolveVariables(auth.basic.username)}:${resolveVariables(auth.basic.password)}`);
      headerObj['Authorization'] = `Basic ${encoded}`;
    } else if (auth.type === 'apikey' && auth.apikey) {
      if (auth.apikey.addTo === 'header') {
        headerObj[resolveVariables(auth.apikey.key)] = resolveVariables(auth.apikey.value);
      } else {
        const sep = resolvedUrl.includes('?') ? '&' : '?';
        resolvedUrl += `${sep}${encodeURIComponent(auth.apikey.key)}=${encodeURIComponent(auth.apikey.value)}`;
      }
    }

    const start = Date.now();
    try {
      const fetchOpts: RequestInit = { method: isGraphQL ? 'POST' : method, headers: headerObj };
      if (isGraphQL) {
        fetchOpts.body = resolvedBody;
        if (!headerObj['Content-Type']) headerObj['Content-Type'] = 'application/json';
      } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (bodyType === 'form-data' && formData.length > 0) {
          const fd = new FormData();
          formData.filter((f) => f.enabled).forEach((f) => {
            fd.append(resolveVariables(f.key), resolveVariables(f.value));
          });
          fetchOpts.body = fd;
          delete headerObj['Content-Type']; // Let browser set multipart boundary
        } else if (bodyType === 'x-www-form-urlencoded' && formData.length > 0) {
          const params = formData
            .filter((f) => f.enabled)
            .map((f) => `${encodeURIComponent(resolveVariables(f.key))}=${encodeURIComponent(resolveVariables(f.value))}`)
            .join('&');
          fetchOpts.body = params;
          headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (resolvedBody.trim()) {
          fetchOpts.body = resolvedBody;
          if (!headerObj['Content-Type']) headerObj['Content-Type'] = 'application/json';
        }
      }

      const res = await fetch(resolvedUrl, fetchOpts);
      const elapsed = Date.now() - start;
      const resBody = await res.text();

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((value: string, key: string) => { resHeaders[key] = value; });

      // Capture cookies from response
      parseCookiesFromHeaders(resolvedUrl, resHeaders);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time: elapsed,
        size: resBody.length,
      });

      // Store for request chaining
      try { setLastResponse(JSON.parse(resBody)); } catch {}


      // Run assertions
      const aResults = assertions.map((a) => {
        let passed = false;
        switch (a.type) {
          case 'status': passed = res.status.toString() === a.expected; break;
          case 'body_contains': passed = resBody.includes(a.expected); break;
          case 'response_time': passed = elapsed <= parseInt(a.expected, 10); break;
          case 'header_exists': passed = res.headers.has(a.expected.toLowerCase()); break;
          case 'json_path':
            try {
              const json = JSON.parse(resBody);
              passed = a.expected.split('.').reduce((o: any, k: string) => o?.[k], json) !== undefined;
            } catch { passed = false; }
            break;
          case 'schema':
            try {
              const result = tryValidateSchema(resBody, a.expected);
              passed = result.valid;
            } catch { passed = false; }
            break;
        }
        return { id: a.id, passed };
      });
      setAssertionResults(aResults);

      addCallLog({
        endpointId: endpoint?.id || '',
        endpointName: endpoint?.name || url,
        collectionId: endpoint?.collectionId || '',
        url: resolvedUrl,
        method,
        statusCode: res.status,
        responseTime: elapsed,
        responseSize: resBody.length,
        success: res.status >= 200 && res.status < 400,
        timestamp: Date.now(),
        requestHeaders: headerObj,
        requestBody: resolvedBody || undefined,
        responseHeaders: resHeaders,
        responseBody: resBody.slice(0, 50000),
      });
    } catch (err: any) {
      const elapsed = Date.now() - start;
      setError(err.message || 'Request failed');
      addCallLog({
        endpointId: endpoint?.id || '',
        endpointName: endpoint?.name || url,
        collectionId: endpoint?.collectionId || '',
        url: resolvedUrl,
        method,
        statusCode: 0,
        responseTime: elapsed,
        responseSize: 0,
        success: false,
        timestamp: Date.now(),
        errorMessage: err.message,
        requestHeaders: headerObj,
        requestBody: resolvedBody || undefined,
      });
    }
    setLoading(false);
  }, [url, method, body, headers, assertions, endpoint, response, resolveVariables]);

  const toggleMonitor = () => {
    if (!endpoint) return;
    if (isMonitored) {
      const check = monitorChecks.find((c) => c.endpointId === id);
      if (check) removeMonitorCheck(check.id);
    } else {
      addMonitorCheck({
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        interval: 5,
        enabled: true,
      });
    }
  };

  const handleDelete = () => {
    if (!endpoint) return;
    Alert.alert('Delete Endpoint', `Delete "${endpoint.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEndpoint(endpoint.id); router.back(); } },
    ]);
  };

  const copyResponse = async () => {
    if (response?.body) await Clipboard.setStringAsync(response.body);
  };

  const formatJson = (text: string): string => {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  };

  // Simple diff
  const computeDiff = (oldText: string, newText: string) => {
    const oldLines = formatJson(oldText).split('\n');
    const newLines = formatJson(newText).split('\n');
    const lines: { text: string; type: 'same' | 'added' | 'removed' }[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldL = oldLines[i];
      const newL = newLines[i];
      if (oldL === newL) lines.push({ text: newL || '', type: 'same' });
      else {
        if (oldL !== undefined) lines.push({ text: oldL, type: 'removed' });
        if (newL !== undefined) lines.push({ text: newL, type: 'added' });
      }
    }
    return lines;
  };

  const endpointLogs = callLogs.filter((l) => l.endpointId === id).slice(0, 10);

  if (!endpoint) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Endpoint not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: endpoint.name }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { maxWidth: 800, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Environment Badge */}
          {env && (
            <TouchableOpacity
              style={[styles.envBadge, { backgroundColor: env.color + '15' }]}
              onPress={() => router.push('/environments' as any)}
            >
              <View style={[styles.envDot, { backgroundColor: env.color }]} />
              <Text style={[styles.envText, { color: env.color }]}>{env.name}</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color={env.color} />
            </TouchableOpacity>
          )}

          {/* URL Bar */}
          <View style={[styles.urlBar, { backgroundColor: inputBg }]}>
            <TouchableOpacity
              style={[styles.methodSelect, { backgroundColor: METHOD_COLORS[method] + '20' }]}
              onPress={() => {
                const idx = METHODS.indexOf(method);
                setMethod(METHODS[(idx + 1) % METHODS.length]);
              }}
            >
              <Text style={[styles.methodSelectText, { color: METHOD_COLORS[method] }]}>{method}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.urlInput, { color: colors.text }]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://api.example.com/{{PATH}}"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={sendRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialCommunityIcons name="send" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: endpoint.isFavorite ? '#FFD60A15' : inputBg }]}
                onPress={() => toggleFavorite(endpoint.id)}
              >
                <MaterialCommunityIcons
                  name={endpoint.isFavorite ? 'star' : 'star-outline'}
                  size={16}
                  color={endpoint.isFavorite ? '#FFD60A' : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: isMonitored ? '#3FB95015' : inputBg }]}
                onPress={toggleMonitor}
              >
                <MaterialCommunityIcons
                  name={isMonitored ? 'heart-pulse' : 'heart-outline'}
                  size={16}
                  color={isMonitored ? '#3FB950' : colors.textSecondary}
                />
                <Text style={[styles.actionPillText, { color: isMonitored ? '#3FB950' : colors.textSecondary }]}>
                  {isMonitored ? 'Monitoring' : 'Monitor'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: inputBg }]}
                onPress={async () => {
                  const curl = endpointToCurl({ method, url, headers, body });
                  await Clipboard.setStringAsync(curl);
                  Alert.alert('cURL', t('exportedToClipboard'));
                }}
              >
                <MaterialCommunityIcons name="console-line" size={16} color={colors.textSecondary} />
                <Text style={[styles.actionPillText, { color: colors.textSecondary }]}>cURL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: inputBg }]}
                onPress={() => setShowCurlModal(true)}
              >
                <MaterialCommunityIcons name="import" size={16} color={colors.textSecondary} />
                <Text style={[styles.actionPillText, { color: colors.textSecondary }]}>{t('importCurl')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: inputBg }]}
                onPress={() => setShowCodeGen(true)}
              >
                <MaterialCommunityIcons name="code-tags" size={16} color={colors.textSecondary} />
                <Text style={[styles.actionPillText, { color: colors.textSecondary }]}>{t('codeGen')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: inputBg }]}
                onPress={() => router.push('/environments' as any)}
              >
                <MaterialCommunityIcons name="server-network" size={16} color={colors.textSecondary} />
                <Text style={[styles.actionPillText, { color: colors.textSecondary }]}>Env</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: '#FF696110' }]}
                onPress={handleDelete}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6961" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Request Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <View style={[styles.tabBar, { marginTop: 0 }]}>
              {(['headers', 'body', 'auth', 'pre-req', ...(isGraphQL ? ['graphql' as const] : []), 'assertions'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab as any)}
                  style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                  <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                    {tab === 'auth' ? t('auth') : tab === 'pre-req' ? t('preReq') : tab === 'graphql' ? 'GraphQL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'headers' && headers.length > 0 ? ` (${headers.length})` : ''}
                    {tab === 'assertions' && assertions.length > 0 ? ` (${assertions.length})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <View style={[styles.tabContent, { backgroundColor: inputBg }]}>
              {headers.map((h, i) => (
                <View key={i} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.headerKey, { color: colors.primary }]}>{h.key}</Text>
                  <Text style={[styles.headerVal, { color: colors.text }]}>{h.value}</Text>
                  <TouchableOpacity onPress={() => removeHeader(i)}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.addHeaderRow}>
                <TextInput
                  style={[styles.headerInput, { backgroundColor: colors.background, color: colors.text }]}
                  value={newHeaderKey}
                  onChangeText={setNewHeaderKey}
                  placeholder="Key"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[styles.headerInput, { backgroundColor: colors.background, color: colors.text, flex: 2 }]}
                  value={newHeaderValue}
                  onChangeText={setNewHeaderValue}
                  placeholder="Value (supports {{VAR}})"
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity onPress={addHeader} style={[styles.addHeaderBtn, { backgroundColor: colors.primary + '18' }]}>
                  <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Body Tab */}
          {activeTab === 'body' && (
            <View style={[styles.tabContent, { backgroundColor: inputBg }]}>
              {/* Body Type Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as BodyType[]).map((bt) => (
                    <TouchableOpacity
                      key={bt}
                      onPress={() => setBodyType(bt)}
                      style={[styles.addAssertionBtn, { backgroundColor: bodyType === bt ? colors.primary + '25' : colors.background }]}
                    >
                      <Text style={[styles.addAssertionText, { color: bodyType === bt ? colors.primary : colors.textSecondary }]}>
                        {bt === 'none' ? 'None' : bt === 'json' ? 'JSON' : bt === 'form-data' ? 'Form Data' : bt === 'x-www-form-urlencoded' ? 'URL Encoded' : 'Raw'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* JSON / Raw body */}
              {(bodyType === 'json' || bodyType === 'raw') && (
                <TextInput
                  style={[styles.bodyEditor, { backgroundColor: colors.background, color: colors.text, marginTop: 0 }]}
                  value={body}
                  onChangeText={setBody}
                  placeholder={bodyType === 'json' ? '{"key": "{{VALUE}}"}' : 'Raw body content...'}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              )}

              {/* Form Data */}
              {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
                <View style={{ gap: 6 }}>
                  {formData.map((field, i) => (
                    <View key={i} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                      <TouchableOpacity onPress={() => setFormData(formData.map((f, j) => j === i ? { ...f, enabled: !f.enabled } : f))}>
                        <MaterialCommunityIcons name={field.enabled ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={field.enabled ? colors.primary : colors.textTertiary} />
                      </TouchableOpacity>
                      <Text style={[styles.headerKey, { color: colors.primary, opacity: field.enabled ? 1 : 0.4 }]}>{field.key}</Text>
                      <Text style={[styles.headerVal, { color: colors.text, opacity: field.enabled ? 1 : 0.4 }]} numberOfLines={1}>{field.value}</Text>
                      {bodyType === 'form-data' && (
                        <View style={[styles.addAssertionBtn, { backgroundColor: field.type === 'file' ? '#FF950020' : colors.background, paddingHorizontal: 6, paddingVertical: 2 }]}>
                          <Text style={{ fontSize: 10, color: field.type === 'file' ? '#FF9500' : colors.textTertiary }}>{field.type}</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => setFormData(formData.filter((_, j) => j !== i))}>
                        <MaterialCommunityIcons name="close-circle" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.addHeaderRow}>
                    <TextInput
                      style={[styles.headerInput, { backgroundColor: colors.background, color: colors.text }]}
                      value={newHeaderKey}
                      onChangeText={setNewHeaderKey}
                      placeholder="Key"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <TextInput
                      style={[styles.headerInput, { backgroundColor: colors.background, color: colors.text, flex: 2 }]}
                      value={newHeaderValue}
                      onChangeText={setNewHeaderValue}
                      placeholder="Value"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (!newHeaderKey.trim()) return;
                        setFormData([...formData, { key: newHeaderKey.trim(), value: newHeaderValue.trim(), type: 'text', enabled: true }]);
                        setNewHeaderKey('');
                        setNewHeaderValue('');
                      }}
                      style={[styles.addHeaderBtn, { backgroundColor: colors.primary + '18' }]}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Auth Tab */}
          {activeTab === 'auth' && (
            <View style={[styles.tabContent, { backgroundColor: inputBg }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['none', 'bearer', 'basic', 'apikey', 'oauth2'] as AuthType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setAuth({ ...auth, type })}
                      style={[styles.addAssertionBtn, {
                        backgroundColor: auth.type === type ? colors.primary + '25' : colors.background,
                      }]}
                    >
                      <Text style={[styles.addAssertionText, {
                        color: auth.type === type ? colors.primary : colors.textSecondary,
                      }]}>
                        {type === 'none' ? t('none') : type === 'bearer' ? 'Bearer' : type === 'basic' ? 'Basic' : type === 'apikey' ? 'API Key' : 'OAuth 2.0'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {auth.type === 'bearer' && (
                <TextInput
                  style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background, marginTop: 4 }]}
                  value={auth.bearer?.token || ''}
                  onChangeText={(v) => setAuth({ ...auth, bearer: { token: v } })}
                  placeholder={t('bearerTokenPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                />
              )}

              {auth.type === 'basic' && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.basic?.username || ''}
                    onChangeText={(v) => setAuth({ ...auth, basic: { ...auth.basic!, username: v, password: auth.basic?.password || '' } })}
                    placeholder={t('username')}
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.basic?.password || ''}
                    onChangeText={(v) => setAuth({ ...auth, basic: { ...auth.basic!, password: v, username: auth.basic?.username || '' } })}
                    placeholder={t('password')}
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                  />
                </View>
              )}

              {auth.type === 'apikey' && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.apikey?.key || ''}
                    onChangeText={(v) => setAuth({ ...auth, apikey: { ...auth.apikey!, key: v, value: auth.apikey?.value || '', addTo: auth.apikey?.addTo || 'header' } })}
                    placeholder={t('key')}
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.apikey?.value || ''}
                    onChangeText={(v) => setAuth({ ...auth, apikey: { ...auth.apikey!, value: v, key: auth.apikey?.key || '', addTo: auth.apikey?.addTo || 'header' } })}
                    placeholder={t('value')}
                    placeholderTextColor={colors.textTertiary}
                  />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['header', 'query'] as const).map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setAuth({ ...auth, apikey: { ...auth.apikey!, addTo: loc } })}
                        style={[styles.addAssertionBtn, {
                          backgroundColor: auth.apikey?.addTo === loc ? colors.primary + '25' : colors.background,
                        }]}
                      >
                        <Text style={[styles.addAssertionText, {
                          color: auth.apikey?.addTo === loc ? colors.primary : colors.textSecondary,
                        }]}>
                          {loc === 'header' ? t('addToHeader') : t('addToQuery')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {auth.type === 'oauth2' && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  {/* Grant Type */}
                  <Text style={[styles.assertionLabel, { color: colors.textSecondary }]}>Grant Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {OAUTH2_GRANT_TYPES.map((gt) => (
                        <TouchableOpacity
                          key={gt.value}
                          onPress={() => setAuth({ ...auth, oauth2: { ...getOAuth2(), grantType: gt.value } })}
                          style={[styles.addAssertionBtn, { backgroundColor: (auth.oauth2?.grantType || 'authorization_code') === gt.value ? colors.primary + '25' : colors.background }]}
                        >
                          <Text style={[styles.addAssertionText, { color: (auth.oauth2?.grantType || 'authorization_code') === gt.value ? colors.primary : colors.textSecondary, fontSize: 11 }]}>{gt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Common OAuth2 fields */}
                  {(auth.oauth2?.grantType === 'authorization_code' || auth.oauth2?.grantType === 'implicit') && (
                    <TextInput
                      style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                      value={auth.oauth2?.authUrl || ''}
                      onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), authUrl: v } })}
                      placeholder="Authorization URL"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                  )}
                  {auth.oauth2?.grantType !== 'implicit' && (
                    <TextInput
                      style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                      value={auth.oauth2?.tokenUrl || ''}
                      onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), tokenUrl: v } })}
                      placeholder="Token URL"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                  )}
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.oauth2?.clientId || ''}
                    onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), clientId: v } })}
                    placeholder="Client ID"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                  {auth.oauth2?.grantType !== 'implicit' && (
                    <TextInput
                      style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                      value={auth.oauth2?.clientSecret || ''}
                      onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), clientSecret: v } })}
                      placeholder="Client Secret"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                  )}
                  <TextInput
                    style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={auth.oauth2?.scope || ''}
                    onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), scope: v } })}
                    placeholder="Scope (e.g. read write)"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                  {auth.oauth2?.grantType === 'password' && (
                    <>
                      <TextInput
                        style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                        value={auth.oauth2?.username || ''}
                        onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), username: v } })}
                        placeholder={t('username')}
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                        value={auth.oauth2?.password || ''}
                        onChangeText={(v) => setAuth({ ...auth, oauth2: { ...getOAuth2(), password: v } })}
                        placeholder={t('password')}
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry
                      />
                    </>
                  )}

                  {/* Current Token */}
                  {auth.oauth2?.accessToken && (
                    <View style={{ backgroundColor: '#3FB95012', borderRadius: 8, padding: 10 }}>
                      <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Active Token</Text>
                      <Text style={{ color: colors.text, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={2}>{auth.oauth2.accessToken}</Text>
                    </View>
                  )}

                  {/* Fetch Token Button */}
                  <TouchableOpacity
                    style={[styles.addAssertionBtn, { backgroundColor: colors.primary + '20', paddingVertical: 10, alignItems: 'center' }]}
                    onPress={async () => {
                      try {
                        const token = await fetchOAuth2Token(getOAuth2(), resolveVariables);
                        if (token) {
                          setAuth({ ...auth, oauth2: { ...getOAuth2(), accessToken: token, tokenExpiry: Date.now() + 3600000 } });
                          Alert.alert('Success', 'Token fetched successfully');
                        }
                      } catch (err: any) {
                        Alert.alert('Error', err.message);
                      }
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Fetch Token</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Pre-Request Script Tab */}
          {activeTab === 'pre-req' && (
            <View>
              <TextInput
                style={[styles.bodyEditor, { backgroundColor: inputBg, color: colors.text, minHeight: 140 }]}
                value={preRequestScript}
                onChangeText={setPreRequestScript}
                placeholder={`// ${t('preReqHint')}\n// headers['X-Custom'] = 'value';`}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: isGraphQL ? '#BC8CFF15' : inputBg, marginTop: 10, alignSelf: 'flex-start' }]}
                onPress={() => setIsGraphQL(!isGraphQL)}
              >
                <MaterialCommunityIcons name="graphql" size={16} color={isGraphQL ? '#BC8CFF' : colors.textSecondary} />
                <Text style={[styles.actionPillText, { color: isGraphQL ? '#BC8CFF' : colors.textSecondary }]}>
                  GraphQL {isGraphQL ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* GraphQL Tab */}
          {activeTab === 'graphql' && isGraphQL && (
            <View style={{ gap: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>{t('graphqlQuery')}</Text>
              <TextInput
                style={[styles.bodyEditor, { backgroundColor: inputBg, color: colors.text, minHeight: 120 }]}
                value={graphqlQuery}
                onChangeText={setGraphqlQuery}
                placeholder={'query {\n  users {\n    id\n    name\n  }\n}'}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('graphqlVariables')}</Text>
              <TextInput
                style={[styles.bodyEditor, { backgroundColor: inputBg, color: colors.text, minHeight: 80 }]}
                value={graphqlVariables}
                onChangeText={setGraphqlVariables}
                placeholder='{"id": 1}'
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Assertions Tab */}
          {activeTab === 'assertions' && (
            <View style={[styles.tabContent, { backgroundColor: inputBg }]}>
              {assertions.map((a) => {
                const result = assertionResults.find((r) => r.id === a.id);
                const typeInfo = ASSERTION_TYPES.find((t) => t.type === a.type);
                return (
                  <View key={a.id} style={[styles.assertionRow, { borderBottomColor: colors.divider }]}>
                    {result && (
                      <MaterialCommunityIcons
                        name={result.passed ? 'check-circle' : 'close-circle'}
                        size={18}
                        color={result.passed ? '#3FB950' : '#FF6961'}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assertionType, { color: colors.textSecondary }]}>{typeInfo?.label}</Text>
                      <TextInput
                        style={[styles.assertionInput, { color: colors.text, backgroundColor: colors.background }]}
                        value={a.expected}
                        onChangeText={(v) => updateAssertion(a.id, v)}
                        placeholder={typeInfo?.placeholder}
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeAssertion(a.id)}>
                      <MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {ASSERTION_TYPES.map((at) => (
                    <TouchableOpacity
                      key={at.type}
                      onPress={() => addAssertion(at.type)}
                      style={[styles.addAssertionBtn, { backgroundColor: colors.primary + '15' }]}
                    >
                      <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                      <Text style={[styles.addAssertionText, { color: colors.primary }]}>{at.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Assertion Results Summary */}
          {assertionResults.length > 0 && (
            <View style={[styles.assertionSummary, {
              backgroundColor: assertionResults.every((r) => r.passed) ? '#3FB95015' : '#FF696115',
            }]}>
              <MaterialCommunityIcons
                name={assertionResults.every((r) => r.passed) ? 'check-circle' : 'alert-circle'}
                size={18}
                color={assertionResults.every((r) => r.passed) ? '#3FB950' : '#FF6961'}
              />
              <Text style={[styles.assertionSummaryText, {
                color: assertionResults.every((r) => r.passed) ? '#3FB950' : '#FF6961',
              }]}>
                {assertionResults.filter((r) => r.passed).length}/{assertionResults.length} assertions passed
              </Text>
            </View>
          )}

          {/* Error */}
          {error ? (
            <View style={[styles.errorCard, { backgroundColor: '#FF696118' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF6961" />
              <Text style={[styles.errorText, { color: '#FF6961' }]}>{error}</Text>
            </View>
          ) : null}

          {/* Response */}
          {response && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.responseHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(response.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(response.status) }]}>
                    {response.status} {response.statusText}
                  </Text>
                </View>
                <Text style={[styles.responseMeta, { color: colors.textSecondary }]}>
                  {response.time}ms · {(response.size / 1024).toFixed(1)}KB
                </Text>
              </View>

              <View style={styles.tabBar}>
                {(['body', 'headers', ...(prevResponse ? ['diff' as const] : [])] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setResponseTab(tab as any)}
                    style={[styles.tab, responseTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  >
                    <Text style={[styles.tabText, { color: responseTab === tab ? colors.primary : colors.textSecondary }]}>
                      {tab === 'body' ? 'Body' : tab === 'headers' ? 'Headers' : 'Diff'}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={async () => {
                  if (!response) return;
                  const summary = `${method} ${url}\nStatus: ${response.status} ${response.statusText}\nTime: ${response.time}ms · Size: ${(response.size / 1024).toFixed(1)}KB\n\n${formatJson(response.body).slice(0, 2000)}`;
                  await Share.share({ message: summary, title: endpoint?.name || 'API Response' });
                }} style={styles.copyBtn}>
                  <MaterialCommunityIcons name="share-variant" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={copyResponse} style={styles.copyBtn}>
                  <MaterialCommunityIcons name="content-copy" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {responseTab === 'body' ? (
                <View style={[styles.responseBody, { backgroundColor: inputBg }]}>
                  {(() => {
                    try { JSON.parse(response.body); return <JsonHighlight json={response.body} colors={colors} />; } catch {
                      return <Text style={{ color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18 }} selectable>{response.body}</Text>;
                    }
                  })()}
                </View>
              ) : responseTab === 'headers' ? (
                <View style={[styles.tabContent, { backgroundColor: inputBg }]}>
                  {Object.entries(response.headers).map(([k, v]) => (
                    <View key={k} style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
                      <Text style={[styles.headerKey, { color: colors.primary }]}>{k}</Text>
                      <Text style={[styles.headerVal, { color: colors.text }]} numberOfLines={2}>{v}</Text>
                    </View>
                  ))}
                </View>
              ) : prevResponse ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.diffContainer, { backgroundColor: inputBg }]}>
                    {computeDiff(prevResponse, response.body).map((line, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.diffLine,
                          {
                            color: line.type === 'added' ? '#3FB950' : line.type === 'removed' ? '#FF6961' : colors.text,
                            backgroundColor: line.type === 'added' ? '#3FB95010' : line.type === 'removed' ? '#FF696110' : 'transparent',
                          },
                        ]}
                      >
                        {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text}
                      </Text>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>
          )}

          {/* History */}
          {endpointLogs.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Calls</Text>
              <View style={[styles.historyCard, { backgroundColor: inputBg }]}>
                {endpointLogs.map((log, i) => (
                  <TouchableOpacity
                    key={log.id}
                    activeOpacity={0.6}
                    onPress={() => router.push(`/log/${log.id}` as any)}
                    style={[
                      styles.historyRow,
                      i < endpointLogs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                    ]}
                  >
                    <View style={[styles.historyDot, { backgroundColor: log.success ? '#3FB950' : '#FF6961' }]} />
                    <Text style={[styles.historyStatus, { color: colors.text }]}>{log.statusCode || 'ERR'}</Text>
                    <Text style={[styles.historyTime, { color: colors.textSecondary }]}>{log.responseTime}ms</Text>
                    <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* cURL Import Modal */}
        <Modal visible={showCurlModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importCurl')}</Text>
                <TouchableOpacity onPress={() => { setShowCurlModal(false); setCurlInput(''); }}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.modalInput, { backgroundColor: inputBg, color: colors.text }]}
                value={curlInput}
                onChangeText={setCurlInput}
                placeholder="curl -X GET https://api.example.com..."
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: curlInput.trim() ? 1 : 0.5 }]}
                disabled={!curlInput.trim()}
                onPress={() => {
                  const parsed = parseCurl(curlInput);
                  if (parsed) {
                    setMethod(parsed.method);
                    setUrl(parsed.url);
                    setHeaders(parsed.headers);
                    if (parsed.body) setBody(parsed.body);
                    setShowCurlModal(false);
                    setCurlInput('');
                  } else {
                    Alert.alert(t('error'), t('invalidCurl'));
                  }
                }}
              >
                <Text style={styles.modalBtnText}>{t('importCurl')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Code Generator Modal */}
        <Modal visible={showCodeGen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('codeGen')}</Text>
                <TouchableOpacity onPress={() => setShowCodeGen(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { lang: 'javascript' as CodeLang, label: 'JavaScript' },
                    { lang: 'python' as CodeLang, label: 'Python' },
                    { lang: 'swift' as CodeLang, label: 'Swift' },
                    { lang: 'kotlin' as CodeLang, label: 'Kotlin' },
                  ]).map((opt) => (
                    <TouchableOpacity
                      key={opt.lang}
                      onPress={() => setCodeLang(opt.lang)}
                      style={[styles.addAssertionBtn, {
                        backgroundColor: codeLang === opt.lang ? colors.primary + '25' : inputBg,
                      }]}
                    >
                      <Text style={[styles.addAssertionText, {
                        color: codeLang === opt.lang ? colors.primary : colors.textSecondary,
                      }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 300 }}>
                <Text
                  style={[styles.responseBody, { backgroundColor: inputBg, color: colors.text, minWidth: '100%' }]}
                  selectable
                >
                  {generateCode({ method, url, headers, body }, codeLang)}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(generateCode({ method, url, headers, body }, codeLang));
                  Alert.alert(t('codeGen'), t('exportedToClipboard'));
                }}
              >
                <MaterialCommunityIcons name="content-copy" size={16} color="#FFF" />
                <Text style={styles.modalBtnText}>{t('copyCode')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

async function fetchOAuth2Token(
  config: OAuth2Config,
  resolve: (s: string) => string
): Promise<string | null> {
  if (!config.tokenUrl && config.grantType !== 'implicit') return null;

  const params = new URLSearchParams();

  switch (config.grantType) {
    case 'client_credentials':
      params.set('grant_type', 'client_credentials');
      params.set('client_id', resolve(config.clientId));
      if (config.clientSecret) params.set('client_secret', resolve(config.clientSecret));
      if (config.scope) params.set('scope', resolve(config.scope));
      break;
    case 'password':
      params.set('grant_type', 'password');
      params.set('client_id', resolve(config.clientId));
      if (config.clientSecret) params.set('client_secret', resolve(config.clientSecret));
      if (config.username) params.set('username', resolve(config.username));
      if (config.password) params.set('password', resolve(config.password));
      if (config.scope) params.set('scope', resolve(config.scope));
      break;
    case 'authorization_code':
      if (config.refreshToken) {
        params.set('grant_type', 'refresh_token');
        params.set('refresh_token', resolve(config.refreshToken));
      } else {
        return null; // Needs browser redirect flow
      }
      params.set('client_id', resolve(config.clientId));
      if (config.clientSecret) params.set('client_secret', resolve(config.clientSecret));
      break;
    default:
      return null;
  }

  const res = await fetch(resolve(config.tokenUrl!), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  return data.access_token || null;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 12, paddingBottom: 20 },

  envBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  envDot: { width: 8, height: 8, borderRadius: 4 },
  envText: { fontSize: 13, fontWeight: '600' },

  urlBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 6, gap: 6 },
  methodSelect: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  methodSelectText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  urlInput: { flex: 1, fontSize: 14, letterSpacing: -0.2, paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionPillText: { fontSize: 13, fontWeight: '600' },

  tabBar: { flexDirection: 'row', marginTop: 16, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#38383A40' },
  tab: { paddingBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },

  tabContent: { borderRadius: 12, padding: 12, marginTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerKey: { fontSize: 13, fontWeight: '600', minWidth: 80 },
  headerVal: { fontSize: 13, flex: 1 },
  addHeaderRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  headerInput: { flex: 1, fontSize: 13, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  addHeaderBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  bodyEditor: {
    borderRadius: 12, padding: 14, marginTop: 8, minHeight: 120,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 20,
  },

  assertionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  assertionType: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  assertionInput: { fontSize: 13, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  addAssertionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  addAssertionText: { fontSize: 12, fontWeight: '600' },
  assertionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },

  assertionSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 10 },
  assertionSummaryText: { fontSize: 14, fontWeight: '600' },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 16 },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },

  responseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 14, fontWeight: '700' },
  responseMeta: { fontSize: 13 },
  copyBtn: { marginLeft: 'auto', padding: 4 },

  responseBody: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, lineHeight: 18, padding: 14, borderRadius: 12, marginTop: 8, minWidth: '100%',
  },

  diffContainer: { borderRadius: 12, padding: 14, marginTop: 8, minWidth: '100%' },
  diffLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, lineHeight: 18, paddingHorizontal: 4,
  },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  historyCard: { borderRadius: 12, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyStatus: { fontSize: 14, fontWeight: '700', minWidth: 36 },
  historyTime: { fontSize: 13, flex: 1 },
  historyDate: { fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalInput: {
    borderRadius: 12, padding: 14, minHeight: 150,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18,
  },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  modalBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
