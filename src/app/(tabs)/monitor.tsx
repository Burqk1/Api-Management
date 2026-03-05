import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useMonitorStore } from '../../stores/monitorStore';
import { useApiStore } from '../../stores/apiStore';
import { MonitorCheck } from '../../types/api';
import { useLanguageStore } from '../../stores/languageStore';

export default function MonitorScreen() {
  const { colors, isDark } = useTheme();
  const checks = useMonitorStore((s) => s.checks);
  const addPing = useMonitorStore((s) => s.addPing);
  const removeCheck = useMonitorStore((s) => s.removeCheck);
  const notificationsEnabled = useMonitorStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useMonitorStore((s) => s.setNotificationsEnabled);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const [autoCheck, setAutoCheck] = useState(false);
  const [autoInterval, setAutoInterval] = useState(60);
  const [lastAutoRun, setLastAutoRun] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useLanguageStore((s) => s.t);
  const padding = Platform.OS === 'web' ? 32 : 20;

  const runCheck = useCallback(async (check: MonitorCheck) => {
    const start = Date.now();
    try {
      const res = await fetch(check.url, { method: check.method, headers: { 'Cache-Control': 'no-cache' } });
      const elapsed = Date.now() - start;
      const success = res.status >= 200 && res.status < 400;
      addPing(check.id, { timestamp: Date.now(), statusCode: res.status, responseTime: elapsed, success });
      addCallLog({
        endpointId: check.endpointId, endpointName: check.endpointName, collectionId: '',
        url: check.url, method: check.method, statusCode: res.status,
        responseTime: elapsed, responseSize: 0, success, timestamp: Date.now(),
      });
    } catch {
      addPing(check.id, { timestamp: Date.now(), statusCode: 0, responseTime: Date.now() - start, success: false });
    }
  }, []);

  const runAllChecks = useCallback(async () => {
    for (const check of checks.filter((c) => c.enabled)) await runCheck(check);
    setLastAutoRun(Date.now());
  }, [checks, runCheck]);

  useEffect(() => {
    if (autoCheck && checks.length > 0) {
      timerRef.current = setInterval(runAllChecks, autoInterval * 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else if (timerRef.current) { clearInterval(timerRef.current); }
  }, [autoCheck, autoInterval, runAllChecks, checks.length]);

  const handleDelete = (id: string) => {
    Alert.alert(t('removeMonitor'), t('removeHealthCheck'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: () => removeCheck(id) },
    ]);
  };

  const formatTime = (ts?: number) => {
    if (!ts) return t('never');
    const diff = Date.now() - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('mAgo')}`;
    return `${Math.floor(diff / 3600000)}${t('hAgo')}`;
  };

  const getUptime = (c: MonitorCheck) => c.history.length === 0 ? 0 : Math.round((c.history.filter((p) => p.success).length / c.history.length) * 100);
  const getAvgTime = (c: MonitorCheck) => c.history.length === 0 ? 0 : Math.round(c.history.reduce((s, p) => s + p.responseTime, 0) / c.history.length);

  const getIncidents = (check: MonitorCheck) => {
    const incidents: { start: number; end?: number; duration: number }[] = [];
    let inInc = false, incStart = 0;
    [...check.history].sort((a, b) => a.timestamp - b.timestamp).forEach((p) => {
      if (!p.success && !inInc) { inInc = true; incStart = p.timestamp; }
      else if (p.success && inInc) { inInc = false; incidents.push({ start: incStart, end: p.timestamp, duration: p.timestamp - incStart }); }
    });
    if (inInc) incidents.push({ start: incStart, duration: Date.now() - incStart });
    return incidents.reverse();
  };

  const cardBg = isDark ? colors.surface : colors.card;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}>
        <View style={[styles.header, { paddingHorizontal: padding }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('monitor')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('healthChecksUptime')}</Text>
          </View>
          <TouchableOpacity style={[styles.runAllBtn, { backgroundColor: colors.primary }]} onPress={runAllChecks}>
            <MaterialCommunityIcons name="refresh" size={16} color="#FFF" />
            <Text style={styles.runAllText}>{t('checkAll')}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={{ paddingHorizontal: padding, marginTop: 16 }}>
          <View style={[styles.summaryBar, { backgroundColor: cardBg }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#3FB950' }]}>{checks.filter((c) => c.isUp === true).length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('healthy')}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF6961' }]}>{checks.filter((c) => c.isUp === false).length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('down')}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.textTertiary }]}>{checks.filter((c) => c.isUp === undefined).length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('pending')}</Text>
            </View>
          </View>
        </View>

        {/* Auto Check */}
        <View style={{ paddingHorizontal: padding, marginTop: 12 }}>
          <View style={[styles.autoCard, { backgroundColor: cardBg }]}>
            <View style={styles.autoHeader}>
              <MaterialCommunityIcons name="timer-outline" size={18} color={autoCheck ? '#3FB950' : colors.textSecondary} />
              <Text style={[styles.autoTitle, { color: colors.text }]}>{t('autoHealthCheck')}</Text>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: autoCheck ? '#3FB950' : colors.systemGray }]}
                onPress={() => setAutoCheck(!autoCheck)}
              >
                <View style={[styles.toggleDot, { alignSelf: autoCheck ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>
            {autoCheck && (
              <View style={styles.intervalRow}>
                <Text style={[styles.intervalLabel, { color: colors.textSecondary }]}>{t('interval')}:</Text>
                {[30, 60, 120, 300].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setAutoInterval(s)}
                    style={[styles.intervalBtn, { backgroundColor: autoInterval === s ? colors.primary : colors.background }]}>
                    <Text style={[styles.intervalText, { color: autoInterval === s ? '#FFF' : colors.textSecondary }]}>
                      {s < 60 ? `${s}s` : `${s / 60}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {lastAutoRun && <Text style={[styles.lastRun, { color: colors.textTertiary }]}>{t('last')}: {formatTime(lastAutoRun)}</Text>}
          </View>

          {/* Notifications Toggle */}
          <View style={[styles.autoCard, { backgroundColor: cardBg, marginTop: 8 }]}>
            <View style={styles.autoHeader}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={notificationsEnabled ? '#58A6FF' : colors.textSecondary} />
              <Text style={[styles.autoTitle, { color: colors.text }]}>{t('pushNotifications')}</Text>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: notificationsEnabled ? '#58A6FF' : colors.systemGray }]}
                onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <View style={[styles.toggleDot, { alignSelf: notificationsEnabled ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.lastRun, { color: colors.textTertiary }]}>{t('pushNotificationsHint')}</Text>
          </View>
        </View>

        {/* Checks List */}
        <View style={{ paddingHorizontal: padding, marginTop: 16 }}>
          {checks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="heart-pulse" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noHealthChecks')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('enableMonitoring')}</Text>
            </View>
          ) : checks.map((check) => {
            const uptime = getUptime(check);
            const incidents = getIncidents(check);
            return (
              <View key={check.id} style={[styles.checkCard, { backgroundColor: cardBg }]}>
                <View style={styles.checkHeader}>
                  <View style={[styles.statusDot, { backgroundColor: check.isUp === true ? '#3FB950' : check.isUp === false ? '#FF6961' : colors.textTertiary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkName, { color: colors.text }]}>{check.endpointName}</Text>
                    <Text style={[styles.checkUrl, { color: colors.textSecondary }]} numberOfLines={1}>{check.method} {check.url}</Text>
                  </View>
                  <TouchableOpacity style={[styles.pingBtn, { backgroundColor: colors.primary + '18' }]} onPress={() => runCheck(check)}>
                    <MaterialCommunityIcons name="refresh" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => handleDelete(check.id)}>
                    <MaterialCommunityIcons name="close" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('uptime')}</Text>
                    <Text style={[styles.statValue, { color: uptime >= 95 ? '#3FB950' : uptime >= 80 ? '#D29922' : '#FF6961' }]}>{uptime}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('avg')}</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{getAvgTime(check)}ms</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('status')}</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{check.lastStatus || '—'}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('pings')}</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{check.history.length}</Text>
                  </View>
                </View>

                {check.history.length > 0 && (
                  <View style={styles.uptimeBar}>
                    {check.history.slice(0, 30).reverse().map((p, i) => (
                      <View key={i} style={[styles.uptimeTick, { backgroundColor: p.success ? '#3FB950' : '#FF6961' }]} />
                    ))}
                  </View>
                )}

                {incidents.length > 0 && (
                  <View style={[styles.incidentBox, { borderTopColor: colors.divider }]}>
                    <Text style={[styles.incidentTitle, { color: colors.textSecondary }]}>{t('incidents')} ({incidents.length})</Text>
                    {incidents.slice(0, 3).map((inc, i) => (
                      <View key={i} style={styles.incidentRow}>
                        <View style={[styles.incidentDot, { backgroundColor: inc.end ? '#D29922' : '#FF6961' }]} />
                        <Text style={[styles.incidentText, { color: colors.text }]}>{inc.end ? t('resolved') : t('ongoing')} · {Math.round(inc.duration / 1000)}s</Text>
                        <Text style={[styles.incidentDate, { color: colors.textTertiary }]}>{new Date(inc.start).toLocaleTimeString()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: { paddingTop: 16, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2, letterSpacing: -0.2 },
  runAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 6 },
  runAllText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  summaryBar: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  summaryDivider: { width: 1, height: 32 },

  autoCard: { borderRadius: 14, padding: 14 },
  autoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  autoTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  intervalLabel: { fontSize: 13, fontWeight: '500' },
  intervalBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  intervalText: { fontSize: 12, fontWeight: '600' },
  lastRun: { fontSize: 12, marginTop: 8 },

  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', letterSpacing: -0.2, maxWidth: 280 },

  checkCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  checkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  checkName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  checkUrl: { fontSize: 12, marginTop: 2, letterSpacing: -0.1 },
  pingBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '700' },

  uptimeBar: { flexDirection: 'row', gap: 2, marginTop: 12, justifyContent: 'center' },
  uptimeTick: { width: 8, height: 16, borderRadius: 2 },

  incidentBox: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  incidentTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  incidentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  incidentDot: { width: 6, height: 6, borderRadius: 3 },
  incidentText: { fontSize: 13, flex: 1 },
  incidentDate: { fontSize: 12 },
});
