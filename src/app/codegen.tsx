import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { ApiEndpoint, METHOD_COLORS } from '../types/api';

type CodeLang = 'curl' | 'python' | 'javascript' | 'swift' | 'kotlin' | 'go' | 'php' | 'ruby' | 'csharp';

interface LangOption {
  key: CodeLang;
  label: string;
  icon: string;
  color: string;
}

const LANGUAGES: LangOption[] = [
  { key: 'curl', label: 'cURL', icon: 'console-line', color: '#3FB950' },
  { key: 'python', label: 'Python', icon: 'language-python', color: '#FFD60A' },
  { key: 'javascript', label: 'JavaScript', icon: 'language-javascript', color: '#F7DF1E' },
  { key: 'swift', label: 'Swift', icon: 'apple', color: '#FF6961' },
  { key: 'kotlin', label: 'Kotlin', icon: 'language-kotlin', color: '#BC8CFF' },
  { key: 'go', label: 'Go', icon: 'language-go', color: '#00ADD8' },
  { key: 'php', label: 'PHP', icon: 'language-php', color: '#777BB4' },
  { key: 'ruby', label: 'Ruby', icon: 'language-ruby', color: '#CC342D' },
  { key: 'csharp', label: 'C#', icon: 'language-csharp', color: '#68217A' },
];

function generateCurl(ep: ApiEndpoint): string {
  const lines = [`curl -X ${ep.method} '${ep.url}'`];
  ep.headers.filter((h) => h.enabled).forEach((h) => {
    lines.push(`  -H '${h.key}: ${h.value}'`);
  });
  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`  -d '${ep.body.replace(/'/g, "\\'")}'`);
  }
  return lines.join(' \\\n');
}

function generatePython(ep: ApiEndpoint): string {
  const lines = ['import requests', ''];
  const headers = ep.headers.filter((h) => h.enabled);

  lines.push(`url = "${ep.url}"`);
  if (headers.length > 0) {
    lines.push('headers = {');
    headers.forEach((h) => lines.push(`    "${h.key}": "${h.value}",`));
    lines.push('}');
  }
  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`payload = '''${ep.body}'''`);
  }

  const args = [];
  if (headers.length > 0) args.push('headers=headers');
  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    args.push('data=payload');
  }

  lines.push('');
  lines.push(`response = requests.${ep.method.toLowerCase()}(url${args.length > 0 ? ', ' + args.join(', ') : ''})`);
  lines.push('');
  lines.push('print(response.status_code)');
  lines.push('print(response.json())');

  return lines.join('\n');
}

function generateJavaScript(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const opts: string[] = [`  method: '${ep.method}'`];

  if (headers.length > 0) {
    opts.push('  headers: {');
    headers.forEach((h) => opts.push(`    '${h.key}': '${h.value}',`));
    opts.push('  }');
  }
  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    opts.push(`  body: JSON.stringify(${ep.body || '{}'})`);
  }

  return [
    `const response = await fetch('${ep.url}', {`,
    opts.join(',\n'),
    '});',
    '',
    'const data = await response.json();',
    'console.log(response.status, data);',
  ].join('\n');
}

function generateSwift(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const lines = [
    'import Foundation',
    '',
    `let url = URL(string: "${ep.url}")!`,
    'var request = URLRequest(url: url)',
    `request.httpMethod = "${ep.method}"`,
  ];

  headers.forEach((h) => {
    lines.push(`request.setValue("${h.value}", forHTTPHeaderField: "${h.key}")`);
  });

  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`request.httpBody = """`, `${ep.body}`, `""".data(using: .utf8)`);
  }

  lines.push('');
  lines.push('let task = URLSession.shared.dataTask(with: request) { data, response, error in');
  lines.push('    guard let data = data, let httpResponse = response as? HTTPURLResponse else { return }');
  lines.push('    print("Status: \\(httpResponse.statusCode)")');
  lines.push('    print(String(data: data, encoding: .utf8) ?? "")');
  lines.push('}');
  lines.push('task.resume()');

  return lines.join('\n');
}

function generateKotlin(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const lines = [
    'import okhttp3.*',
    '',
    'val client = OkHttpClient()',
    '',
  ];

  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push('val mediaType = "application/json".toMediaType()');
    lines.push(`val body = """${ep.body}""".toRequestBody(mediaType)`);
    lines.push('');
  }

  lines.push('val request = Request.Builder()');
  lines.push(`    .url("${ep.url}")`);
  lines.push(`    .method("${ep.method}"${ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method) ? ', body' : ', null'})`);
  headers.forEach((h) => {
    lines.push(`    .addHeader("${h.key}", "${h.value}")`);
  });
  lines.push('    .build()');
  lines.push('');
  lines.push('val response = client.newCall(request).execute()');
  lines.push('println("Status: ${response.code}")');
  lines.push('println(response.body?.string())');

  return lines.join('\n');
}

function generateGo(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const hasBody = ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method);

  const lines = [
    'package main',
    '',
    'import (',
    '    "fmt"',
    '    "io"',
    '    "net/http"',
  ];
  if (hasBody) lines.push('    "strings"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');

  if (hasBody) {
    lines.push(`    body := strings.NewReader(\`${ep.body}\`)`);
    lines.push(`    req, _ := http.NewRequest("${ep.method}", "${ep.url}", body)`);
  } else {
    lines.push(`    req, _ := http.NewRequest("${ep.method}", "${ep.url}", nil)`);
  }

  headers.forEach((h) => {
    lines.push(`    req.Header.Set("${h.key}", "${h.value}")`);
  });

  lines.push('');
  lines.push('    resp, _ := http.DefaultClient.Do(req)');
  lines.push('    defer resp.Body.Close()');
  lines.push('    data, _ := io.ReadAll(resp.Body)');
  lines.push('    fmt.Printf("Status: %d\\n%s\\n", resp.StatusCode, string(data))');
  lines.push('}');

  return lines.join('\n');
}

function generatePhp(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const lines = ['<?php', '', '$ch = curl_init();', ''];

  lines.push(`curl_setopt($ch, CURLOPT_URL, "${ep.url}");`);
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');

  if (ep.method !== 'GET') {
    lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${ep.method}");`);
  }

  if (headers.length > 0) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    headers.forEach((h) => lines.push(`    "${h.key}: ${h.value}",`));
    lines.push(']);');
  }

  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${ep.body.replace(/'/g, "\\'")}');`);
  }

  lines.push('');
  lines.push('$response = curl_exec($ch);');
  lines.push('$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);');
  lines.push('curl_close($ch);');
  lines.push('');
  lines.push('echo "Status: $httpCode\\n";');
  lines.push('echo $response;');

  return lines.join('\n');
}

function generateRuby(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const lines = [
    "require 'net/http'",
    "require 'json'",
    '',
    `uri = URI('${ep.url}')`,
  ];

  const methodClass = ep.method === 'GET' ? 'Get' : ep.method === 'POST' ? 'Post' : ep.method === 'PUT' ? 'Put' : ep.method === 'DELETE' ? 'Delete' : 'Get';
  lines.push(`request = Net::HTTP::${methodClass}.new(uri)`);

  headers.forEach((h) => {
    lines.push(`request['${h.key}'] = '${h.value}'`);
  });

  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`request.body = '${ep.body.replace(/'/g, "\\'")}'`);
  }

  lines.push('');
  lines.push('response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|');
  lines.push('  http.request(request)');
  lines.push('end');
  lines.push('');
  lines.push('puts "Status: #{response.code}"');
  lines.push('puts response.body');

  return lines.join('\n');
}

function generateCSharp(ep: ApiEndpoint): string {
  const headers = ep.headers.filter((h) => h.enabled);
  const lines = [
    'using System.Net.Http;',
    '',
    'var client = new HttpClient();',
    '',
  ];

  headers.forEach((h) => {
    lines.push(`client.DefaultRequestHeaders.Add("${h.key}", "${h.value}");`);
  });

  if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
    lines.push(`var content = new StringContent(@"${ep.body}", System.Text.Encoding.UTF8, "application/json");`);
    lines.push(`var response = await client.${ep.method === 'POST' ? 'PostAsync' : ep.method === 'PUT' ? 'PutAsync' : 'PatchAsync'}("${ep.url}", content);`);
  } else if (ep.method === 'DELETE') {
    lines.push(`var response = await client.DeleteAsync("${ep.url}");`);
  } else {
    lines.push(`var response = await client.GetAsync("${ep.url}");`);
  }

  lines.push('');
  lines.push('var body = await response.Content.ReadAsStringAsync();');
  lines.push('Console.WriteLine($"Status: {(int)response.StatusCode}");');
  lines.push('Console.WriteLine(body);');

  return lines.join('\n');
}

function generateCode(ep: ApiEndpoint, lang: CodeLang): string {
  switch (lang) {
    case 'curl': return generateCurl(ep);
    case 'python': return generatePython(ep);
    case 'javascript': return generateJavaScript(ep);
    case 'swift': return generateSwift(ep);
    case 'kotlin': return generateKotlin(ep);
    case 'go': return generateGo(ep);
    case 'php': return generatePhp(ep);
    case 'ruby': return generateRuby(ep);
    case 'csharp': return generateCSharp(ep);
  }
}

export default function CodeGenScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const endpoints = useApiStore((s) => s.endpoints);
  const collections = useApiStore((s) => s.collections);

  const [selectedLang, setSelectedLang] = useState<CodeLang>('curl');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  const ep = endpoints.find((e) => e.id === selectedEndpoint);

  const code = useMemo(() => {
    if (!ep) return '';
    return generateCode(ep, selectedLang);
  }, [ep, selectedLang]);

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `${LANGUAGES.find((l) => l.key === selectedLang)?.label} code copied to clipboard`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Code Generator', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Language Grid */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Language</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                onPress={() => setSelectedLang(lang.key)}
                style={[
                  styles.langItem,
                  selectedLang === lang.key && { backgroundColor: lang.color + '18', borderColor: lang.color },
                  selectedLang !== lang.key && { backgroundColor: isDark ? colors.background : colors.systemGray5, borderColor: 'transparent' },
                ]}
              >
                <MaterialCommunityIcons
                  name={lang.icon as any}
                  size={20}
                  color={selectedLang === lang.key ? lang.color : colors.textSecondary}
                />
                <Text style={{ color: selectedLang === lang.key ? lang.color : colors.text, fontSize: 12, fontWeight: '700' }}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Endpoint Picker */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Endpoint</Text>
          {endpoints.length === 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>No endpoints created yet</Text>
          )}
          {collections.map((col) => {
            const colEndpoints = endpoints.filter((e) => e.collectionId === col.id);
            if (colEndpoints.length === 0) return null;
            return (
              <View key={col.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  {col.name}
                </Text>
                {colEndpoints.slice(0, 10).map((ep) => (
                  <TouchableOpacity
                    key={ep.id}
                    style={[
                      styles.epRow,
                      { borderBottomColor: colors.divider },
                      selectedEndpoint === ep.id && { backgroundColor: colors.primary + '08' },
                    ]}
                    onPress={() => setSelectedEndpoint(ep.id)}
                  >
                    <MaterialCommunityIcons
                      name={selectedEndpoint === ep.id ? 'radiobox-marked' : 'radiobox-blank'}
                      size={18}
                      color={selectedEndpoint === ep.id ? colors.primary : colors.textTertiary}
                    />
                    <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[ep.method] || '#8B949E') + '22' }]}>
                      <Text style={{ color: METHOD_COLORS[ep.method] || '#8B949E', fontSize: 9, fontWeight: '700' }}>
                        {ep.method}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                      {ep.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>

        {/* Generated Code */}
        {code ? (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.codeHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                {LANGUAGES.find((l) => l.key === selectedLang)?.label} Code
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: colors.primary + '18' }]}
                onPress={copyCode}
              >
                <MaterialCommunityIcons name="content-copy" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Copy</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              style={[styles.codeBlock, { backgroundColor: isDark ? '#0D1117' : '#F6F8FA' }]}
            >
              <Text style={styles.codeText}>{code}</Text>
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="code-tags" size={40} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 14, marginTop: 8 }}>
              Select an endpoint to generate code
            </Text>
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
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2 },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 36, alignItems: 'center' },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  codeBlock: { borderRadius: 10, maxHeight: 400, padding: 12 },
  codeText: { color: '#E6EDF3', fontFamily: 'monospace', fontSize: 12 },
  emptyCard: { borderRadius: 14, padding: 32, alignItems: 'center', marginBottom: 12 },
});
