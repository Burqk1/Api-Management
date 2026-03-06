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
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SSLProfile {
  id: string;
  name: string;
  enabled: boolean;
  rejectUnauthorized: boolean;
  clientCertificate: string;
  clientKey: string;
  caCertificate: string;
  passphrase: string;
}

const SSL_STORAGE_KEY = 'ssl_profiles';

export default function SSLConfigScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [profiles, setProfiles] = useState<SSLProfile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<SSLProfile | null>(null);
  const [showForm, setShowForm] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  // Load on first render
  if (!loaded) {
    AsyncStorage.getItem(SSL_STORAGE_KEY).then((val) => {
      if (val) setProfiles(JSON.parse(val));
      setLoaded(true);
    });
  }

  const saveProfiles = (updated: SSLProfile[]) => {
    setProfiles(updated);
    AsyncStorage.setItem(SSL_STORAGE_KEY, JSON.stringify(updated));
  };

  const startNew = () => {
    setEditing({
      id: Date.now().toString(36),
      name: '',
      enabled: true,
      rejectUnauthorized: true,
      clientCertificate: '',
      clientKey: '',
      caCertificate: '',
      passphrase: '',
    });
    setShowForm(true);
  };

  const saveProfile = () => {
    if (!editing?.name.trim()) return;
    const exists = profiles.findIndex((p) => p.id === editing.id);
    if (exists >= 0) {
      const updated = [...profiles];
      updated[exists] = editing;
      saveProfiles(updated);
    } else {
      saveProfiles([...profiles, editing]);
    }
    setShowForm(false);
    setEditing(null);
  };

  const deleteProfile = (id: string) => {
    Alert.alert(t('delete'), t('deleteConfirmGeneric'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => saveProfiles(profiles.filter((p) => p.id !== id)) },
    ]);
  };

  const toggleProfile = (id: string) => {
    saveProfiles(profiles.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <>
      <Stack.Screen options={{ title: t('sslCertificates') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: '#58A6FF15' }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#58A6FF" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{t('sslCertificates')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{t('sslInfoDesc')}</Text>
            </View>
          </View>

          {/* Add Profile */}
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={startNew}>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>{t('addSslProfile')}</Text>
          </TouchableOpacity>

          {/* Form */}
          {showForm && editing && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {profiles.find((p) => p.id === editing.id) ? t('editSslProfile') : t('addSslProfile')}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('profileName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={editing.name}
                onChangeText={(v) => setEditing({ ...editing, name: v })}
                placeholder="My SSL Profile"
                placeholderTextColor={colors.textTertiary}
              />

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('rejectUnauthorized')}</Text>
                <TouchableOpacity onPress={() => setEditing({ ...editing, rejectUnauthorized: !editing.rejectUnauthorized })}>
                  <MaterialCommunityIcons
                    name={editing.rejectUnauthorized ? 'toggle-switch' : 'toggle-switch-off'}
                    size={44}
                    color={editing.rejectUnauthorized ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('clientCertPEM')}</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
                value={editing.clientCertificate}
                onChangeText={(v) => setEditing({ ...editing, clientCertificate: v })}
                placeholder="-----BEGIN CERTIFICATE-----"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('clientKeyPEM')}</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
                value={editing.clientKey}
                onChangeText={(v) => setEditing({ ...editing, clientKey: v })}
                placeholder="-----BEGIN PRIVATE KEY-----"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
                secureTextEntry={false}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('caCertPEM')}</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
                value={editing.caCertificate}
                onChangeText={(v) => setEditing({ ...editing, caCertificate: v })}
                placeholder="-----BEGIN CERTIFICATE-----"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('passphrase')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={editing.passphrase}
                onChangeText={(v) => setEditing({ ...editing, passphrase: v })}
                placeholder={t('optional')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.systemGray5, flex: 1 }]} onPress={() => { setShowForm(false); setEditing(null); }}>
                  <Text style={[styles.formBtnText, { color: colors.text }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={saveProfile}>
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Profiles List */}
          {profiles.length === 0 && !showForm && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="certificate-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('noSslProfiles')}</Text>
            </View>
          )}

          {profiles.map((profile) => (
            <View key={profile.id} style={[styles.profileCard, { backgroundColor: cardBg }]}>
              <View style={styles.profileHeader}>
                <TouchableOpacity onPress={() => toggleProfile(profile.id)}>
                  <MaterialCommunityIcons
                    name={profile.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                    size={40}
                    color={profile.enabled ? '#3FB950' : colors.textTertiary}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {profile.clientCertificate ? t('certAttached') : t('noCert')}
                    {profile.rejectUnauthorized ? '' : ` | ${t('insecureMode')}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setEditing(profile); setShowForm(true); }}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteProfile(profile.id)} style={{ marginLeft: 8 }}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color="#FF6961" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileMeta}>
                {profile.clientCertificate && (
                  <View style={[styles.metaBadge, { backgroundColor: '#3FB95015' }]}>
                    <MaterialCommunityIcons name="file-certificate-outline" size={12} color="#3FB950" />
                    <Text style={{ color: '#3FB950', fontSize: 11, fontWeight: '600' }}>{t('clientCert')}</Text>
                  </View>
                )}
                {profile.clientKey && (
                  <View style={[styles.metaBadge, { backgroundColor: '#58A6FF15' }]}>
                    <MaterialCommunityIcons name="key-outline" size={12} color="#58A6FF" />
                    <Text style={{ color: '#58A6FF', fontSize: 11, fontWeight: '600' }}>{t('privateKey')}</Text>
                  </View>
                )}
                {profile.caCertificate && (
                  <View style={[styles.metaBadge, { backgroundColor: '#D2992215' }]}>
                    <MaterialCommunityIcons name="shield-check-outline" size={12} color="#D29922" />
                    <Text style={{ color: '#D29922', fontSize: 11, fontWeight: '600' }}>CA</Text>
                  </View>
                )}
              </View>
            </View>
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
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 12 },
  infoTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  formCard: { borderRadius: 14, padding: 16, gap: 8, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'monospace', minHeight: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  formBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  formBtnText: { fontSize: 15, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  profileCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileMeta: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
