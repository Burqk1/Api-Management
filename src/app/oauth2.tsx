import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

type GrantType = 'authorization_code' | 'client_credentials' | 'password' | 'implicit';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  timestamp: number;
  grantType: GrantType;
}

const GRANT_TYPES: { key: GrantType; label: string }[] = [
  { key: 'authorization_code', label: 'Auth Code' },
  { key: 'client_credentials', label: 'Client Cred' },
  { key: 'password', label: 'Password' },
  { key: 'implicit', label: 'Implicit' },
];

const PRESETS: Record<string, Record<string, string>> = {
  Google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    redirectUri: 'com.fetchlab.app:/oauth2redirect',
    scope: 'openid profile email',
  },
  GitHub: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    redirectUri: 'com.fetchlab.app:/oauth2redirect',
    scope: 'read:user repo',
  },
  Auth0: {
    authUrl: 'https://YOUR_DOMAIN.auth0.com/authorize',
    tokenUrl: 'https://YOUR_DOMAIN.auth0.com/oauth/token',
    redirectUri: 'com.fetchlab.app:/oauth2redirect',
    scope: 'openid profile email offline_access',
  },
};

const FIELDS: Record<GrantType, string[]> = {
  authorization_code: ['clientId', 'clientSecret', 'authUrl', 'tokenUrl', 'redirectUri', 'scope'],
  client_credentials: ['clientId', 'clientSecret', 'tokenUrl', 'scope'],
  password: ['clientId', 'clientSecret', 'tokenUrl', 'username', 'password', 'scope'],
  implicit: ['clientId', 'authUrl', 'redirectUri', 'scope'],
};

const FIELD_LABELS: Record<string, string> = {
  clientId: 'Client ID',
  clientSecret: 'Client Secret',
  authUrl: 'Authorization URL',
  tokenUrl: 'Token URL',
  redirectUri: 'Redirect URI',
  scope: 'Scope',
  username: 'Username',
  password: 'Password',
};

export default function OAuth2Screen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;

  const [grantType, setGrantType] = useState<GrantType>('authorization_code');
  const [form, setForm] = useState<Record<string, string>>({});
  const [token, setToken] = useState<TokenResponse | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenResponse[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) setForm((f) => ({ ...f, ...preset }));
  };

  const generateMockToken = (): TokenResponse => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return {
      access_token: `eyJ${rand(20)}.${rand(40)}.${rand(30)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: grantType !== 'implicit' ? rand(40) : undefined,
      scope: form.scope || 'openid',
      timestamp: Date.now(),
      grantType,
    };
  };

  const getToken = () => {
    const required = FIELDS[grantType].filter((f) => f !== 'scope');
    const missing = required.filter((f) => !form[f]?.trim());
    if (missing.length > 0) {
      return Alert.alert('Missing Fields', `Please fill: ${missing.map((f) => FIELD_LABELS[f]).join(', ')}`);
    }
    const newToken = generateMockToken();
    setToken(newToken);
    setTokenHistory((h) => [newToken, ...h].slice(0, 5));
  };

  const copyToken = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Token copied to clipboard');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'OAuth 2.0', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Grant Type Selector */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Grant Type</Text>
          <View style={styles.pillRow}>
            {GRANT_TYPES.map((gt) => (
              <TouchableOpacity
                key={gt.key}
                onPress={() => setGrantType(gt.key)}
                style={[styles.pill, grantType === gt.key && { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: grantType === gt.key ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {gt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Presets */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Presets</Text>
          <View style={styles.presetRow}>
            {Object.keys(PRESETS).map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => applyPreset(name)}
                style={[styles.presetBtn, { backgroundColor: colors.primary + '18' }]}
              >
                <MaterialCommunityIcons
                  name={name === 'Google' ? 'google' : name === 'GitHub' ? 'github' : 'shield-lock-outline'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Configuration Form */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuration</Text>
          {FIELDS[grantType].map((field) => (
            <View key={field} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                {FIELD_LABELS[field]}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
                value={form[field] || ''}
                onChangeText={(v) => updateField(field, v)}
                placeholder={FIELD_LABELS[field]}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={field === 'password' || field === 'clientSecret'}
              />
            </View>
          ))}
        </View>

        {/* Auto Refresh */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Auto-Refresh Token</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Refresh before expiry</Text>
            </View>
            <Switch value={autoRefresh} onValueChange={setAutoRefresh} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        {/* Get Token Button */}
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={getToken}>
          <MaterialCommunityIcons name="key-variant" size={20} color="#FFF" />
          <Text style={styles.sendText}>Get Token</Text>
        </TouchableOpacity>

        {/* Token Display */}
        {token && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.tokenHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Token Response</Text>
              <TouchableOpacity onPress={() => copyToken(token.access_token)}>
                <MaterialCommunityIcons name="content-copy" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.tokenField, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>access_token</Text>
              <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace' }} numberOfLines={2}>
                {token.access_token}
              </Text>
            </View>
            <View style={styles.tokenMeta}>
              <View style={styles.metaItem}>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Type</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{token.token_type}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Expires In</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{token.expires_in}s</Text>
              </View>
              {token.scope && (
                <View style={styles.metaItem}>
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Scope</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{token.scope}</Text>
                </View>
              )}
            </View>
            {token.refresh_token && (
              <View style={[styles.tokenField, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>refresh_token</Text>
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace' }} numberOfLines={1}>
                  {token.refresh_token}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Token History */}
        {tokenHistory.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Token History</Text>
            {tokenHistory.map((th, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.historyItem, i < tokenHistory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                onPress={() => copyToken(th.access_token)}
              >
                <View style={[styles.grantBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
                    {GRANT_TYPES.find((g) => g.key === th.grantType)?.label}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace', flex: 1 }} numberOfLines={1}>
                  {th.access_token.substring(0, 30)}...
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{formatTime(th.timestamp)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  sendBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tokenField: { borderRadius: 10, padding: 12, marginBottom: 10, gap: 4 },
  tokenMeta: { flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
  metaItem: { gap: 2 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  grantBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
