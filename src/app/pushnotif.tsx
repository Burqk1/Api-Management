import React, { useState, useEffect } from 'react';
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
import * as Notifications from 'expo-notifications';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useMonitorStore } from '../stores/monitorStore';

interface NotifRule {
  id: string;
  name: string;
  type: 'downtime' | 'slow' | 'error' | 'schedule';
  enabled: boolean;
  threshold?: number;
  monitorId?: string;
}

const RULE_TEMPLATES = [
  { type: 'downtime', name: 'API Down Alert', icon: 'server-off', color: '#FF6961', desc: 'Notify when a monitored API goes down' },
  { type: 'slow', name: 'Slow Response', icon: 'speedometer-slow', color: '#FFD60A', desc: 'Notify when response time exceeds threshold' },
  { type: 'error', name: 'Error Rate Spike', icon: 'alert-circle-outline', color: '#FF9500', desc: 'Notify when error rate spikes above normal' },
  { type: 'schedule', name: 'Scheduled Report', icon: 'clock-outline', color: '#58A6FF', desc: 'Daily/weekly summary of API health' },
];

export default function PushNotifScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const checks = useMonitorStore((s) => s.checks);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [rules, setRules] = useState<NotifRule[]>([]);
  const [pushToken, setPushToken] = useState('');
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    checkPermission();
    loadRules();
  }, []);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(status === 'granted');
    if (status === 'granted') {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
      } catch {}
    }
  };

  const loadRules = async () => {
    try {
      const stored = await AsyncStorage.getItem('push_rules');
      if (stored) setRules(JSON.parse(stored));
    } catch {}
  };

  const saveRules = async (updated: NotifRule[]) => {
    setRules(updated);
    await AsyncStorage.setItem('push_rules', JSON.stringify(updated));
  };

  const addRule = (type: string) => {
    const tmpl = RULE_TEMPLATES.find((r) => r.type === type);
    if (!tmpl) return;
    const rule: NotifRule = {
      id: Date.now().toString(),
      name: tmpl.name,
      type: type as NotifRule['type'],
      enabled: true,
      threshold: type === 'slow' ? 1000 : type === 'error' ? 10 : undefined,
    };
    saveRules([...rules, rule]);
  };

  const toggleRule = (id: string) => {
    saveRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const removeRule = (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  const sendTestNotif = async () => {
    setTestSending(true);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fetchlab Alert',
        body: 'This is a test notification. Your push notifications are working!',
        sound: true,
      },
      trigger: null,
    });
    setTestSending(false);
    Alert.alert('Sent', 'Test notification sent!');
  };

  const getRuleColor = (type: string) => RULE_TEMPLATES.find((r) => r.type === type)?.color || '#8B949E';
  const getRuleIcon = (type: string) => RULE_TEMPLATES.find((r) => r.type === type)?.icon || 'bell-outline';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Push Notifications', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        <View style={[styles.card, { backgroundColor: permissionGranted ? '#3FB95018' : '#FF696118' }]}>
          <View style={styles.permRow}>
            <MaterialCommunityIcons
              name={permissionGranted ? 'bell-check-outline' : 'bell-off-outline'}
              size={28}
              color={permissionGranted ? '#3FB950' : '#FF6961'}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: permissionGranted ? '#3FB950' : '#FF6961', fontSize: 16, fontWeight: '700' }}>
                {permissionGranted ? 'Notifications Enabled' : 'Notifications Disabled'}
              </Text>
              <Text style={{ color: permissionGranted ? '#3FB950' : '#FF6961', fontSize: 12, marginTop: 2 }}>
                {permissionGranted ? 'You will receive push alerts' : 'Enable to receive API alerts'}
              </Text>
            </View>
            {!permissionGranted && (
              <TouchableOpacity style={[styles.enableBtn, { backgroundColor: '#FF6961' }]} onPress={requestPermission}>
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Push Token */}
        {pushToken ? (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Push Token</Text>
            <Text style={{ color: colors.text, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={2}>{pushToken}</Text>
          </View>
        ) : null}

        {/* Active Rules */}
        {rules.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Rules</Text>
            {rules.map((rule) => (
              <View key={rule.id} style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.ruleRow}>
                  <View style={[styles.ruleIcon, { backgroundColor: getRuleColor(rule.type) + '18' }]}>
                    <MaterialCommunityIcons name={getRuleIcon(rule.type) as any} size={18} color={getRuleColor(rule.type)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{rule.name}</Text>
                    {rule.threshold && (
                      <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                        Threshold: {rule.type === 'slow' ? `${rule.threshold}ms` : `${rule.threshold}%`}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => toggleRule(rule.id)}
                    trackColor={{ true: colors.primary }}
                  />
                  <TouchableOpacity onPress={() => removeRule(rule.id)} style={{ marginLeft: 6 }}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#FF6961" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Add Rule */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Add Alert Rule</Text>
        {RULE_TEMPLATES.map((tmpl) => (
          <TouchableOpacity
            key={tmpl.type}
            style={[styles.card, { backgroundColor: cardBg }]}
            onPress={() => addRule(tmpl.type)}
          >
            <View style={styles.ruleRow}>
              <View style={[styles.ruleIcon, { backgroundColor: tmpl.color + '18' }]}>
                <MaterialCommunityIcons name={tmpl.icon as any} size={18} color={tmpl.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{tmpl.name}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{tmpl.desc}</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Test */}
        {permissionGranted && (
          <TouchableOpacity
            style={[styles.testBtn, { backgroundColor: colors.primary, opacity: testSending ? 0.6 : 1 }]}
            onPress={sendTestNotif}
            disabled={testSending}
          >
            <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Send Test Notification</Text>
          </TouchableOpacity>
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
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  enableBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  testBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
});
