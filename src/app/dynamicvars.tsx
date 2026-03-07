import React, { useState } from 'react';
import {
  View,
  Text,
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
import { getDynamicVariableList, resolveDynamicVariables } from '../utils/dynamicVariables';
import * as Clipboard from 'expo-clipboard';

export default function DynamicVarsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const [copiedVar, setCopiedVar] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;
  const vars = getDynamicVariableList();

  const handleCopy = (name: string) => {
    Clipboard.setStringAsync(`{{${name}}}`);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(''), 1500);
  };

  const handleGenerate = (name: string) => {
    const result = resolveDynamicVariables(`{{${name}}}`);
    Clipboard.setStringAsync(result);
    setCopiedVar(name + '_gen');
    setTimeout(() => setCopiedVar(''), 1500);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('dynamicVariables') || 'Dynamic Variables' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Info */}
          <View style={[styles.card, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Use these variables in URLs, headers, and body. They are resolved at request time with fresh values.
            </Text>
          </View>

          {/* Usage Example */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 12 }]}>
            <Text style={[styles.usageTitle, { color: colors.text }]}>Usage</Text>
            <Text style={[styles.usageCode, { color: colors.primary }]}>
              {'https://api.com/users/{{$guid}}?t={{$timestamp}}'}
            </Text>
          </View>

          {/* Variable List */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 16 }]}>
            {vars.map((v, i) => (
              <View
                key={v.name}
                style={[
                  styles.varRow,
                  i < vars.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.varName, { color: colors.primary }]}>
                      {`{{${v.name}}}`}
                    </Text>
                    <TouchableOpacity onPress={() => handleCopy(v.name)}>
                      <MaterialCommunityIcons
                        name={copiedVar === v.name ? 'check' : 'content-copy'}
                        size={14}
                        color={copiedVar === v.name ? '#3FB950' : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.varDesc, { color: colors.textSecondary }]}>{v.description}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.genBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => handleGenerate(v.name)}
                >
                  <MaterialCommunityIcons
                    name={copiedVar === v.name + '_gen' ? 'check' : 'refresh'}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.genText, { color: colors.primary }]}>
                    {copiedVar === v.name + '_gen' ? 'Copied' : 'Generate'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  card: { borderRadius: 14, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 20 },
  usageTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  usageCode: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  varRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  varName: { fontSize: 13, fontWeight: '700', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  varDesc: { fontSize: 12, marginTop: 2 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  genText: { fontSize: 12, fontWeight: '600' },
});
