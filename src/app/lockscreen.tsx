import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useSecurityStore } from '../stores/securityStore';

let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch {}

export default function LockScreen() {
  const { colors } = useTheme();
  const unlock = useSecurityStore((s) => s.unlock);
  const isLocked = useSecurityStore((s) => s.isLocked);

  const authenticate = useCallback(async () => {
    if (!LocalAuthentication) {
      unlock();
      return;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        unlock();
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Biometrics', 'No biometrics enrolled on this device');
        unlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock API Toolbox',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        unlock();
      }
    } catch {
      // Fail open on error
      unlock();
    }
  }, [unlock]);

  useEffect(() => {
    if (isLocked) {
      authenticate();
    }
  }, []);

  if (!isLocked) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <MaterialCommunityIcons name="lock-outline" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>API Toolbox</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Authenticate to continue
        </Text>
        <TouchableOpacity
          style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
          onPress={authenticate}
        >
          <MaterialCommunityIcons name="fingerprint" size={24} color="#FFF" />
          <Text style={styles.unlockText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: { alignItems: 'center', gap: 16 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginBottom: 16 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  unlockText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
