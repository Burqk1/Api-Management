import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { keys: ['Ctrl', '1'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['Ctrl', '2'], description: 'Go to APIs', category: 'Navigation' },
  { keys: ['Ctrl', '3'], description: 'Go to Monitor', category: 'Navigation' },
  { keys: ['Ctrl', '4'], description: 'Go to Tools', category: 'Navigation' },
  { keys: ['Ctrl', '5'], description: 'Go to Settings', category: 'Navigation' },
  // Requests
  { keys: ['Ctrl', 'Enter'], description: 'Send Request', category: 'Requests' },
  { keys: ['Ctrl', 'S'], description: 'Save Endpoint', category: 'Requests' },
  { keys: ['Ctrl', 'N'], description: 'New Endpoint', category: 'Requests' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'New Collection', category: 'Requests' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate Endpoint', category: 'Requests' },
  // Editor
  { keys: ['Ctrl', 'B'], description: 'Format/Beautify Body', category: 'Editor' },
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Copy as cURL', category: 'Editor' },
  { keys: ['Ctrl', 'L'], description: 'Clear Response', category: 'Editor' },
  { keys: ['Ctrl', '/'], description: 'Toggle Comment', category: 'Editor' },
  // General
  { keys: ['Ctrl', 'K'], description: 'Quick Search', category: 'General' },
  { keys: ['Ctrl', 'E'], description: 'Switch Environment', category: 'General' },
  { keys: ['Ctrl', ','], description: 'Open Settings', category: 'General' },
  { keys: ['Esc'], description: 'Close Modal / Go Back', category: 'General' },
  { keys: ['F11'], description: 'Toggle Fullscreen', category: 'General' },
];

export default function KeyboardShortcutsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;

  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  if (Platform.OS !== 'web') {
    return (
      <>
        <Stack.Screen options={{ title: t('keyboardShortcuts') || 'Keyboard Shortcuts' }} />
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={[styles.emptyState, { backgroundColor: cardBg, margin: 20 }]}>
            <MaterialCommunityIcons name="keyboard-off-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Desktop Only</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Keyboard shortcuts are available when running on web/desktop.
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('keyboardShortcuts') || 'Keyboard Shortcuts' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {categories.map((cat) => (
            <View key={cat} style={{ marginBottom: 16 }}>
              <Text style={[styles.catTitle, { color: colors.text }]}>{cat}</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {SHORTCUTS.filter((s) => s.category === cat).map((shortcut, i, arr) => (
                  <View
                    key={shortcut.description}
                    style={[styles.shortcutRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  >
                    <Text style={[styles.shortcutDesc, { color: colors.text }]}>{shortcut.description}</Text>
                    <View style={styles.keysRow}>
                      {shortcut.keys.map((key, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && <Text style={{ color: colors.textTertiary, fontSize: 12 }}>+</Text>}
                          <View style={[styles.keyBadge, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                            <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  </View>
                ))}
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
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  catTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  card: { borderRadius: 14, overflow: 'hidden' },
  shortcutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  shortcutDesc: { fontSize: 14, fontWeight: '500', flex: 1 },
  keysRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  keyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, minWidth: 32, alignItems: 'center' },
  keyText: { fontSize: 12, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  emptyState: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
