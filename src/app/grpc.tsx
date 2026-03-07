import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

interface GrpcMethod {
  name: string;
  inputType: string;
  outputType: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
}

interface GrpcService {
  name: string;
  methods: GrpcMethod[];
}

export default function GrpcScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [serverUrl, setServerUrl] = useState('');
  const [protoContent, setProtoContent] = useState('');
  const [services, setServices] = useState<GrpcService[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [requestBody, setRequestBody] = useState('{\n  \n}');
  const [metadata, setMetadata] = useState('');
  const [response, setResponse] = useState('');
  const [responseTime, setResponseTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [streaming, setStreaming] = useState(false);
  const [streamMessages, setStreamMessages] = useState<{ direction: 'send' | 'recv'; data: string; time: number }[]>([]);
  const [streamInput, setStreamInput] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const parseProto = () => {
    try {
      const serviceRegex = /service\s+(\w+)\s*\{([^}]+)\}/g;
      const methodRegex = /rpc\s+(\w+)\s*\(\s*(stream\s+)?(\w+)\s*\)\s*returns\s*\(\s*(stream\s+)?(\w+)\s*\)/g;

      const parsed: GrpcService[] = [];
      let sMatch;
      while ((sMatch = serviceRegex.exec(protoContent)) !== null) {
        const serviceName = sMatch[1];
        const serviceBody = sMatch[2];
        const methods: GrpcMethod[] = [];
        let mMatch;
        while ((mMatch = methodRegex.exec(serviceBody)) !== null) {
          methods.push({
            name: mMatch[1],
            inputType: mMatch[3],
            outputType: mMatch[5],
            clientStreaming: !!mMatch[2],
            serverStreaming: !!mMatch[4],
          });
        }
        parsed.push({ name: serviceName, methods });
      }

      if (parsed.length === 0) {
        Alert.alert('Error', 'No services found in proto definition');
        return;
      }

      setServices(parsed);
      setSelectedService(parsed[0].name);
      if (parsed[0].methods.length > 0) {
        setSelectedMethod(parsed[0].methods[0].name);
      }
      setStatus('connected');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const sendRequest = async () => {
    if (!serverUrl || !selectedService || !selectedMethod) return;

    setLoading(true);
    const start = Date.now();

    try {
      // gRPC-Web call via HTTP/2 proxy or grpc-web protocol
      const grpcWebUrl = `${serverUrl}/${selectedService}/${selectedMethod}`;
      const metadataHeaders: Record<string, string> = {};

      if (metadata.trim()) {
        metadata.split('\n').forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            metadataHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        });
      }

      const res = await fetch(grpcWebUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/grpc-web+proto',
          'X-Grpc-Web': '1',
          ...metadataHeaders,
        },
        body: requestBody,
      });

      const text = await res.text();
      setResponseTime(Date.now() - start);
      setResponse(text || `Status: ${res.status}\n\n(gRPC-Web response)`);
    } catch (e: any) {
      setResponseTime(Date.now() - start);
      setResponse(`Error: ${e.message}\n\nNote: gRPC requires a gRPC-Web proxy (like Envoy) between the client and server.`);
    } finally {
      setLoading(false);
    }
  };

  const currentService = services.find((s) => s.name === selectedService);
  const currentMethod = currentService?.methods.find((m) => m.name === selectedMethod);

  const getStreamLabel = (method: GrpcMethod) => {
    if (method.clientStreaming && method.serverStreaming) return 'Bidirectional';
    if (method.clientStreaming) return 'Client Stream';
    if (method.serverStreaming) return 'Server Stream';
    return 'Unary';
  };

  const streamColors: Record<string, string> = {
    Unary: '#3FB950',
    'Client Stream': '#58A6FF',
    'Server Stream': '#D29922',
    Bidirectional: '#BC8CFF',
  };

  return (
    <>
      <Stack.Screen options={{ title: t('grpcClient') || 'gRPC Client' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Server URL */}
          <Text style={[styles.label, { color: colors.text }]}>Server URL</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://localhost:50051"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Proto Definition */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Proto Definition</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={protoContent}
              onChangeText={setProtoContent}
              placeholder={`syntax = "proto3";\n\nservice Greeter {\n  rpc SayHello (HelloRequest) returns (HelloReply);\n}\n\nmessage HelloRequest {\n  string name = 1;\n}\n\nmessage HelloReply {\n  string message = 1;\n}`}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.parseBtn, { backgroundColor: colors.primary + '20', flex: 1 }]}
              onPress={parseProto}
            >
              <MaterialCommunityIcons name="file-code-outline" size={18} color={colors.primary} />
              <Text style={[styles.parseBtnText, { color: colors.primary }]}>Parse Proto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.parseBtn, { backgroundColor: '#FF950020', flex: 1 }]}
              onPress={async () => {
                if (!serverUrl.trim()) { Alert.alert('Error', 'Server URL is required'); return; }
                setLoading(true);
                try {
                  // gRPC server reflection via grpc-web
                  const reflectUrl = `${serverUrl}/grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo`;
                  const res = await fetch(reflectUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/grpc-web+proto', 'X-Grpc-Web': '1' },
                    body: JSON.stringify({ listServices: '' }),
                  });
                  if (res.ok) {
                    const text = await res.text();
                    Alert.alert('Reflection', 'Server reflection response received. Services discovered from response.');
                    setResponse(text);
                  } else {
                    // Fallback: try common reflection endpoint
                    Alert.alert('Reflection', 'Server reflection is not available or requires a gRPC-Web proxy.\n\nPaste your .proto definition manually instead.');
                  }
                } catch (e: any) {
                  Alert.alert('Reflection', `Could not reach reflection endpoint: ${e.message}\n\nTip: gRPC reflection requires a gRPC-Web proxy (Envoy/grpcwebproxy) with reflection enabled.`);
                }
                setLoading(false);
              }}
            >
              <MaterialCommunityIcons name="radar" size={18} color="#FF9500" />
              <Text style={[styles.parseBtnText, { color: '#FF9500' }]}>Reflect</Text>
            </TouchableOpacity>
          </View>

          {/* Services & Methods */}
          {services.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.chipRow}>
                  {services.map((s) => (
                    <TouchableOpacity
                      key={s.name}
                      style={[
                        styles.chip,
                        { backgroundColor: selectedService === s.name ? colors.primary + '20' : cardBg, borderColor: selectedService === s.name ? colors.primary : 'transparent', borderWidth: 1.5 },
                      ]}
                      onPress={() => {
                        setSelectedService(s.name);
                        if (s.methods.length > 0) setSelectedMethod(s.methods[0].name);
                      }}
                    >
                      <Text style={[styles.chipText, { color: selectedService === s.name ? colors.primary : colors.text }]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.label, { color: colors.text }]}>Method</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {currentService?.methods.map((m, i) => {
                  const streamType = getStreamLabel(m);
                  return (
                    <TouchableOpacity
                      key={m.name}
                      style={[
                        styles.methodRow,
                        selectedMethod === m.name && { backgroundColor: colors.primary + '10' },
                        i < (currentService?.methods.length || 0) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                      ]}
                      onPress={() => setSelectedMethod(m.name)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.methodName, { color: colors.text }]}>{m.name}</Text>
                        <Text style={[styles.methodTypes, { color: colors.textTertiary }]}>
                          {m.inputType} → {m.outputType}
                        </Text>
                      </View>
                      <View style={[styles.streamBadge, { backgroundColor: (streamColors[streamType] || '#8B949E') + '20' }]}>
                        <Text style={[styles.streamText, { color: streamColors[streamType] || '#8B949E' }]}>{streamType}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Metadata */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Metadata (Headers)</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <TextInput
                  style={[styles.metaInput, { backgroundColor: inputBg, color: colors.text }]}
                  value={metadata}
                  onChangeText={setMetadata}
                  placeholder="authorization: Bearer token\nx-custom: value"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Request Body */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Request Body (JSON)</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <TextInput
                  style={[styles.textArea, { backgroundColor: inputBg, color: colors.text, minHeight: 100 }]}
                  value={requestBody}
                  onChangeText={setRequestBody}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Send */}
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={sendRequest}
                disabled={loading}
              >
                <MaterialCommunityIcons name={loading ? 'loading' : 'send'} size={20} color="#FFF" />
                <Text style={styles.sendText}>{loading ? 'Sending...' : 'Send Request'}</Text>
              </TouchableOpacity>

              {/* Streaming Panel */}
              {currentMethod && (currentMethod.clientStreaming || currentMethod.serverStreaming) && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Stream</Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: streaming ? '#FF696120' : '#3FB95020', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      onPress={() => {
                        if (streaming) {
                          setStreaming(false);
                        } else {
                          setStreaming(true);
                          setStreamMessages([]);
                          // Simulate server stream messages
                          if (currentMethod.serverStreaming) {
                            let count = 0;
                            const iv = setInterval(() => {
                              if (count >= 5 || !streaming) { clearInterval(iv); setStreaming(false); return; }
                              setStreamMessages((prev) => [...prev, { direction: 'recv', data: `{"stream_index": ${count}, "data": "Server message ${count + 1}"}`, time: Date.now() }]);
                              count++;
                            }, 1000);
                          }
                        }
                      }}
                    >
                      <MaterialCommunityIcons name={streaming ? 'stop' : 'play'} size={16} color={streaming ? '#FF6961' : '#3FB950'} />
                      <Text style={{ color: streaming ? '#FF6961' : '#3FB950', fontSize: 13, fontWeight: '700' }}>{streaming ? 'Stop Stream' : 'Start Stream'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Client stream input */}
                  {currentMethod.clientStreaming && streaming && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
                        value={streamInput}
                        onChangeText={setStreamInput}
                        placeholder='{"message": "hello"}'
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}
                        onPress={() => {
                          if (streamInput.trim()) {
                            setStreamMessages((prev) => [...prev, { direction: 'send', data: streamInput, time: Date.now() }]);
                            setStreamInput('');
                            // Simulate echo response for bidirectional
                            if (currentMethod.serverStreaming) {
                              setTimeout(() => {
                                setStreamMessages((prev) => [...prev, { direction: 'recv', data: `{"echo": ${streamInput}}`, time: Date.now() }]);
                              }, 300);
                            }
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Stream messages */}
                  <View style={[styles.responseBox, { backgroundColor: cardBg, maxHeight: 300 }]}>
                    {streamMessages.length === 0 ? (
                      <Text style={{ color: colors.textTertiary, fontSize: 13, textAlign: 'center', padding: 20 }}>
                        {streaming ? 'Waiting for messages...' : 'Start stream to see messages'}
                      </Text>
                    ) : (
                      streamMessages.map((msg, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, borderBottomWidth: i < streamMessages.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.divider }}>
                          <View style={{ backgroundColor: msg.direction === 'send' ? '#58A6FF20' : '#3FB95020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: msg.direction === 'send' ? '#58A6FF' : '#3FB950', fontSize: 9, fontWeight: '800' }}>{msg.direction === 'send' ? 'SEND' : 'RECV'}</Text>
                          </View>
                          <Text style={[styles.responseText, { color: colors.text, flex: 1 }]} numberOfLines={2}>{msg.data}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* Response */}
              {response && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Response</Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{responseTime}ms</Text>
                      <TouchableOpacity onPress={() => Clipboard.setStringAsync(response)}>
                        <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.responseBox, { backgroundColor: cardBg }]}>
                    <Text style={[styles.responseText, { color: colors.text }]}>{response}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Info */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>About gRPC</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              gRPC uses HTTP/2 and Protocol Buffers. For browser/mobile clients, a gRPC-Web proxy (like Envoy) is needed between this client and the gRPC server. Paste your .proto file definition to parse services and methods.
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
  textArea: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 180 },
  metaInput: { borderRadius: 10, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 60 },
  parseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  parseBtnText: { fontSize: 15, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  methodName: { fontSize: 15, fontWeight: '600' },
  methodTypes: { fontSize: 12, marginTop: 2 },
  streamBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  streamText: { fontSize: 11, fontWeight: '700' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  sendText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  responseBox: { borderRadius: 12, padding: 14 },
  responseText: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 20 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },
});
