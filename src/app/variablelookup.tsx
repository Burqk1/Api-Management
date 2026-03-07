import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { getDynamicVariableList, resolveDynamicVariables } from '../utils/dynamicVariables';
import * as Clipboard from 'expo-clipboard';

export default function VariableLookupScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvId = useEnvironmentStore((s) => s.activeEnvId);
  const globalVariables = useEnvironmentStore((s) => s.globalVariables);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [search, setSearch] = useState('');
  const [testInput, setTestInput] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const activeEnv = environments.find((e) => e.id === activeEnvId);

  const dynamicVars = getDynamicVariableList();

  const allVars = useMemo(() => {
    const vars: { key: string; value: string; source: string; color: string }[] = [];

    // Global variables
    globalVariables.forEach((v) => {
      vars.push({ key: v.key, value: v.value, source: 'Global', color: '#BC8CFF' });
    });

    // Active environment variables
    if (activeEnv) {
      activeEnv.variables.forEach((v) => {
        vars.push({ key: v.key, value: v.value, source: activeEnv.name, color: activeEnv.color });
      });
    }

    // Dynamic variables
    dynamicVars.forEach((dv) => {
      vars.push({ key: `$${dv.name}`, value: dv.description, source: 'Dynamic', color: '#FF9500' });
    });

    return vars;
  }, [globalVariables, activeEnv, dynamicVars]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allVars;
    const q = search.toLowerCase();
    return allVars.filter((v) => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q) || v.source.toLowerCase().includes(q));
  }, [allVars, search]);

  const resolvedPreview = useMemo(() => {
    if (!testInput.trim()) return '';
    return resolveVariables(testInput);
  }, [testInput, resolveVariables]);

  const handleCopy = async (key: string) => {
    await Clipboard.setStringAsync(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('variableQuickLook') || 'Variable Quick Look' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('searchVariables') || 'Search variables...'}
              placeholderTextColor={colors.textTertiary}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Active Env */}
          <View style={[styles.envBadge, { backgroundColor: (activeEnv?.color || colors.primary) + '15' }]}>
            <View style={[styles.envDot, { backgroundColor: activeEnv?.color || colors.primary }]} />
            <Text style={[styles.envName, { color: activeEnv?.color || colors.primary }]}>
              {activeEnv?.name || 'No Active Environment'}
            </Text>
            <Text style={[styles.envCount, { color: colors.textSecondary }]}>
              {filtered.length} variables
            </Text>
          </View>

          {/* Test Resolver */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="test-tube" size={16} color={colors.primary} /> Test Variable Resolution
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              value={testInput}
              onChangeText={setTestInput}
              placeholder="e.g. {{baseUrl}}/api/{{$timestamp}}"
              placeholderTextColor={colors.textTertiary}
            />
            {resolvedPreview ? (
              <View style={[styles.resolvedBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.resolvedLabel, { color: colors.textSecondary }]}>Resolved:</Text>
                <Text style={[styles.resolvedValue, { color: '#3FB950' }]} selectable>{resolvedPreview}</Text>
              </View>
            ) : null}
          </View>

          {/* Variables List */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Variables ({filtered.length})</Text>
            {filtered.map((v, i) => (
              <TouchableOpacity
                key={`${v.source}-${v.key}-${i}`}
                style={[styles.varRow, i < filtered.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                onPress={() => handleCopy(v.key)}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.varKey, { color: colors.text }]}>{`{{${v.key}}}`}</Text>
                    <View style={[styles.sourceBadge, { backgroundColor: v.color + '20' }]}>
                      <Text style={[styles.sourceText, { color: v.color }]}>{v.source}</Text>
                    </View>
                  </View>
                  <Text style={[styles.varValue, { color: colors.textSecondary }]} numberOfLines={1}>{v.value}</Text>
                </View>
                <MaterialCommunityIcons
                  name={copiedKey === v.key ? 'check' : 'content-copy'}
                  size={16}
                  color={copiedKey === v.key ? '#3FB950' : colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  envBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 12 },
  envDot: { width: 8, height: 8, borderRadius: 4 },
  envName: { fontSize: 14, fontWeight: '700', flex: 1 },
  envCount: { fontSize: 13 },
  card: { borderRadius: 14, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 8 },
  resolvedBox: { borderRadius: 8, padding: 10, marginTop: 4 },
  resolvedLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  resolvedValue: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  varRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  varKey: { fontSize: 14, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  varValue: { fontSize: 12, marginTop: 2 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceText: { fontSize: 10, fontWeight: '700' },
});
