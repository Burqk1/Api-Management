import React, { useState } from 'react';
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

type PlanOption = 'pro' | 'team';

const FEATURES = [
  { icon: 'infinity', key: 'unlimitedRequests' },
  { icon: 'folder-multiple-outline', key: 'unlimitedCollections' },
  { icon: 'cloud-sync-outline', key: 'cloudSync' },
  { icon: 'robot-outline', key: 'aiAnalysis' },
  { icon: 'link-variant', key: 'requestChaining' },
  { icon: 'code-json', key: 'postmanImport' },
  { icon: 'account-group-outline', key: 'teamSharing' },
];

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setPlan = useAuthStore((s) => s.setPlan);

  const [selected, setSelected] = useState<PlanOption>('pro');

  const handlePurchase = () => {
    if (!user) {
      router.push('/auth' as any);
      return;
    }
    // In production, integrate RevenueCat / Stripe here
    setPlan(selected);
    Alert.alert(t('subscriptionActivated'), t('enjoyPro'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const cardBg = isDark ? colors.surface : colors.card;

  return (
    <>
      <Stack.Screen options={{ title: t('goPro'), headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Close Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.close}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.crown, { backgroundColor: '#FFD60A20' }]}>
              <MaterialCommunityIcons name="crown" size={56} color="#FFD60A" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('unlockFullPower')}</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>{t('paywallDesc')}</Text>
          </View>

          {/* Features */}
          <View style={[styles.featuresCard, { backgroundColor: cardBg }]}>
            {FEATURES.map((f, i) => (
              <View
                key={f.key}
                style={[
                  styles.featureRow,
                  i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <MaterialCommunityIcons name={f.icon as any} size={22} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.text }]}>{t(f.key)}</Text>
                {f.key === 'teamSharing' && (
                  <View style={[styles.teamBadge, { backgroundColor: '#BC8CFF20' }]}>
                    <Text style={{ color: '#BC8CFF', fontSize: 11, fontWeight: '700' }}>TEAM</Text>
                  </View>
                )}
                <MaterialCommunityIcons name="check-circle" size={20} color="#3FB950" />
              </View>
            ))}
          </View>

          {/* Plan Selection */}
          <View style={styles.planRow}>
            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: cardBg, borderColor: selected === 'pro' ? colors.primary : 'transparent', borderWidth: 2 },
              ]}
              onPress={() => setSelected('pro')}
            >
              <Text style={[styles.planName, { color: colors.text }]}>Pro</Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>$9</Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/{t('month')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: cardBg, borderColor: selected === 'team' ? '#BC8CFF' : 'transparent', borderWidth: 2 },
              ]}
              onPress={() => setSelected('team')}
            >
              <Text style={[styles.planName, { color: colors.text }]}>Team</Text>
              <Text style={[styles.planPrice, { color: '#BC8CFF' }]}>$19</Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/{t('perUser')}/{t('month')}</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: selected === 'team' ? '#BC8CFF' : colors.primary }]}
            onPress={handlePurchase}
          >
            <MaterialCommunityIcons name="crown-outline" size={20} color="#FFF" />
            <Text style={styles.ctaText}>{t('startFreeTrial')}</Text>
          </TouchableOpacity>

          <Text style={[styles.trialHint, { color: colors.textTertiary }]}>
            {t('trialHint')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  close: { alignSelf: 'flex-end', padding: 8 },
  hero: { alignItems: 'center', marginBottom: 24 },
  crown: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { fontSize: 15, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  featuresCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  featureText: { flex: 1, fontSize: 15, fontWeight: '600' },
  teamBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  planCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  planName: { fontSize: 18, fontWeight: '800' },
  planPrice: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  planPeriod: { fontSize: 13 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16 },
  ctaText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  trialHint: { textAlign: 'center', fontSize: 13, marginTop: 12 },
});
