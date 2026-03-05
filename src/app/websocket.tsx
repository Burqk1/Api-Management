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
import { generateId } from '../types/api';

interface WsMessage {
  id: string;
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
}

export default function WebSocketScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const [wsUrl, setWsUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;

  const connect = useCallback(() => {
    if (!wsUrl.trim()) return;
    setConnecting(true);
    setMessages([]);

    try {
      const ws = new WebSocket(wsUrl.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'received',
          data: `[${t('wsConnected')}]`,
          timestamp: Date.now(),
        }]);
      };

      ws.onmessage = (event) => {
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'received',
          data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
          timestamp: Date.now(),
        }]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      };

      ws.onerror = () => {
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'received',
          data: `[${t('wsError')}]`,
          timestamp: Date.now(),
        }]);
        setConnecting(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'received',
          data: `[${t('wsDisconnected')}]`,
          timestamp: Date.now(),
        }]);
      };
    } catch {
      setConnecting(false);
    }
  }, [wsUrl, t]);

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  const sendMessage = () => {
    if (!message.trim() || !wsRef.current) return;
    wsRef.current.send(message);
    setMessages((prev) => [...prev, {
      id: generateId(),
      direction: 'sent',
      data: message,
      timestamp: Date.now(),
    }]);
    setMessage('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();

  const formatData = (data: string) => {
    try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('websocketTesting') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* URL Bar */}
        <View style={[styles.urlBar, { backgroundColor: inputBg, marginHorizontal: padding, marginTop: 12 }]}>
          <View style={[styles.protocolBadge, { backgroundColor: connected ? '#3FB95020' : '#D2992220' }]}>
            <Text style={[styles.protocolText, { color: connected ? '#3FB950' : '#D29922' }]}>WS</Text>
          </View>
          <TextInput
            style={[styles.urlInput, { color: colors.text }]}
            value={wsUrl}
            onChangeText={setWsUrl}
            placeholder="wss://echo.websocket.org"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            editable={!connected}
          />
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: connected ? '#FF6961' : colors.primary }]}
            onPress={connected ? disconnect : connect}
            disabled={connecting}
          >
            <MaterialCommunityIcons
              name={connected ? 'connection' : 'power-plug'}
              size={18}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={[styles.statusRow, { marginHorizontal: padding }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#3FB950' : connecting ? '#D29922' : '#8B949E' }]} />
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
            {connected ? t('wsStatusConnected') : connecting ? t('wsStatusConnecting') : t('wsStatusDisconnected')}
          </Text>
          <Text style={[styles.statusCount, { color: colors.textTertiary }]}>
            {messages.length} {t('wsMessages')}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="lan-connect" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('wsEmptyHint')}</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.msgBubble,
                  {
                    backgroundColor: msg.direction === 'sent' ? colors.primary + '15' : inputBg,
                    alignSelf: msg.direction === 'sent' ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <View style={styles.msgHeader}>
                  <MaterialCommunityIcons
                    name={msg.direction === 'sent' ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={14}
                    color={msg.direction === 'sent' ? colors.primary : '#3FB950'}
                  />
                  <Text style={[styles.msgTime, { color: colors.textTertiary }]}>{formatTime(msg.timestamp)}</Text>
                </View>
                <Text style={[styles.msgData, { color: colors.text }]} selectable>
                  {formatData(msg.data)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Send Bar */}
        <View style={[styles.sendBar, { backgroundColor: inputBg, marginHorizontal: padding, marginBottom: Platform.OS === 'ios' ? 0 : 12 }]}>
          <TextInput
            style={[styles.msgInput, { color: colors.text }]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('wsTypePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            editable={connected}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: connected && message.trim() ? 1 : 0.4 }]}
            onPress={sendMessage}
            disabled={!connected || !message.trim()}
          >
            <MaterialCommunityIcons name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  urlBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 6, gap: 6 },
  protocolBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  protocolText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  urlInput: { flex: 1, fontSize: 14, letterSpacing: -0.2, paddingVertical: 8 },
  connectBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  statusCount: { fontSize: 12, marginLeft: 'auto' },

  messageList: { flex: 1 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  msgBubble: { borderRadius: 12, padding: 10, marginTop: 6, maxWidth: '85%' },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  msgTime: { fontSize: 11 },
  msgData: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, lineHeight: 18,
  },

  sendBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 6, gap: 6 },
  msgInput: { flex: 1, fontSize: 14, paddingVertical: 8, paddingHorizontal: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
