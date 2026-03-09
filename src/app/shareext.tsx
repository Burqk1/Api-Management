import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { HttpMethod } from '../types/api';

const METHOD_COLORS: Record<string, string> = {
  GET: '#3FB950', POST: '#58A6FF', PUT: '#D29922', DELETE: '#FF6961',
  PATCH: '#BC8CFF', HEAD: '#64D2FF', OPTIONS: '#8B949E',
};

interface SharedItem {
  url: string;
  method: HttpMethod;
  title: string;
  source: string;
  timestamp: number;
}

export default function ShareExtScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const collections = useApiStore((s) => s.collections);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [sharedUrl, setSharedUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [name, setName] = useState('');
  const [recentShares, setRecentShares] = useState<SharedItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  useEffect(() => {
    checkClipboard();
    checkDeepLink();
  }, []);

  const checkClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setSharedUrl(text);
        setName(extractName(text));
      }
    } catch {}
  };

  const checkDeepLink = async () => {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        const match = url.match(/[?&]url=([^&]+)/);
        if (match) {
          const decoded = decodeURIComponent(match[1]);
          setSharedUrl(decoded);
          setName(extractName(decoded));
        }
      }
    } catch {}
  };

  const extractName = (url: string): string => {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/^\//, '').replace(/\/$/, '');
      if (path) return path.split('/').pop() || u.hostname;
      return u.hostname;
    } catch {
      return 'Shared Endpoint';
    }
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setSharedUrl(text);
      setName(extractName(text));
    }
  };

  const saveEndpoint = () => {
    if (!sharedUrl.trim()) return Alert.alert('Error', 'URL is required');
    if (!selectedCollection) return Alert.alert('Error', 'Select a collection');

    addEndpoint({
      collectionId: selectedCollection,
      name: name || 'Shared Endpoint',
      method,
      url: sharedUrl.trim(),
      headers: [],
      body: '',
      assertions: [],
    });

    const share: SharedItem = {
      url: sharedUrl.trim(),
      method,
      title: name,
      source: 'Share Extension',
      timestamp: Date.now(),
    };
    setRecentShares((r) => [share, ...r].slice(0, 10));
    setSaved(true);
  };

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Share Extension', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* How it works */}
        <View style={[styles.card, { backgroundColor: '#58A6FF18' }]}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color="#58A6FF" />
            <Text style={{ color: '#58A6FF', fontSize: 13, flex: 1 }}>
              Share any URL from Safari or other apps to Fetchlab using the iOS Share Sheet, or paste a URL below.
            </Text>
          </View>
        </View>

        {/* Success */}
        {saved && (
          <View style={[styles.card, { backgroundColor: '#3FB95018' }]}>
            <View style={styles.successRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontSize: 15, fontWeight: '700' }}>Saved to Collection!</Text>
            </View>
            <TouchableOpacity onPress={() => setSaved(false)}>
              <Text style={{ color: '#3FB950', fontSize: 13 }}>Add another</Text>
            </TouchableOpacity>
          </View>
        )}

        {!saved && (
          <>
            {/* URL Input */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Shared URL</Text>
              <TextInput
                style={[styles.urlInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.background : colors.systemGray5 }]}
                value={sharedUrl}
                onChangeText={(v) => { setSharedUrl(v); setName(extractName(v)); }}
                placeholder="https://api.example.com/v1/users"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.pasteBtn, { backgroundColor: '#58A6FF18' }]} onPress={pasteFromClipboard}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#58A6FF" />
                <Text style={{ color: '#58A6FF', fontWeight: '600', fontSize: 13 }}>Paste from Clipboard</Text>
              </TouchableOpacity>
            </View>

            {/* Method & Name */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
              <View style={styles.methodRow}>
                {methods.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[styles.methodPill, method === m && { backgroundColor: METHOD_COLORS[m] }]}
                  >
                    <Text style={{ color: method === m ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderColor: colors.cardBorder }]}
                value={name}
                onChangeText={setName}
                placeholder="Endpoint name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Collection Picker */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Save to Collection</Text>
              {collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.colRow, { borderBottomColor: colors.divider }]}
                  onPress={() => setSelectedCollection(col.id)}
                >
                  <MaterialCommunityIcons
                    name={selectedCollection === col.id ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={selectedCollection === col.id ? colors.primary : colors.textTertiary}
                  />
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{col.name}</Text>
                </TouchableOpacity>
              ))}
              {collections.length === 0 && (
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Create a collection first</Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveEndpoint}
            >
              <MaterialCommunityIcons name="content-save-outline" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Save Endpoint</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Recent Shares */}
        {recentShares.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Recent Shares</Text>
            {recentShares.map((s, i) => (
              <View key={i} style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.shareRow}>
                  <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[s.method] || '#8B949E') + '22' }]}>
                    <Text style={{ color: METHOD_COLORS[s.method], fontSize: 10, fontWeight: '700' }}>{s.method}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{s.title}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={1}>{s.url}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
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
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  urlInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'monospace' },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 10, alignSelf: 'flex-start' },
  methodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  methodPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  nameInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  saveBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 44, alignItems: 'center' },
});
