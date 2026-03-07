import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

type AuthProvider = 'aws_v4' | 'azure_ad' | 'gcp';

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'];
const SERVICES = ['s3', 'dynamodb', 'lambda', 'execute-api', 'sqs', 'sns', 'ec2', 'iam'];

function hmacSha256Hex(key: string, data: string): string {
  // Simplified hash for demonstration - in production use crypto API
  let hash = 0;
  const str = key + data;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

function generateAwsSignature(accessKey: string, secretKey: string, region: string, service: string, method: string, url: string, body: string): Record<string, string> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const shortDate = dateStamp.slice(0, 8);
  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
  const credential = `${accessKey}/${credentialScope}`;

  let host = '';
  try { host = new URL(url).host; } catch { host = 'example.com'; }

  const canonicalHeaders = `host:${host}\nx-amz-date:${dateStamp}\n`;
  const signedHeaders = 'host;x-amz-date';
  const payloadHash = hmacSha256Hex('', body || '');
  const canonicalRequest = `${method}\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateStamp}\n${credentialScope}\n${hmacSha256Hex('', canonicalRequest)}`;
  const signature = hmacSha256Hex(`AWS4${secretKey}${shortDate}${region}${service}`, stringToSign);

  return {
    'Authorization': `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'X-Amz-Date': dateStamp,
    'X-Amz-Content-Sha256': payloadHash,
    'Host': host,
  };
}

export default function AwsAuthScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [provider, setProvider] = useState<AuthProvider>('aws_v4');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [service, setService] = useState('execute-api');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  // Azure AD
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scope, setScope] = useState('https://management.azure.com/.default');
  // Output
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const PROVIDERS: { key: AuthProvider; label: string; icon: string; color: string }[] = [
    { key: 'aws_v4', label: 'AWS Sig v4', icon: 'aws', color: '#FF9900' },
    { key: 'azure_ad', label: 'Azure AD', icon: 'microsoft-azure', color: '#0078D4' },
    { key: 'gcp', label: 'GCP', icon: 'google-cloud', color: '#4285F4' },
  ];

  const generateHeaders = () => {
    if (provider === 'aws_v4') {
      const h = generateAwsSignature(accessKey, secretKey, region, service, method, url, body);
      setHeaders(h);
    } else if (provider === 'azure_ad') {
      // Simulate Azure AD token generation
      const fakeToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.${btoa(JSON.stringify({ tid: tenantId, aud: scope, iss: `https://sts.windows.net/${tenantId}/`, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
      setToken(fakeToken);
      setHeaders({ 'Authorization': `Bearer ${fakeToken}` });
    } else {
      const fakeToken = `ya29.${Array.from({ length: 40 }, () => 'abcdefghijklmnop'[Math.floor(Math.random() * 16)]).join('')}`;
      setToken(fakeToken);
      setHeaders({ 'Authorization': `Bearer ${fakeToken}` });
    }
  };

  const copy = (text: string, id: string) => {
    Clipboard.setStringAsync(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Cloud Auth' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Provider Toggle */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.provBtn, { backgroundColor: provider === p.key ? p.color + '20' : cardBg, borderColor: provider === p.key ? p.color : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setProvider(p.key)}
              >
                <MaterialCommunityIcons name={p.icon as any} size={18} color={provider === p.key ? p.color : colors.textSecondary} />
                <Text style={{ color: provider === p.key ? p.color : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AWS v4 */}
          {provider === 'aws_v4' && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Access Key ID</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={accessKey} onChangeText={setAccessKey} placeholder="AKIA..." placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Secret Access Key</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={secretKey} onChangeText={setSecretKey} placeholder="Secret key" placeholderTextColor={colors.textTertiary} secureTextEntry autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Region</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {REGIONS.map((r) => (
                    <TouchableOpacity key={r} style={[styles.chip, { backgroundColor: region === r ? '#FF990020' : inputBg }]} onPress={() => setRegion(r)}>
                      <Text style={{ color: region === r ? '#FF9900' : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {SERVICES.map((s) => (
                    <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: service === s ? '#FF990020' : inputBg }]} onPress={() => setService(s)}>
                      <Text style={{ color: service === s ? '#FF9900' : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Request URL</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={url} onChangeText={setUrl} placeholder="https://..." placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                  <TouchableOpacity key={m} style={[styles.chip, { backgroundColor: method === m ? colors.primary + '20' : inputBg }]} onPress={() => setMethod(m)}>
                    <Text style={{ color: method === m ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Azure AD */}
          {provider === 'azure_ad' && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tenant ID</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={tenantId} onChangeText={setTenantId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Client ID</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={clientId} onChangeText={setClientId} placeholder="Application ID" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Client Secret</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={clientSecret} onChangeText={setClientSecret} placeholder="Secret" placeholderTextColor={colors.textTertiary} secureTextEntry />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Scope</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={scope} onChangeText={setScope} placeholder="https://..." placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
            </View>
          )}

          {/* GCP */}
          {provider === 'gcp' && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Account JSON Key</Text>
              <TextInput style={[styles.codeInput, { backgroundColor: inputBg, color: colors.text }]} value={clientSecret} onChangeText={setClientSecret} placeholder='{"type": "service_account", ...}' placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Scope</Text>
              <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={scope} onChangeText={setScope} placeholder="https://www.googleapis.com/auth/cloud-platform" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
            </View>
          )}

          {/* Generate */}
          <TouchableOpacity style={[styles.genBtn, { backgroundColor: PROVIDERS.find((p) => p.key === provider)?.color || colors.primary }]} onPress={generateHeaders}>
            <MaterialCommunityIcons name="shield-key" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Generate Auth Headers</Text>
          </TouchableOpacity>

          {/* Output */}
          {Object.keys(headers).length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Generated Headers</Text>
              {Object.entries(headers).map(([key, val]) => (
                <TouchableOpacity key={key} style={[styles.headerCard, { backgroundColor: cardBg }]} onPress={() => copy(`${key}: ${val}`, key)}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{key}</Text>
                  <Text style={{ color: colors.text, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 }} numberOfLines={2}>{val}</Text>
                  <MaterialCommunityIcons name={copied === key ? 'check' : 'content-copy'} size={16} color={copied === key ? '#3FB950' : colors.textTertiary} style={{ position: 'absolute', top: 12, right: 12 }} />
                </TouchableOpacity>
              ))}
            </View>
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
  provBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  formCard: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  codeInput: { borderRadius: 10, padding: 12, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 100 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  headerCard: { borderRadius: 12, padding: 12, marginBottom: 8, position: 'relative' },
});
