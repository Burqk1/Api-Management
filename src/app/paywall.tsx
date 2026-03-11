import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useAuthStore } from '../stores/authStore';
import * as Haptics from 'expo-haptics';

type PlanOption = 'pro' | 'team';
type BillingCycle = 'monthly' | 'yearly';

const FEATURES = [
  { icon: 'infinity', key: 'unlimitedRequests', free: '50/day', pro: 'Unlimited', team: 'Unlimited' },
  { icon: 'folder-multiple-outline', key: 'unlimitedCollections', free: '3', pro: 'Unlimited', team: 'Unlimited' },
  { icon: 'cloud-sync-outline', key: 'cloudSync', free: false, pro: true, team: true },
  { icon: 'robot-outline', key: 'aiAnalysis', free: false, pro: true, team: true },
  { icon: 'link-variant', key: 'requestChaining', free: false, pro: true, team: true },
  { icon: 'lan-connect', key: 'advancedProtocols', free: false, pro: true, team: true },
  { icon: 'shield-check-outline', key: 'securityTools', free: false, pro: true, team: true },
  { icon: 'code-braces', key: 'codeGenerator', free: false, pro: true, team: true },
  { icon: 'account-group-outline', key: 'teamSharing', free: false, pro: false, team: true },
];

const PRICES = {
  pro: { monthly: 9.99, yearly: 95.99 },
  team: { monthly: 19.99, yearly: 191.99 },
};

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setPlan = useAuthStore((s) => s.setPlan);

  const [selected, setSelected] = useState<PlanOption>('pro');
  const [billing, setBilling] = useState<BillingCycle>('yearly');

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePurchase = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!user) {
      router.push('/auth' as any);
      return;
    }
    setPlan(selected);
    Alert.alert(t('subscriptionActivated'), t('enjoyPro'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const price = PRICES[selected][billing];
  const monthlyEquiv = billing === 'yearly' ? (PRICES[selected].yearly / 12).toFixed(2) : PRICES[selected].monthly.toFixed(2);
  const savings = billing === 'yearly' ? Math.round((1 - PRICES[selected].yearly / (PRICES[selected].monthly * 12)) * 100) : 0;
  const cardBg = isDark ? colors.surface : colors.card;
  const accentColor = selected === 'team' ? '#BC8CFF' : '#FF9500';

  return (
    <>
      <Stack.Screen options={{ title: t('goPro'), headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Close Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.close}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Hero with Gradient */}
          <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={isDark ? ['#3a2a00', '#1a1500'] : ['#fff8e1', '#ffecb3']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.crownGradient}
            >
              <MaterialCommunityIcons name="crown" size={48} color="#FFD60A" />
            </LinearGradient>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('unlockFullPower')}</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>{t('paywallDesc')}</Text>
          </Animated.View>

          {/* Social Proof */}
          <View style={[styles.socialProof, { backgroundColor: cardBg }]}>
            <View style={styles.avatarRow}>
              {['#FF6961', '#58A6FF', '#3FB950', '#BC8CFF', '#FF9500'].map((c, i) => (
                <View key={i} style={[styles.miniAvatar, { backgroundColor: c, marginLeft: i > 0 ? -8 : 0 }]}>
                  <MaterialCommunityIcons name="account" size={14} color="#FFF" />
                </View>
              ))}
            </View>
            <Text style={[styles.socialText, { color: colors.textSecondary }]}>
              {t('trustedBy') || 'Trusted by 10,000+ developers worldwide'}
            </Text>
          </View>

          {/* Billing Toggle */}
          <View style={[styles.billingToggle, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              style={[styles.billingBtn, billing === 'monthly' && { backgroundColor: colors.primary + '20' }]}
              onPress={() => { setBilling('monthly'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.billingText, { color: billing === 'monthly' ? colors.primary : colors.textSecondary }]}>
                {t('monthly') || 'Monthly'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingBtn, billing === 'yearly' && { backgroundColor: colors.primary + '20' }]}
              onPress={() => { setBilling('yearly'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.billingText, { color: billing === 'yearly' ? colors.primary : colors.textSecondary }]}>
                {t('yearly') || 'Yearly'}
              </Text>
              {billing === 'yearly' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>-{savings}%</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Plan Selection */}
          <View style={styles.planRow}>
            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: cardBg, borderColor: selected === 'pro' ? '#FF9500' : 'transparent', borderWidth: 2 },
              ]}
              onPress={() => { setSelected('pro'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              {selected === 'pro' && (
                <View style={[styles.popularBadge, { backgroundColor: '#FF9500' }]}>
                  <Text style={styles.popularText}>{t('mostPopular') || 'POPULAR'}</Text>
                </View>
              )}
              <Text style={[styles.planName, { color: colors.text }]}>Pro</Text>
              <Text style={[styles.planPrice, { color: '#FF9500' }]}>
                ${billing === 'yearly' ? (PRICES.pro.yearly / 12).toFixed(2) : PRICES.pro.monthly}
              </Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/{t('month')}</Text>
              {billing === 'yearly' && (
                <Text style={[styles.billedAs, { color: colors.textTertiary }]}>
                  ${PRICES.pro.yearly}/{t('year') || 'year'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: cardBg, borderColor: selected === 'team' ? '#BC8CFF' : 'transparent', borderWidth: 2 },
              ]}
              onPress={() => { setSelected('team'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.planName, { color: colors.text }]}>Team</Text>
              <Text style={[styles.planPrice, { color: '#BC8CFF' }]}>
                ${billing === 'yearly' ? (PRICES.team.yearly / 12).toFixed(2) : PRICES.team.monthly}
              </Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/{t('perUser') || 'user'}/{t('month')}</Text>
              {billing === 'yearly' && (
                <Text style={[styles.billedAs, { color: colors.textTertiary }]}>
                  ${PRICES.team.yearly}/{t('year') || 'year'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Feature Comparison Table */}
          <View style={[styles.comparisonCard, { backgroundColor: cardBg }]}>
            {/* Table Header */}
            <View style={[styles.compRow, styles.compHeader]}>
              <Text style={[styles.compFeature, { color: colors.textSecondary, fontWeight: '700' }]}>{t('feature') || 'Feature'}</Text>
              <Text style={[styles.compPlan, { color: colors.textSecondary, fontWeight: '700' }]}>Free</Text>
              <Text style={[styles.compPlan, { color: '#FF9500', fontWeight: '700' }]}>Pro</Text>
              <Text style={[styles.compPlan, { color: '#BC8CFF', fontWeight: '700' }]}>Team</Text>
            </View>
            {FEATURES.map((f, i) => (
              <View
                key={f.key}
                style={[
                  styles.compRow,
                  i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={[styles.compFeature, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <MaterialCommunityIcons name={f.icon as any} size={16} color={colors.textSecondary} />
                  <Text style={[styles.compFeatureText, { color: colors.text }]} numberOfLines={1}>{t(f.key)}</Text>
                </View>
                <View style={styles.compPlan}>
                  {typeof f.free === 'string' ? (
                    <Text style={[styles.compLimit, { color: colors.textTertiary }]}>{f.free}</Text>
                  ) : f.free ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color="#3FB950" />
                  ) : (
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                  )}
                </View>
                <View style={styles.compPlan}>
                  {typeof f.pro === 'string' ? (
                    <Text style={[styles.compLimit, { color: '#FF9500' }]}>{f.pro}</Text>
                  ) : f.pro ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color="#3FB950" />
                  ) : (
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                  )}
                </View>
                <View style={styles.compPlan}>
                  {typeof f.team === 'string' ? (
                    <Text style={[styles.compLimit, { color: '#BC8CFF' }]}>{f.team}</Text>
                  ) : f.team ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color="#3FB950" />
                  ) : (
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <LinearGradient
            colors={selected === 'team' ? ['#BC8CFF', '#9B6DFF'] : ['#FF9500', '#FF7A00']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <TouchableOpacity style={styles.ctaBtn} onPress={handlePurchase}>
              <MaterialCommunityIcons name="crown-outline" size={22} color="#FFF" />
              <Text style={styles.ctaText}>{t('startFreeTrial')}</Text>
            </TouchableOpacity>
          </LinearGradient>

          <Text style={[styles.trialHint, { color: colors.textTertiary }]}>
            {t('trialHint')}
          </Text>

          {/* Guarantee */}
          <View style={[styles.guarantee, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#3FB950" />
            <Text style={[styles.guaranteeText, { color: colors.textSecondary }]}>
              {t('moneyBack') || '30-day money-back guarantee. Cancel anytime.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  close: { alignSelf: 'flex-end', padding: 8 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 20 },
  crownGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { fontSize: 15, marginTop: 6, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },

  // Social Proof
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  avatarRow: { flexDirection: 'row' },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)' },
  socialText: { flex: 1, fontSize: 13, fontWeight: '500' },

  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  billingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  billingText: { fontSize: 15, fontWeight: '600' },
  saveBadge: { backgroundColor: '#3FB950', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  saveText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  // Plans
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  planCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  planName: { fontSize: 18, fontWeight: '800' },
  planPrice: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  planPeriod: { fontSize: 13 },
  billedAs: { fontSize: 12, marginTop: 4 },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Comparison
  comparisonCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  compHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  compFeature: { flex: 2 },
  compFeatureText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  compPlan: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compLimit: { fontSize: 12, fontWeight: '700' },

  // CTA
  ctaGradient: { borderRadius: 16, marginBottom: 4 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  ctaText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  trialHint: { textAlign: 'center', fontSize: 13, marginTop: 8, marginBottom: 16 },

  // Guarantee
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 14,
  },
  guaranteeText: { flex: 1, fontSize: 13, fontWeight: '500' },
});
