import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);
  const signOut = useAuthStore((s) => s.signOut);
  const { status, lastSyncAt, sync, autoSync, setAutoSync } = useSyncStore();

  const cardBg = isDark ? colors.surface : colors.card;

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: async () => { await signOut(); router.back(); } },
    ]);
  };

  const lastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString()
    : t('never');

  const planLabel = plan === 'team' ? 'Team' : plan === 'pro' ? 'Pro' : 'Free';
  const planColor = plan === 'free' ? colors.textSecondary : '#FFD60A';

  return (
    <>
      <Stack.Screen options={{ title: t('profile') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar & Info */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="account" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
            <View style={[styles.planBadge, { backgroundColor: planColor + '20' }]}>
              <Text style={[styles.planText, { color: planColor }]}>{planLabel}</Text>
            </View>
          </View>

          {/* Subscription */}
          {plan === 'free' && (
            <TouchableOpacity
              style={[styles.upgradeCard, { backgroundColor: '#FFD60A15' }]}
              onPress={() => router.push('/paywall' as any)}
            >
              <MaterialCommunityIcons name="crown-outline" size={24} color="#FFD60A" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.upgradeTitle, { color: '#FFD60A' }]}>{t('upgradeToPro')}</Text>
                <Text style={[styles.upgradeDesc, { color: colors.textSecondary }]}>{t('upgradeDesc')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#FFD60A" />
            </TouchableOpacity>
          )}

          {/* Cloud Sync */}
          <Text style={[styles.section, { color: colors.textSecondary }]}>{t('cloudSync').toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.row, styles.separator, { borderBottomColor: colors.divider }]}>
              <View style={[styles.iconBox, { backgroundColor: '#58A6FF' }]}>
                <MaterialCommunityIcons name="cloud-sync-outline" size={18} color="#FFF" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('syncNow')}</Text>
              <TouchableOpacity onPress={sync} disabled={status === 'syncing'}>
                <MaterialCommunityIcons
                  name={status === 'syncing' ? 'loading' : 'sync'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.row, styles.separator, { borderBottomColor: colors.divider }]}>
              <View style={[styles.iconBox, { backgroundColor: '#3FB950' }]}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#FFF" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('lastSync')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{lastSync}</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={() => setAutoSync(!autoSync)}>
              <View style={[styles.iconBox, { backgroundColor: '#BC8CFF' }]}>
                <MaterialCommunityIcons name="autorenew" size={18} color="#FFF" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('autoSync')}</Text>
              <MaterialCommunityIcons
                name={autoSync ? 'toggle-switch' : 'toggle-switch-off'}
                size={36}
                color={autoSync ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <Text style={[styles.section, { color: colors.textSecondary }]}>{t('account').toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <View style={[styles.iconBox, { backgroundColor: '#FF6961' }]}>
                <MaterialCommunityIcons name="logout" size={18} color="#FFF" />
              </View>
              <Text style={[styles.rowLabel, { color: '#FF6961' }]}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  email: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  planText: { fontSize: 13, fontWeight: '700' },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, marginBottom: 8 },
  upgradeTitle: { fontSize: 16, fontWeight: '700' },
  upgradeDesc: { fontSize: 13, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, marginTop: 24, marginBottom: 8, marginLeft: 16 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 14, minHeight: 48 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
});
