import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

type SyntaxLang = 'json' | 'xml' | 'html' | 'auto';

interface TokenSpan {
  text: string;
  color: string;
}

const JSON_COLORS = {
  key: '#58A6FF',
  string: '#3FB950',
  number: '#D29922',
  boolean: '#BC8CFF',
  null: '#FF6961',
  brace: '#8B949E',
  colon: '#8B949E',
};

const XML_COLORS = {
  tag: '#FF6961',
  attr: '#D29922',
  attrValue: '#3FB950',
  text: '#E6EDF3',
  bracket: '#8B949E',
  comment: '#6E7681',
};

function tokenizeJson(input: string): TokenSpan[][] {
  const lines = input.split('\n');
  return lines.map((line) => {
    const spans: TokenSpan[] = [];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        const end = line.indexOf('"', i + 1);
        if (end === -1) {
          spans.push({ text: line.slice(i), color: JSON_COLORS.string });
          break;
        }
        const str = line.slice(i, end + 1);
        const afterQuote = line.slice(end + 1).trimStart();
        if (afterQuote.startsWith(':')) {
          spans.push({ text: str, color: JSON_COLORS.key });
        } else {
          spans.push({ text: str, color: JSON_COLORS.string });
        }
        i = end + 1;
      } else if (/[0-9\-.]/.test(ch)) {
        let num = '';
        while (i < line.length && /[0-9eE.\-+]/.test(line[i])) {
          num += line[i];
          i++;
        }
        spans.push({ text: num, color: JSON_COLORS.number });
      } else if (line.slice(i, i + 4) === 'true' || line.slice(i, i + 5) === 'false') {
        const word = line.slice(i, i + 4) === 'true' ? 'true' : 'false';
        spans.push({ text: word, color: JSON_COLORS.boolean });
        i += word.length;
      } else if (line.slice(i, i + 4) === 'null') {
        spans.push({ text: 'null', color: JSON_COLORS.null });
        i += 4;
      } else if ('{[}]'.includes(ch)) {
        spans.push({ text: ch, color: JSON_COLORS.brace });
        i++;
      } else if (ch === ':' || ch === ',') {
        spans.push({ text: ch, color: JSON_COLORS.colon });
        i++;
      } else {
        spans.push({ text: ch, color: '#8B949E' });
        i++;
      }
    }
    return spans;
  });
}

function tokenizeXml(input: string): TokenSpan[][] {
  const lines = input.split('\n');
  return lines.map((line) => {
    const spans: TokenSpan[] = [];
    let i = 0;
    while (i < line.length) {
      if (line.slice(i, i + 4) === '<!--') {
        const end = line.indexOf('-->', i);
        if (end === -1) {
          spans.push({ text: line.slice(i), color: XML_COLORS.comment });
          break;
        }
        spans.push({ text: line.slice(i, end + 3), color: XML_COLORS.comment });
        i = end + 3;
      } else if (line[i] === '<') {
        const end = line.indexOf('>', i);
        if (end === -1) {
          spans.push({ text: line.slice(i), color: XML_COLORS.bracket });
          break;
        }
        const tag = line.slice(i, end + 1);
        const parts = tag.match(/^(<\/?)([\w:\-]+)(.*?)(\/?>)$/s);
        if (parts) {
          spans.push({ text: parts[1], color: XML_COLORS.bracket });
          spans.push({ text: parts[2], color: XML_COLORS.tag });
          if (parts[3]) {
            const attrStr = parts[3];
            const attrRegex = /([\w:\-]+)(=)("[^"]*"|'[^']*')/g;
            let lastIdx = 0;
            let match;
            while ((match = attrRegex.exec(attrStr)) !== null) {
              if (match.index > lastIdx) {
                spans.push({ text: attrStr.slice(lastIdx, match.index), color: '#8B949E' });
              }
              spans.push({ text: match[1], color: XML_COLORS.attr });
              spans.push({ text: '=', color: '#8B949E' });
              spans.push({ text: match[3], color: XML_COLORS.attrValue });
              lastIdx = match.index + match[0].length;
            }
            if (lastIdx < attrStr.length) {
              spans.push({ text: attrStr.slice(lastIdx), color: '#8B949E' });
            }
          }
          spans.push({ text: parts[4], color: XML_COLORS.bracket });
        } else {
          spans.push({ text: tag, color: XML_COLORS.bracket });
        }
        i = end + 1;
      } else {
        let textEnd = line.indexOf('<', i);
        if (textEnd === -1) textEnd = line.length;
        spans.push({ text: line.slice(i, textEnd), color: XML_COLORS.text });
        i = textEnd;
      }
    }
    return spans;
  });
}

function detectLang(input: string): SyntaxLang {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  return 'json';
}

function formatJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

export default function SyntaxHighlightScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const callLogs = useApiStore((s) => s.callLogs);

  const [input, setInput] = useState('');
  const [lang, setLang] = useState<SyntaxLang>('auto');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  const activeLang = lang === 'auto' ? detectLang(input) : lang;

  const tokenized = useMemo(() => {
    if (!input.trim()) return [];
    if (activeLang === 'xml' || activeLang === 'html') return tokenizeXml(input);
    return tokenizeJson(input);
  }, [input, activeLang]);

  const loadFromResponse = (index: number) => {
    const log = callLogs[index];
    if (!log?.responseBody) return;
    setInput(log.responseBody);
  };

  const prettify = () => {
    if (activeLang === 'json') {
      setInput(formatJson(input));
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(input);
    Alert.alert('Copied', 'Content copied to clipboard');
  };

  const minify = () => {
    if (activeLang === 'json') {
      try {
        setInput(JSON.stringify(JSON.parse(input)));
      } catch {}
    }
  };

  const langs: { key: SyntaxLang; label: string }[] = [
    { key: 'auto', label: 'Auto' },
    { key: 'json', label: 'JSON' },
    { key: 'xml', label: 'XML' },
    { key: 'html', label: 'HTML' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Syntax Highlight', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Language Selector */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.langRow}>
            {langs.map((l) => (
              <TouchableOpacity
                key={l.key}
                onPress={() => setLang(l.key)}
                style={[
                  styles.langPill,
                  lang === l.key && { backgroundColor: colors.primary },
                  lang !== l.key && { backgroundColor: isDark ? colors.background : colors.systemGray5 },
                ]}
              >
                <Text style={{ color: lang === l.key ? '#FFF' : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setShowLineNumbers(!showLineNumbers)} style={styles.toggleBtn}>
              <MaterialCommunityIcons
                name={showLineNumbers ? 'format-list-numbered' : 'format-list-bulleted'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWordWrap(!wordWrap)} style={styles.toggleBtn}>
              <MaterialCommunityIcons
                name={wordWrap ? 'wrap' : 'wrap-disabled'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Input */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.inputHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Input</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#58A6FF18' }]} onPress={prettify}>
                <Text style={{ color: '#58A6FF', fontSize: 12, fontWeight: '600' }}>Prettify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFD60A18' }]} onPress={minify}>
                <Text style={{ color: '#FFD60A', fontSize: 12, fontWeight: '600' }}>Minify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95018' }]} onPress={copyToClipboard}>
                <MaterialCommunityIcons name="content-copy" size={14} color="#3FB950" />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
            value={input}
            onChangeText={setInput}
            placeholder='Paste JSON, XML, or HTML here...'
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Load from Response */}
        {callLogs.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Load from Response</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.responseRow}>
                {callLogs.slice(0, 10).map((log, i) => (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.responseChip, { backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
                    onPress={() => loadFromResponse(i)}
                  >
                    <Text style={{ color: log.statusCode < 400 ? '#3FB950' : '#FF6961', fontSize: 10, fontWeight: '700' }}>
                      {log.statusCode}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                      {log.endpointName || log.method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Highlighted Output */}
        {tokenized.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Highlighted ({activeLang.toUpperCase()})
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                {tokenized.length} lines
              </Text>
            </View>
            <ScrollView
              horizontal={!wordWrap}
              style={[styles.codeBlock, { backgroundColor: isDark ? '#0D1117' : '#F6F8FA' }]}
            >
              <View style={styles.codeContent}>
                {tokenized.map((line, lineIdx) => (
                  <View key={lineIdx} style={styles.codeLine}>
                    {showLineNumbers && (
                      <Text style={styles.lineNumber}>{lineIdx + 1}</Text>
                    )}
                    <View style={[styles.lineContent, wordWrap && { flexWrap: 'wrap' }]}>
                      {line.map((span, spanIdx) => (
                        <Text key={spanIdx} style={{ color: span.color, fontFamily: 'monospace', fontSize: 12 }}>
                          {span.text}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleBtn: { padding: 6 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  textInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 120, maxHeight: 200 },
  responseRow: { flexDirection: 'row', gap: 8 },
  responseChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codeBlock: { borderRadius: 10, maxHeight: 400, padding: 12 },
  codeContent: { gap: 0 },
  codeLine: { flexDirection: 'row', minHeight: 18 },
  lineNumber: { color: '#6E7681', fontFamily: 'monospace', fontSize: 11, width: 32, textAlign: 'right', marginRight: 12 },
  lineContent: { flexDirection: 'row', flex: 1 },
});
