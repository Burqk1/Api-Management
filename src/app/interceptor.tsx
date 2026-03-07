import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { generateId } from '../types/api';

interface InterceptRule {
  id: string;
  name: string;
  type: 'request' | 'response';
  matchUrl: string;
  matchMethod: string;
  action: 'modify_header' | 'modify_body' | 'delay' | 'block' | 'redirect';
  headerKey?: string;
  headerValue?: string;
  bodyReplace?: string;
  delayMs?: number;
  redirectUrl?: string;
  enabled: boolean;
  hitCount: number;
}

interface InterceptLog {
  id: string;
  ruleId: string;
  ruleName: string;
  url: string;
  method: string;
  action: string;
  timestamp: number;
}

const ACTION_CONFIG = {
  modify_header: { icon: 'web', color: '#58A6FF', label: 'Modify Header' },
  modify_body: { icon: 'code-json', color: '#D29922', label: 'Modify Body' },
  delay: { icon: 'clock-outline', color: '#BC8CFF', label: 'Add Delay' },
  block: { icon: 'block-helper', color: '#FF6961', label: 'Block Request' },
  redirect: { icon: 'redirect', color: '#3FB950', label: 'Redirect' },
};

const STORAGE_KEY = 'intercept_rules';

export default function InterceptorScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [rules, setRules] = useState<InterceptRule[]>([]);
  const [logs, setLogs] = useState<InterceptLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<'rules' | 'logs'>('rules');
  const [name, setName] = useState('');
  const [type, setType] = useState<'request' | 'response'>('request');
  const [matchUrl, setMatchUrl] = useState('*');
  const [matchMethod, setMatchMethod] = useState('*');
  const [action, setAction] = useState<InterceptRule['action']>('modify_header');
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [bodyReplace, setBodyReplace] = useState('');
  const [delayMs, setDelayMs] = useState('500');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isActive, setIsActive] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((d) => { if (d) setRules(JSON.parse(d)); });
  }, []);

  const save = (list: InterceptRule[]) => {
    setRules(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const addRule = () => {
    if (!name.trim()) return;
    save([...rules, {
      id: generateId(), name: name.trim(), type, matchUrl, matchMethod,
      action, headerKey, headerValue, bodyReplace,
      delayMs: parseInt(delayMs) || 500, redirectUrl,
      enabled: true, hitCount: 0,
    }]);
    setName(''); setShowAdd(false);
  };

  const simulateIntercept = () => {
    setIsActive(true);
    // Simulate intercepting requests
    const enabledRules = rules.filter((r) => r.enabled);
    enabledRules.forEach((rule, i) => {
      setTimeout(() => {
        const log: InterceptLog = {
          id: generateId(), ruleId: rule.id, ruleName: rule.name,
          url: rule.matchUrl === '*' ? 'https://api.example.com/data' : rule.matchUrl,
          method: rule.matchMethod === '*' ? 'GET' : rule.matchMethod,
          action: rule.action, timestamp: Date.now(),
        };
        setLogs((prev) => [log, ...prev].slice(0, 50));
        save(rules.map((r) => r.id === rule.id ? { ...r, hitCount: r.hitCount + 1 } : r));
      }, (i + 1) * 500);
    });
    setTimeout(() => setIsActive(false), enabledRules.length * 500 + 500);
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Request Interceptor' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Status Bar */}
          <View style={[styles.statusBar, { backgroundColor: isActive ? '#3FB95015' : cardBg }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#3FB950' : '#8B949E' }]} />
            <Text style={{ color: isActive ? '#3FB950' : colors.textSecondary, fontSize: 14, fontWeight: '600', flex: 1 }}>
              {isActive ? 'Intercepting...' : 'Interceptor Inactive'}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{rules.filter((r) => r.enabled).length} rules active</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: isActive ? '#FF696120' : '#3FB95020' }]}
              onPress={isActive ? () => setIsActive(false) : simulateIntercept}
            >
              <MaterialCommunityIcons name={isActive ? 'stop' : 'play'} size={18} color={isActive ? '#FF6961' : '#3FB950'} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { key: 'rules' as const, label: 'Rules', count: rules.length },
              { key: 'logs' as const, label: 'Logs', count: logs.length },
            ].map((tb) => (
              <TouchableOpacity
                key={tb.key}
                style={[styles.tab, { backgroundColor: tab === tb.key ? colors.primary + '20' : cardBg, borderColor: tab === tb.key ? colors.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setTab(tb.key)}
              >
                <Text style={{ color: tab === tb.key ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{tb.label} ({tb.count})</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'rules' && (
            <>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
                <MaterialCommunityIcons name={showAdd ? 'close' : 'plus'} size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{showAdd ? 'Cancel' : 'Add Rule'}</Text>
              </TouchableOpacity>

              {showAdd && (
                <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                  <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={name} onChangeText={setName} placeholder="Rule name" placeholderTextColor={colors.textTertiary} />

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['request', 'response'] as const).map((tp) => (
                      <TouchableOpacity key={tp} style={[styles.chip, { backgroundColor: type === tp ? colors.primary + '20' : inputBg }]} onPress={() => setType(tp)}>
                        <Text style={{ color: type === tp ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{tp}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={matchUrl} onChangeText={setMatchUrl} placeholder="URL pattern (* = any)" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
                  <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={matchMethod} onChangeText={setMatchMethod} placeholder="Method (* = any)" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />

                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Action</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(Object.entries(ACTION_CONFIG) as [InterceptRule['action'], typeof ACTION_CONFIG.modify_header][]).map(([k, v]) => (
                        <TouchableOpacity key={k} style={[styles.actionChip, { backgroundColor: action === k ? v.color + '20' : inputBg }]} onPress={() => setAction(k)}>
                          <MaterialCommunityIcons name={v.icon as any} size={14} color={action === k ? v.color : colors.textTertiary} />
                          <Text style={{ color: action === k ? v.color : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>{v.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {action === 'modify_header' && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]} value={headerKey} onChangeText={setHeaderKey} placeholder="Header name" placeholderTextColor={colors.textTertiary} />
                      <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text, flex: 1 }]} value={headerValue} onChangeText={setHeaderValue} placeholder="Value" placeholderTextColor={colors.textTertiary} />
                    </View>
                  )}
                  {action === 'modify_body' && (
                    <TextInput style={[styles.codeInput, { backgroundColor: inputBg, color: colors.text }]} value={bodyReplace} onChangeText={setBodyReplace} placeholder='{"modified": true}' placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
                  )}
                  {action === 'delay' && (
                    <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={delayMs} onChangeText={setDelayMs} placeholder="Delay (ms)" placeholderTextColor={colors.textTertiary} keyboardType="numeric" />
                  )}
                  {action === 'redirect' && (
                    <TextInput style={[styles.input, { backgroundColor: inputBg, color: colors.text }]} value={redirectUrl} onChangeText={setRedirectUrl} placeholder="Redirect URL" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
                  )}

                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={addRule}>
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Add Rule</Text>
                  </TouchableOpacity>
                </View>
              )}

              {rules.map((rule) => {
                const cfg = ACTION_CONFIG[rule.action];
                return (
                  <View key={rule.id} style={[styles.ruleCard, { backgroundColor: cardBg, opacity: rule.enabled ? 1 : 0.5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.ruleIcon, { backgroundColor: cfg.color + '15' }]}>
                        <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{rule.name}</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{rule.type} | {rule.matchMethod} {rule.matchUrl}</Text>
                      </View>
                      <TouchableOpacity onPress={() => save(rules.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}>
                        <MaterialCommunityIcons name={rule.enabled ? 'toggle-switch' : 'toggle-switch-off'} size={28} color={rule.enabled ? colors.primary : colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <View style={[styles.tag, { backgroundColor: cfg.color + '10' }]}>
                        <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '700' }}>{cfg.label.toUpperCase()}</Text>
                      </View>
                      {rule.hitCount > 0 && (
                        <View style={[styles.tag, { backgroundColor: '#3FB95010' }]}>
                          <Text style={{ color: '#3FB950', fontSize: 9, fontWeight: '700' }}>{rule.hitCount} hits</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {tab === 'logs' && (
            <>
              {logs.length > 0 && (
                <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 8 }} onPress={() => setLogs([])}>
                  <Text style={{ color: '#FF6961', fontSize: 12, fontWeight: '600' }}>Clear Logs</Text>
                </TouchableOpacity>
              )}
              {logs.map((log) => {
                const cfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG] || ACTION_CONFIG.modify_header;
                return (
                  <View key={log.id} style={[styles.logCard, { backgroundColor: cardBg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{log.ruleName}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{timeAgo(log.timestamp)}</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{log.method} {log.url}</Text>
                  </View>
                );
              })}
              {logs.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <MaterialCommunityIcons name="radar" size={48} color={colors.textTertiary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No intercept logs yet</Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  toggleBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  formCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  codeInput: { borderRadius: 10, padding: 12, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 80 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  submitBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ruleCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  logCard: { borderRadius: 10, padding: 10, marginBottom: 4 },
});
