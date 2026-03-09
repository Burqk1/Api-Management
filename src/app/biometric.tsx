import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

const STORAGE_KEY = 'biometric_settings';

interface BiometricSettings {
  enabled: boolean;
  lockOnBackground: boolean;
  lockTimeout: number;
  fallbackPin: string;
  requireOnSensitive: boolean;
}

const defaultSettings: BiometricSettings = {
  enabled: false,
  lockOnBackground: true,
  lockTimeout: 5,
  fallbackPin: '',
  requireOnSensitive: false,
};

export default function BiometricScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;

  const [settings, setSettings] = useState<BiometricSettings>(defaultSettings);
  const [faceIdAvailable, setFaceIdAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const timeoutOptions = [1, 5, 15, 30, 60];

  useEffect(() => {
    checkFaceId();
    loadSettings();
  }, []);

  const checkFaceId = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setFaceIdAvailable(hasHardware && hasFaceId);
      setEnrolled(level > 0);
    } catch {
      setFaceIdAvailable(false);
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  };

  const saveSettings = async (updated: BiometricSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const authenticate = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Fetchlab Face ID',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: !!settings.fallbackPin,
      });
      return result.success;
    } catch {
      return false;
    }
  };

  const toggleFaceId = async () => {
    if (!settings.enabled) {
      const success = await authenticate();
      if (success) {
        saveSettings({ ...settings, enabled: true });
        setVerified(true);
      } else {
        Alert.alert('Face ID Failed', 'Could not verify your identity');
      }
    } else {
      const success = await authenticate();
      if (success) {
        saveSettings({ ...settings, enabled: false });
      }
    }
  };

  const testAuth = async () => {
    const success = await authenticate();
    if (success) {
      setVerified(true);
      Alert.alert('Success', 'Face ID verified!');
    } else {
      Alert.alert('Failed', 'Face ID could not verify');
    }
  };

  const savePin = () => {
    if (pinInput.length < 4) return Alert.alert('Error', 'PIN must be at least 4 digits');
    if (pinInput !== pinConfirm) return Alert.alert('Error', 'PINs do not match');
    saveSettings({ ...settings, fallbackPin: pinInput });
    setShowPinSetup(false);
    setPinInput('');
    setPinConfirm('');
    Alert.alert('Saved', 'Fallback PIN saved');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Face ID', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Face ID Status */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.statusRow}>
            <View style={[styles.iconCircle, { backgroundColor: faceIdAvailable ? '#3FB95022' : '#FF696122' }]}>
              <MaterialCommunityIcons
                name={faceIdAvailable ? 'face-recognition' : 'face-recognition'}
                size={36}
                color={faceIdAvailable ? '#3FB950' : '#FF6961'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {faceIdAvailable ? 'Face ID Available' : 'Face ID Not Available'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {faceIdAvailable && enrolled
                  ? 'Face ID is set up on this device'
                  : faceIdAvailable && !enrolled
                  ? 'Go to Settings > Face ID to set up'
                  : 'This device does not support Face ID'}
              </Text>
            </View>
          </View>
          {faceIdAvailable && enrolled && (
            <View style={[styles.badge, { backgroundColor: '#3FB95018' }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '600' }}>Face ID Enrolled</Text>
            </View>
          )}
        </View>

        {/* Main Toggle */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Face ID</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                Require Face ID to open Fetchlab
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleFaceId}
              disabled={!faceIdAvailable || !enrolled}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {settings.enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Lock on Background</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                    Lock when you leave the app
                  </Text>
                </View>
                <Switch
                  value={settings.lockOnBackground}
                  onValueChange={(v) => saveSettings({ ...settings, lockOnBackground: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Protect Sensitive Data</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                    Require Face ID for API keys, tokens, env vars
                  </Text>
                </View>
                <Switch
                  value={settings.requireOnSensitive}
                  onValueChange={(v) => saveSettings({ ...settings, requireOnSensitive: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </>
          )}
        </View>

        {/* Lock Timeout */}
        {settings.enabled && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Auto-Lock Timeout</Text>
            <View style={styles.timeoutRow}>
              {timeoutOptions.map((min) => (
                <TouchableOpacity
                  key={min}
                  onPress={() => saveSettings({ ...settings, lockTimeout: min })}
                  style={[
                    styles.timeoutPill,
                    settings.lockTimeout === min && { backgroundColor: colors.primary },
                    settings.lockTimeout !== min && { backgroundColor: isDark ? colors.background : colors.systemGray5 },
                  ]}
                >
                  <Text
                    style={{
                      color: settings.lockTimeout === min ? '#FFF' : colors.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {min < 60 ? `${min}m` : '1h'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Fallback PIN */}
        {settings.enabled && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Fallback PIN</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                  {settings.fallbackPin ? 'PIN is set' : 'Use when Face ID fails'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.pinBtn, { backgroundColor: colors.primary + '18' }]}
                onPress={() => setShowPinSetup(!showPinSetup)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                  {settings.fallbackPin ? 'Change' : 'Set PIN'}
                </Text>
              </TouchableOpacity>
            </View>
            {showPinSetup && (
              <View style={styles.pinSetup}>
                <TextInput
                  style={[styles.pinInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Enter PIN (min 4 digits)"
                  placeholderTextColor={colors.textTertiary}
                  value={pinInput}
                  onChangeText={setPinInput}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                />
                <TextInput
                  style={[styles.pinInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.textTertiary}
                  value={pinConfirm}
                  onChangeText={setPinConfirm}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[styles.savePinBtn, { backgroundColor: colors.primary }]}
                  onPress={savePin}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Save PIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Test Face ID */}
        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: cardBg }]}
          onPress={testAuth}
          disabled={!faceIdAvailable}
        >
          <MaterialCommunityIcons name="face-recognition" size={24} color={colors.primary} />
          <Text style={[styles.testText, { color: colors.primary }]}>Test Face ID</Text>
          {verified && <MaterialCommunityIcons name="check-circle" size={20} color="#3FB950" />}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  timeoutRow: { flexDirection: 'row', gap: 8 },
  timeoutPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  pinBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  pinSetup: { marginTop: 12, gap: 10 },
  pinInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', letterSpacing: 8 },
  savePinBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
  testBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  testText: { fontSize: 16, fontWeight: '700' },
});
