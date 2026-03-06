import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useProxyStore } from '../stores/proxyStore';

export default function ProxyScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { proxy, setProxy } = useProxyStore();

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  return (
    <>
      <Stack.Screen options={{ title: t('proxySettings') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Enable Toggle */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{t('enableProxy')}</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('proxyDesc')}</Text>
              </View>
              <TouchableOpacity onPress={() => setProxy({ enabled: !proxy.enabled })}>
                <MaterialCommunityIcons
                  name={proxy.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                  size={44}
                  color={proxy.enabled ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Proxy Config */}
          <View style={[styles.card, { backgroundColor: cardBg, opacity: proxy.enabled ? 1 : 0.5 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('proxyHost')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={proxy.host}
              onChangeText={(v) => setProxy({ host: v })}
              placeholder="192.168.1.100"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              editable={proxy.enabled}
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('proxyPort')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={String(proxy.port)}
              onChangeText={(v) => setProxy({ port: parseInt(v) || 8080 })}
              placeholder="8080"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              editable={proxy.enabled}
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('proxyAuth')}</Text>
            <View style={styles.authRow}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
                value={proxy.auth?.username || ''}
                onChangeText={(v) => setProxy({ auth: { username: v, password: proxy.auth?.password || '' } })}
                placeholder={t('username')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                editable={proxy.enabled}
              />
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
                value={proxy.auth?.password || ''}
                onChangeText={(v) => setProxy({ auth: { username: proxy.auth?.username || '', password: v } })}
                placeholder={t('password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                editable={proxy.enabled}
              />
            </View>
          </View>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '12' }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('proxyInfo')}
            </Text>
          </View>

          {/* Common Proxies */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('commonProxies')}</Text>
          {[
            { name: 'Charles Proxy', host: 'localhost', port: 8888 },
            { name: 'Fiddler', host: 'localhost', port: 8866 },
            { name: 'mitmproxy', host: 'localhost', port: 8080 },
            { name: 'Proxyman', host: 'localhost', port: 9090 },
          ].map((p) => (
            <TouchableOpacity
              key={p.name}
              style={[styles.presetRow, { backgroundColor: cardBg }]}
              onPress={() => setProxy({ host: p.host, port: p.port, enabled: true })}
            >
              <MaterialCommunityIcons name="server-network" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: colors.text }]}>{p.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{p.host}:{p.port}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
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
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 6 },
  authRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 10 },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  presetName: { fontSize: 15, fontWeight: '600' },
});
