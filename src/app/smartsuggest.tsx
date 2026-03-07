import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

interface Suggestion {
  category: string;
  name: string;
  value: string;
  description: string;
}

const COMMON_HEADERS: Suggestion[] = [
  { category: 'Content', name: 'Content-Type', value: 'application/json', description: 'JSON request body' },
  { category: 'Content', name: 'Content-Type', value: 'application/xml', description: 'XML request body' },
  { category: 'Content', name: 'Content-Type', value: 'multipart/form-data', description: 'File upload' },
  { category: 'Content', name: 'Accept', value: 'application/json', description: 'Accept JSON response' },
  { category: 'Content', name: 'Accept-Encoding', value: 'gzip, deflate, br', description: 'Compressed responses' },
  { category: 'Content', name: 'Accept-Language', value: 'en-US,en;q=0.9', description: 'Language preference' },
  { category: 'Auth', name: 'Authorization', value: 'Bearer <token>', description: 'Bearer token auth' },
  { category: 'Auth', name: 'Authorization', value: 'Basic <base64>', description: 'Basic auth' },
  { category: 'Auth', name: 'X-API-Key', value: '<api-key>', description: 'API key header' },
  { category: 'Auth', name: 'X-Auth-Token', value: '<token>', description: 'Custom auth token' },
  { category: 'Cache', name: 'Cache-Control', value: 'no-cache', description: 'Bypass cache' },
  { category: 'Cache', name: 'Cache-Control', value: 'max-age=3600', description: 'Cache for 1 hour' },
  { category: 'Cache', name: 'If-None-Match', value: '<etag>', description: 'Conditional request' },
  { category: 'Cache', name: 'If-Modified-Since', value: '<date>', description: 'Modified since check' },
  { category: 'CORS', name: 'Origin', value: 'https://example.com', description: 'CORS origin' },
  { category: 'CORS', name: 'Access-Control-Request-Method', value: 'POST', description: 'Preflight method' },
  { category: 'Security', name: 'X-Content-Type-Options', value: 'nosniff', description: 'Prevent MIME sniffing' },
  { category: 'Security', name: 'X-Frame-Options', value: 'DENY', description: 'Prevent framing' },
  { category: 'Security', name: 'Strict-Transport-Security', value: 'max-age=31536000', description: 'Force HTTPS' },
  { category: 'Custom', name: 'X-Request-ID', value: '<uuid>', description: 'Request tracing' },
  { category: 'Custom', name: 'X-Forwarded-For', value: '<ip>', description: 'Client IP forwarding' },
  { category: 'Custom', name: 'User-Agent', value: 'DevToolbox/1.0', description: 'Custom user agent' },
  { category: 'Pagination', name: 'X-Page', value: '1', description: 'Page number' },
  { category: 'Pagination', name: 'X-Per-Page', value: '20', description: 'Items per page' },
  { category: 'Rate', name: 'X-RateLimit-Limit', value: '100', description: 'Rate limit header' },
  { category: 'Rate', name: 'Retry-After', value: '60', description: 'Retry after seconds' },
];

const COMMON_PARAMS: Suggestion[] = [
  { category: 'Pagination', name: 'page', value: '1', description: 'Page number' },
  { category: 'Pagination', name: 'limit', value: '20', description: 'Items per page' },
  { category: 'Pagination', name: 'offset', value: '0', description: 'Skip items' },
  { category: 'Pagination', name: 'cursor', value: '<cursor>', description: 'Cursor-based pagination' },
  { category: 'Filter', name: 'sort', value: 'created_at', description: 'Sort field' },
  { category: 'Filter', name: 'order', value: 'desc', description: 'Sort order' },
  { category: 'Filter', name: 'search', value: '<query>', description: 'Search query' },
  { category: 'Filter', name: 'q', value: '<query>', description: 'Search shorthand' },
  { category: 'Filter', name: 'filter', value: 'status:active', description: 'Filter expression' },
  { category: 'Filter', name: 'fields', value: 'id,name,email', description: 'Sparse fieldset' },
  { category: 'Filter', name: 'include', value: 'posts,comments', description: 'Include relations' },
  { category: 'Filter', name: 'expand', value: 'author', description: 'Expand nested' },
  { category: 'Date', name: 'from', value: '2024-01-01', description: 'Start date' },
  { category: 'Date', name: 'to', value: '2024-12-31', description: 'End date' },
  { category: 'Date', name: 'since', value: '2024-01-01T00:00:00Z', description: 'Since ISO date' },
  { category: 'Format', name: 'format', value: 'json', description: 'Response format' },
  { category: 'Format', name: 'pretty', value: 'true', description: 'Pretty print' },
  { category: 'Format', name: 'locale', value: 'en-US', description: 'Locale preference' },
  { category: 'Auth', name: 'api_key', value: '<key>', description: 'API key param' },
  { category: 'Auth', name: 'token', value: '<token>', description: 'Token param' },
  { category: 'Misc', name: 'callback', value: 'handleResponse', description: 'JSONP callback' },
  { category: 'Misc', name: 'dry_run', value: 'true', description: 'Dry run mode' },
  { category: 'Misc', name: 'verbose', value: 'true', description: 'Verbose output' },
];

const STATUS_CODES: { code: number; text: string; desc: string }[] = [
  { code: 200, text: 'OK', desc: 'Request succeeded' },
  { code: 201, text: 'Created', desc: 'Resource created' },
  { code: 204, text: 'No Content', desc: 'Success, no body' },
  { code: 301, text: 'Moved Permanently', desc: 'Permanent redirect' },
  { code: 304, text: 'Not Modified', desc: 'Cached version OK' },
  { code: 400, text: 'Bad Request', desc: 'Invalid request' },
  { code: 401, text: 'Unauthorized', desc: 'Auth required' },
  { code: 403, text: 'Forbidden', desc: 'Access denied' },
  { code: 404, text: 'Not Found', desc: 'Resource not found' },
  { code: 405, text: 'Method Not Allowed', desc: 'Wrong HTTP method' },
  { code: 409, text: 'Conflict', desc: 'Resource conflict' },
  { code: 422, text: 'Unprocessable', desc: 'Validation failed' },
  { code: 429, text: 'Too Many Requests', desc: 'Rate limited' },
  { code: 500, text: 'Internal Server Error', desc: 'Server error' },
  { code: 502, text: 'Bad Gateway', desc: 'Gateway error' },
  { code: 503, text: 'Service Unavailable', desc: 'Service down' },
];

export default function SmartSuggestScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [tab, setTab] = useState<'headers' | 'params' | 'status'>('headers');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;

  const data = tab === 'headers' ? COMMON_HEADERS : tab === 'params' ? COMMON_PARAMS : [];
  const filtered = search.trim()
    ? data.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
    : data;

  const categories = useMemo(() => {
    const cats: Record<string, Suggestion[]> = {};
    filtered.forEach((s) => { if (!cats[s.category]) cats[s.category] = []; cats[s.category].push(s); });
    return Object.entries(cats);
  }, [filtered]);

  const copy = (text: string, id: string) => {
    Clipboard.setStringAsync(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  const statusColor = (code: number) => code < 300 ? '#3FB950' : code < 400 ? '#58A6FF' : code < 500 ? '#D29922' : '#FF6961';

  return (
    <>
      <Stack.Screen options={{ title: 'Smart Suggestions' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { key: 'headers' as const, icon: 'web', label: 'Headers' },
              { key: 'params' as const, icon: 'code-brackets', label: 'Parameters' },
              { key: 'status' as const, icon: 'information-outline', label: 'Status Codes' },
            ].map((tb) => (
              <TouchableOpacity
                key={tb.key}
                style={[styles.tab, { backgroundColor: tab === tb.key ? colors.primary + '20' : cardBg, borderColor: tab === tb.key ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setTab(tb.key)}
              >
                <MaterialCommunityIcons name={tb.icon as any} size={16} color={tab === tb.key ? colors.primary : colors.textSecondary} />
                <Text style={{ color: tab === tb.key ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{tb.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          {tab !== 'status' && (
            <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textTertiary} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 14 }}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${tab}...`}
                placeholderTextColor={colors.textTertiary}
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}><MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} /></TouchableOpacity> : null}
            </View>
          )}

          {/* Headers / Params */}
          {tab !== 'status' && categories.map(([cat, items]) => (
            <View key={cat} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</Text>
              {items.map((item, i) => {
                const id = `${cat}-${item.name}-${i}`;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.itemCard, { backgroundColor: cardBg }]}
                    onPress={() => copy(`${item.name}: ${item.value}`, id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{item.value}</Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{item.description}</Text>
                    </View>
                    <MaterialCommunityIcons name={copied === id ? 'check' : 'content-copy'} size={16} color={copied === id ? '#3FB950' : colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Status Codes */}
          {tab === 'status' && STATUS_CODES.map((sc) => (
            <TouchableOpacity
              key={sc.code}
              style={[styles.statusCard, { backgroundColor: cardBg }]}
              onPress={() => copy(String(sc.code), `sc-${sc.code}`)}
            >
              <View style={[styles.codeBadge, { backgroundColor: statusColor(sc.code) + '20' }]}>
                <Text style={{ color: statusColor(sc.code), fontSize: 16, fontWeight: '800' }}>{sc.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{sc.text}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{sc.desc}</Text>
              </View>
              <MaterialCommunityIcons name={copied === `sc-${sc.code}` ? 'check' : 'content-copy'} size={16} color={copied === `sc-${sc.code}` ? '#3FB950' : colors.textTertiary} />
            </TouchableOpacity>
          ))}

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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, marginBottom: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 6 },
  codeBadge: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
