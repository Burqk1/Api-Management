import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useCookieStore } from '../stores/cookieStore';

export default function CookiesScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { cookies, autoCapture, setAutoCapture, removeCookie, clearCookies, clearDomainCookies, addCookie } = useCookieStore();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newPath, setNewPath] = useState('/');
  const [filter, setFilter] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  // Group cookies by domain
  const domains = [...new Set(cookies.map((c) => c.domain))].sort();
  const filteredDomains = filter
    ? domains.filter((d) => d.includes(filter) || cookies.some((c) => c.domain === d && c.name.includes(filter)))
    : domains;

  const handleAdd = () => {
    if (!newName.trim() || !newDomain.trim()) return;
    addCookie({
      name: newName.trim(),
      value: newValue.trim(),
      domain: newDomain.trim(),
      path: newPath || '/',
    });
    setShowAdd(false);
    setNewName('');
    setNewValue('');
    setNewDomain('');
    setNewPath('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('cookieManager') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Auto Capture Toggle */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>{t('autoCaptureCookies')}</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{t('autoCaptureDesc')}</Text>
              </View>
              <TouchableOpacity onPress={() => setAutoCapture(!autoCapture)}>
                <MaterialCommunityIcons
                  name={autoCapture ? 'toggle-switch' : 'toggle-switch-off'}
                  size={44}
                  color={autoCapture ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats & Actions */}
          <View style={styles.actionsRow}>
            <View style={[styles.statBox, { backgroundColor: cardBg }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{cookies.length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('totalCookies')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: cardBg }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{domains.length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('domains')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
              onPress={() => setShowAdd(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtnSmall, { backgroundColor: '#FF696120' }]}
              onPress={() => {
                Alert.alert(t('clearAllCookies'), t('clearAllCookiesConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('clear'), style: 'destructive', onPress: clearCookies },
                ]);
              }}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#FF6961" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            style={[styles.searchInput, { backgroundColor: inputBg, color: colors.text }]}
            value={filter}
            onChangeText={setFilter}
            placeholder={t('searchCookies')}
            placeholderTextColor={colors.textTertiary}
          />

          {/* Add Cookie Form */}
          {showAdd && (
            <View style={[styles.addForm, { backgroundColor: cardBg }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>{t('addCookie')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={newDomain}
                onChangeText={setNewDomain}
                placeholder="example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t('cookieName')}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
                  value={newPath}
                  onChangeText={setNewPath}
                  placeholder="/"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={newValue}
                onChangeText={setNewValue}
                placeholder={t('cookieValue')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.systemGray5, flex: 1 }]} onPress={() => setShowAdd(false)}>
                  <Text style={[styles.formBtnText, { color: colors.text }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleAdd}>
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cookie List by Domain */}
          {filteredDomains.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cookie-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('noCookies')}</Text>
            </View>
          )}

          {filteredDomains.map((domain) => {
            const domainCookies = cookies.filter((c) => c.domain === domain);
            return (
              <View key={domain} style={{ marginBottom: 16 }}>
                <View style={styles.domainHeader}>
                  <MaterialCommunityIcons name="web" size={16} color={colors.primary} />
                  <Text style={[styles.domainTitle, { color: colors.text }]}>{domain}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{domainCookies.length}</Text>
                  <TouchableOpacity onPress={() => clearDomainCookies(domain)} style={{ marginLeft: 'auto' }}>
                    <MaterialCommunityIcons name="delete-sweep-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.cookieList, { backgroundColor: cardBg }]}>
                  {domainCookies.map((cookie, i) => (
                    <View
                      key={`${cookie.name}-${i}`}
                      style={[styles.cookieRow, i < domainCookies.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cookieName, { color: colors.text }]}>{cookie.name}</Text>
                        <Text style={[styles.cookieValue, { color: colors.textSecondary }]} numberOfLines={1}>{cookie.value}</Text>
                        <View style={styles.cookieMeta}>
                          <Text style={{ color: colors.textTertiary, fontSize: 10 }}>path: {cookie.path}</Text>
                          {cookie.httpOnly && <Text style={{ color: '#FF9500', fontSize: 10 }}>HttpOnly</Text>}
                          {cookie.secure && <Text style={{ color: '#3FB950', fontSize: 10 }}>Secure</Text>}
                          {cookie.expires && (
                            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
                              exp: {new Date(cookie.expires).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeCookie(cookie.name, cookie.domain)}>
                        <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 16, fontWeight: '600' },
  toggleDesc: { fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  addBtnSmall: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  addForm: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  formBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  formBtnText: { fontSize: 15, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingHorizontal: 4 },
  domainTitle: { fontSize: 15, fontWeight: '700' },
  cookieList: { borderRadius: 12, overflow: 'hidden' },
  cookieRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  cookieName: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  cookieValue: { fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  cookieMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
