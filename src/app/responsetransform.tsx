import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

type Format = 'json' | 'xml' | 'yaml' | 'csv' | 'toml';

function jsonToXml(obj: any, root = 'root', indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    return obj.map((item) => `${pad}<item>\n${jsonToXml(item, '', indent + 1)}${pad}</item>\n`).join('');
  }
  if (typeof obj === 'object' && obj !== null) {
    let xml = indent === 0 ? `${pad}<${root}>\n` : '';
    Object.entries(obj).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        xml += `${pad}  <${key}>\n${jsonToXml(val, key, indent + 2)}${pad}  </${key}>\n`;
      } else {
        xml += `${pad}  <${key}>${val}</${key}>\n`;
      }
    });
    if (indent === 0) xml += `${pad}</${root}>\n`;
    return xml;
  }
  return `${pad}${obj}\n`;
}

function jsonToYaml(obj: any, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'object') return `${pad}- \n${jsonToYaml(item, indent + 1)}`;
      return `${pad}- ${item}\n`;
    }).join('');
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).map(([key, val]) => {
      if (typeof val === 'object' && val !== null) return `${pad}${key}:\n${jsonToYaml(val, indent + 1)}`;
      if (typeof val === 'string') return `${pad}${key}: "${val}"\n`;
      return `${pad}${key}: ${val}\n`;
    }).join('');
  }
  return `${pad}${obj}\n`;
}

function jsonToCsv(obj: any): string {
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
    const headers = Object.keys(obj[0]);
    const rows = obj.map((item) => headers.map((h) => JSON.stringify(item[h] ?? '')).join(','));
    return [headers.join(','), ...rows].join('\n');
  }
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.entries(obj).map(([k, v]) => `${k},${JSON.stringify(v)}`).join('\n');
  }
  return String(obj);
}

function jsonToToml(obj: any): string {
  if (typeof obj !== 'object' || Array.isArray(obj)) return '';
  let toml = '';
  Object.entries(obj).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      toml += `[${key}]\n`;
      Object.entries(val).forEach(([k, v]) => {
        toml += `${k} = ${typeof v === 'string' ? `"${v}"` : v}\n`;
      });
      toml += '\n';
    } else if (typeof val === 'string') {
      toml += `${key} = "${val}"\n`;
    } else {
      toml += `${key} = ${JSON.stringify(val)}\n`;
    }
  });
  return toml;
}

function xmlToJson(xml: string): string {
  // Simple XML to JSON - extract tag/value pairs
  const result: Record<string, any> = {};
  const tagRegex = /<(\w+)>([^<]*)<\/\1>/g;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    const val = match[2].trim();
    result[match[1]] = isNaN(Number(val)) ? val : Number(val);
  }
  return JSON.stringify(result, null, 2);
}

function yamlToJson(yaml: string): string {
  const result: Record<string, any> = {};
  yaml.split('\n').forEach((line) => {
    const match = line.match(/^(\s*)(\w+):\s*(.+)?$/);
    if (match && match[3]) {
      let val: any = match[3].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (!isNaN(Number(val))) val = Number(val);
      else if (val === 'true') val = true;
      else if (val === 'false') val = false;
      result[match[2]] = val;
    }
  });
  return JSON.stringify(result, null, 2);
}

const FORMAT_CONFIG: Record<Format, { icon: string; color: string; label: string }> = {
  json: { icon: 'code-json', color: '#D29922', label: 'JSON' },
  xml: { icon: 'xml', color: '#FF6961', label: 'XML' },
  yaml: { icon: 'file-document-outline', color: '#3FB950', label: 'YAML' },
  csv: { icon: 'table', color: '#58A6FF', label: 'CSV' },
  toml: { icon: 'file-code-outline', color: '#BC8CFF', label: 'TOML' },
};

export default function ResponseTransformScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [input, setInput] = useState('{\n  "name": "John",\n  "age": 30,\n  "email": "john@example.com"\n}');
  const [fromFormat, setFromFormat] = useState<Format>('json');
  const [toFormat, setToFormat] = useState<Format>('xml');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;

  const transform = () => {
    setError('');
    setOutput('');
    try {
      let parsed: any;
      // Parse input
      if (fromFormat === 'json') {
        parsed = JSON.parse(input);
      } else if (fromFormat === 'xml') {
        const json = xmlToJson(input);
        parsed = JSON.parse(json);
      } else if (fromFormat === 'yaml') {
        const json = yamlToJson(input);
        parsed = JSON.parse(json);
      } else {
        parsed = JSON.parse(input);
      }
      // Convert to output
      let result = '';
      switch (toFormat) {
        case 'json': result = JSON.stringify(parsed, null, 2); break;
        case 'xml': result = `<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(parsed)}`; break;
        case 'yaml': result = jsonToYaml(parsed); break;
        case 'csv': result = jsonToCsv(parsed); break;
        case 'toml': result = jsonToToml(parsed); break;
      }
      setOutput(result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const prettify = () => {
    setError('');
    try {
      if (fromFormat === 'json') setInput(JSON.stringify(JSON.parse(input), null, 2));
    } catch (e: any) { setError(e.message); }
  };

  const minify = () => {
    setError('');
    try {
      if (fromFormat === 'json') setInput(JSON.stringify(JSON.parse(input)));
    } catch (e: any) { setError(e.message); }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Response Transform' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* From Format */}
          <Text style={[styles.label, { color: colors.text }]}>Input Format</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {(Object.entries(FORMAT_CONFIG) as [Format, typeof FORMAT_CONFIG.json][]).map(([k, v]) => (
              <TouchableOpacity
                key={k}
                style={[styles.formatBtn, { backgroundColor: fromFormat === k ? v.color + '20' : cardBg, borderColor: fromFormat === k ? v.color : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setFromFormat(k)}
              >
                <MaterialCommunityIcons name={v.icon as any} size={14} color={fromFormat === k ? v.color : colors.textTertiary} />
                <Text style={{ color: fromFormat === k ? v.color : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <TextInput
            style={[styles.codeInput, { backgroundColor: cardBg, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste your data here..."
            placeholderTextColor={colors.textTertiary}
          />

          {/* Quick Actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#3FB95020' }]} onPress={prettify}>
              <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '600' }}>Prettify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#D2992220' }]} onPress={minify}>
              <Text style={{ color: '#D29922', fontSize: 12, fontWeight: '600' }}>Minify</Text>
            </TouchableOpacity>
          </View>

          {/* Arrow */}
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <MaterialCommunityIcons name="arrow-down-bold" size={24} color={colors.primary} />
          </View>

          {/* To Format */}
          <Text style={[styles.label, { color: colors.text }]}>Output Format</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {(Object.entries(FORMAT_CONFIG) as [Format, typeof FORMAT_CONFIG.json][]).map(([k, v]) => (
              <TouchableOpacity
                key={k}
                style={[styles.formatBtn, { backgroundColor: toFormat === k ? v.color + '20' : cardBg, borderColor: toFormat === k ? v.color : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setToFormat(k)}
              >
                <MaterialCommunityIcons name={v.icon as any} size={14} color={toFormat === k ? v.color : colors.textTertiary} />
                <Text style={{ color: toFormat === k ? v.color : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transform Button */}
          <TouchableOpacity style={[styles.transformBtn, { backgroundColor: colors.primary }]} onPress={transform}>
            <MaterialCommunityIcons name="swap-vertical" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Transform</Text>
          </TouchableOpacity>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: '#FF696115' }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6961" />
              <Text style={{ color: '#FF6961', fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {/* Output */}
          {output ? (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Output</Text>
                <TouchableOpacity onPress={() => { Clipboard.setStringAsync(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={18} color={copied ? '#3FB950' : colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.outputBox, { backgroundColor: cardBg }]}>
                <Text style={[styles.outputText, { color: colors.text }]} selectable>{output}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  formatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  codeInput: { borderRadius: 14, padding: 14, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 140, lineHeight: 18 },
  quickBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  transformBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 8 },
  outputBox: { borderRadius: 14, padding: 14 },
  outputText: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 18 },
});
