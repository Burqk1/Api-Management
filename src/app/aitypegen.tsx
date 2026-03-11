import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import * as Haptics from 'expo-haptics';

type OutputLang = 'typescript' | 'swift' | 'kotlin' | 'go' | 'python';

const LANGS: { key: OutputLang; label: string; icon: string; color: string }[] = [
  { key: 'typescript', label: 'TypeScript', icon: 'language-typescript', color: '#3178C6' },
  { key: 'swift', label: 'Swift', icon: 'language-swift', color: '#F05138' },
  { key: 'kotlin', label: 'Kotlin', icon: 'language-kotlin', color: '#7F52FF' },
  { key: 'go', label: 'Go', icon: 'language-go', color: '#00ADD8' },
  { key: 'python', label: 'Python', icon: 'language-python', color: '#3776AB' },
];

function inferType(value: unknown, lang: OutputLang): string {
  if (value === null) {
    const nullTypes = { typescript: 'null', swift: 'Any?', kotlin: 'Any?', go: 'interface{}', python: 'None' };
    return nullTypes[lang];
  }
  if (typeof value === 'string') {
    const strTypes = { typescript: 'string', swift: 'String', kotlin: 'String', go: 'string', python: 'str' };
    return strTypes[lang];
  }
  if (typeof value === 'number') {
    const isInt = Number.isInteger(value);
    const numTypes = {
      typescript: 'number',
      swift: isInt ? 'Int' : 'Double',
      kotlin: isInt ? 'Int' : 'Double',
      go: isInt ? 'int' : 'float64',
      python: isInt ? 'int' : 'float',
    };
    return numTypes[lang];
  }
  if (typeof value === 'boolean') {
    const boolTypes = { typescript: 'boolean', swift: 'Bool', kotlin: 'Boolean', go: 'bool', python: 'bool' };
    return boolTypes[lang];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      const arrTypes = { typescript: 'any[]', swift: '[Any]', kotlin: 'List<Any>', go: '[]interface{}', python: 'List[Any]' };
      return arrTypes[lang];
    }
    const inner = inferType(value[0], lang);
    const arrTypesF = {
      typescript: `${inner}[]`,
      swift: `[${inner}]`,
      kotlin: `List<${inner}>`,
      go: `[]${inner}`,
      python: `List[${inner}]`,
    };
    return arrTypesF[lang];
  }
  return { typescript: 'any', swift: 'Any', kotlin: 'Any', go: 'interface{}', python: 'Any' }[lang];
}

function generateInterface(json: Record<string, unknown>, name: string, lang: OutputLang): string {
  const entries = Object.entries(json);

  switch (lang) {
    case 'typescript': {
      const fields = entries.map(([k, v]) => `  ${k}: ${inferType(v, lang)};`).join('\n');
      return `export interface ${name} {\n${fields}\n}`;
    }
    case 'swift': {
      const fields = entries.map(([k, v]) => `    let ${k}: ${inferType(v, lang)}`).join('\n');
      return `struct ${name}: Codable {\n${fields}\n}`;
    }
    case 'kotlin': {
      const fields = entries.map(([k, v]) => `    val ${k}: ${inferType(v, lang)},`).join('\n');
      return `data class ${name}(\n${fields}\n)`;
    }
    case 'go': {
      const fields = entries.map(([k, v]) => {
        const goName = k.charAt(0).toUpperCase() + k.slice(1);
        return `\t${goName} ${inferType(v, lang)} \`json:"${k}"\``;
      }).join('\n');
      return `type ${name} struct {\n${fields}\n}`;
    }
    case 'python': {
      const fields = entries.map(([k, v]) => `    ${k}: ${inferType(v, lang)}`).join('\n');
      return `from dataclasses import dataclass\nfrom typing import List, Optional, Any\n\n@dataclass\nclass ${name}:\n${fields}`;
    }
  }
}

export default function AITypeGenScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);
  const endpoints = useApiStore((s) => s.endpoints);

  const [selectedLang, setSelectedLang] = useState<OutputLang>('typescript');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [output, setOutput] = useState('');

  const recentLogs = useMemo(() => callLogs.filter((l) => l.responseBody).slice(0, 20), [callLogs]);

  const cardBg = isDark ? colors.surface : colors.card;

  const handleGenerate = (logId: string) => {
    const log = callLogs.find((l) => l.id === logId);
    if (!log?.responseBody) return;

    try {
      const parsed = JSON.parse(log.responseBody);
      const ep = endpoints.find((e) => e.url === log.url);
      const name = ep?.name
        ? ep.name.replace(/[^a-zA-Z0-9]/g, '') + 'Response'
        : 'ApiResponse';

      let json = parsed;
      if (Array.isArray(parsed) && parsed.length > 0) {
        json = parsed[0];
      }

      if (typeof json === 'object' && json !== null) {
        const result = generateInterface(json as Record<string, unknown>, name, selectedLang);

        // If there are nested objects, also generate their interfaces
        const nested: string[] = [];
        Object.entries(json).forEach(([key, val]) => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const nestedName = key.charAt(0).toUpperCase() + key.slice(1);
            nested.push(generateInterface(val as Record<string, unknown>, nestedName, selectedLang));
          }
          if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
            const nestedName = key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, '');
            nested.push(generateInterface(val[0] as Record<string, unknown>, nestedName, selectedLang));
          }
        });

        setOutput([...nested, result].join('\n\n'));
        setSelectedLogId(logId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setOutput(`// Response is a primitive: ${typeof json}`);
      }
    } catch {
      setOutput('// Could not parse response as JSON');
    }
  };

  const copyOutput = async () => {
    await Clipboard.setStringAsync(output);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('aiTypeGen') || 'Type Generator', headerBackTitle: t('cancel') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Language Selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('outputLanguage') || 'OUTPUT LANGUAGE'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LANGS.map((lang) => (
                <TouchableOpacity
                  key={lang.key}
                  style={[
                    styles.langChip,
                    { backgroundColor: selectedLang === lang.key ? lang.color + '20' : cardBg, borderColor: selectedLang === lang.key ? lang.color : 'transparent', borderWidth: 1.5 },
                  ]}
                  onPress={() => { setSelectedLang(lang.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <MaterialCommunityIcons name={lang.icon as any} size={18} color={lang.color} />
                  <Text style={[styles.langLabel, { color: selectedLang === lang.key ? lang.color : colors.text }]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Recent Responses */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('selectResponse') || 'SELECT API RESPONSE'}
          </Text>
          {recentLogs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="code-json" size={36} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noResponsesYet') || 'No API responses yet. Make some requests first.'}
              </Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: cardBg }]}>
              {recentLogs.map((log, i) => (
                <TouchableOpacity
                  key={log.id}
                  style={[
                    styles.logRow,
                    selectedLogId === log.id && { backgroundColor: colors.primary + '10' },
                    i < recentLogs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                  onPress={() => handleGenerate(log.id)}
                >
                  <View style={[styles.methodBadge, { backgroundColor: (log.statusCode < 400 ? '#3FB950' : '#FF6961') + '20' }]}>
                    <Text style={[styles.methodText, { color: log.statusCode < 400 ? '#3FB950' : '#FF6961' }]}>
                      {log.method}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>
                      {log.endpointName || log.url}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.textTertiary }]}>
                      {log.statusCode} · {log.responseTime}ms
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={selectedLogId === log.id ? 'check-circle' : 'chevron-right'}
                    size={18}
                    color={selectedLogId === log.id ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Output */}
          {output.length > 0 && (
            <>
              <View style={styles.outputHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t('generatedTypes') || 'GENERATED TYPES'}
                </Text>
                <TouchableOpacity onPress={copyOutput} style={[styles.copyBtn, { backgroundColor: cardBg }]}>
                  <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
                  <Text style={[styles.copyText, { color: colors.primary }]}>{t('copy') || 'Copy'}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.outputCard, { backgroundColor: isDark ? '#0d1117' : '#f6f8fa' }]}>
                <Text style={[styles.outputCode, { color: isDark ? '#e6edf3' : '#24292f' }]}>
                  {output}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  langLabel: { fontSize: 14, fontWeight: '600' },
  listCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 48, alignItems: 'center' },
  methodText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  logName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  logMeta: { fontSize: 12, marginTop: 1 },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10, marginBottom: 20 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  outputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  copyText: { fontSize: 13, fontWeight: '600' },
  outputCard: { borderRadius: 14, padding: 16, marginBottom: 20 },
  outputCode: { fontFamily: 'Menlo', fontSize: 13, lineHeight: 20 },
});
