import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

interface SoapOperation {
  name: string;
  inputMessage: string;
  outputMessage: string;
  soapAction: string;
}

type SoapVersion = '1.1' | '1.2';

const SOAP_11_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const SOAP_12_NS = 'http://www.w3.org/2003/05/soap-envelope';
const SOAP_11_CONTENT = 'text/xml; charset=utf-8';
const SOAP_12_CONTENT = 'application/soap+xml; charset=utf-8';

function parseWsdlOperations(xml: string): { operations: SoapOperation[]; targetNamespace: string } {
  const nsMatch = xml.match(/targetNamespace\s*=\s*["']([^"']+)["']/);
  const targetNamespace = nsMatch ? nsMatch[1] : '';

  const operations: SoapOperation[] = [];
  const opRegex = /<\w*:?operation\s+name\s*=\s*["']([^"']+)["'][^>]*>/g;
  const actionRegex = /soapAction\s*=\s*["']([^"']*?)["']/;
  const seen = new Set<string>();

  let match;
  while ((match = opRegex.exec(xml)) !== null) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);

    const after = xml.slice(match.index, match.index + 500);
    const actionMatch = after.match(actionRegex);
    const soapAction = actionMatch ? actionMatch[1] : `${targetNamespace}/${name}`;

    const inputMatch = after.match(/<\w*:?input[^>]*message\s*=\s*["'](?:\w+:)?([^"']+)["']/);
    const outputMatch = after.match(/<\w*:?output[^>]*message\s*=\s*["'](?:\w+:)?([^"']+)["']/);

    operations.push({
      name,
      inputMessage: inputMatch ? inputMatch[1] : `${name}Request`,
      outputMessage: outputMatch ? outputMatch[1] : `${name}Response`,
      soapAction,
    });
  }

  return { operations, targetNamespace };
}

function buildEnvelope(op: SoapOperation, ns: string, version: SoapVersion): string {
  const soapNs = version === '1.1' ? SOAP_11_NS : SOAP_12_NS;
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${soapNs}">
  <soap:Header/>
  <soap:Body>
    <${op.name} xmlns="${ns}">
      <!-- parameters -->
    </${op.name}>
  </soap:Body>
</soap:Envelope>`;
}

function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) indent = Math.max(indent - 1, 0);
    formatted += '  '.repeat(indent) + trimmed + '\n';
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      indent++;
    }
  }
  return formatted.trim();
}

export default function SoapScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [wsdlUrl, setWsdlUrl] = useState('');
  const [operations, setOperations] = useState<SoapOperation[]>([]);
  const [targetNamespace, setTargetNamespace] = useState('');
  const [selectedOp, setSelectedOp] = useState<string>('');
  const [soapVersion, setSoapVersion] = useState<SoapVersion>('1.1');
  const [envelope, setEnvelope] = useState('');
  const [soapAction, setSoapAction] = useState('');
  const [response, setResponse] = useState('');
  const [responseTime, setResponseTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wsdlLoading, setWsdlLoading] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const loadWsdl = async () => {
    if (!wsdlUrl.trim()) {
      Alert.alert('Error', 'Please enter a WSDL URL');
      return;
    }
    setWsdlLoading(true);
    setOperations([]);
    setSelectedOp('');
    setEnvelope('');
    setResponse('');
    try {
      const res = await fetch(wsdlUrl.trim());
      const xml = await res.text();
      const { operations: ops, targetNamespace: ns } = parseWsdlOperations(xml);
      if (ops.length === 0) {
        Alert.alert('Error', 'No operations found in the WSDL document');
        return;
      }
      setOperations(ops);
      setTargetNamespace(ns);
      selectOperation(ops[0], ns);
    } catch (e: any) {
      Alert.alert('Error', `Failed to load WSDL: ${e.message}`);
    } finally {
      setWsdlLoading(false);
    }
  };

  const selectOperation = (op: SoapOperation, ns?: string) => {
    setSelectedOp(op.name);
    setSoapAction(op.soapAction);
    setEnvelope(buildEnvelope(op, ns ?? targetNamespace, soapVersion));
  };

  const toggleVersion = (v: SoapVersion) => {
    setSoapVersion(v);
    const op = operations.find((o) => o.name === selectedOp);
    if (op) {
      setEnvelope(buildEnvelope(op, targetNamespace, v));
    }
  };

  const sendRequest = async () => {
    if (!wsdlUrl.trim() || !envelope.trim()) return;
    setLoading(true);
    setResponse('');
    const start = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': soapVersion === '1.1' ? SOAP_11_CONTENT : SOAP_12_CONTENT,
      };
      if (soapVersion === '1.1' && soapAction) {
        headers['SOAPAction'] = `"${soapAction}"`;
      }

      const serviceUrl = wsdlUrl.replace(/\?wsdl$/i, '');
      const res = await fetch(serviceUrl, {
        method: 'POST',
        headers,
        body: envelope,
      });
      const text = await res.text();
      setResponseTime(Date.now() - start);
      setResponse(formatXml(text));
    } catch (e: any) {
      setResponseTime(Date.now() - start);
      setResponse(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('soapClient') || 'SOAP Client' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* WSDL URL */}
          <Text style={[styles.label, { color: colors.text }]}>WSDL URL</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={wsdlUrl}
              onChangeText={setWsdlUrl}
              placeholder="https://example.com/service?wsdl"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.parseBtn, { backgroundColor: colors.primary + '20', opacity: wsdlLoading ? 0.6 : 1 }]}
            onPress={loadWsdl}
            disabled={wsdlLoading}
          >
            {wsdlLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="download-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.parseBtnText, { color: colors.primary }]}>
              {wsdlLoading ? 'Loading...' : 'Load WSDL'}
            </Text>
          </TouchableOpacity>

          {/* SOAP Version Toggle */}
          {operations.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>SOAP Version</Text>
              <View style={styles.chipRow}>
                {(['1.1', '1.2'] as SoapVersion[]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: soapVersion === v ? colors.primary + '20' : cardBg,
                        borderColor: soapVersion === v ? colors.primary : 'transparent',
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => toggleVersion(v)}
                  >
                    <Text style={[styles.chipText, { color: soapVersion === v ? colors.primary : colors.text }]}>
                      SOAP {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Operations */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Operations</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {operations.map((op, i) => (
                  <TouchableOpacity
                    key={op.name}
                    style={[
                      styles.methodRow,
                      selectedOp === op.name && { backgroundColor: colors.primary + '10' },
                      i < operations.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                    ]}
                    onPress={() => selectOperation(op)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodName, { color: colors.text }]}>{op.name}</Text>
                      <Text style={[styles.methodTypes, { color: colors.textTertiary }]}>
                        {op.inputMessage} → {op.outputMessage}
                      </Text>
                    </View>
                    {selectedOp === op.name && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* SOAPAction */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>SOAPAction</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={soapAction}
                  onChangeText={setSoapAction}
                  placeholder="SOAPAction header value"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Envelope Editor */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>SOAP Envelope</Text>
                <TouchableOpacity onPress={() => copyToClipboard(envelope)}>
                  <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.card, { backgroundColor: cardBg, marginTop: 8 }]}>
                <TextInput
                  style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
                  value={envelope}
                  onChangeText={setEnvelope}
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
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                )}
                <Text style={styles.sendText}>{loading ? 'Sending...' : 'Send Request'}</Text>
              </TouchableOpacity>

              {/* Response */}
              {response !== '' && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Response</Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{responseTime}ms</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(response)}>
                        <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.responseBox, { backgroundColor: cardBg }]}>
                    <ScrollView horizontal>
                      <Text style={[styles.responseText, { color: colors.text }]} selectable>
                        {response}
                      </Text>
                    </ScrollView>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Info */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>About SOAP</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              SOAP (Simple Object Access Protocol) uses XML for messaging. Enter a WSDL URL to discover available
              operations, then edit the generated envelope and send requests. Supports both SOAP 1.1 and 1.2 protocols.
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
  parseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  parseBtnText: { fontSize: 15, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  methodName: { fontSize: 15, fontWeight: '600' },
  methodTypes: { fontSize: 12, marginTop: 2 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  sendText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  responseBox: { borderRadius: 12, padding: 14 },
  responseText: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 20 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },
});
