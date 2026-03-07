import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { generateId } from '../types/api';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: 'pre-request' | 'post-response' | 'transform' | 'auth' | 'validator';
  code: string;
  enabled: boolean;
  createdAt: number;
  runCount: number;
  lastRun?: number;
  lastError?: string;
}

const TYPE_CONFIG = {
  'pre-request': { icon: 'arrow-right-bold', color: '#58A6FF', desc: 'Runs before request is sent' },
  'post-response': { icon: 'arrow-left-bold', color: '#3FB950', desc: 'Runs after response received' },
  'transform': { icon: 'swap-horizontal', color: '#D29922', desc: 'Transforms request/response data' },
  'auth': { icon: 'shield-key', color: '#BC8CFF', desc: 'Custom authentication handler' },
  'validator': { icon: 'check-decagram', color: '#FF9500', desc: 'Custom validation logic' },
};

const TEMPLATES: Record<string, string> = {
  'pre-request': `// Pre-request plugin
// Available: request.url, request.method, request.headers, request.body
// Return modified request or null to skip

function run(request) {
  request.headers['X-Request-Time'] = new Date().toISOString();
  request.headers['X-Custom-Plugin'] = 'active';
  return request;
}`,
  'post-response': `// Post-response plugin
// Available: response.status, response.headers, response.body, response.time

function run(response) {
  if (response.time > 2000) {
    console.warn('Slow response: ' + response.time + 'ms');
  }
  return response;
}`,
  'transform': `// Transform plugin
// Modify request body before sending or response body after receiving

function run(data, direction) {
  if (direction === 'request') {
    // Add timestamp to all requests
    const body = JSON.parse(data.body || '{}');
    body._timestamp = Date.now();
    data.body = JSON.stringify(body);
  }
  return data;
}`,
  'auth': `// Auth plugin
// Generate custom auth headers

function run(request, config) {
  const token = config.apiKey || '';
  request.headers['Authorization'] = 'Custom ' + token;
  request.headers['X-API-Version'] = '2.0';
  return request;
}`,
  'validator': `// Validator plugin
// Return { valid: boolean, errors: string[] }

function run(response) {
  const errors = [];
  if (response.status >= 500) errors.push('Server error');
  try {
    const body = JSON.parse(response.body);
    if (!body.data) errors.push('Missing data field');
  } catch { errors.push('Invalid JSON'); }
  return { valid: errors.length === 0, errors };
}`,
};

const STORAGE_KEY = 'user_plugins';

export default function PluginsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Plugin['type']>('pre-request');
  const [code, setCode] = useState(TEMPLATES['pre-request']);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Plugin['type']>('all');

  const cardBg = isDark ? colors.surface : colors.card;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((d) => { if (d) setPlugins(JSON.parse(d)); });
  }, []);

  const save = (list: Plugin[]) => {
    setPlugins(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const addPlugin = () => {
    if (!name.trim()) return;
    save([...plugins, {
      id: generateId(), name: name.trim(), description: description.trim(),
      version: '1.0.0', author: 'Me', type, code,
      enabled: true, createdAt: Date.now(), runCount: 0,
    }]);
    setName('');
    setDescription('');
    setCode(TEMPLATES['pre-request']);
    setShowAdd(false);
  };

  const testPlugin = (plugin: Plugin) => {
    try {
      // Basic syntax check
      new Function('request', 'response', 'config', plugin.code);
      save(plugins.map((p) => p.id === plugin.id ? { ...p, runCount: p.runCount + 1, lastRun: Date.now(), lastError: undefined } : p));
      Alert.alert('Success', 'Plugin syntax is valid and ready to use');
    } catch (e: any) {
      save(plugins.map((p) => p.id === plugin.id ? { ...p, lastError: e.message } : p));
      Alert.alert('Error', e.message);
    }
  };

  const filtered = filter === 'all' ? plugins : plugins.filter((p) => p.type === filter);

  return (
    <>
      <Stack.Screen options={{ title: 'Plugins' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{plugins.length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.statValue, { color: '#3FB950' }]}>{plugins.filter((p) => p.enabled).length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.statValue, { color: '#D29922' }]}>{plugins.reduce((s, p) => s + p.runCount, 0)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Runs</Text>
            </View>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: filter === 'all' ? colors.primary + '20' : cardBg }]} onPress={() => setFilter('all')}>
                <Text style={{ color: filter === 'all' ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>All</Text>
              </TouchableOpacity>
              {(Object.entries(TYPE_CONFIG) as [Plugin['type'], typeof TYPE_CONFIG['pre-request']][]).map(([k, v]) => (
                <TouchableOpacity key={k} style={[styles.filterChip, { backgroundColor: filter === k ? v.color + '20' : cardBg }]} onPress={() => setFilter(k)}>
                  <MaterialCommunityIcons name={v.icon as any} size={14} color={filter === k ? v.color : colors.textTertiary} />
                  <Text style={{ color: filter === k ? v.color : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Add */}
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
            <MaterialCommunityIcons name={showAdd ? 'close' : 'plus'} size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{showAdd ? 'Cancel' : 'Create Plugin'}</Text>
          </TouchableOpacity>

          {showAdd && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={name} onChangeText={setName} placeholder="Plugin name" placeholderTextColor={colors.textTertiary} />
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textTertiary} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(Object.entries(TYPE_CONFIG) as [Plugin['type'], typeof TYPE_CONFIG['pre-request']][]).map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.typeChip, { backgroundColor: type === k ? v.color + '20' : colors.background }]}
                      onPress={() => { setType(k); setCode(TEMPLATES[k]); }}
                    >
                      <MaterialCommunityIcons name={v.icon as any} size={14} color={type === k ? v.color : colors.textTertiary} />
                      <Text style={{ color: type === k ? v.color : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TextInput
                style={[styles.codeInput, { backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA', color: colors.text }]}
                value={code}
                onChangeText={setCode}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={addPlugin}>
                <MaterialCommunityIcons name="puzzle-plus" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Create Plugin</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Plugins List */}
          {filtered.map((plugin) => {
            const cfg = TYPE_CONFIG[plugin.type];
            const isExpanded = expanded === plugin.id;
            return (
              <TouchableOpacity key={plugin.id} activeOpacity={0.8} onPress={() => setExpanded(isExpanded ? null : plugin.id)}
                style={[styles.pluginCard, { backgroundColor: cardBg, opacity: plugin.enabled ? 1 : 0.5 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.pluginIcon, { backgroundColor: cfg.color + '15' }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{plugin.name}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{plugin.description || cfg.desc}</Text>
                  </View>
                  <TouchableOpacity onPress={() => save(plugins.map((p) => p.id === plugin.id ? { ...p, enabled: !p.enabled } : p))}>
                    <MaterialCommunityIcons name={plugin.enabled ? 'toggle-switch' : 'toggle-switch-off'} size={28} color={plugin.enabled ? colors.primary : colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <View style={[styles.tag, { backgroundColor: cfg.color + '10' }]}>
                    <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '700' }}>{plugin.type.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: '#8B949E10' }]}>
                    <Text style={{ color: colors.textTertiary, fontSize: 9, fontWeight: '700' }}>v{plugin.version}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: '#3FB95010' }]}>
                    <Text style={{ color: '#3FB950', fontSize: 9, fontWeight: '700' }}>{plugin.runCount} runs</Text>
                  </View>
                  {plugin.lastError && (
                    <View style={[styles.tag, { backgroundColor: '#FF696110' }]}>
                      <Text style={{ color: '#FF6961', fontSize: 9, fontWeight: '700' }}>ERROR</Text>
                    </View>
                  )}
                </View>
                {isExpanded && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <Text style={[styles.codePreview, { color: colors.text, backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA' }]} numberOfLines={8}>{plugin.code}</Text>
                    {plugin.lastError && <Text style={{ color: '#FF6961', fontSize: 11 }}>Last error: {plugin.lastError}</Text>}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95020', flex: 1 }]} onPress={() => testPlugin(plugin)}>
                        <MaterialCommunityIcons name="play" size={16} color="#3FB950" />
                        <Text style={{ color: '#3FB950', fontSize: 12, fontWeight: '700' }}>Test</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF696120', flex: 1 }]} onPress={() => { Alert.alert('Delete', 'Delete plugin?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => save(plugins.filter((p) => p.id !== plugin.id)) }]); }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6961" />
                        <Text style={{ color: '#FF6961', fontSize: 12, fontWeight: '700' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <MaterialCommunityIcons name="puzzle-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No plugins yet</Text>
            </View>
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
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  formCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  codeInput: { borderRadius: 10, padding: 12, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 180, lineHeight: 18 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  pluginCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  pluginIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  codePreview: { borderRadius: 8, padding: 10, fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
});
