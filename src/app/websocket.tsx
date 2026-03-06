import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  direction: 'sent' | 'received' | 'system';
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

  // Auto-reconnect & ping/pong settings
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectInterval, setReconnectInterval] = useState('3');
  const [maxReconnects, setMaxReconnects] = useState('5');
  const [pingEnabled, setPingEnabled] = useState(false);
  const [pingInterval, setPingInterval] = useState('30');
  const [pingMessage, setPingMessage] = useState('ping');
  const [showSettings, setShowSettings] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalCloseRef = useRef(false);
  const lastPongRef = useRef<number>(0);

  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;
  const cardBg = isDark ? colors.surface : colors.card;

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, {
      id: generateId(),
      direction: 'system',
      data: text,
      timestamp: Date.now(),
    }]);
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    if (!pingEnabled) return;
    const interval = (parseInt(pingInterval) || 30) * 1000;
    pingTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(pingMessage);
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'sent',
          data: `[PING] ${pingMessage}`,
          timestamp: Date.now(),
        }]);
      }
    }, interval);
  }, [pingEnabled, pingInterval, pingMessage, stopPing]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback((isReconnect = false) => {
    if (!wsUrl.trim()) return;
    if (!isReconnect) {
      reconnectCountRef.current = 0;
      intentionalCloseRef.current = false;
    }
    setConnecting(true);
    if (!isReconnect) setMessages([]);

    try {
      const ws = new WebSocket(wsUrl.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        reconnectCountRef.current = 0;
        lastPongRef.current = Date.now();

        const msg = isReconnect ? `[${t('wsReconnected')}]` : `[${t('wsConnected')}]`;
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'system',
          data: msg,
          timestamp: Date.now(),
        }]);

        startPing();
      };

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);

        // Detect pong responses
        if (data === 'pong' || data === pingMessage) {
          lastPongRef.current = Date.now();
        }

        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'received',
          data,
          timestamp: Date.now(),
        }]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      };

      ws.onerror = () => {
        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'system',
          data: `[${t('wsError')}]`,
          timestamp: Date.now(),
        }]);
        setConnecting(false);
      };

      ws.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        stopPing();

        setMessages((prev) => [...prev, {
          id: generateId(),
          direction: 'system',
          data: `[${t('wsDisconnected')}] Code: ${event.code}`,
          timestamp: Date.now(),
        }]);

        // Auto-reconnect logic
        if (!intentionalCloseRef.current && autoReconnect) {
          const maxR = parseInt(maxReconnects) || 5;
          if (reconnectCountRef.current < maxR) {
            reconnectCountRef.current++;
            const delay = (parseInt(reconnectInterval) || 3) * 1000;
            addSystemMessage(`[${t('wsReconnecting')} ${reconnectCountRef.current}/${maxR} in ${delay / 1000}s...]`);
            reconnectTimerRef.current = setTimeout(() => {
              connect(true);
            }, delay);
          } else {
            addSystemMessage(`[${t('wsMaxReconnects')}]`);
          }
        }
      };
    } catch {
      setConnecting(false);
    }
  }, [wsUrl, t, autoReconnect, reconnectInterval, maxReconnects, startPing, stopPing, addSystemMessage, pingMessage]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();
    stopPing();
    wsRef.current?.close();
    wsRef.current = null;
  }, [clearReconnectTimer, stopPing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      clearReconnectTimer();
      stopPing();
      wsRef.current?.close();
    };
  }, [clearReconnectTimer, stopPing]);

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
            style={[styles.settingsBtn, { backgroundColor: showSettings ? colors.primary + '20' : 'transparent' }]}
            onPress={() => setShowSettings(!showSettings)}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={showSettings ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: connected ? '#FF6961' : colors.primary }]}
            onPress={connected ? disconnect : () => connect(false)}
            disabled={connecting}
          >
            <MaterialCommunityIcons
              name={connected ? 'connection' : 'power-plug'}
              size={18}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Connection Settings Panel */}
        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: cardBg, marginHorizontal: padding }]}>
            <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('connectionSettings')}</Text>

            {/* Auto Reconnect */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('autoReconnect')}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{t('autoReconnectDesc')}</Text>
              </View>
              <TouchableOpacity onPress={() => setAutoReconnect(!autoReconnect)}>
                <MaterialCommunityIcons
                  name={autoReconnect ? 'toggle-switch' : 'toggle-switch-off'}
                  size={40}
                  color={autoReconnect ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {autoReconnect && (
              <View style={styles.subSettings}>
                <View style={styles.inlineInput}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('reconnectDelay')}</Text>
                  <TextInput
                    style={[styles.smallInput, { backgroundColor: inputBg, color: colors.text }]}
                    value={reconnectInterval}
                    onChangeText={setReconnectInterval}
                    keyboardType="number-pad"
                  />
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>s</Text>
                </View>
                <View style={styles.inlineInput}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('maxAttempts')}</Text>
                  <TextInput
                    style={[styles.smallInput, { backgroundColor: inputBg, color: colors.text }]}
                    value={maxReconnects}
                    onChangeText={setMaxReconnects}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}

            {/* Ping/Pong */}
            <View style={[styles.settingRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, marginTop: 8, paddingTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('pingPong')}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{t('pingPongDesc')}</Text>
              </View>
              <TouchableOpacity onPress={() => setPingEnabled(!pingEnabled)}>
                <MaterialCommunityIcons
                  name={pingEnabled ? 'toggle-switch' : 'toggle-switch-off'}
                  size={40}
                  color={pingEnabled ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {pingEnabled && (
              <View style={styles.subSettings}>
                <View style={styles.inlineInput}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('interval')}</Text>
                  <TextInput
                    style={[styles.smallInput, { backgroundColor: inputBg, color: colors.text }]}
                    value={pingInterval}
                    onChangeText={setPingInterval}
                    keyboardType="number-pad"
                  />
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>s</Text>
                </View>
                <View style={styles.inlineInput}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('pingPayload')}</Text>
                  <TextInput
                    style={[styles.smallInput, { backgroundColor: inputBg, color: colors.text, width: 100 }]}
                    value={pingMessage}
                    onChangeText={setPingMessage}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Status */}
        <View style={[styles.statusRow, { marginHorizontal: padding }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#3FB950' : connecting ? '#D29922' : '#8B949E' }]} />
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
            {connected ? t('wsStatusConnected') : connecting ? t('wsStatusConnecting') : t('wsStatusDisconnected')}
          </Text>
          {autoReconnect && connected && (
            <View style={[styles.featureBadge, { backgroundColor: '#3FB95015' }]}>
              <MaterialCommunityIcons name="refresh-auto" size={12} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontSize: 10, fontWeight: '600' }}>AR</Text>
            </View>
          )}
          {pingEnabled && connected && (
            <View style={[styles.featureBadge, { backgroundColor: '#58A6FF15' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={12} color="#58A6FF" />
              <Text style={{ color: '#58A6FF', fontSize: 10, fontWeight: '600' }}>HB</Text>
            </View>
          )}
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
                    backgroundColor: msg.direction === 'system'
                      ? (isDark ? '#8B949E15' : '#8B949E10')
                      : msg.direction === 'sent' ? colors.primary + '15' : inputBg,
                    alignSelf: msg.direction === 'sent' ? 'flex-end' : msg.direction === 'system' ? 'center' : 'flex-start',
                  },
                ]}
              >
                {msg.direction === 'system' ? (
                  <Text style={{ color: colors.textTertiary, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                    {msg.data}
                  </Text>
                ) : (
                  <>
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
                  </>
                )}
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
  settingsBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  connectBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  settingsPanel: { borderRadius: 14, padding: 14, marginTop: 8, gap: 4 },
  settingsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  subSettings: { gap: 6, paddingLeft: 8, marginTop: 4, marginBottom: 4 },
  inlineInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '600', textAlign: 'center', width: 55 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  statusCount: { fontSize: 12, marginLeft: 'auto' },
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

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
