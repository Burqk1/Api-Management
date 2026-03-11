import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useEnvironmentStore } from '../stores/environmentStore';

interface GqlField {
  name: string;
  description: string | null;
  type: { kind: string; name: string | null; ofType: any };
  args: { name: string; description: string | null; type: { kind: string; name: string | null; ofType: any } }[];
}

interface GqlType {
  kind: string;
  name: string;
  description: string | null;
  fields: GqlField[] | null;
}

interface GqlSchema {
  queryType: { name: string } | null;
  mutationType: { name: string } | null;
  subscriptionType: { name: string } | null;
  types: GqlType[];
}

interface HeaderEntry {
  key: string;
  value: string;
}

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
        type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}`;

function formatTypeName(type: any): string {
  if (!type) return 'Unknown';
  if (type.kind === 'NON_NULL') return `${formatTypeName(type.ofType)}!`;
  if (type.kind === 'LIST') return `[${formatTypeName(type.ofType)}]`;
  return type.name || 'Unknown';
}

export default function GraphQLExplorerScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);
  const cardBg = isDark ? colors.surface : colors.card;

  const [endpointUrl, setEndpointUrl] = useState('');
  const [query, setQuery] = useState('{\n  \n}');
  const [variables, setVariables] = useState('');
  const [headers, setHeaders] = useState<HeaderEntry[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [schema, setSchema] = useState<GqlSchema | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [introspecting, setIntrospecting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'schema' | 'query' | 'response'>('query');

  const scrollRef = useRef<ScrollView>(null);
  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;

  const buildHeaders = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        result[resolveVariables(h.key.trim())] = resolveVariables(h.value);
      }
    });
    return result;
  }, [headers, resolveVariables]);

  const runIntrospection = useCallback(async () => {
    const url = resolveVariables(endpointUrl.trim());
    if (!url) return;
    setIntrospecting(true);
    setError(null);
    setSchema(null);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ query: INTROSPECTION_QUERY }),
      });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error('Server returned non-JSON response'); }

      if (json.errors) {
        setError(json.errors.map((e: any) => e.message).join('\n'));
      } else if (json.data?.__schema) {
        setSchema(json.data.__schema);
        setActiveTab('schema');
      } else {
        setError('Unexpected response format');
      }
    } catch (err: any) {
      setError(err.message || 'Introspection failed');
    } finally {
      setIntrospecting(false);
    }
  }, [endpointUrl, buildHeaders, resolveVariables]);

  const executeQuery = useCallback(async () => {
    const url = resolveVariables(endpointUrl.trim());
    if (!url || !query.trim()) return;
    setExecuting(true);
    setError(null);
    setResponse(null);

    try {
      let parsedVars: any = undefined;
      if (variables.trim()) {
        try { parsedVars = JSON.parse(resolveVariables(variables)); } catch { throw new Error('Invalid JSON in variables'); }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          query: resolveVariables(query),
          variables: parsedVars,
        }),
      });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error('Server returned non-JSON response'); }
      setResponse(JSON.stringify(json, null, 2));
      setActiveTab('response');
    } catch (err: any) {
      setError(err.message || 'Query execution failed');
    } finally {
      setExecuting(false);
    }
  }, [endpointUrl, query, variables, buildHeaders, resolveVariables]);

  const toggleType = (name: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addHeader = () => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: val } : h)));
  };

  const removeHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const isRootType = (typeName: string): string | null => {
    if (!schema) return null;
    if (schema.queryType?.name === typeName) return 'Query';
    if (schema.mutationType?.name === typeName) return 'Mutation';
    if (schema.subscriptionType?.name === typeName) return 'Subscription';
    return null;
  };

  const filteredTypes = schema?.types.filter(
    (t) => !t.name.startsWith('__') && t.fields
  ) || [];

  const rootTypes = filteredTypes.filter((t) => isRootType(t.name));
  const otherTypes = filteredTypes.filter((t) => !isRootType(t.name));
  const sortedTypes = [...rootTypes, ...otherTypes];

  const renderTypeTag = (rootLabel: string | null) => {
    if (!rootLabel) return null;
    const tagColors: Record<string, string> = {
      Query: '#3FB950',
      Mutation: '#D29922',
      Subscription: '#A371F7',
    };
    const color = tagColors[rootLabel] || colors.primary;
    return (
      <View style={[styles.rootTag, { backgroundColor: color + '20' }]}>
        <Text style={[styles.rootTagText, { color }]}>{rootLabel}</Text>
      </View>
    );
  };

  const tabs = [
    { key: 'query' as const, label: t('queryBuilder'), icon: 'code-braces' as const },
    { key: 'schema' as const, label: t('schemaTypes'), icon: 'file-tree' as const },
    { key: 'response' as const, label: t('graphqlResponse'), icon: 'code-json' as const },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t('graphqlExplorer') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* URL Bar */}
        <View style={[styles.urlBar, { backgroundColor: inputBg, marginHorizontal: padding, marginTop: 12 }]}>
          <View style={[styles.protocolBadge, { backgroundColor: schema ? '#3FB95020' : '#A371F720' }]}>
            <Text style={[styles.protocolText, { color: schema ? '#3FB950' : '#A371F7' }]}>GQL</Text>
          </View>
          <TextInput
            style={[styles.urlInput, { color: colors.text }]}
            value={endpointUrl}
            onChangeText={setEndpointUrl}
            placeholder="https://api.example.com/graphql"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.introspectBtn, { backgroundColor: colors.primary, opacity: introspecting || !endpointUrl.trim() ? 0.5 : 1 }]}
            onPress={runIntrospection}
            disabled={introspecting || !endpointUrl.trim()}
          >
            {introspecting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialCommunityIcons name="magnify-scan" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Schema Status */}
        {(schema || introspecting || error) && (
          <View style={[styles.statusRow, { marginHorizontal: padding }]}>
            <View style={[styles.statusDot, { backgroundColor: error ? '#FF6961' : schema ? '#3FB950' : '#D29922' }]} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {error ? error : introspecting ? t('introspecting') : `${t('schemaLoaded')} (${filteredTypes.length} types)`}
            </Text>
          </View>
        )}

        {/* Tab Bar */}
        <View style={[styles.tabBar, { marginHorizontal: padding }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary + '15' : 'transparent',
                  borderColor: activeTab === tab.key ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? colors.primary : colors.textTertiary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== QUERY TAB ===== */}
          {activeTab === 'query' && (
            <>
              {/* Query Input */}
              <View style={[styles.section, { backgroundColor: cardBg }]}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="code-braces" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('graphqlQuery')}</Text>
                </View>
                <TextInput
                  style={[styles.codeInput, { color: colors.text, backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA' }]}
                  value={query}
                  onChangeText={setQuery}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  placeholder={'{\n  users {\n    id\n    name\n  }\n}'}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Variables Input */}
              <View style={[styles.section, { backgroundColor: cardBg }]}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="variable" size={18} color="#D29922" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('graphqlVariables')}</Text>
                </View>
                <TextInput
                  style={[styles.codeInput, { color: colors.text, backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA', minHeight: 60 }]}
                  value={variables}
                  onChangeText={setVariables}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  placeholder={'{\n  "id": 1\n}'}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Headers */}
              <View style={[styles.section, { backgroundColor: cardBg }]}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="web" size={18} color="#58A6FF" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('graphqlHeaders')}</Text>
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]} onPress={addHeader}>
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                {headers.map((header, i) => (
                  <View key={i} style={styles.headerRow}>
                    <TextInput
                      style={[styles.headerInput, { color: colors.text, backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA', flex: 1 }]}
                      value={header.key}
                      onChangeText={(v) => updateHeader(i, 'key', v)}
                      placeholder="Header name"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.headerInput, { color: colors.text, backgroundColor: isDark ? '#1A1A2E' : '#F6F8FA', flex: 1.5 }]}
                      value={header.value}
                      onChangeText={(v) => updateHeader(i, 'value', v)}
                      placeholder="Value"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => removeHeader(i)} style={styles.removeBtn}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#FF6961" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Execute Button */}
              <TouchableOpacity
                style={[styles.executeBtn, { backgroundColor: colors.primary, opacity: executing || !endpointUrl.trim() || !query.trim() ? 0.5 : 1 }]}
                onPress={executeQuery}
                disabled={executing || !endpointUrl.trim() || !query.trim()}
              >
                {executing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                )}
                <Text style={styles.executeBtnText}>{t('executeQuery')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ===== SCHEMA TAB ===== */}
          {activeTab === 'schema' && (
            <>
              {!schema ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="file-tree-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noSchema')}</Text>
                </View>
              ) : (
                sortedTypes.map((type) => {
                  const rootLabel = isRootType(type.name);
                  const isExpanded = expandedTypes.has(type.name);
                  return (
                    <View key={type.name} style={[styles.typeCard, { backgroundColor: cardBg, borderLeftColor: rootLabel ? (rootLabel === 'Query' ? '#3FB950' : rootLabel === 'Mutation' ? '#D29922' : '#A371F7') : colors.divider }]}>
                      <TouchableOpacity style={styles.typeHeader} onPress={() => toggleType(type.name)}>
                        <MaterialCommunityIcons
                          name={isExpanded ? 'chevron-down' : 'chevron-right'}
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text style={[styles.typeName, { color: colors.text }]}>{type.name}</Text>
                        {renderTypeTag(rootLabel)}
                        <Text style={[styles.typeKind, { color: colors.textTertiary }]}>{type.kind}</Text>
                        {type.fields && (
                          <Text style={[styles.fieldCount, { color: colors.textTertiary }]}>
                            {type.fields.length}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {type.description && isExpanded && (
                        <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                      )}

                      {isExpanded && type.fields && type.fields.map((field) => (
                        <View key={field.name} style={[styles.fieldRow, { borderTopColor: colors.divider }]}>
                          <View style={styles.fieldMain}>
                            <Text style={[styles.fieldName, { color: colors.primary }]}>{field.name}</Text>
                            {field.args.length > 0 && (
                              <Text style={[styles.fieldArgs, { color: colors.textTertiary }]}>
                                ({field.args.map((a) => `${a.name}: ${formatTypeName(a.type)}`).join(', ')})
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.fieldType, { color: '#D29922' }]}>{formatTypeName(field.type)}</Text>
                          {field.description && (
                            <Text style={[styles.fieldDesc, { color: colors.textTertiary }]}>{field.description}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ===== RESPONSE TAB ===== */}
          {activeTab === 'response' && (
            <>
              {response ? (
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="code-json" size={18} color="#3FB950" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('graphqlResponse')}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Text
                      style={[styles.responseText, { color: colors.text }]}
                      selectable
                    >
                      {response}
                    </Text>
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="code-json" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t('noResponseBody')}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  urlBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 6, gap: 6 },
  protocolBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  protocolText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  urlInput: { flex: 1, fontSize: 14, letterSpacing: -0.2, paddingVertical: 8 },
  introspectBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600', flex: 1 },

  tabBar: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '700' },

  content: { flex: 1 },

  section: { borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },

  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  headerInput: {
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { padding: 4 },

  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  executeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },

  typeCard: { borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderLeftWidth: 3 },
  typeHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  typeName: { fontSize: 14, fontWeight: '700' },
  typeKind: { fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
  typeDesc: { fontSize: 12, paddingHorizontal: 12, paddingBottom: 8 },
  fieldCount: { fontSize: 11, fontWeight: '600' },

  rootTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rootTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  fieldRow: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  fieldMain: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  fieldName: { fontSize: 13, fontWeight: '600' },
  fieldArgs: { fontSize: 11 },
  fieldType: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fieldDesc: { fontSize: 11, marginTop: 2 },

  responseText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
