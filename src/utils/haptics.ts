import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Light tap - for button presses, selections
export const tapLight = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// Medium tap - for toggles, important actions
export const tapMedium = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

// Heavy tap - for destructive actions, confirmations
export const tapHeavy = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

// Success notification - request succeeded, test passed
export const notifySuccess = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

// Error notification - request failed, test failed
export const notifyError = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

// Warning notification - rate limit, slow response
export const notifyWarning = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

// Selection changed - for pickers, tabs
export const selectionChanged = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
};
