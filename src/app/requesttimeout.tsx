import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';

interface TimeoutPreset {
  label: string;
  value: number;
  icon: string;
  color: string;
  desc: string;
}

const PRESETS: TimeoutPreset[] = [
  { label: 'Fast', value: 5000, icon: 'lightning-bolt', color: '#3FB950', desc: 'Quick APIs (5s)' },
  { label: 'Normal', value: 15000, icon: 'speedometer-medium', color: '#58A6FF', desc: 'Standard timeout (15s)' },
  { label: 'Slow', value: 30000, icon: 'speedometer-slow', color: '#FFD60A', desc: 'Slow APIs (30s)' },
  { label: 'Patient', value: 60000, icon: 'clock-outline', color: '#FF9500', desc: 'Long operations (60s)' },
  { label: 'No Limit', value: 0, icon: 'infinity', color: '#FF6961', desc: 'No timeout (risky)' },
];

export default function RequestTimeoutScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const endpoints = useApiStore((s) => s.endpoints);
  const updateEndpoint = useApiStore((s) => s.updateEndpoint);

  const [globalTimeout, setGlobalTimeout] = useState(15000);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [maxRedirects, setMaxRedirects] = useState(5);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [showEndpoints, setShowEndpoints] = useState(false);

  const applyGlobal = () => {
    endpoints.forEach((ep) => {
      updateEndpoint(ep.id, {
        requestSettings: {
          timeout: globalTimeout,
          followRedirects,
          maxRedirects,
        },
      });
    });
    Alert.alert('Applied', `Timeout settings applied to ${endpoints.length} endpoints`);
  };

  const applyToEndpoint = (epId: string) => {
    updateEndpoint(epId, {
      requestSettings: {
        timeout: globalTimeout,
        followRedirects,
        maxRedirects,
      },
    });
    Alert.alert('Applied', 'Timeout settings applied to endpoint');
  };

  const formatTimeout = (ms: number) => {
    if (ms === 0) return 'No Limit';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Request Timeout', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current Value */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeout Duration</Text>
          <View style={styles.timeoutDisplay}>
            <Text style={[styles.timeoutValue, { color: colors.primary }]}>
              {formatTimeout(globalTimeout)}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
              {globalTimeout === 0 ? 'Request will wait indefinitely' : `Request will abort after ${formatTimeout(globalTimeout)}`}
            </Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setGlobalTimeout(Math.max(0, globalTimeout - 5000))}
            >
              <MaterialCommunityIcons name="minus" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setGlobalTimeout(Math.max(0, globalTimeout - 1000))}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>-1s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setGlobalTimeout(Math.min(120000, globalTimeout + 1000))}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+1s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setGlobalTimeout(Math.min(120000, globalTimeout + 5000))}
            >
              <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Presets */}
        <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 4 }]}>Quick Presets</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[
                styles.presetItem,
                {
                  backgroundColor: globalTimeout === p.value ? p.color + '18' : cardBg,
                  borderColor: globalTimeout === p.value ? p.color : 'transparent',
                },
              ]}
              onPress={() => setGlobalTimeout(p.value)}
            >
              <MaterialCommunityIcons
                name={p.icon as any}
                size={24}
                color={globalTimeout === p.value ? p.color : colors.textSecondary}
              />
              <Text style={{ color: globalTimeout === p.value ? p.color : colors.text, fontSize: 14, fontWeight: '700' }}>
                {p.label}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 10, textAlign: 'center' }}>{p.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Redirect Settings */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Redirect Settings</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setFollowRedirects(!followRedirects)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Follow Redirects</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                Automatically follow 3xx redirect responses
              </Text>
            </View>
            <MaterialCommunityIcons
              name={followRedirects ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={40}
              color={followRedirects ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>

          {followRedirects && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Max Redirects</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                    Maximum number of redirects to follow
                  </Text>
                </View>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.primary + '18' }]}
                    onPress={() => setMaxRedirects(Math.max(1, maxRedirects - 1))}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', minWidth: 30, textAlign: 'center' }}>
                    {maxRedirects}
                  </Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.primary + '18' }]}
                    onPress={() => setMaxRedirects(Math.min(20, maxRedirects + 1))}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Apply Buttons */}
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={applyGlobal}
        >
          <MaterialCommunityIcons name="check-all" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
            Apply to All Endpoints ({endpoints.length})
          </Text>
        </TouchableOpacity>

        {/* Per-Endpoint */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.expandHeader} onPress={() => setShowEndpoints(!showEndpoints)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Per-Endpoint Settings</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                Apply timeout to specific endpoints
              </Text>
            </View>
            <MaterialCommunityIcons
              name={showEndpoints ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {showEndpoints && (
            <View style={{ marginTop: 12 }}>
              {endpoints.slice(0, 20).map((ep) => {
                const current = ep.requestSettings?.timeout;
                return (
                  <TouchableOpacity
                    key={ep.id}
                    style={[styles.epRow, { borderBottomColor: colors.divider }]}
                    onPress={() => applyToEndpoint(ep.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{ep.name}</Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                        {ep.method} • Current: {current ? formatTimeout(current) : 'Default'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-right-circle-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
              {endpoints.length === 0 && (
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>No endpoints created yet</Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  timeoutDisplay: { alignItems: 'center', paddingVertical: 8 },
  timeoutValue: { fontSize: 36, fontWeight: '800' },
  stepperRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  stepperBtn: { width: 48, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  presetItem: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 4, borderWidth: 2, flexGrow: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  expandHeader: { flexDirection: 'row', alignItems: 'center' },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
