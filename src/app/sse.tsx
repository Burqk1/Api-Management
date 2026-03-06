import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { SSEMessage } from '../types/api';
import * as Clipboard from 'expo-clipboard';

type SSEStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function SSEScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [headers, setHeaders] = useState('');
  const [filter, setFilter] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const connect = useCallback(async () => {
    if (!url.trim()) return;
    setStatus('connecting');
    setMessages([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reqHeaders: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      };
      if (headers.trim()) {
        headers.split('\n').forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) reqHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        });
      }

      const res = await fetch(url, {
        headers: reqHeaders,
        signal: controller.signal,
      });

      if (!res.ok) {
        setStatus('error');
        setMessages([{ data: `HTTP ${res.status}: ${res.statusText}`, timestamp: Date.now() }]);
        return;
      }

      setStatus('connected');

      const reader = res.body?.getReader();
      if (!reader) {
        setStatus('error');
        return;
      }
      readerRef.current = reader;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent: Partial<SSEMessage> = {};
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            currentEvent.data = (currentEvent.data || '') + line.slice(6);
          } else if (line.startsWith('event: ')) {
            currentEvent.event = line.slice(7);
          } else if (line.startsWith('id: ')) {
            currentEvent.id = line.slice(4);
          } else if (line === '') {
            if (currentEvent.data !== undefined) {
              const msg: SSEMessage = {
                data: currentEvent.data,
                event: currentEvent.event,
                id: currentEvent.id,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev.slice(-500), msg]);
            }
            currentEvent = {};
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus('error');
        setMessages((prev) => [...prev, { data: `Error: ${err.message}`, timestamp: Date.now() }]);
      }
    }
    setStatus('disconnected');
  }, [url, headers]);

  const disconnect = useCallback(() => {
    abortRef.current?.abort();
    readerRef.current?.cancel();
    readerRef.current = null;
    abortRef.current = null;
    setStatus('disconnected');
  }, []);

  const filteredMessages = filter
    ? messages.filter((m) => m.data.includes(filter) || m.event?.includes(filter))
    : messages;

  const statusColor = status === 'connected' ? '#3FB950' : status === 'error' ? '#FF6961' : status === 'connecting' ? '#D29922' : '#8B949E';

  return (
    <>
      <Stack.Screen options={{ title: t('sseTesting') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Connection Bar */}
        <View style={[styles.connBar, { backgroundColor: cardBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <TextInput
            style={[styles.urlInput, { color: colors.text, backgroundColor: inputBg }]}
            value={url}
            onChangeText={setUrl}
            placeholder="https://api.example.com/events"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            editable={status === 'disconnected'}
          />
          <TouchableOpacity
            style={[styles.connBtn, { backgroundColor: status === 'disconnected' ? colors.primary : '#FF6961' }]}
            onPress={status === 'disconnected' ? connect : disconnect}
          >
            <MaterialCommunityIcons
              name={status === 'disconnected' ? 'play' : 'stop'}
              size={20}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Headers (expandable) */}
        <View style={{ paddingHorizontal: 16 }}>
          <TextInput
            style={[styles.headersInput, { backgroundColor: inputBg, color: colors.text }]}
            value={headers}
            onChangeText={setHeaders}
            placeholder="Authorization: Bearer token..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={2}
            autoCapitalize="none"
          />
        </View>

        {/* Status & Filter */}
        <View style={[styles.infoRow, { paddingHorizontal: 16 }]}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {status === 'connected' ? t('sseConnected') : status === 'connecting' ? t('sseConnecting') : status === 'error' ? t('sseError') : t('sseDisconnected')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {messages.length} {t('events')}
          </Text>
          <TextInput
            style={[styles.filterInput, { backgroundColor: inputBg, color: colors.text }]}
            value={filter}
            onChangeText={setFilter}
            placeholder={t('filterEvents')}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {filteredMessages.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="broadcast" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('sseEmptyHint')}</Text>
            </View>
          )}

          {filteredMessages.map((msg, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.msgCard, { backgroundColor: cardBg }]}
              onLongPress={() => Clipboard.setStringAsync(msg.data)}
              activeOpacity={0.7}
            >
              <View style={styles.msgHeader}>
                {msg.event && (
                  <View style={[styles.eventTag, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{msg.event}</Text>
                  </View>
                )}
                {msg.id && (
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>id: {msg.id}</Text>
                )}
                <Text style={{ color: colors.textTertiary, fontSize: 11, marginLeft: 'auto' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text
                style={[styles.msgData, { color: colors.text }]}
                numberOfLines={10}
                selectable
              >
                {msg.data}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom Actions */}
        {messages.length > 0 && (
          <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: inputBg }]}
              onPress={() => {
                const text = messages.map((m) => `[${m.event || 'message'}] ${m.data}`).join('\n');
                Clipboard.setStringAsync(text);
              }}
            >
              <MaterialCommunityIcons name="content-copy" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{t('copyAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FF696115' }]}
              onPress={() => setMessages([])}
            >
              <MaterialCommunityIcons name="delete-outline" size={16} color="#FF6961" />
              <Text style={{ color: '#FF6961', fontSize: 13, fontWeight: '600' }}>{t('clear')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  connBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  urlInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  connBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headersInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontFamily: 'monospace', marginTop: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 },
  statusLabel: { fontSize: 13, fontWeight: '700' },
  filterInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, marginLeft: 'auto' },
  messageList: { flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  msgCard: { borderRadius: 10, padding: 10, marginBottom: 6 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  msgData: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },
  bottomBar: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 30 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
});
