import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useMockStore, MockRoute } from '../stores/mockStore';
import { HttpMethod, METHOD_COLORS } from '../types/api';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function MockServerScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { routes, isRunning, addRoute, updateRoute, removeRoute, toggleServer } = useMockStore();

  const [showAdd, setShowAdd] = useState(false);
  const [path, setPath] = useState('/api/example');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [statusCode, setStatusCode] = useState('200');
  const [resBody, setResBody] = useState('{"message": "Hello from mock"}');
  const [delay, setDelay] = useState('0');
  const [delayMax, setDelayMax] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [condField, setCondField] = useState<'query' | 'body_contains' | 'body_json_path'>('query');
  const [condKey, setCondKey] = useState('');
  const [condOperator, setCondOperator] = useState<'equals' | 'contains' | 'exists' | 'regex'>('equals');
  const [condValue, setCondValue] = useState('');
  const [condStatus, setCondStatus] = useState('200');
  const [condBody, setCondBody] = useState('{"conditional": true}');
  const [sequenceMode, setSequenceMode] = useState(false);
  const [sequenceItems, setSequenceItems] = useState('');
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const inputBg = isDark ? colors.surface : colors.card;

  const handleAdd = () => {
    if (!path.trim()) return;
    const delayMin = parseInt(delay) || 0;
    const delayMaxVal = parseInt(delayMax) || 0;
    const conditionalResponses: import('../stores/mockStore').MockConditionalResponse[] = [];
    if (condKey.trim() && condBody.trim()) {
      conditionalResponses.push({
        id: Date.now().toString(),
        conditions: [{ field: condField, key: condKey, operator: condOperator, value: condValue }],
        statusCode: parseInt(condStatus) || 200,
        responseBody: condBody,
        priority: 1,
      });
    }
    const seqItems = sequenceMode && sequenceItems.trim()
      ? sequenceItems.split('\n---\n').filter(Boolean)
      : undefined;
    addRoute({
      path: path.trim(),
      method,
      statusCode: parseInt(statusCode) || 200,
      responseBody: resBody,
      responseHeaders: { 'Content-Type': 'application/json' },
      delay: delayMin,
      delayRange: delayMaxVal > delayMin ? { min: delayMin, max: delayMaxVal } : undefined,
      enabled: true,
      conditionalResponses: conditionalResponses.length > 0 ? conditionalResponses : undefined,
      responseSequence: seqItems,
      sequenceIndex: 0,
    });
    setShowAdd(false);
    setPath('/api/example');
    setResBody('{"message": "Hello from mock"}');
    setStatusCode('200');
    setDelay('0');
    setDelayMax('');
    setCondKey('');
    setCondValue('');
    setCondBody('{"conditional": true}');
    setSequenceMode(false);
    setSequenceItems('');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('mockServer') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Server Status */}
          <View style={[styles.statusCard, { backgroundColor: inputBg, marginTop: 12 }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isRunning ? '#3FB950' : '#8B949E' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  {isRunning ? t('mockServerRunning') : t('mockServerStopped')}
                </Text>
                <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                  {routes.filter((r) => r.enabled).length} {t('activeRoutes')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: isRunning ? '#FF696120' : colors.primary + '20' }]}
                onPress={toggleServer}
              >
                <MaterialCommunityIcons
                  name={isRunning ? 'stop' : 'play'}
                  size={20}
                  color={isRunning ? '#FF6961' : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Routes */}
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('mockRoutes')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAdd(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {showAdd && (
            <View style={[styles.addForm, { backgroundColor: inputBg }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMethod(m)}
                      style={[styles.methodChip, { backgroundColor: method === m ? METHOD_COLORS[m] + '30' : colors.background }]}
                    >
                      <Text style={[styles.methodChipText, { color: method === m ? METHOD_COLORS[m] : colors.textSecondary }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={path}
                onChangeText={setPath}
                placeholder="/api/users"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                  value={statusCode}
                  onChangeText={setStatusCode}
                  placeholder="200"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                  value={delay}
                  onChangeText={setDelay}
                  placeholder={`${t('delay')} (ms)`}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <TextInput
                style={[styles.bodyInput, { backgroundColor: colors.background, color: colors.text }]}
                value={resBody}
                onChangeText={setResBody}
                placeholder='{"key": "value"}'
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />

              {/* Advanced Toggle */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                onPress={() => setShowAdvanced(!showAdvanced)}
              >
                <MaterialCommunityIcons name={showAdvanced ? 'chevron-down' : 'chevron-right'} size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Advanced Options</Text>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={{ gap: 8 }}>
                  {/* Delay Range */}
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Delay Range (ms)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                      value={delay}
                      onChangeText={setDelay}
                      placeholder="Min"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                      value={delayMax}
                      onChangeText={setDelayMax}
                      placeholder="Max (optional)"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Conditional Response */}
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Conditional Response</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['query', 'body_contains', 'body_json_path'] as const).map((f) => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setCondField(f)}
                          style={[styles.methodChip, { backgroundColor: condField === f ? colors.primary + '20' : colors.background }]}
                        >
                          <Text style={{ color: condField === f ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                      value={condKey}
                      onChangeText={setCondKey}
                      placeholder="Key (e.g. status)"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                      value={condValue}
                      onChangeText={setCondValue}
                      placeholder="Value"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['equals', 'contains', 'exists', 'regex'] as const).map((op) => (
                        <TouchableOpacity
                          key={op}
                          onPress={() => setCondOperator(op)}
                          style={[styles.methodChip, { backgroundColor: condOperator === op ? '#D2992220' : colors.background }]}
                        >
                          <Text style={{ color: condOperator === op ? '#D29922' : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{op}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
                      value={condStatus}
                      onChangeText={setCondStatus}
                      placeholder="Status"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                  <TextInput
                    style={[styles.bodyInput, { backgroundColor: colors.background, color: colors.text, minHeight: 60 }]}
                    value={condBody}
                    onChangeText={setCondBody}
                    placeholder="Conditional response body"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    textAlignVertical="top"
                  />

                  {/* Sequence Mode */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                    onPress={() => setSequenceMode(!sequenceMode)}
                  >
                    <MaterialCommunityIcons
                      name={sequenceMode ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={sequenceMode ? colors.primary : colors.textTertiary}
                    />
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Sequence Mode (round-robin responses)</Text>
                  </TouchableOpacity>
                  {sequenceMode && (
                    <TextInput
                      style={[styles.bodyInput, { backgroundColor: colors.background, color: colors.text, minHeight: 80 }]}
                      value={sequenceItems}
                      onChangeText={setSequenceItems}
                      placeholder={'{"seq": 1}\n---\n{"seq": 2}\n---\n{"seq": 3}'}
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      textAlignVertical="top"
                    />
                  )}

                  {/* Template Variables Info */}
                  <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
                      Template vars: {'{{timestamp}}'} {'{{randomId}}'} {'{{hitCount}}'} {'{{method}}'} {'{{path}}'} {'{{randomInt}}'} {'{{randomFloat}}'} {'{{request.body.fieldName}}'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.systemGray5, flex: 1 }]}
                  onPress={() => setShowAdd(false)}
                >
                  <Text style={[styles.formBtnText, { color: colors.text }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleAdd}
                >
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('addRoute')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {routes.length === 0 && !showAdd && (
            <View style={[styles.emptyCard, { backgroundColor: inputBg }]}>
              <MaterialCommunityIcons name="server-off" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noMockRoutes')}</Text>
            </View>
          )}

          {routes.map((route) => (
            <TouchableOpacity
              key={route.id}
              activeOpacity={0.8}
              onPress={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
              style={[styles.routeCard, { backgroundColor: inputBg, opacity: route.enabled ? 1 : 0.5 }]}
            >
              <View style={styles.routeHeader}>
                <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[route.method] + '20' }]}>
                  <Text style={[styles.methodText, { color: METHOD_COLORS[route.method] }]}>{route.method}</Text>
                </View>
                <Text style={[styles.routePath, { color: colors.text }]} numberOfLines={1}>{route.path}</Text>
                <Text style={[styles.routeStatus, { color: colors.textSecondary }]}>{route.statusCode}</Text>
              </View>
              {/* Badges row */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {route.hitCount > 0 && (
                  <View style={{ backgroundColor: '#3FB95015', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#3FB950', fontSize: 10, fontWeight: '700' }}>{route.hitCount} hits</Text>
                  </View>
                )}
                {route.delay > 0 && (
                  <View style={{ backgroundColor: '#D2992215', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#D29922', fontSize: 10, fontWeight: '700' }}>
                      {route.delayRange ? `${route.delay}-${route.delayRange.max}ms` : `${route.delay}ms`}
                    </Text>
                  </View>
                )}
                {(route.conditionalResponses?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: '#BC8CFF15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#BC8CFF', fontSize: 10, fontWeight: '700' }}>{route.conditionalResponses!.length} conditions</Text>
                  </View>
                )}
                {(route.responseSequence?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: '#58A6FF15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#58A6FF', fontSize: 10, fontWeight: '700' }}>seq [{route.sequenceIndex || 0}/{route.responseSequence!.length}]</Text>
                  </View>
                )}
              </View>
              {/* Expanded details */}
              {expandedRoute === route.id && (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} numberOfLines={4}>{route.responseBody}</Text>
                  {route.conditionalResponses?.map((cr) => (
                    <View key={cr.id} style={{ backgroundColor: colors.background, borderRadius: 6, padding: 6, marginTop: 4 }}>
                      <Text style={{ color: '#BC8CFF', fontSize: 10, fontWeight: '700' }}>
                        IF {cr.conditions.map((c) => `${c.field}.${c.key} ${c.operator} "${c.value}"`).join(' AND ')}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>THEN {cr.statusCode}: {cr.responseBody.slice(0, 50)}...</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.routeActions}>
                <TouchableOpacity onPress={() => updateRoute(route.id, { enabled: !route.enabled })}>
                  <MaterialCommunityIcons
                    name={route.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                    size={28}
                    color={route.enabled ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Alert.alert(t('remove'), t('removeRouteConfirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('remove'), style: 'destructive', onPress: () => removeRoute(route.id) },
                  ]);
                }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF6961" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  statusCard: { borderRadius: 14, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 13, marginTop: 2 },
  toggleBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  addForm: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 12 },
  methodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  methodChipText: { fontSize: 12, fontWeight: '700' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  bodyInput: {
    borderRadius: 10, padding: 12, minHeight: 100, fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18,
  },
  formBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  formBtnText: { fontSize: 15, fontWeight: '600' },

  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },

  routeCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 46, alignItems: 'center' },
  methodText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  routePath: { flex: 1, fontSize: 14, fontWeight: '600' },
  routeStatus: { fontSize: 13, fontWeight: '600' },
  routeActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
});
