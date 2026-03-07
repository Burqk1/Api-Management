import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CloudCheck {
  id: string;
  name: string;
  url: string;
  method: string;
  interval: number; // minutes
  enabled: boolean;
  lastCheck?: number;
  lastStatus?: number;
  lastTime?: number;
  isUp?: boolean;
  uptime: number; // percentage
  history: { timestamp: number; status: number; time: number; up: boolean }[];
}

const STORAGE_KEY = 'cloud_monitors';

export default function CloudMonitorScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const endpoints = useApiStore((s) => s.endpoints);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [checks, setChecks] = useState<CloudCheck[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newInterval, setNewInterval] = useState('5');
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setChecks(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    if (checks.length > 0) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  }, [checks]);

  // Auto-check every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      checks.forEach((c) => {
        if (!c.enabled) return;
        const now = Date.now();
        if (c.lastCheck && now - c.lastCheck < c.interval * 60000) return;
        runCheck(c.id);
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [checks]);

  const addCheck = () => {
    if (!newUrl.trim()) return;
    const check: CloudCheck = {
      id: Date.now().toString(36),
      name: newName.trim() || newUrl.split('//')[1]?.split('/')[0] || 'Monitor',
      url: newUrl.trim(),
      method: 'GET',
      interval: parseInt(newInterval) || 5,
      enabled: true,
      uptime: 100,
      history: [],
    };
    setChecks([...checks, check]);
    setNewUrl('');
    setNewName('');
    setShowAdd(false);
  };

  const runCheck = async (id: string) => {
    setChecking(id);
    const check = checks.find((c) => c.id === id);
    if (!check) return;

    try {
      const start = Date.now();
      const res = await fetch(check.url, { method: check.method });
      const elapsed = Date.now() - start;
      const isUp = res.status >= 200 && res.status < 400;
      const entry = { timestamp: Date.now(), status: res.status, time: elapsed, up: isUp };
      const newHistory = [entry, ...check.history].slice(0, 100);
      const upCount = newHistory.filter((h) => h.up).length;
      setChecks((prev) => prev.map((c) => c.id === id ? {
        ...c, lastCheck: Date.now(), lastStatus: res.status, lastTime: elapsed, isUp,
        history: newHistory, uptime: Math.round((upCount / newHistory.length) * 100),
      } : c));
    } catch (err: any) {
      const entry = { timestamp: Date.now(), status: 0, time: 0, up: false };
      const check2 = checks.find((c) => c.id === id)!;
      const newHistory = [entry, ...check2.history].slice(0, 100);
      const upCount = newHistory.filter((h) => h.up).length;
      setChecks((prev) => prev.map((c) => c.id === id ? {
        ...c, lastCheck: Date.now(), lastStatus: 0, lastTime: 0, isUp: false,
        history: newHistory, uptime: Math.round((upCount / newHistory.length) * 100),
      } : c));
    }
    setChecking(null);
  };

  const runAll = async () => {
    for (const c of checks.filter((c) => c.enabled)) {
      await runCheck(c.id);
    }
  };

  const removeCheck = (id: string) => {
    Alert.alert('Remove', 'Remove this monitor?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setChecks(checks.filter((c) => c.id !== id)) },
    ]);
  };

  const upCount = checks.filter((c) => c.isUp === true).length;
  const downCount = checks.filter((c) => c.isUp === false).length;

  return (
    <>
      <Stack.Screen options={{ title: t('cloudMonitoring') || 'Cloud Monitoring' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Summary */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={[styles.statCard, { backgroundColor: '#3FB95012', flex: 1 }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#3FB950" />
              <Text style={[styles.statNum, { color: '#3FB950' }]}>{upCount}</Text>
              <Text style={{ color: '#3FB950', fontSize: 12 }}>Up</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FF696112', flex: 1 }]}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#FF6961" />
              <Text style={[styles.statNum, { color: '#FF6961' }]}>{downCount}</Text>
              <Text style={{ color: '#FF6961', fontSize: 12 }}>Down</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.primary + '12', flex: 1 }]}>
              <MaterialCommunityIcons name="web" size={24} color={colors.primary} />
              <Text style={[styles.statNum, { color: colors.primary }]}>{checks.length}</Text>
              <Text style={{ color: colors.primary, fontSize: 12 }}>Total</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '15', flex: 1 }]}
              onPress={() => setShowAdd(!showAdd)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Add Monitor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3FB95015', flex: 1 }]}
              onPress={runAll}
            >
              <MaterialCommunityIcons name="refresh" size={18} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontWeight: '700' }}>Check All</Text>
            </TouchableOpacity>
          </View>

          {/* Add Form */}
          {showAdd && (
            <View style={[styles.card, { backgroundColor: cardBg, padding: 14, gap: 10 }]}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Monitor name (optional)"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="https://api.example.com/health"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Check every</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text, width: 60, textAlign: 'center' }]}
                  value={newInterval}
                  onChangeText={setNewInterval}
                  keyboardType="numeric"
                />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>min</Text>
              </View>
              {/* Quick add from endpoints */}
              {endpoints.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {endpoints.slice(0, 10).map((ep) => (
                      <TouchableOpacity
                        key={ep.id}
                        style={[styles.epChip, { backgroundColor: inputBg }]}
                        onPress={() => { setNewUrl(ep.url); setNewName(ep.name); }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{ep.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
              <TouchableOpacity
                style={[styles.addMonitorBtn, { backgroundColor: colors.primary, opacity: newUrl.trim() ? 1 : 0.4 }]}
                onPress={addCheck}
                disabled={!newUrl.trim()}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Add Monitor</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Monitors List */}
          {checks.length === 0 ? (
            <View style={[styles.card, { backgroundColor: cardBg, padding: 40, alignItems: 'center', gap: 8 }]}>
              <MaterialCommunityIcons name="cloud-search-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>No Monitors</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                Add endpoints to monitor their uptime and response times.
              </Text>
            </View>
          ) : (
            checks.map((check) => (
              <View key={check.id} style={[styles.card, { backgroundColor: cardBg, padding: 14, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: check.isUp === undefined ? '#8B949E' : check.isUp ? '#3FB950' : '#FF6961' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{check.name}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }} numberOfLines={1}>{check.url}</Text>
                  </View>
                  <TouchableOpacity onPress={() => runCheck(check.id)}>
                    {checking === check.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MaterialCommunityIcons name="refresh" size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeCheck(check.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.miniStat, { backgroundColor: inputBg }]}>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>UPTIME</Text>
                    <Text style={{ color: check.uptime >= 95 ? '#3FB950' : check.uptime >= 80 ? '#D29922' : '#FF6961', fontSize: 15, fontWeight: '800' }}>{check.uptime}%</Text>
                  </View>
                  <View style={[styles.miniStat, { backgroundColor: inputBg }]}>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>STATUS</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{check.lastStatus || '-'}</Text>
                  </View>
                  <View style={[styles.miniStat, { backgroundColor: inputBg }]}>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>TIME</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{check.lastTime ? `${check.lastTime}ms` : '-'}</Text>
                  </View>
                  <View style={[styles.miniStat, { backgroundColor: inputBg }]}>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>CHECKS</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{check.history.length}</Text>
                  </View>
                </View>

                {/* Mini chart */}
                {check.history.length > 0 && (
                  <View style={styles.miniChart}>
                    {check.history.slice(0, 30).reverse().map((h, i) => (
                      <View key={i} style={[styles.chartBar, { backgroundColor: h.up ? '#3FB950' : '#FF6961', height: Math.max(4, Math.min(20, h.time / 50)) }]} />
                    ))}
                  </View>
                )}
              </View>
            ))
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
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  statCard: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontWeight: '800' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  epChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, maxWidth: 120 },
  addMonitorBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  miniStat: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center', gap: 2 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 10, height: 24 },
  chartBar: { flex: 1, borderRadius: 2, minWidth: 3 },
});
