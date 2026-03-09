import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { useMonitorStore } from '../stores/monitorStore';
import { useApiStore } from '../stores/apiStore';

interface WatchConfig {
  enabled: boolean;
  showMonitors: boolean;
  showQuickActions: boolean;
  showStats: boolean;
  hapticAlerts: boolean;
  complication: 'status' | 'stats' | 'none';
  pinnedEndpoints: string[];
}

const defaultConfig: WatchConfig = {
  enabled: false,
  showMonitors: true,
  showQuickActions: true,
  showStats: true,
  hapticAlerts: true,
  complication: 'status',
  pinnedEndpoints: [],
};

export default function WatchCompanionScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const monitors = useMonitorStore((s) => s.checks);
  const endpoints = useApiStore((s) => s.endpoints);
  const callLogs = useApiStore((s) => s.callLogs);

  const [config, setConfig] = useState<WatchConfig>(defaultConfig);
  const [showPinned, setShowPinned] = useState(false);

  const saveConfig = async (updated: WatchConfig) => {
    setConfig(updated);
    await AsyncStorage.setItem('watch_config', JSON.stringify(updated));
  };

  const togglePinned = (id: string) => {
    const pinned = config.pinnedEndpoints.includes(id)
      ? config.pinnedEndpoints.filter((e) => e !== id)
      : [...config.pinnedEndpoints, id].slice(0, 5);
    saveConfig({ ...config, pinnedEndpoints: pinned });
  };

  const upCount = monitors.filter((m) => m.isUp === true).length;
  const totalMonitors = monitors.length;
  const todayCalls = callLogs.filter((l) => Date.now() - l.timestamp < 86400000).length;

  const complications: { key: WatchConfig['complication']; label: string; icon: string }[] = [
    { key: 'status', label: 'API Status', icon: 'check-network-outline' },
    { key: 'stats', label: 'Call Stats', icon: 'chart-box-outline' },
    { key: 'none', label: 'None', icon: 'close-circle-outline' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Apple Watch', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Watch Preview */}
        <View style={styles.watchContainer}>
          <View style={[styles.watchFrame, { borderColor: isDark ? '#555' : '#333' }]}>
            <View style={[styles.watchScreen, { backgroundColor: '#000' }]}>
              <Text style={styles.watchTime}>9:41</Text>
              <View style={styles.watchContent}>
                {config.showMonitors && (
                  <View style={styles.watchRow}>
                    <View style={[styles.watchDot, { backgroundColor: upCount === totalMonitors ? '#3FB950' : '#FF6961' }]} />
                    <Text style={styles.watchText}>{upCount}/{totalMonitors} APIs Up</Text>
                  </View>
                )}
                {config.showStats && (
                  <View style={styles.watchRow}>
                    <MaterialCommunityIcons name="chart-line" size={10} color="#58A6FF" />
                    <Text style={styles.watchText}>{todayCalls} calls today</Text>
                  </View>
                )}
                {config.showQuickActions && config.pinnedEndpoints.length > 0 && (
                  <View style={styles.watchActions}>
                    {config.pinnedEndpoints.slice(0, 3).map((id) => {
                      const ep = endpoints.find((e) => e.id === id);
                      if (!ep) return null;
                      return (
                        <View key={id} style={styles.watchAction}>
                          <Text style={styles.watchActionText}>{ep.method}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {!config.showMonitors && !config.showStats && !config.showQuickActions && (
                  <Text style={[styles.watchText, { opacity: 0.5 }]}>No data configured</Text>
                )}
              </View>
              <Text style={[styles.watchFooter, { color: '#58A6FF' }]}>Fetchlab</Text>
            </View>
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 8 }}>Apple Watch Preview</Text>
        </View>

        {/* Enable */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Watch App</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                Sync data to Apple Watch
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={(v) => saveConfig({ ...config, enabled: v })}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>

        {config.enabled && (
          <>
            {/* Watch Features */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Watch Features</Text>
              {[
                { key: 'showMonitors' as const, label: 'Monitor Status', desc: 'Show API up/down status' },
                { key: 'showQuickActions' as const, label: 'Quick Actions', desc: 'One-tap requests from wrist' },
                { key: 'showStats' as const, label: 'Daily Stats', desc: 'Call count and response times' },
                { key: 'hapticAlerts' as const, label: 'Haptic Alerts', desc: 'Vibrate when API goes down' },
              ].map((item, i) => (
                <React.Fragment key={item.key}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{item.label}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    <Switch
                      value={config[item.key]}
                      onValueChange={(v) => saveConfig({ ...config, [item.key]: v })}
                      trackColor={{ true: colors.primary }}
                    />
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Complication */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Watch Face Complication</Text>
              <View style={styles.compRow}>
                {complications.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => saveConfig({ ...config, complication: c.key })}
                    style={[
                      styles.compItem,
                      config.complication === c.key && { backgroundColor: colors.primary },
                      config.complication !== c.key && { backgroundColor: isDark ? colors.background : colors.systemGray5 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={c.icon as any}
                      size={18}
                      color={config.complication === c.key ? '#FFF' : colors.textSecondary}
                    />
                    <Text style={{ color: config.complication === c.key ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pinned Endpoints */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <TouchableOpacity style={styles.pinnedHeader} onPress={() => setShowPinned(!showPinned)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Pinned Endpoints</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {config.pinnedEndpoints.length}/5 selected — accessible from Watch
                  </Text>
                </View>
                <MaterialCommunityIcons name={showPinned ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textTertiary} />
              </TouchableOpacity>
              {showPinned && (
                <View style={{ marginTop: 12 }}>
                  {endpoints.slice(0, 15).map((ep) => {
                    const isPinned = config.pinnedEndpoints.includes(ep.id);
                    return (
                      <TouchableOpacity
                        key={ep.id}
                        style={[styles.epRow, { borderBottomColor: colors.divider }]}
                        onPress={() => togglePinned(ep.id)}
                      >
                        <MaterialCommunityIcons
                          name={isPinned ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                          size={20}
                          color={isPinned ? colors.primary : colors.textTertiary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{ep.name}</Text>
                          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{ep.method} {ep.url}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {endpoints.length === 0 && (
                    <Text style={{ color: colors.textTertiary, fontSize: 13 }}>No endpoints created yet</Text>
                  )}
                </View>
              )}
            </View>
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
  watchContainer: { alignItems: 'center', marginBottom: 20 },
  watchFrame: { width: 160, height: 195, borderRadius: 36, borderWidth: 3, padding: 8, backgroundColor: '#000' },
  watchScreen: { flex: 1, borderRadius: 28, padding: 12, justifyContent: 'space-between' },
  watchTime: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  watchContent: { gap: 6 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  watchDot: { width: 6, height: 6, borderRadius: 3 },
  watchText: { color: '#FFF', fontSize: 10 },
  watchActions: { flexDirection: 'row', gap: 4, marginTop: 4 },
  watchAction: { backgroundColor: '#58A6FF33', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  watchActionText: { color: '#58A6FF', fontSize: 8, fontWeight: '700' },
  watchFooter: { fontSize: 8, textAlign: 'center', fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  compRow: { flexDirection: 'row', gap: 8 },
  compItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, gap: 4 },
  pinnedHeader: { flexDirection: 'row', alignItems: 'center' },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
