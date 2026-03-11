/**
 * Secure Storage Utility
 * Uses expo-secure-store for sensitive data (API keys, tokens, credentials)
 * Falls back to AsyncStorage for non-sensitive data
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isSecureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export async function setSecure(key: string, value: string): Promise<void> {
  if (isSecureAvailable) {
    await SecureStore.setItemAsync(key, value);
  } else {
    // Web fallback — not truly secure, but functional for dev
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(`__secure_${key}`, value);
  }
}

export async function getSecure(key: string): Promise<string | null> {
  if (isSecureAvailable) {
    return SecureStore.getItemAsync(key);
  } else {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return AsyncStorage.getItem(`__secure_${key}`);
  }
}

export async function deleteSecure(key: string): Promise<void> {
  if (isSecureAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(`__secure_${key}`);
  }
}
