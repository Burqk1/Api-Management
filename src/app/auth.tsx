import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useAuthStore } from '../stores/authStore';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError(t('fillAllFields'));
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError(t('passwordsNoMatch'));
      return;
    }

    setLoading(true);
    const result = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: mode === 'login' ? t('signIn') : t('signUp') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.logoBox, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons name="shield-account-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {mode === 'login' ? t('welcomeBack') : t('createAccount')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('authSubtitle')}
              </Text>
            </View>

            {/* Form */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>{t('password').toUpperCase()}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />

              {mode === 'register' && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>{t('confirmPassword').toUpperCase()}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                  />
                </>
              )}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: '#FF696112' }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF6961" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? t('signIn') : t('signUp')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Toggle Mode */}
            <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                {mode === 'login' ? t('noAccount') : t('haveAccount')}
              </Text>
              <Text style={[styles.toggleLink, { color: colors.primary }]}>
                {mode === 'login' ? t('signUp') : t('signIn')}
              </Text>
            </TouchableOpacity>

            {/* Pro Benefits */}
            <View style={[styles.benefitsCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.benefitsTitle, { color: colors.text }]}>{t('whySignUp')}</Text>
              {[
                { icon: 'cloud-sync-outline', text: t('benefitSync') },
                { icon: 'robot-outline', text: t('benefitAI') },
                { icon: 'link-variant', text: t('benefitChaining') },
                { icon: 'account-group-outline', text: t('benefitTeam') },
              ].map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <MaterialCommunityIcons name={b.icon as any} size={20} color={colors.primary} />
                  <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{b.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4 },
  card: { borderRadius: 14, padding: 18, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 10, marginTop: 12 },
  errorText: { color: '#FF6961', fontSize: 13, fontWeight: '600', flex: 1 },
  submitBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 24 },
  toggleText: { fontSize: 15 },
  toggleLink: { fontSize: 15, fontWeight: '700' },
  benefitsCard: { borderRadius: 14, padding: 18, gap: 12 },
  benefitsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, flex: 1 },
});
