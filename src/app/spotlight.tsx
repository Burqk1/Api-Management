import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS } from '../types/api';
import * as Haptics from 'expo-haptics';

interface SpotlightItem {
  id: string;
  type: 'action' | 'endpoint' | 'collection' | 'tool';
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  route: string;
  method?: string;
}

const TOOLS: Omit<SpotlightItem, 'id'>[] = [
  { type: 'action', title: 'New Collection', icon: 'folder-plus-outline', color: '#58A6FF', route: '/collection/new' },
  { type: 'action', title: 'New Endpoint', icon: 'plus-network-outline', color: '#3FB950', route: '/endpoint/new' },
  { type: 'action', title: 'Quick Send', icon: 'send-outline', color: '#30D158', route: '/quicksend' },
  { type: 'tool', title: 'cURL Import', icon: 'console-line', color: '#3FB950', route: '/curlimport' },
  { type: 'tool', title: 'WebSocket', icon: 'lan-connect', color: '#F778BA', route: '/websocket' },
  { type: 'tool', title: 'GraphQL', icon: 'graphql', color: '#E535AB', route: '/graphqlexplorer' },
  { type: 'tool', title: 'Mock Server', icon: 'server-network', color: '#FF9500', route: '/mockserver' },
  { type: 'tool', title: 'Analytics', icon: 'chart-bar', color: '#BC8CFF', route: '/analytics' },
  { type: 'tool', title: 'Environments', icon: 'swap-horizontal', color: '#D29922', route: '/environments' },
  { type: 'tool', title: 'AI Analysis', icon: 'robot-outline', color: '#FF9500', route: '/aianalysis' },
  { type: 'tool', title: 'API Docs', icon: 'file-document-multiple-outline', color: '#3FB950', route: '/apidocs' },
  { type: 'tool', title: 'History', icon: 'history', color: '#D29922', route: '/history' },
  { type: 'tool', title: 'Settings', icon: 'cog-outline', color: '#8B949E', route: '/(tabs)/settings' },
  { type: 'tool', title: 'Code Generator', icon: 'code-braces', color: '#00BCD4', route: '/codegen' },
  { type: 'tool', title: 'Load Testing', icon: 'chart-timeline-variant-shimmer', color: '#FF5722', route: '/loadtest' },
  { type: 'tool', title: 'Compare Requests', icon: 'compare', color: '#64D2FF', route: '/compare' },
  { type: 'tool', title: 'Security Scan', icon: 'shield-alert-outline', color: '#F44336', route: '/securityscan' },
  { type: 'tool', title: 'Postman Import', icon: 'application-import', color: '#FF6961', route: '/postmanimport' },
];

export default function SpotlightScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);

  const [query, setQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const allItems = useMemo<SpotlightItem[]>(() => {
    const items: SpotlightItem[] = TOOLS.map((tool, i) => ({ ...tool, id: `tool_${i}` }));

    collections.forEach((c) => {
      items.push({
        id: `col_${c.id}`,
        type: 'collection',
        title: c.name,
        subtitle: `${endpoints.filter((e) => e.collectionId === c.id).length} endpoints`,
        icon: c.icon || 'folder-outline',
        color: c.color || '#58A6FF',
        route: `/collection/${c.id}`,
      });
    });

    endpoints.forEach((ep) => {
      const col = collections.find((c) => c.id === ep.collectionId);
      items.push({
        id: `ep_${ep.id}`,
        type: 'endpoint',
        title: ep.name,
        subtitle: `${ep.method} ${ep.url}`,
        icon: 'api',
        color: METHOD_COLORS[ep.method] || '#8B949E',
        route: `/endpoint/${ep.id}`,
        method: ep.method,
      });
    });

    return items;
  }, [collections, endpoints]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return allItems.filter((i) => i.type === 'action').slice(0, 6);
    }
    const q = query.toLowerCase();
    return allItems
      .filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.method?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, allItems]);

  const handleSelect = (item: SpotlightItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    router.back();
    setTimeout(() => router.push(item.route as any), 100);
  };

  const cardBg = isDark ? colors.surface : colors.card;

  const renderItem = ({ item }: { item: SpotlightItem }) => (
    <TouchableOpacity
      style={[styles.resultRow, { backgroundColor: cardBg }]}
      activeOpacity={0.6}
      onPress={() => handleSelect(item)}
    >
      <View style={[styles.resultIcon, { backgroundColor: item.color + '18' }]}>
        {item.method ? (
          <Text style={[styles.methodLabel, { color: item.color }]}>{item.method}</Text>
        ) : (
          <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        {item.subtitle && (
          <Text style={[styles.resultSub, { color: colors.textTertiary }]} numberOfLines={1}>{item.subtitle}</Text>
        )}
      </View>
      <View style={[styles.typeBadge, { backgroundColor: colors.systemGray5 }]}>
        <Text style={[styles.typeText, { color: colors.textTertiary }]}>
          {item.type === 'action' ? 'Action' : item.type === 'endpoint' ? 'API' : item.type === 'collection' ? 'Collection' : 'Tool'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => router.back()} />
        <SafeAreaView style={styles.safeContent}>
          <View style={[styles.searchContainer, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('searchPlaceholder') || 'Search endpoints, tools, actions...'}
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.resultsContainer}>
            {!query.trim() && (
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('quickActions') || 'Quick Actions'}
              </Text>
            )}
            {filtered.length > 0 ? (
              <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                contentContainerStyle={{ gap: 2 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noResults}>
                <MaterialCommunityIcons name="magnify-close" size={40} color={colors.textTertiary} />
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                  {t('noResults') || 'No results found'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.hintRow}>
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Type to search endpoints, collections, and tools
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  resultsContainer: {
    flex: 1,
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  resultsList: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  resultSub: {
    fontSize: 12,
    marginTop: 1,
    letterSpacing: -0.1,
  },
  methodLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  hintRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
