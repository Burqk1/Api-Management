import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import { useApiStore } from '../../stores/apiStore';
import { useAuthStore } from '../../stores/authStore';
import { ThemeName } from '../../constants/colors';
import { Language } from '../../constants/translations';
import { useLanguageStore } from '../../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

const THEME_KEYS: { labelKey: string; value: ThemeName; icon: string }[] = [
  { labelKey: 'system', value: 'system', icon: 'cellphone' },
  { labelKey: 'dark', value: 'dark', icon: 'weather-night' },
  { labelKey: 'light', value: 'light', icon: 'white-balance-sunny' },
];

const LANG_OPTIONS: { labelKey: string; value: Language; icon: string }[] = [
  { labelKey: 'english', value: 'en', icon: 'alpha-e-circle' },
  { labelKey: 'turkish', value: 'tr', icon: 'alpha-t-circle' },
];

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const themeName = useThemeStore((s) => s.themeName);
  const setTheme = useThemeStore((s) => s.setTheme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const setAccentColor = useThemeStore((s) => s.setAccentColor);
  const clearCallLogs = useApiStore((s) => s.clearCallLogs);
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const apiKeys = useApiStore((s) => s.apiKeys);
  const addApiKey = useApiStore((s) => s.addApiKey);
  const deleteApiKey = useApiStore((s) => s.deleteApiKey);
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);

  const [showAddKey, setShowAddKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyService, setKeyService] = useState('');

  const handleClearLogs = () => {
    Alert.alert(t('clearCallLogs'), t('clearCallLogsConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clear'), style: 'destructive', onPress: clearCallLogs },
    ]);
  };

  const handleAddKey = () => {
    if (!keyName.trim() || !keyValue.trim()) return;
    addApiKey({ name: keyName.trim(), key: keyValue.trim(), service: keyService.trim() });
    setKeyName('');
    setKeyValue('');
    setKeyService('');
    setShowAddKey(false);
  };

  const copyKey = async (key: string) => {
    await Clipboard.setStringAsync(key);
  };

  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Account */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('account').toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        {user ? (
          <TouchableOpacity onPress={() => router.push('/profile' as any)} style={styles.row} activeOpacity={0.5}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="account" size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 0 }]}>{user.email}</Text>
              <Text style={[styles.keyMeta, { color: plan === 'free' ? colors.textTertiary : '#FFD60A' }]}>
                {plan === 'team' ? 'Team' : plan === 'pro' ? 'Pro' : 'Free'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/auth' as any)} style={styles.row} activeOpacity={0.5}>
            <View style={[styles.iconBox, { backgroundColor: '#58A6FF' }]}>
              <MaterialCommunityIcons name="login" size={18} color="#FFF" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.primary }]}>{t('signInSignUp')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        {plan === 'free' && (
          <TouchableOpacity
            onPress={() => router.push('/paywall' as any)}
            style={[styles.row, styles.separator, { borderBottomColor: colors.divider }]}
            activeOpacity={0.5}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FFD60A' }]}>
              <MaterialCommunityIcons name="crown-outline" size={18} color="#FFF" />
            </View>
            <Text style={[styles.rowLabel, { color: '#FFD60A' }]}>{t('upgradeToPro')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Theme */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('appearance')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        {THEME_KEYS.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setTheme(opt.value)}
            activeOpacity={0.5}
            style={[
              styles.row,
              i < THEME_KEYS.length - 1 && [styles.separator, { borderBottomColor: colors.divider }],
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: opt.value === 'dark' ? '#5856D6' : opt.value === 'light' ? '#FF9500' : '#007AFF' }]}>
              <MaterialCommunityIcons name={opt.icon as any} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t(opt.labelKey)}</Text>
            {themeName === opt.value && (
              <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Language */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('language')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        {LANG_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setLanguage(opt.value)}
            activeOpacity={0.5}
            style={[
              styles.row,
              i < LANG_OPTIONS.length - 1 && [styles.separator, { borderBottomColor: colors.divider }],
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: opt.value === 'en' ? '#007AFF' : '#FF3B30' }]}>
              <MaterialCommunityIcons name={opt.icon as any} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t(opt.labelKey)}</Text>
            {language === opt.value && (
              <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Accent Color */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('accentColor')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
          {[null, '#0A84FF', '#FF453A', '#FF9500', '#FFD60A', '#30D158', '#5856D6', '#BF5AF2', '#FF375F', '#64D2FF'].map((c) => (
            <TouchableOpacity
              key={c || 'default'}
              onPress={() => setAccentColor(c)}
              style={[styles.colorDot, {
                backgroundColor: c || (isDark ? '#0A84FF' : '#007AFF'),
                borderWidth: accentColor === c ? 3 : 0,
                borderColor: colors.text,
              }]}
            >
              {accentColor === c && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
              {c === null && accentColor === null && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* API Keys */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('apiKeys')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        {apiKeys.length === 0 && !showAddKey && (
          <View style={styles.emptyKeys}>
            <Text style={[styles.emptyKeysText, { color: colors.textTertiary }]}>
              {t('noApiKeysStored')}
            </Text>
          </View>
        )}
        {apiKeys.map((ak, i) => (
          <View
            key={ak.id}
            style={[
              styles.row,
              (i < apiKeys.length - 1 || showAddKey) && [styles.separator, { borderBottomColor: colors.divider }],
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: '#3FB950' }]}>
              <MaterialCommunityIcons name="key-variant" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 0 }]}>{ak.name}</Text>
              <Text style={[styles.keyMeta, { color: colors.textTertiary }]}>
                {ak.service || 'General'} · ····{ak.key.slice(-4)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => copyKey(ak.key)} style={{ marginRight: 10 }}>
              <MaterialCommunityIcons name="content-copy" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteApiKey(ak.id)}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
        ))}

        {showAddKey ? (
          <View style={styles.addKeyForm}>
            <TextInput
              style={[styles.keyInput, { backgroundColor: inputBg, color: colors.text }]}
              value={keyName}
              onChangeText={setKeyName}
              placeholder={t('keyName')}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.keyInput, { backgroundColor: inputBg, color: colors.text }]}
              value={keyService}
              onChangeText={setKeyService}
              placeholder={t('service')}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.keyInput, { backgroundColor: inputBg, color: colors.text }]}
              value={keyValue}
              onChangeText={setKeyValue}
              placeholder={t('apiKeyValue')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
            />
            <View style={styles.keyActions}>
              <TouchableOpacity
                style={[styles.keyBtn, { backgroundColor: colors.systemGray5 }]}
                onPress={() => setShowAddKey(false)}
              >
                <Text style={[styles.keyBtnText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keyBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddKey}
              >
                <Text style={[styles.keyBtnText, { color: '#FFF' }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowAddKey(true)}
            style={[styles.row, { justifyContent: 'center' }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
            <Text style={[styles.addKeyText, { color: colors.primary }]}>{t('addApiKey')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Data */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('data')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <TouchableOpacity onPress={handleClearLogs} activeOpacity={0.5} style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.accent }]}>{t('clearCallLogs')}</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('about')}</Text>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: colors.systemGray }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{t('version')}</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        API Manager v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    minHeight: 48,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
  rowValue: { fontSize: 17, letterSpacing: -0.4 },
  keyMeta: { fontSize: 13, marginTop: 1 },
  emptyKeys: { padding: 16, alignItems: 'center' },
  emptyKeysText: { fontSize: 14 },
  addKeyText: { fontSize: 15, fontWeight: '600' },
  addKeyForm: { padding: 16, gap: 8 },
  keyInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  keyActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  keyBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  keyBtnText: { fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 13, marginTop: 32, marginBottom: 40 },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
