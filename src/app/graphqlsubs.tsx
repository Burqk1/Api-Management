import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface SubMessage {
  id: string;
  data: string;
  timestamp: number;
}

export default function GraphQLSubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [wsUrl, setWsUrl] = useState('');
  const [query, setQuery] = useState('subscription {\n  messageAdded {\n    id\n    content\n    user\n  }\n}');
  const [variables, setVariables] = useState('');
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SubMessage[]>([]);
  const [error, setError] = useState('');
  const [protocol, setProtocol] = useState<'ws' | 'sse'>('ws');
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<any>(null);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const connect = useCallback(() => {
    setError('');
    setMessages([]);

    if (protocol === 'ws') {
      try {
        const url = wsUrl.replace(/^http/, 'ws');
        const ws = new WebSocket(url, 'graphql-ws');
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          // Send connection_init
          ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
          // Send subscription
          let vars: any = undefined;
          try { if (variables.trim()) vars = JSON.parse(variables); } catch {}
          setTimeout(() => {
            ws.send(JSON.stringify({ id: '1', type: 'start', payload: { query, variables: vars } }));
          }, 100);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'data' || msg.type === 'next') {
              setMessages((prev) => [...prev, { id: Date.now().toString(), data: JSON.stringify(msg.payload, null, 2), timestamp: Date.now() }]);
            } else if (msg.type === 'error') {
              setError(JSON.stringify(msg.payload));
            }
          } catch {
            setMessages((prev) => [...prev, { id: Date.now().toString(), data: e.data, timestamp: Date.now() }]);
          }
        };

        ws.onerror = () => setError('WebSocket connection error');
        ws.onclose = () => setConnected(false);
      } catch (e: any) {
        setError(e.message);
      }
    } else {
      // SSE-based subscriptions
      try {
        const url = new URL(wsUrl);
        url.searchParams.set('query', query);
        if (variables.trim()) url.searchParams.set('variables', variables);

        const es = new EventSource(url.toString());
        sseRef.current = es;
        setConnected(true);

        es.onmessage = (e: any) => {
          setMessages((prev) => [...prev, { id: Date.now().toString(), data: e.data, timestamp: Date.now() }]);
        };
        es.onerror = () => { setError('SSE connection error'); setConnected(false); };
      } catch (e: any) {
        setError(e.message);
      }
    }
  }, [wsUrl, query, variables, protocol]);

  const disconnect = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setConnected(false);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'GraphQL Subscriptions' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Protocol Toggle */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['ws', 'sse'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.protoBtn, { backgroundColor: protocol === p ? colors.primary + '20' : cardBg, borderColor: protocol === p ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setProtocol(p)}
              >
                <MaterialCommunityIcons name={p === 'ws' ? 'lan-connect' : 'broadcast'} size={16} color={protocol === p ? colors.primary : colors.textSecondary} />
                <Text style={{ color: protocol === p ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{p === 'ws' ? 'WebSocket' : 'SSE'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* URL */}
          <View style={[styles.urlBar, { backgroundColor: cardBg }]}>
            <View style={[styles.badge, { backgroundColor: connected ? '#3FB95020' : '#A371F720' }]}>
              <Text style={{ color: connected ? '#3FB950' : '#A371F7', fontSize: 10, fontWeight: '800' }}>GQL</Text>
            </View>
            <TextInput
              style={[styles.urlInput, { color: colors.text }]}
              value={wsUrl}
              onChangeText={setWsUrl}
              placeholder={protocol === 'ws' ? 'wss://api.example.com/graphql' : 'https://api.example.com/graphql'}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Query */}
          <Text style={[styles.label, { color: colors.text }]}>Subscription Query</Text>
          <TextInput
            style={[styles.codeInput, { backgroundColor: cardBg, color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Variables */}
          <Text style={[styles.label, { color: colors.text }]}>Variables</Text>
          <TextInput
            style={[styles.codeInput, { backgroundColor: cardBg, color: colors.text, minHeight: 50 }]}
            value={variables}
            onChangeText={setVariables}
            multiline
            placeholder='{"channel": "general"}'
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          {/* Connect/Disconnect */}
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: connected ? '#FF6961' : colors.primary }]}
            onPress={connected ? disconnect : connect}
          >
            <MaterialCommunityIcons name={connected ? 'close-circle' : 'connection'} size={20} color="#FFF" />
            <Text style={styles.connectBtnText}>{connected ? 'Disconnect' : 'Subscribe'}</Text>
          </TouchableOpacity>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: '#FF696115' }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6961" />
              <Text style={{ color: '#FF6961', fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {/* Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.statusDot, { backgroundColor: connected ? '#3FB950' : '#8B949E' }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {connected ? 'Listening...' : 'Disconnected'}
              </Text>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{messages.length} messages</Text>
            {messages.length > 0 && (
              <TouchableOpacity onPress={() => setMessages([])}>
                <Text style={{ color: '#FF6961', fontSize: 12, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Messages */}
          {messages.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="antenna" size={40} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {connected ? 'Waiting for subscription events...' : 'Subscribe to start receiving events'}
              </Text>
            </View>
          ) : (
            messages.map((msg, i) => (
              <View key={msg.id} style={[styles.msgCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={[styles.badge, { backgroundColor: '#3FB95020' }]}>
                    <Text style={{ color: '#3FB950', fontSize: 9, fontWeight: '800' }}>#{i + 1}</Text>
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{formatTime(msg.timestamp)}</Text>
                </View>
                <Text style={[styles.msgText, { color: colors.text }]} selectable>{msg.data}</Text>
              </View>
            ))
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
  protoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  urlBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 6, gap: 6, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  urlInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  codeInput: { borderRadius: 12, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 100, lineHeight: 20 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  connectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  msgCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  msgText: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 18 },
});
