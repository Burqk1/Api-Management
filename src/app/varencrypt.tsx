import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { generateId } from '../types/api';

interface SecureVar {
  id: string;
  name: string;
  value: string;
  encrypted: boolean;
  category: 'api_key' | 'token' | 'password' | 'secret' | 'other';
  createdAt: number;
  lastUsed?: number;
}

const CATEGORIES = {
  api_key: { icon: 'key-outline', color: '#58A6FF' },
  token: { icon: 'shield-key-outline', color: '#3FB950' },
  password: { icon: 'lock-outline', color: '#FF6961' },
  secret: { icon: 'eye-off-outline', color: '#BC8CFF' },
  other: { icon: 'variable', color: '#D29922' },
};

const STORAGE_KEY = 'encrypted_variables';

// Simple XOR-based encryption for demonstration
function encrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decrypt(encoded: string, key: string): string {
  const text = atob(encoded);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export default function VarEncryptScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  const [vars, setVars] = useState<SecureVar[]>([]);
  const [masterKey, setMasterKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<SecureVar['category']>('api_key');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const cardBg = isDark ? colors.surface : colors.card;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((d) => { if (d) setVars(JSON.parse(d)); });
  }, []);

  const save = (list: SecureVar[]) => {
    setVars(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const unlock = () => {
    if (masterKey.length < 4) { Alert.alert('Error', 'Master key must be at least 4 characters'); return; }
    setUnlocked(true);
  };

  const addVar = () => {
    if (!name.trim() || !value.trim()) return;
    const encrypted = encrypt(value, masterKey);
    save([...vars, { id: generateId(), name: name.trim(), value: encrypted, encrypted: true, category, createdAt: Date.now() }]);
    setName('');
    setValue('');
    setShowAdd(false);
  };

  const deleteVar = (id: string) => {
    Alert.alert('Delete', 'Delete this variable?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => save(vars.filter((v) => v.id !== id)) },
    ]);
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getDecrypted = (v: SecureVar) => {
    try { return decrypt(v.value, masterKey); } catch { return '***'; }
  };

  const filtered = vars.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  if (!unlocked) {
    return (
      <>
        <Stack.Screen options={{ title: 'Variable Encryption' }} />
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.lockScreen}>
            <MaterialCommunityIcons name="shield-lock" size={64} color={colors.primary} />
            <Text style={[styles.lockTitle, { color: colors.text }]}>Secure Variables</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Enter your master key to access encrypted variables
            </Text>
            <TextInput
              style={[styles.lockInput, { backgroundColor: cardBg, color: colors.text }]}
              value={masterKey}
              onChangeText={setMasterKey}
              placeholder="Master Key"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoFocus
            />
            <TouchableOpacity
              style={[styles.unlockBtn, { backgroundColor: colors.primary, opacity: masterKey.length >= 4 ? 1 : 0.4 }]}
              onPress={unlock}
              disabled={masterKey.length < 4}
            >
              <MaterialCommunityIcons name="lock-open" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Variable Encryption' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textTertiary} />
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
              value={search}
              onChangeText={setSearch}
              placeholder="Search variables..."
              placeholderTextColor={colors.textTertiary}
            />
            {search ? <TouchableOpacity onPress={() => setSearch('')}><MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} /></TouchableOpacity> : null}
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {Object.entries(CATEGORIES).map(([key, cfg]) => {
              const count = vars.filter((v) => v.category === key).length;
              return (
                <View key={key} style={[styles.statChip, { backgroundColor: cfg.color + '15' }]}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={{ color: cfg.color, fontSize: 11, fontWeight: '700' }}>{count}</Text>
                </View>
              );
            })}
          </View>

          {/* Add Button */}
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
            <MaterialCommunityIcons name={showAdd ? 'close' : 'plus'} size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{showAdd ? 'Cancel' : 'Add Secure Variable'}</Text>
          </TouchableOpacity>

          {showAdd && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Variable name (e.g. API_KEY)"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={value}
                onChangeText={setValue}
                placeholder="Secret value"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(Object.entries(CATEGORIES) as [SecureVar['category'], typeof CATEGORIES.api_key][]).map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.catChip, { backgroundColor: category === k ? v.color + '20' : colors.background }]}
                      onPress={() => setCategory(k)}
                    >
                      <MaterialCommunityIcons name={v.icon as any} size={14} color={category === k ? v.color : colors.textTertiary} />
                      <Text style={{ color: category === k ? v.color : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={addVar}>
                <MaterialCommunityIcons name="lock-plus" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Encrypt & Save</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Variables List */}
          {filtered.map((v) => {
            const cfg = CATEGORIES[v.category];
            const isRevealed = revealed.has(v.id);
            return (
              <View key={v.id} style={[styles.varCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.varIcon, { backgroundColor: cfg.color + '15' }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{v.name}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                      {isRevealed ? getDecrypted(v) : '••••••••••••'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleReveal(v.id)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name={isRevealed ? 'eye-off' : 'eye'} size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteVar(v.id)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF6961" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <View style={[styles.tagChip, { backgroundColor: cfg.color + '10' }]}>
                    <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '700' }}>{v.category.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.tagChip, { backgroundColor: '#3FB95010' }]}>
                    <MaterialCommunityIcons name="lock" size={10} color="#3FB950" />
                    <Text style={{ color: '#3FB950', fontSize: 9, fontWeight: '700' }}>ENCRYPTED</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No secure variables yet</Text>
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
  lockScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  lockTitle: { fontSize: 24, fontWeight: '800', marginTop: 12 },
  lockInput: { width: '100%', borderRadius: 12, padding: 14, fontSize: 16, textAlign: 'center' },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, borderRadius: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  formCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  varCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  varIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
