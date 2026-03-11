import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useMonitorStore } from '../stores/monitorStore';

interface WidgetConfig {
  id: string;
  type: 'status' | 'stats' | 'quick' | 'timeline';
  title: string;
  enabled: boolean;
  endpoints: string[];
  refreshInterval: number;
}

const WIDGET_TYPES = [
  { key: 'status', label: 'API Status', icon: 'check-network-outline', desc: 'Live up/down status of monitored APIs', color: '#3FB950' },
  { key: 'stats', label: 'Quick Stats', icon: 'chart-box-outline', desc: 'Today\'s call count, avg response time, success rate', color: '#58A6FF' },
  { key: 'quick', label: 'Quick Actions', icon: 'lightning-bolt', desc: 'One-tap GET requests from Lock Screen', color: '#FFD60A' },
  { key: 'timeline', label: 'Response Timeline', icon: 'chart-timeline-variant', desc: 'Mini response time graph for last 24h', color: '#BC8CFF' },
];

export default function IOSWidgetScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const checks = useMonitorStore((s) => s.checks);
  const endpoints = useApiStore((s) => s.endpoints);
  const callLogs = useApiStore((s) => s.callLogs);

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const addWidget = (type: string) => {
    const info = WIDGET_TYPES.find((w) => w.key === type);
    if (!info) return;
    const widget: WidgetConfig = {
      id: Date.now().toString(),
      type: type as WidgetConfig['type'],
      title: info.label,
      enabled: true,
      endpoints: [],
      refreshInterval: 15,
    };
    setWidgets((w) => [...w, widget]);
    setSelectedType(null);
    saveWidgets([...widgets, widget]);
  };

  const toggleWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    setWidgets(updated);
    saveWidgets(updated);
  };

  const removeWidget = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    saveWidgets(updated);
  };

  const saveWidgets = async (data: WidgetConfig[]) => {
    await AsyncStorage.setItem('ios_widgets', JSON.stringify(data));
  };

  const getWidgetColor = (type: string) => WIDGET_TYPES.find((w) => w.key === type)?.color || '#8B949E';
  const getWidgetIcon = (type: string) => WIDGET_TYPES.find((w) => w.key === type)?.icon || 'widgets-outline';

  // Stats for preview
  const todayCalls = callLogs.filter((l) => Date.now() - l.timestamp < 86400000).length;
  const avgTime = callLogs.length > 0 ? Math.round(callLogs.slice(0, 20).reduce((a, l) => a + l.responseTime, 0) / Math.min(callLogs.length, 20)) : 0;
  const successRate = callLogs.length > 0 ? Math.round((callLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length / callLogs.length) * 100) : 0;
  const upCount = checks.filter((m) => m.isUp === true).length;
  const downCount = checks.filter((m) => m.isUp === false).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'iOS Widgets', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.card, { backgroundColor: '#58A6FF18' }]}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#58A6FF" />
            <Text style={{ color: '#58A6FF', fontSize: 13, flex: 1 }}>
              Configure widgets here, then add them from your iOS Home Screen (long press {'>'} +).
            </Text>
          </View>
        </View>

        {/* Widget Previews */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Widget Previews</Text>

        {/* Status Widget Preview */}
        <View style={[styles.widgetPreview, { backgroundColor: cardBg }]}>
          <Text style={[styles.widgetLabel, { color: colors.textTertiary }]}>API STATUS</Text>
          <View style={styles.statusGrid}>
            {checks.slice(0, 4).map((m) => (
              <View key={m.id} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: m.isUp === true ? '#3FB950' : m.isUp === false ? '#FF6961' : '#FFD60A' }]} />
                <Text style={{ color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>{m.endpointName}</Text>
                <Text style={{ color: m.isUp ? '#3FB950' : '#FF6961', fontSize: 11, fontWeight: '600' }}>
                  {m.isUp === true ? 'UP' : m.isUp === false ? 'DOWN' : '...'}
                </Text>
              </View>
            ))}
            {checks.length === 0 && (
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>No checks configured</Text>
            )}
          </View>
          <View style={styles.previewFooter}>
            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
              {upCount} up  {downCount} down
            </Text>
          </View>
        </View>

        {/* Stats Widget Preview */}
        <View style={[styles.widgetPreview, { backgroundColor: cardBg }]}>
          <Text style={[styles.widgetLabel, { color: colors.textTertiary }]}>QUICK STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{todayCalls}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Calls Today</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{avgTime}ms</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Avg Response</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: successRate >= 90 ? '#3FB950' : '#FFD60A' }]}>{successRate}%</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Success</Text>
            </View>
          </View>
        </View>

        {/* Timeline Widget Preview */}
        <View style={[styles.widgetPreview, { backgroundColor: cardBg }]}>
          <Text style={[styles.widgetLabel, { color: colors.textTertiary }]}>RESPONSE TIMELINE</Text>
          <View style={styles.miniChart}>
            {callLogs.slice(0, 12).reverse().map((log, i) => {
              const height = Math.min(Math.max((log.responseTime / 1000) * 40, 4), 40);
              const barColor = log.responseTime < 300 ? '#3FB950' : log.responseTime < 800 ? '#FFD60A' : '#FF6961';
              return (
                <View key={i} style={styles.barContainer}>
                  <View style={[styles.miniBar, { height, backgroundColor: barColor }]} />
                </View>
              );
            })}
            {callLogs.length === 0 && (
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>No data yet</Text>
            )}
          </View>
        </View>

        {/* Configured Widgets */}
        {widgets.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Configured Widgets</Text>
            {widgets.map((w) => (
              <View key={w.id} style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.widgetRow}>
                  <View style={[styles.widgetIcon, { backgroundColor: getWidgetColor(w.type) + '18' }]}>
                    <MaterialCommunityIcons name={getWidgetIcon(w.type) as any} size={20} color={getWidgetColor(w.type)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{w.title}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Refresh: {w.refreshInterval}min</Text>
                  </View>
                  <Switch
                    value={w.enabled}
                    onValueChange={() => toggleWidget(w.id)}
                    trackColor={{ true: colors.primary }}
                  />
                  <TouchableOpacity onPress={() => removeWidget(w.id)} style={{ marginLeft: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF6961" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Add Widget */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Add Widget</Text>
        {WIDGET_TYPES.map((wt) => (
          <TouchableOpacity
            key={wt.key}
            style={[styles.card, { backgroundColor: cardBg }]}
            onPress={() => addWidget(wt.key)}
          >
            <View style={styles.widgetRow}>
              <View style={[styles.widgetIcon, { backgroundColor: wt.color + '18' }]}>
                <MaterialCommunityIcons name={wt.icon as any} size={20} color={wt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{wt.label}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{wt.desc}</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}

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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  widgetPreview: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.15)' },
  widgetLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  statusGrid: { gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  previewFooter: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statDivider: { width: 1, height: 30 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 },
  barContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  miniBar: { width: 6, borderRadius: 3 },
  widgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  widgetIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
