import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface Props {
  json: string;
  colors: {
    text: string;
    textSecondary: string;
    primary: string;
    background: string;
  };
}

const COLORS = {
  key: '#58A6FF',
  string: '#A5D6FF',
  number: '#79C0FF',
  boolean: '#FF7B72',
  null: '#8B949E',
  bracket: '#8B949E',
  punctuation: '#8B949E',
};

interface JsonNode {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation' | 'plain';
  text: string;
}

function tokenizeLine(line: string): JsonNode[] {
  const tokens: JsonNode[] = [];
  let i = 0;
  const s = line;

  while (i < s.length) {
    // Whitespace
    if (s[i] === ' ' || s[i] === '\t') {
      let ws = '';
      while (i < s.length && (s[i] === ' ' || s[i] === '\t')) { ws += s[i]; i++; }
      tokens.push({ type: 'plain', text: ws });
      continue;
    }

    // Brackets
    if ('{}[]'.includes(s[i])) {
      tokens.push({ type: 'bracket', text: s[i] });
      i++;
      continue;
    }

    // Comma, colon
    if (s[i] === ',' || s[i] === ':') {
      tokens.push({ type: 'punctuation', text: s[i] });
      i++;
      continue;
    }

    // String
    if (s[i] === '"') {
      let str = '"';
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\') { str += s[i]; i++; }
        if (i < s.length) { str += s[i]; i++; }
      }
      if (i < s.length) { str += '"'; i++; }

      // Check if it's a key (next non-space char is ':')
      let j = i;
      while (j < s.length && s[j] === ' ') j++;
      const isKey = j < s.length && s[j] === ':';
      tokens.push({ type: isKey ? 'key' : 'string', text: str });
      continue;
    }

    // Numbers
    if (s[i] === '-' || (s[i] >= '0' && s[i] <= '9')) {
      let num = '';
      while (i < s.length && /[\d.eE\-+]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: 'number', text: num });
      continue;
    }

    // true/false/null
    if (s.slice(i, i + 4) === 'true') { tokens.push({ type: 'boolean', text: 'true' }); i += 4; continue; }
    if (s.slice(i, i + 5) === 'false') { tokens.push({ type: 'boolean', text: 'false' }); i += 5; continue; }
    if (s.slice(i, i + 4) === 'null') { tokens.push({ type: 'null', text: 'null' }); i += 4; continue; }

    // Fallback
    tokens.push({ type: 'plain', text: s[i] });
    i++;
  }

  return tokens;
}

export default function JsonHighlight({ json, colors }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }, [json]);

  const lines = useMemo(() => formatted.split('\n'), [formatted]);

  const toggleCollapse = (lineIndex: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) next.delete(lineIndex);
      else next.add(lineIndex);
      return next;
    });
  };

  // Find matching closing bracket for a line
  const findClosingLine = (startLine: number): number => {
    const trimmed = lines[startLine].trimEnd();
    const openChar = trimmed[trimmed.length - 1];
    const closeChar = openChar === '{' ? '}' : ']';
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === openChar) depth++;
        if (ch === closeChar) depth--;
        if (depth === 0) return i;
      }
    }
    return lines.length - 1;
  };

  const renderLines = () => {
    const result: React.ReactNode[] = [];
    let skip = -1;

    for (let i = 0; i < lines.length; i++) {
      if (i <= skip) continue;

      const line = lines[i];
      const trimmed = line.trimEnd();
      const isCollapsible = trimmed.endsWith('{') || trimmed.endsWith('[');
      const isCollapsed = collapsed.has(i);

      if (isCollapsed && isCollapsible) {
        const closingLine = findClosingLine(i);
        const indent = line.match(/^\s*/)?.[0] || '';
        const tokens = tokenizeLine(line);
        result.push(
          <View key={i} style={styles.lineRow}>
            <TouchableOpacity onPress={() => toggleCollapse(i)} style={styles.collapseBtn}>
              <Text style={[styles.collapseIcon, { color: colors.textSecondary }]}>▶</Text>
            </TouchableOpacity>
            <Text style={styles.lineText}>
              {tokens.map((t, j) => (
                <Text key={j} style={{ color: COLORS[t.type] || colors.text }}>{t.text}</Text>
              ))}
              <Text style={{ color: COLORS.punctuation }}> ... </Text>
              <Text style={{ color: COLORS.bracket }}>{trimmed.endsWith('{') ? '}' : ']'}{lines[closingLine].trimStart().slice(1)}</Text>
            </Text>
          </View>
        );
        skip = closingLine;
        continue;
      }

      const tokens = tokenizeLine(line);
      result.push(
        <View key={i} style={styles.lineRow}>
          {isCollapsible ? (
            <TouchableOpacity onPress={() => toggleCollapse(i)} style={styles.collapseBtn}>
              <Text style={[styles.collapseIcon, { color: colors.textSecondary }]}>▼</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.collapseBtn} />
          )}
          <Text style={styles.lineText}>
            {tokens.map((t, j) => (
              <Text key={j} style={{ color: COLORS[t.type] || colors.text }}>{t.text}</Text>
            ))}
          </Text>
        </View>
      );
    }

    return result;
  };

  return (
    <View style={styles.container}>
      {renderLines()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  collapseBtn: { width: 16, alignItems: 'center', paddingTop: 2 },
  collapseIcon: { fontSize: 8 },
  lineText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
