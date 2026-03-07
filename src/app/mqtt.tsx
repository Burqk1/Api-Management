import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

// ---------------------------------------------------------------------------
// Minimal MQTT 3.1.1 packet encoder / decoder (over WebSocket)
// ---------------------------------------------------------------------------

const MQTT_CONNECT = 1;
const MQTT_CONNACK = 2;
const MQTT_PUBLISH = 3;
const MQTT_SUBSCRIBE = 8;
const MQTT_SUBACK = 9;
const MQTT_UNSUBSCRIBE = 10;
const MQTT_PINGREQ = 12;

function encodeUTF8(str: string): number[] {
  const encoded: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      encoded.push(c);
    } else if (c < 0x800) {
      encoded.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      encoded.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return encoded;
}

function decodeUTF8(bytes: Uint8Array, start: number, length: number): string {
  const arr = bytes.slice(start, start + length);
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (b < 0x80) {
      str += String.fromCharCode(b);
    } else if (b < 0xe0) {
      str += String.fromCharCode(((b & 0x1f) << 6) | (arr[++i] & 0x3f));
    } else {
      str += String.fromCharCode(((b & 0x0f) << 12) | ((arr[++i] & 0x3f) << 6) | (arr[++i] & 0x3f));
    }
  }
  return str;
}

function encodeString(s: string): number[] {
  const utf = encodeUTF8(s);
  return [(utf.length >> 8) & 0xff, utf.length & 0xff, ...utf];
}

function encodeRemainingLength(len: number): number[] {
  const bytes: number[] = [];
  do {
    let b = len % 128;
    len = Math.floor(len / 128);
    if (len > 0) b |= 0x80;
    bytes.push(b);
  } while (len > 0);
  return bytes;
}

function buildConnectPacket(clientId: string, username?: string, password?: string): ArrayBuffer {
  const variableHeader = [
    // Protocol Name "MQTT"
    0x00, 0x04, 0x4d, 0x51, 0x54, 0x54,
    // Protocol Level 4 (MQTT 3.1.1)
    0x04,
    // Connect Flags
    0x02 | (username ? 0x80 : 0) | (password ? 0x40 : 0),
    // Keep Alive 60s
    0x00, 0x3c,
  ];

  const payload = [...encodeString(clientId)];
  if (username) payload.push(...encodeString(username));
  if (password) payload.push(...encodeString(password));

  const remainingLength = variableHeader.length + payload.length;
  const packet = [
    (MQTT_CONNECT << 4),
    ...encodeRemainingLength(remainingLength),
    ...variableHeader,
    ...payload,
  ];
  return new Uint8Array(packet).buffer;
}

function buildSubscribePacket(packetId: number, topic: string, qos: number): ArrayBuffer {
  const variableHeader = [(packetId >> 8) & 0xff, packetId & 0xff];
  const payload = [...encodeString(topic), qos];
  const remainingLength = variableHeader.length + payload.length;
  const packet = [
    (MQTT_SUBSCRIBE << 4) | 0x02,
    ...encodeRemainingLength(remainingLength),
    ...variableHeader,
    ...payload,
  ];
  return new Uint8Array(packet).buffer;
}

function buildUnsubscribePacket(packetId: number, topic: string): ArrayBuffer {
  const variableHeader = [(packetId >> 8) & 0xff, packetId & 0xff];
  const payload = [...encodeString(topic)];
  const remainingLength = variableHeader.length + payload.length;
  const packet = [
    (MQTT_UNSUBSCRIBE << 4) | 0x02,
    ...encodeRemainingLength(remainingLength),
    ...variableHeader,
    ...payload,
  ];
  return new Uint8Array(packet).buffer;
}

function buildPublishPacket(topic: string, message: string, qos: number, retain: boolean): ArrayBuffer {
  const topicBytes = encodeString(topic);
  const msgBytes = encodeUTF8(message);
  const fixedByte = (MQTT_PUBLISH << 4) | (qos << 1) | (retain ? 1 : 0);

  let variableHeader = [...topicBytes];
  if (qos > 0) {
    const pid = Math.floor(Math.random() * 65535) + 1;
    variableHeader.push((pid >> 8) & 0xff, pid & 0xff);
  }

  const remainingLength = variableHeader.length + msgBytes.length;
  const packet = [
    fixedByte,
    ...encodeRemainingLength(remainingLength),
    ...variableHeader,
    ...msgBytes,
  ];
  return new Uint8Array(packet).buffer;
}

function buildPingPacket(): ArrayBuffer {
  return new Uint8Array([(MQTT_PINGREQ << 4), 0x00]).buffer;
}

function decodeRemainingLength(bytes: Uint8Array, startIdx: number): { value: number; bytesUsed: number } {
  let multiplier = 1;
  let value = 0;
  let idx = startIdx;
  let encodedByte: number;
  do {
    encodedByte = bytes[idx++];
    value += (encodedByte & 0x7f) * multiplier;
    multiplier *= 128;
  } while ((encodedByte & 0x80) !== 0);
  return { value, bytesUsed: idx - startIdx };
}

interface MqttMessage {
  id: string;
  topic: string;
  payload: string;
  timestamp: Date;
  qos: number;
  direction: 'in' | 'out';
}

// ---------------------------------------------------------------------------

export default function MqttScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  // Connection
  const [brokerUrl, setBrokerUrl] = useState('');
  const [port, setPort] = useState('9001');
  const [clientId, setClientId] = useState(`mqtt_client_${Math.random().toString(36).slice(2, 8)}`);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Subscribe
  const [subscribeTopic, setSubscribeTopic] = useState('');
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  // Publish
  const [publishTopic, setPublishTopic] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [publishQos, setPublishQos] = useState<0 | 1 | 2>(0);
  const [retainFlag, setRetainFlag] = useState(false);

  // Messages
  const [messages, setMessages] = useState<MqttMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const packetIdRef = useRef(1);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesScrollRef = useRef<ScrollView>(null);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const nextPacketId = () => {
    packetIdRef.current = (packetIdRef.current + 1) % 65535 || 1;
    return packetIdRef.current;
  };

  const addMessage = useCallback((msg: MqttMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleIncomingData = useCallback((data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    if (bytes.length === 0) return;

    const packetType = (bytes[0] >> 4) & 0x0f;

    if (packetType === MQTT_CONNACK) {
      const returnCode = bytes[3];
      if (returnCode === 0) {
        setConnectionStatus('connected');
      } else {
        const reasons: Record<number, string> = {
          1: 'Unacceptable protocol version',
          2: 'Identifier rejected',
          3: 'Server unavailable',
          4: 'Bad username or password',
          5: 'Not authorized',
        };
        Alert.alert('Connection Failed', reasons[returnCode] || `Return code: ${returnCode}`);
        setConnectionStatus('error');
      }
      return;
    }

    if (packetType === MQTT_PUBLISH) {
      const rl = decodeRemainingLength(bytes, 1);
      let offset = 1 + rl.bytesUsed;
      const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;
      const topic = decodeUTF8(bytes, offset, topicLen);
      offset += topicLen;

      const qos = (bytes[0] >> 1) & 0x03;
      if (qos > 0) {
        offset += 2; // skip packet id
      }

      const payloadLen = rl.value - (offset - (1 + rl.bytesUsed));
      const payload = decodeUTF8(bytes, offset, payloadLen);

      addMessage({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        topic,
        payload,
        timestamp: new Date(),
        qos,
        direction: 'in',
      });
      return;
    }

    if (packetType === MQTT_SUBACK) {
      // Subscription acknowledged
      return;
    }

    // PINGRESP, etc. — silently ignore
  }, [addMessage]);

  const connect = useCallback(() => {
    if (!brokerUrl.trim()) {
      Alert.alert('Error', 'Please enter a broker URL');
      return;
    }

    const wsUrl = brokerUrl.startsWith('ws://') || brokerUrl.startsWith('wss://')
      ? `${brokerUrl}:${port}`
      : `ws://${brokerUrl}:${port}`;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl, ['mqtt']);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        ws.send(buildConnectPacket(
          clientId,
          username.trim() || undefined,
          password.trim() || undefined,
        ));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          handleIncomingData(event.data);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };

      wsRef.current = ws;

      // Keep-alive ping every 30s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(buildPingPacket());
        }
      }, 30000);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setConnectionStatus('error');
    }
  }, [brokerUrl, port, clientId, username, password, handleIncomingData]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setConnectionStatus('disconnected');
    setSubscriptions([]);
  }, []);

  const subscribe = useCallback(() => {
    if (!subscribeTopic.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const topic = subscribeTopic.trim();
    if (subscriptions.includes(topic)) return;

    wsRef.current.send(buildSubscribePacket(nextPacketId(), topic, 0));
    setSubscriptions((prev) => [...prev, topic]);
    setSubscribeTopic('');
  }, [subscribeTopic, subscriptions]);

  const unsubscribe = useCallback((topic: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(buildUnsubscribePacket(nextPacketId(), topic));
    setSubscriptions((prev) => prev.filter((t) => t !== topic));
  }, []);

  const publish = useCallback(() => {
    if (!publishTopic.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(buildPublishPacket(publishTopic.trim(), publishMessage, publishQos, retainFlag));

    addMessage({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      topic: publishTopic.trim(),
      payload: publishMessage,
      timestamp: new Date(),
      qos: publishQos,
      direction: 'out',
    });
  }, [publishTopic, publishMessage, publishQos, retainFlag, addMessage]);

  const clearMessages = () => setMessages([]);

  const statusColor = connectionStatus === 'connected'
    ? '#3FB950'
    : connectionStatus === 'connecting'
      ? '#D29922'
      : connectionStatus === 'error'
        ? '#F85149'
        : colors.textTertiary;

  const statusLabel = connectionStatus === 'connected'
    ? 'Connected'
    : connectionStatus === 'connecting'
      ? 'Connecting...'
      : connectionStatus === 'error'
        ? 'Error'
        : 'Disconnected';

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  const isConnected = connectionStatus === 'connected';

  return (
    <>
      <Stack.Screen options={{ title: t('mqttClient') || 'MQTT Client' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Connection Status */}
          <View style={[styles.statusRow, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* Connection Settings */}
          <Text style={[styles.label, { color: colors.text }]}>Connection</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Broker URL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={brokerUrl}
              onChangeText={setBrokerUrl}
              placeholder="broker.example.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnected}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>Port</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={port}
              onChangeText={setPort}
              placeholder="9001"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              editable={!isConnected}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>Client ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={clientId}
              onChangeText={setClientId}
              placeholder="mqtt_client_abc123"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnected}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>Username (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnected}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>Password (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              editable={!isConnected}
            />
          </View>

          {/* Connect / Disconnect */}
          <TouchableOpacity
            style={[
              styles.connectBtn,
              { backgroundColor: isConnected ? '#F8514920' : colors.primary, opacity: connectionStatus === 'connecting' ? 0.6 : 1 },
            ]}
            onPress={isConnected ? disconnect : connect}
            disabled={connectionStatus === 'connecting'}
          >
            <MaterialCommunityIcons
              name={isConnected ? 'lan-disconnect' : 'lan-connect'}
              size={20}
              color={isConnected ? '#F85149' : '#FFF'}
            />
            <Text style={[styles.connectBtnText, { color: isConnected ? '#F85149' : '#FFF' }]}>
              {isConnected ? 'Disconnect' : connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
            </Text>
          </TouchableOpacity>

          {/* Subscribe */}
          <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Subscribe</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.subscribeRow}>
              <TextInput
                style={[styles.input, styles.subscribeInput, { backgroundColor: inputBg, color: colors.text }]}
                value={subscribeTopic}
                onChangeText={setSubscribeTopic}
                placeholder="topic/to/subscribe"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={isConnected}
              />
              <TouchableOpacity
                style={[styles.subscribeBtn, { backgroundColor: isConnected ? colors.primary : colors.primary + '40' }]}
                onPress={subscribe}
                disabled={!isConnected}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {subscriptions.length > 0 && (
              <View style={[styles.subscriptionsList, { borderTopColor: colors.divider }]}>
                {subscriptions.map((topic) => (
                  <View key={topic} style={[styles.subscriptionItem, { borderBottomColor: colors.divider }]}>
                    <MaterialCommunityIcons name="antenna" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.subscriptionTopic, { color: colors.text }]} numberOfLines={1}>
                      {topic}
                    </Text>
                    <TouchableOpacity onPress={() => unsubscribe(topic)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#F85149" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {subscriptions.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No active subscriptions</Text>
            )}
          </View>

          {/* Publish */}
          <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Publish</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Topic</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={publishTopic}
              onChangeText={setPublishTopic}
              placeholder="topic/to/publish"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={isConnected}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>Message</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={publishMessage}
              onChangeText={setPublishMessage}
              placeholder='{"key": "value"}'
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              editable={isConnected}
            />

            {/* QoS Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>QoS</Text>
            <View style={styles.qosRow}>
              {([0, 1, 2] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.qosChip,
                    {
                      backgroundColor: publishQos === q ? colors.primary + '20' : inputBg,
                      borderColor: publishQos === q ? colors.primary : 'transparent',
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setPublishQos(q)}
                >
                  <Text style={[styles.qosChipText, { color: publishQos === q ? colors.primary : colors.text }]}>
                    QoS {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Retain Toggle */}
            <View style={styles.retainRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 0 }]}>Retain</Text>
              <Switch
                value={retainFlag}
                onValueChange={setRetainFlag}
                trackColor={{ false: inputBg, true: colors.primary + '60' }}
                thumbColor={retainFlag ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: isConnected ? colors.primary : colors.primary + '40' }]}
            onPress={publish}
            disabled={!isConnected}
          >
            <MaterialCommunityIcons name="send" size={20} color="#FFF" />
            <Text style={styles.sendText}>Publish</Text>
          </TouchableOpacity>

          {/* Messages Log */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Messages ({messages.length})</Text>
            {messages.length > 0 && (
              <TouchableOpacity onPress={clearMessages} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="delete-outline" size={18} color="#F85149" />
                <Text style={{ color: '#F85149', fontSize: 13, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.messagesContainer, { backgroundColor: cardBg, marginTop: 8 }]}>
            {messages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <MaterialCommunityIcons name="message-text-outline" size={36} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary, marginTop: 8 }]}>
                  No messages yet
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={messagesScrollRef}
                style={styles.messagesScroll}
                nestedScrollEnabled
                onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageItem,
                      { borderBottomColor: colors.divider },
                    ]}
                  >
                    <View style={styles.messageHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <MaterialCommunityIcons
                          name={msg.direction === 'in' ? 'arrow-down-bold' : 'arrow-up-bold'}
                          size={14}
                          color={msg.direction === 'in' ? '#3FB950' : '#58A6FF'}
                        />
                        <Text style={[styles.messageTopic, { color: colors.text }]} numberOfLines={1}>
                          {msg.topic}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.qosBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.qosBadgeText, { color: colors.primary }]}>Q{msg.qos}</Text>
                        </View>
                        <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
                          {formatTime(msg.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.messagePayload, { color: colors.textSecondary }]} numberOfLines={5}>
                      {msg.payload}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Info */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>About MQTT</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              MQTT is a lightweight messaging protocol for IoT devices. This client connects via WebSocket (MQTT over WS). Make sure your broker supports WebSocket connections on the specified port (commonly 9001 or 8083). Use ws:// or wss:// for secure connections.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  card: { borderRadius: 14, padding: 14 },
  input: { borderRadius: 10, padding: 12, fontSize: 15 },
  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' },

  // Connect button
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  connectBtnText: { fontSize: 17, fontWeight: '700' },

  // Subscribe
  subscribeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  subscribeInput: { flex: 1 },
  subscribeBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subscriptionsList: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subscriptionTopic: { flex: 1, fontSize: 14, fontWeight: '500' },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 8 },

  // QoS
  qosRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  qosChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  qosChipText: { fontSize: 14, fontWeight: '600' },

  // Retain
  retainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },

  // Send
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  sendText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  // Messages
  messagesContainer: { borderRadius: 14, overflow: 'hidden' },
  messagesScroll: { maxHeight: 360 },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  messageItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  messageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  messageTopic: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  messageTime: { fontSize: 11 },
  messagePayload: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    lineHeight: 18,
  },
  qosBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qosBadgeText: { fontSize: 10, fontWeight: '700' },

  // Info
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },
});
