import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'snippet_library';

interface Snippet {
  id: string;
  name: string;
  category: string;
  content: string;
  isDefault?: boolean;
}

type Category = 'Headers' | 'Auth' | 'Body Templates' | 'Scripts' | 'URLs';

const CATEGORY_META: Record<Category, { icon: string; color: string }> = {
  Headers: { icon: 'web', color: '#58A6FF' },
  Auth: { icon: 'shield-lock-outline', color: '#3FB950' },
  'Body Templates': { icon: 'code-braces', color: '#D29922' },
  Scripts: { icon: 'script-text-outline', color: '#BC8CFF' },
  URLs: { icon: 'link-variant', color: '#F778BA' },
};

const CATEGORIES: Category[] = ['Headers', 'Auth', 'Body Templates', 'Scripts', 'URLs'];

const DEFAULT_SNIPPETS: Snippet[] = [
  { id: 'd1', name: 'Content-Type JSON', category: 'Headers', content: 'Content-Type: application/json', isDefault: true },
  { id: 'd2', name: 'Content-Type Form', category: 'Headers', content: 'Content-Type: application/x-www-form-urlencoded', isDefault: true },
  { id: 'd3', name: 'Accept JSON', category: 'Headers', content: 'Accept: application/json', isDefault: true },
  { id: 'd4', name: 'Accept XML', category: 'Headers', content: 'Accept: application/xml', isDefault: true },
  { id: 'd5', name: 'Bearer Token', category: 'Auth', content: 'Authorization: Bearer {{TOKEN}}', isDefault: true },
  { id: 'd6', name: 'Basic Auth', category: 'Auth', content: 'Authorization: Basic {{BASE64_CREDENTIALS}}', isDefault: true },
  { id: 'd7', name: 'API Key Header', category: 'Auth', content: 'X-API-Key: {{API_KEY}}', isDefault: true },
  { id: 'd8', name: 'Simple JSON Object', category: 'Body Templates', content: '{\n  "key": "value"\n}', isDefault: true },
  { id: 'd9', name: 'User Create Body', category: 'Body Templates', content: '{\n  "name": "",\n  "email": "",\n  "password": ""\n}', isDefault: true },
  { id: 'd10', name: 'Pagination Params', category: 'Body Templates', content: '{\n  "page": 1,\n  "limit": 20,\n  "sort": "createdAt",\n  "order": "desc"\n}', isDefault: true },
  { id: 'd11', name: 'Login Body', category: 'Body Templates', content: '{\n  "email": "",\n  "password": ""\n}', isDefault: true },
  { id: 'd12', name: 'Check Status 200', category: 'Scripts', content: 'pm.test("Status is 200", () => {\n  pm.response.to.have.status(200);\n});', isDefault: true },
  { id: 'd13', name: 'Check Body Contains', category: 'Scripts', content: 'pm.test("Body contains key", () => {\n  const json = pm.response.json();\n  pm.expect(json).to.have.property("key");\n});', isDefault: true },
  { id: 'd14', name: 'Check Response Time', category: 'Scripts', content: 'pm.test("Response time < 500ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});', isDefault: true },
  { id: 'd15', name: 'JSONPlaceholder', category: 'URLs', content: 'https://jsonplaceholder.typicode.com', isDefault: true },
  { id: 'd16', name: 'HTTPBin', category: 'URLs', content: 'https://httpbin.org', isDefault: true },
  { id: 'd17', name: 'ReqRes API', category: 'URLs', content: 'https://reqres.in/api', isDefault: true },
  { id: 'd18', name: 'Dog API', category: 'URLs', content: 'https://dog.ceo/api/breeds/image/random', isDefault: true },
];

export default function SnippetsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [customSnippets, setCustomSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('Headers');
  const [newContent, setNewContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomSnippets();
  }, []);

  const loadCustomSnippets = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setCustomSnippets(JSON.parse(data));
    } catch {}
  };

  const saveCustomSnippets = async (snippets: Snippet[]) => {
    setCustomSnippets(snippets);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  };

  const allSnippets = [...DEFAULT_SNIPPETS, ...customSnippets];

  const filtered = allSnippets.filter((s) => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch =
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const grouped = CATEGORIES.reduce<Record<string, Snippet[]>>((acc, cat) => {
    const items = filtered.filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const handleCopy = async (snippet: Snippet) => {
    await Clipboard.setStringAsync(snippet.content);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Name and content are required.');
      return;
    }
    const snippet: Snippet = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      content: newContent.trim(),
    };
    saveCustomSnippets([...customSnippets, snippet]);
    setNewName('');
    setNewContent('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Snippet', 'Are you sure you want to delete this snippet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveCustomSnippets(customSnippets.filter((s) => s.id !== id)) },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('snippetLibrary') || 'Snippet Library' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search snippets..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
            {(['All', ...CATEGORIES] as const).map((cat) => {
              const isActive = activeCategory === cat;
              const meta = cat !== 'All' ? CATEGORY_META[cat] : null;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: isActive ? (meta?.color || colors.primary) : cardBg, borderColor: meta?.color || colors.primary },
                  ]}
                >
                  {meta && <MaterialCommunityIcons name={meta.icon as any} size={14} color={isActive ? '#fff' : meta.color} />}
                  <Text style={[styles.filterText, { color: isActive ? '#fff' : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Add Button */}
          <TouchableOpacity
            onPress={() => setShowAdd(!showAdd)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <MaterialCommunityIcons name={showAdd ? 'close' : 'plus'} size={18} color="#fff" />
            <Text style={styles.addButtonText}>{showAdd ? 'Cancel' : 'Add Snippet'}</Text>
          </TouchableOpacity>

          {/* Add Form */}
          {showAdd && (
            <View style={[styles.addForm, { backgroundColor: cardBg }]}>
              <TextInput
                style={[styles.formInput, { backgroundColor: inputBg, color: colors.text }]}
                placeholder="Snippet name"
                placeholderTextColor={colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: newCategory === cat ? CATEGORY_META[cat].color : 'transparent',
                        borderColor: CATEGORY_META[cat].color,
                      },
                    ]}
                  >
                    <Text style={{ color: newCategory === cat ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: inputBg, color: colors.text }]}
                placeholder="Snippet content"
                placeholderTextColor={colors.textTertiary}
                value={newContent}
                onChangeText={setNewContent}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity onPress={handleAdd} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Snippet</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Snippet List */}
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category as Category];
            return (
              <View key={category} style={{ marginTop: 20 }}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{category}</Text>
                  <Text style={[styles.countBadge, { color: meta.color }]}>{items.length}</Text>
                </View>
                <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                  {items.map((snippet, i) => (
                    <View
                      key={snippet.id}
                      style={[
                        styles.snippetRow,
                        i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                      ]}
                    >
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleCopy(snippet)} activeOpacity={0.6}>
                        <Text style={[styles.snippetName, { color: colors.text }]}>{snippet.name}</Text>
                        <Text style={[styles.snippetContent, { color: colors.textTertiary }]} numberOfLines={2}>
                          {snippet.content}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.snippetActions}>
                        <TouchableOpacity onPress={() => handleCopy(snippet)} style={styles.iconBtn}>
                          <MaterialCommunityIcons
                            name={copiedId === snippet.id ? 'check-circle' : 'content-copy'}
                            size={18}
                            color={copiedId === snippet.id ? '#3FB950' : colors.textTertiary}
                          />
                        </TouchableOpacity>
                        {!snippet.isDefault && (
                          <TouchableOpacity onPress={() => handleDelete(snippet.id)} style={styles.iconBtn}>
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#F85149" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {Object.keys(grouped).length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="code-tags" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No snippets found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginTop: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addForm: { borderRadius: 14, padding: 16, marginTop: 12 },
  formInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  formTextArea: { height: 100, marginTop: 0 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  countBadge: { fontSize: 13, fontWeight: '600' },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },
  snippetRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  snippetName: { fontSize: 15, fontWeight: '600' },
  snippetContent: { fontSize: 12, marginTop: 3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  snippetActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },
});
