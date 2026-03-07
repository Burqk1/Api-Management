import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

type Status = 'pass' | 'fail' | 'warn' | 'pending';

interface CheckResult {
  id: string;
  name: string;
  icon: string;
  status: Status;
  description: string;
}

const PASS = '#3FB950';
const FAIL = '#FF6961';
const WARN = '#D29922';

const statusColor = (s: Status) => (s === 'pass' ? PASS : s === 'fail' ? FAIL : s === 'warn' ? WARN : '#8B949E');
const statusLabel = (s: Status) => (s === 'pass' ? 'PASS' : s === 'fail' ? 'FAIL' : s === 'warn' ? 'WARN' : '...');

const initialChecks: CheckResult[] = [
  { id: 'https', name: 'HTTPS Check', icon: 'lock-outline', status: 'pending', description: 'Verifies the URL uses HTTPS' },
  { id: 'headers', name: 'Security Headers', icon: 'shield-check-outline', status: 'pending', description: 'Checks for common security headers' },
  { id: 'cors', name: 'CORS Headers', icon: 'web', status: 'pending', description: 'Checks Access-Control-Allow-Origin' },
  { id: 'auth', name: 'Authentication', icon: 'account-lock-outline', status: 'pending', description: 'Checks if endpoint requires auth' },
  { id: 'info', name: 'Information Disclosure', icon: 'eye-off-outline', status: 'pending', description: 'Checks for Server / X-Powered-By leaks' },
  { id: 'cookie', name: 'Cookie Security', icon: 'cookie-outline', status: 'pending', description: 'Checks Set-Cookie flags' },
  { id: 'ratelimit', name: 'Rate Limiting', icon: 'speedometer', status: 'pending', description: 'Checks for rate-limit headers' },
  { id: 'content', name: 'Content-Type', icon: 'file-document-outline', status: 'pending', description: 'Verifies Content-Type header' },
];

function scoreFromChecks(checks: CheckResult[]): number {
  const weights: Record<string, number> = { https: 20, headers: 20, cors: 10, auth: 15, info: 10, cookie: 10, ratelimit: 5, content: 10 };
  let score = 0;
  checks.forEach((c) => {
    const w = weights[c.id] || 10;
    if (c.status === 'pass') score += w;
    else if (c.status === 'warn') score += w * 0.5;
  });
  return Math.round(score);
}

function scoreColor(score: number) {
  if (score >= 80) return PASS;
  if (score >= 50) return WARN;
  return FAIL;
}

const h = (headers: Headers, name: string) => headers.get(name);

export default function SecurityScanScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [url, setUrl] = useState('');
  const [checks, setChecks] = useState<CheckResult[]>(initialChecks);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [progress, setProgress] = useState(0);

  const score = scanned ? scoreFromChecks(checks) : -1;

  const runScan = useCallback(async () => {
    const target = url.trim();
    if (!target) return;
    setScanning(true);
    setScanned(false);
    setChecks(initialChecks);
    setProgress(0);

    const results = [...initialChecks];
    const update = (id: string, status: Status, description: string) => {
      const idx = results.findIndex((c) => c.id === id);
      if (idx !== -1) results[idx] = { ...results[idx], status, description };
    };

    // HTTPS
    const isHttps = target.startsWith('https://');
    update('https', isHttps ? 'pass' : 'fail', isHttps ? 'URL uses HTTPS' : 'URL does not use HTTPS — insecure');
    setProgress(10);
    setChecks([...results]);

    try {
      const res = await fetch(target, { method: 'GET', headers: { Accept: '*/*' } });
      const hdrs = res.headers;
      setProgress(30);

      // Security Headers
      const secHeaders = ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection', 'Strict-Transport-Security', 'Content-Security-Policy', 'Referrer-Policy'];
      const present = secHeaders.filter((sh) => h(hdrs, sh));
      const missing = secHeaders.filter((sh) => !h(hdrs, sh));
      if (missing.length === 0) update('headers', 'pass', 'All security headers present');
      else if (present.length > 0) update('headers', 'warn', `Missing: ${missing.join(', ')}`);
      else update('headers', 'fail', 'No security headers found');
      setProgress(45);
      setChecks([...results]);

      // CORS
      const acao = h(hdrs, 'Access-Control-Allow-Origin');
      if (!acao) update('cors', 'pass', 'No CORS header exposed');
      else if (acao === '*') update('cors', 'warn', 'Access-Control-Allow-Origin is wildcard (*)');
      else update('cors', 'pass', `CORS restricted to: ${acao}`);
      setProgress(55);

      // Auth
      if (res.status === 401 || res.status === 403) update('auth', 'pass', `Endpoint returned ${res.status} — auth required`);
      else if (res.status === 200) update('auth', 'warn', 'Endpoint accessible without authentication');
      else update('auth', 'warn', `Endpoint returned status ${res.status}`);
      setProgress(65);
      setChecks([...results]);

      // Information Disclosure
      const server = h(hdrs, 'Server');
      const powered = h(hdrs, 'X-Powered-By');
      if (!server && !powered) update('info', 'pass', 'No server info disclosed');
      else {
        const leaked = [server && `Server: ${server}`, powered && `X-Powered-By: ${powered}`].filter(Boolean).join(', ');
        update('info', 'warn', `Disclosed: ${leaked}`);
      }
      setProgress(75);

      // Cookie Security
      const setCookie = h(hdrs, 'Set-Cookie');
      if (!setCookie) update('cookie', 'pass', 'No cookies set');
      else {
        const lower = setCookie.toLowerCase();
        const hasSecure = lower.includes('secure');
        const hasHttp = lower.includes('httponly');
        const hasSame = lower.includes('samesite');
        if (hasSecure && hasHttp && hasSame) update('cookie', 'pass', 'Cookie has Secure, HttpOnly, SameSite');
        else {
          const missing2 = [!hasSecure && 'Secure', !hasHttp && 'HttpOnly', !hasSame && 'SameSite'].filter(Boolean);
          update('cookie', 'warn', `Cookie missing: ${missing2.join(', ')}`);
        }
      }
      setProgress(85);
      setChecks([...results]);

      // Rate Limiting
      const rl = ['X-RateLimit-Limit', 'X-Rate-Limit-Limit', 'RateLimit-Limit', 'Retry-After'];
      const hasRl = rl.some((r) => h(hdrs, r));
      update('ratelimit', hasRl ? 'pass' : 'warn', hasRl ? 'Rate limiting headers detected' : 'No rate-limit headers found');
      setProgress(92);

      // Content-Type
      const ct = h(hdrs, 'Content-Type');
      if (ct) update('content', 'pass', `Content-Type: ${ct}`);
      else update('content', 'fail', 'No Content-Type header returned');
      setProgress(100);
      setChecks([...results]);
    } catch (e: any) {
      const msg = e?.message || 'Request failed';
      ['headers', 'cors', 'auth', 'info', 'cookie', 'ratelimit', 'content'].forEach((id) => {
        if (results.find((r) => r.id === id)?.status === 'pending') update(id, 'fail', msg);
      });
      setProgress(100);
      setChecks([...results]);
    }

    setScanning(false);
    setScanned(true);
  }, [url]);

  const exportReport = useCallback(async () => {
    const lines = [`Security Scan Report — ${url}`, `Score: ${score}/100`, ''];
    checks.forEach((c) => lines.push(`[${statusLabel(c.status)}] ${c.name}: ${c.description}`));
    await Clipboard.setStringAsync(lines.join('\n'));
  }, [checks, score, url]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Security Scanner' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* URL Input */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: colors.text }]}>Target URL</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]}
              placeholder="https://api.example.com/endpoint"
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.scanBtn, { opacity: scanning ? 0.6 : 1 }]}
              onPress={runScan}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons name="radar" size={18} color="#fff" />
              )}
              <Text style={styles.scanBtnText}>{scanning ? 'Scanning' : 'Scan'}</Text>
            </TouchableOpacity>
          </View>
          {scanning && (
            <View style={[styles.progressTrack, { backgroundColor: inputBg }]}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          )}
        </View>

        {/* Score Badge */}
        {scanned && (
          <View style={[styles.card, styles.scoreCard, { backgroundColor: cardBg }]}>
            <View style={[styles.scoreBadge, { borderColor: scoreColor(score) }]}>
              <Text style={[styles.scoreNum, { color: scoreColor(score) }]}>{score}</Text>
              <Text style={[styles.scoreOf, { color: colors.textSecondary }]}>/100</Text>
            </View>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              {score >= 80 ? 'Good' : score >= 50 ? 'Needs Improvement' : 'Poor'}
            </Text>
          </View>
        )}

        {/* Check Cards */}
        {checks.map((c) => (
          <View key={c.id} style={[styles.card, styles.checkCard, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name={c.icon as any} size={22} color={statusColor(c.status)} />
            <View style={styles.checkBody}>
              <View style={styles.checkHeader}>
                <Text style={[styles.checkName, { color: colors.text }]}>{c.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor(c.status) + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor(c.status) }]}>{statusLabel(c.status)}</Text>
                </View>
              </View>
              <Text style={[styles.checkDesc, { color: colors.textSecondary }]} numberOfLines={2}>{c.description}</Text>
            </View>
          </View>
        ))}

        {/* Export */}
        {scanned && (
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: cardBg }]} onPress={exportReport}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={colors.primary} />
            <Text style={[styles.exportText, { color: colors.primary }]}>Export Report to Clipboard</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14 },
  scanBtn: { backgroundColor: '#58A6FF', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: '#58A6FF' },
  scoreCard: { alignItems: 'center', paddingVertical: 20 },
  scoreBadge: { borderWidth: 3, borderRadius: 50, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '800' },
  scoreOf: { fontSize: 12, marginTop: -2 },
  scoreLabel: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  checkCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkBody: { flex: 1 },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  checkName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
  checkDesc: { fontSize: 12, lineHeight: 17 },
  exportBtn: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  exportText: { fontSize: 14, fontWeight: '600' },
});
