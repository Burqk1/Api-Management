import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useSecurityStore } from '../stores/securityStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

export default function LockScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const unlock = useSecurityStore((s) => s.unlock);
  const isLocked = useSecurityStore((s) => s.isLocked);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    loadPin();
    if (isLocked) {
      setTimeout(() => authenticate(), 300);
    }
  }, []);

  const loadPin = async () => {
    try {
      const stored = await AsyncStorage.getItem('biometric_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.fallbackPin) setSavedPin(settings.fallbackPin);
      }
    } catch {}
  };

  const authenticate = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        handleUnlock();
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        handleUnlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Fetchlab',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: !!savedPin,
      });

      if (result.success) {
        handleUnlock();
      } else if (savedPin) {
        setShowPin(true);
      }
    } catch {
      if (savedPin) {
        setShowPin(true);
      } else {
        handleUnlock();
      }
    }
  }, [unlock, savedPin]);

  const handleUnlock = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    unlock();
    router.back();
  };

  const handlePinSubmit = () => {
    if (pin === savedPin) {
      handleUnlock();
    } else {
      setError('Wrong PIN');
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setError(''), 2000);
    }
  };

  const pinDots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.content}>
        {/* Face ID Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.primary + '25' }]}>
            <MaterialCommunityIcons
              name="face-recognition"
              size={48}
              color={colors.primary}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Fetchlab</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {showPin ? 'Enter your PIN' : 'Authenticate to continue'}
        </Text>

        {/* PIN Input */}
        {showPin && (
          <Animated.View style={[styles.pinContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.pinDots}>
              {pinDots.map((filled, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor: filled ? colors.primary : 'transparent',
                      borderColor: error ? '#FF6961' : filled ? colors.primary : colors.textTertiary,
                    },
                  ]}
                />
              ))}
            </View>
            <TextInput
              style={styles.hiddenInput}
              value={pin}
              onChangeText={(v) => {
                setPin(v);
                setError('');
                if (v.length === savedPin.length) {
                  setTimeout(() => {
                    if (v === savedPin) handleUnlock();
                    else {
                      setError('Wrong PIN');
                      setPin('');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      Animated.sequence([
                        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                      ]).start();
                      setTimeout(() => setError(''), 2000);
                    }
                  }, 100);
                }
              }}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              secureTextEntry
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={authenticate}
          >
            <MaterialCommunityIcons name="face-recognition" size={22} color="#FFF" />
            <Text style={styles.primaryBtnText}>
              {showPin ? 'Try Face ID' : 'Unlock with Face ID'}
            </Text>
          </TouchableOpacity>

          {savedPin && !showPin && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => setShowPin(true)}
            >
              <MaterialCommunityIcons name="dialpad" size={20} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Use PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginBottom: 8 },

  // PIN
  pinContainer: { alignItems: 'center', marginVertical: 16, width: '100%' },
  pinDots: { flexDirection: 'row', gap: 14 },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: 50,
  },
  errorText: {
    color: '#FF6961',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },

  // Actions
  actions: { gap: 10, width: '100%', marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
});
