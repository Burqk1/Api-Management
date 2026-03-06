import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { useLanguageStore } from '../../stores/languageStore';
import { AuthConfig, AuthType } from '../../types/api';

const COLORS = ['#58A6FF', '#3FB950', '#F0883E', '#BC8CFF', '#F778BA', '#D29922', '#FF6961', '#8B949E'];
const ICONS = [
  'folder-outline', 'api', 'web', 'cloud-outline', 'server-network',
  'database-outline', 'cellphone-link', 'shield-check-outline',
];

export default function NewCollectionScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const addCollection = useApiStore((s) => s.addCollection);
  const t = useLanguageStore((s) => s.t);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [auth, setAuth] = useState<AuthConfig>({ type: 'none' });

  const handleCreate = () => {
    if (!name.trim()) return;
    addCollection({
      name: name.trim(),
      description: description.trim(),
      baseUrl: baseUrl.trim(),
      color: selectedColor,
      icon: selectedIcon,
      auth: auth.type !== 'none' ? auth : undefined,
    });
    router.back();
  };

  const inputBg = isDark ? colors.surface : colors.card;
  const padding = Platform.OS === 'web' ? 32 : 20;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { maxWidth: 600, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>COLLECTION NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="My API Collection"
          placeholderTextColor={colors.textTertiary}
          autoFocus
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={colors.textTertiary}
        />

        {/* Base URL */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>BASE URL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="https://api.example.com"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Color */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>COLOR</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selectedColor === c && styles.colorDotSelected,
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>ICON</Text>
        <View style={styles.iconRow}>
          {ICONS.map((ic) => (
            <TouchableOpacity
              key={ic}
              onPress={() => setSelectedIcon(ic)}
              style={[
                styles.iconBtn,
                { backgroundColor: selectedIcon === ic ? selectedColor + '25' : inputBg },
              ]}
            >
              <MaterialCommunityIcons
                name={ic as any}
                size={22}
                color={selectedIcon === ic ? selectedColor : colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Collection Auth */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('collectionAuth')}</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>{t('collectionAuthHint')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['none', 'bearer', 'basic', 'apikey'] as AuthType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setAuth({ ...auth, type })}
                style={[styles.iconBtn, { backgroundColor: auth.type === type ? selectedColor + '25' : inputBg }]}
              >
                <Text style={{ color: auth.type === type ? selectedColor : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {type === 'none' ? t('none') : type === 'bearer' ? 'Bearer' : type === 'basic' ? 'Basic' : 'API Key'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {auth.type === 'bearer' && (
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.text, marginTop: 8 }]}
            value={auth.bearer?.token || ''}
            onChangeText={(v) => setAuth({ ...auth, bearer: { token: v } })}
            placeholder={t('bearerTokenPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
        )}
        {auth.type === 'basic' && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={auth.basic?.username || ''}
              onChangeText={(v) => setAuth({ ...auth, basic: { username: v, password: auth.basic?.password || '' } })}
              placeholder={t('username')}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={auth.basic?.password || ''}
              onChangeText={(v) => setAuth({ ...auth, basic: { username: auth.basic?.username || '', password: v } })}
              placeholder={t('password')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
            />
          </View>
        )}
        {auth.type === 'apikey' && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={auth.apikey?.key || ''}
              onChangeText={(v) => setAuth({ ...auth, apikey: { key: v, value: auth.apikey?.value || '', addTo: auth.apikey?.addTo || 'header' } })}
              placeholder={t('key')}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={auth.apikey?.value || ''}
              onChangeText={(v) => setAuth({ ...auth, apikey: { key: auth.apikey?.key || '', value: v, addTo: auth.apikey?.addTo || 'header' } })}
              placeholder={t('value')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        )}

        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: inputBg }]}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
            <MaterialCommunityIcons name={selectedIcon as any} size={24} color={selectedColor} />
          </View>
          <Text style={[styles.previewName, { color: colors.text }]}>
            {name || 'Collection Name'}
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.5 }]}
          onPress={handleCreate}
          disabled={!name.trim()}
        >
          <Text style={styles.createBtnText}>Create Collection</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  createBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
