import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { generateId, METHOD_COLORS } from '../types/api';

interface EndpointRunResult {
  endpointId: string;
  endpointName: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

interface ScheduleRun {
  timestamp: number;
  passed: number;
  failed: number;
  total: number;
  results: EndpointRunResult[];
}

interface ScheduledJob {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  intervalMs: number;
  intervalLabel: string;
  enabled: boolean;
  createdAt: number;
  lastRun?: ScheduleRun;
  nextRunAt?: number;
}

const STORAGE_KEY = 'scheduled_runs';

const INTERVAL_OPTIONS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 h', ms: 60 * 60 * 1000 },
  { label: '6 h', ms: 6 * 60 * 60 * 1000 },
  { label: '12 h', ms: 12 * 60 * 60 * 1000 },
  { label: '24 h', ms: 24 * 60 * 60 * 1000 },
];

export default function ScheduledRunsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const getEndpointsByCollection = useApiStore((s) => s.getEndpointsByCollection);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [schedules, setSchedules] = useState<ScheduledJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCollectionId, setFormCollectionId] = useState('');
  const [formInterval, setFormInterval] = useState(INTERVAL_OPTIONS[0]);
  const [formEnabled, setFormEnabled] = useState(true);

  const schedulesRef = useRef<ScheduledJob[]>(schedules);
  schedulesRef.current = schedules;

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  // Load schedules from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setSchedules(JSON.parse(raw));
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Persist whenever schedules change
  const persistSchedules = useCallback((data: ScheduledJob[]) => {
    setSchedules(data);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  // Execute all endpoints in a collection
  const runCollection = useCallback(
    async (collectionId: string): Promise<ScheduleRun> => {
      const eps = endpoints.filter((e) => e.collectionId === collectionId);
      const results: EndpointRunResult[] = [];

      for (const ep of eps) {
        const start = Date.now();
        try {
          const url = resolveVariables(ep.url);
          const headers: Record<string, string> = {};
          ep.headers.forEach((h) => {
            if (h.enabled) {
              headers[resolveVariables(h.key)] = resolveVariables(h.value);
            }
          });

          if (ep.bodyType === 'json' || (!ep.bodyType && ep.body)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
          }

          const fetchOptions: RequestInit = {
            method: ep.method,
            headers,
          };

          if (ep.method !== 'GET' && ep.method !== 'HEAD' && ep.body) {
            fetchOptions.body = resolveVariables(ep.body);
          }

          const res = await fetch(url, fetchOptions);
          const elapsed = Date.now() - start;

          results.push({
            endpointId: ep.id,
            endpointName: ep.name,
            method: ep.method,
            url,
            statusCode: res.status,
            responseTime: elapsed,
            success: res.status >= 200 && res.status < 400,
          });
        } catch (err: any) {
          results.push({
            endpointId: ep.id,
            endpointName: ep.name,
            method: ep.method,
            url: ep.url,
            statusCode: 0,
            responseTime: Date.now() - start,
            success: false,
            error: err.message,
          });
        }
      }

      return {
        timestamp: Date.now(),
        passed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        total: results.length,
        results,
      };
    },
    [endpoints, resolveVariables]
  );

  // Scheduler: check every 15 seconds if a schedule is due
  useEffect(() => {
    if (!loaded) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const current = schedulesRef.current;
      let changed = false;

      const updated = current.map((job) => {
        if (!job.enabled) return job;
        if (job.nextRunAt && job.nextRunAt <= now) {
          changed = true;
          // Trigger async run (fire and forget for the interval handler)
          runCollection(job.collectionId).then((result) => {
            setSchedules((prev) => {
              const next = prev.map((j) =>
                j.id === job.id
                  ? { ...j, lastRun: result, nextRunAt: Date.now() + j.intervalMs }
                  : j
              );
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              return next;
            });
          });
          // Mark as running so we don't re-trigger
          return { ...job, nextRunAt: now + job.intervalMs + 60000 };
        }
        return job;
      });

      if (changed) {
        schedulesRef.current = updated;
        setSchedules(updated);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [loaded, runCollection]);

  const handleCreate = () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a schedule name.');
      return;
    }
    if (!formCollectionId) {
      Alert.alert('Error', 'Please select a collection.');
      return;
    }

    const col = collections.find((c) => c.id === formCollectionId);
    const newJob: ScheduledJob = {
      id: generateId(),
      name: formName.trim(),
      collectionId: formCollectionId,
      collectionName: col?.name || 'Unknown',
      intervalMs: formInterval.ms,
      intervalLabel: formInterval.label,
      enabled: formEnabled,
      createdAt: Date.now(),
      nextRunAt: formEnabled ? Date.now() + formInterval.ms : undefined,
    };

    const updated = [...schedules, newJob];
    persistSchedules(updated);

    // Reset form
    setFormName('');
    setFormCollectionId('');
    setFormInterval(INTERVAL_OPTIONS[0]);
    setFormEnabled(true);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('delete') || 'Delete',
      t('deleteScheduleConfirm') || 'Are you sure you want to delete this schedule?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = schedules.filter((s) => s.id !== id);
            persistSchedules(updated);
          },
        },
      ]
    );
  };

  const handleToggle = (id: string, enabled: boolean) => {
    const updated = schedules.map((s) =>
      s.id === id
        ? {
            ...s,
            enabled,
            nextRunAt: enabled ? Date.now() + s.intervalMs : undefined,
          }
        : s
    );
    persistSchedules(updated);
  };

  const handleRunNow = async (job: ScheduledJob) => {
    setRunningId(job.id);
    try {
      const result = await runCollection(job.collectionId);
      const updated = schedules.map((s) =>
        s.id === job.id
          ? { ...s, lastRun: result, nextRunAt: s.enabled ? Date.now() + s.intervalMs : undefined }
          : s
      );
      persistSchedules(updated);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setRunningId(null);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '--';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  return (
    <>
      <Stack.Screen options={{ title: t('scheduledRuns') || 'Scheduled Runs' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('scheduledRuns') || 'Scheduled Runs'}
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(!showForm)}
            >
              <MaterialCommunityIcons
                name={showForm ? 'close' : 'plus'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.addBtnText}>
                {showForm ? (t('cancel') || 'Cancel') : (t('newSchedule') || 'New Schedule')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create Form */}
          {showForm && (
            <View style={[styles.card, { backgroundColor: cardBg, marginBottom: 16 }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('scheduleName') || 'Schedule Name'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('scheduleNamePlaceholder') || 'e.g. Nightly API Health Check'}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
                {t('collection') || 'Collection'}
              </Text>
              {collections.length === 0 ? (
                <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                  {t('noCollections') || 'No collections available. Create one first.'}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {collections.map((col) => (
                      <TouchableOpacity
                        key={col.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              formCollectionId === col.id ? colors.primary + '20' : inputBg,
                            borderColor:
                              formCollectionId === col.id ? colors.primary : 'transparent',
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => setFormCollectionId(col.id)}
                      >
                        <View style={[styles.colDot, { backgroundColor: col.color || colors.primary }]} />
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color:
                                formCollectionId === col.id ? colors.primary : colors.text,
                            },
                          ]}
                        >
                          {col.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
                {t('interval') || 'Interval'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            formInterval.label === opt.label ? colors.primary + '20' : inputBg,
                          borderColor:
                            formInterval.label === opt.label ? colors.primary : 'transparent',
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => setFormInterval(opt)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              formInterval.label === opt.label ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  {t('enabled') || 'Enabled'}
                </Text>
                <Switch
                  value={formEnabled}
                  onValueChange={setFormEnabled}
                  trackColor={{ false: colors.systemGray4, true: colors.primary + '60' }}
                  thumbColor={formEnabled ? colors.primary : '#CCC'}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFF" />
                <Text style={styles.sendText}>
                  {t('createSchedule') || 'Create Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Schedules List */}
          {!loaded ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : schedules.length === 0 && !showForm ? (
            <View style={[styles.card, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 40 }]}>
              <MaterialCommunityIcons name="calendar-clock" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('noSchedules') || 'No Scheduled Runs'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                {t('noSchedulesHint') || 'Create a schedule to automatically run all endpoints in a collection at a fixed interval.'}
              </Text>
            </View>
          ) : (
            schedules.map((job) => {
              const isRunning = runningId === job.id;
              const lastRun = job.lastRun;
              const hasFailures = lastRun && lastRun.failed > 0;
              const allPassed = lastRun && lastRun.failed === 0 && lastRun.total > 0;

              return (
                <View
                  key={job.id}
                  style={[styles.card, { backgroundColor: cardBg, marginBottom: 12 }]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                      <View style={styles.jobMetaRow}>
                        <MaterialCommunityIcons
                          name="folder-outline"
                          size={14}
                          color={colors.textTertiary}
                        />
                        <Text style={[styles.jobMetaText, { color: colors.textTertiary }]}>
                          {job.collectionName}
                        </Text>
                        <View style={styles.metaDot} />
                        <MaterialCommunityIcons
                          name="timer-outline"
                          size={14}
                          color={colors.textTertiary}
                        />
                        <Text style={[styles.jobMetaText, { color: colors.textTertiary }]}>
                          {t('every') || 'Every'} {job.intervalLabel}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={job.enabled}
                      onValueChange={(val) => handleToggle(job.id, val)}
                      trackColor={{ false: colors.systemGray4, true: colors.primary + '60' }}
                      thumbColor={job.enabled ? colors.primary : '#CCC'}
                    />
                  </View>

                  {/* Timing Info */}
                  <View style={[styles.timingRow, { borderTopColor: colors.divider }]}>
                    <View style={styles.timingItem}>
                      <Text style={[styles.timingLabel, { color: colors.textTertiary }]}>
                        {t('lastRun') || 'Last Run'}
                      </Text>
                      <Text style={[styles.timingValue, { color: colors.text }]}>
                        {formatTime(lastRun?.timestamp)}
                      </Text>
                    </View>
                    <View style={styles.timingItem}>
                      <Text style={[styles.timingLabel, { color: colors.textTertiary }]}>
                        {t('nextRun') || 'Next Run'}
                      </Text>
                      <Text style={[styles.timingValue, { color: colors.text }]}>
                        {job.enabled ? formatTime(job.nextRunAt) : '--'}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  {lastRun && (
                    <View style={[styles.statusRow, { borderTopColor: colors.divider }]}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: allPassed
                              ? '#3FB95020'
                              : hasFailures
                              ? '#FF696120'
                              : colors.systemGray5,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={allPassed ? 'check-circle' : 'alert-circle'}
                          size={16}
                          color={allPassed ? '#3FB950' : '#FF6961'}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: allPassed ? '#3FB950' : '#FF6961' },
                          ]}
                        >
                          {lastRun.passed}/{lastRun.total} {t('passed') || 'passed'}
                        </Text>
                      </View>

                      {lastRun.results && lastRun.results.length > 0 && (
                        <Text style={[styles.avgTime, { color: colors.textTertiary }]}>
                          {t('avg') || 'avg'}{' '}
                          {Math.round(
                            lastRun.results.reduce((s, r) => s + r.responseTime, 0) /
                              lastRun.results.length
                          )}
                          ms
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Last Run Results (collapsed preview) */}
                  {lastRun && lastRun.results.length > 0 && (
                    <View style={[styles.resultsPreview, { borderTopColor: colors.divider }]}>
                      {lastRun.results.slice(0, 5).map((r, idx) => (
                        <View
                          key={r.endpointId + idx}
                          style={[
                            styles.resultRow,
                            idx < Math.min(lastRun.results.length, 5) - 1 && {
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: colors.divider,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.methodBadge,
                              { backgroundColor: (METHOD_COLORS[r.method as keyof typeof METHOD_COLORS] || '#8B949E') + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.methodText,
                                { color: METHOD_COLORS[r.method as keyof typeof METHOD_COLORS] || '#8B949E' },
                              ]}
                            >
                              {r.method}
                            </Text>
                          </View>
                          <Text
                            style={[styles.resultName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {r.endpointName}
                          </Text>
                          <Text
                            style={[
                              styles.resultStatus,
                              { color: r.success ? '#3FB950' : '#FF6961' },
                            ]}
                          >
                            {r.statusCode || 'ERR'}
                          </Text>
                          <Text style={[styles.resultTime, { color: colors.textTertiary }]}>
                            {r.responseTime}ms
                          </Text>
                        </View>
                      ))}
                      {lastRun.results.length > 5 && (
                        <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                          +{lastRun.results.length - 5} {t('more') || 'more'}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={[styles.actionRow, { borderTopColor: colors.divider }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                      onPress={() => handleRunNow(job)}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <MaterialCommunityIcons name="play" size={18} color={colors.primary} />
                      )}
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                        {isRunning
                          ? t('running') || 'Running...'
                          : t('runNow') || 'Run Now'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#FF696115' }]}
                      onPress={() => handleDelete(job.id)}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={18} color="#FF6961" />
                      <Text style={[styles.actionBtnText, { color: '#FF6961' }]}>
                        {t('delete') || 'Delete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Info Card */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {t('aboutScheduledRuns') || 'About Scheduled Runs'}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('aboutScheduledRunsDesc') ||
                'Scheduled runs execute all endpoints in a collection at fixed intervals while the app is open. The scheduler checks for due jobs every 15 seconds. Results are persisted locally. Note: schedules only run while the app is active in the foreground.'}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  card: { borderRadius: 14, padding: 14 },
  input: { borderRadius: 10, padding: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6 },
  chipText: { fontSize: 14, fontWeight: '600' },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  sendText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  jobName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  jobMetaText: { fontSize: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#8B949E', marginHorizontal: 4 },
  timingRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  timingItem: { flex: 1 },
  timingLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  timingValue: { fontSize: 13, fontWeight: '500' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  avgTime: { fontSize: 12 },
  resultsPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  methodText: { fontSize: 10, fontWeight: '800' },
  resultName: { flex: 1, fontSize: 13, fontWeight: '500' },
  resultStatus: { fontSize: 13, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  resultTime: { fontSize: 11, minWidth: 48, textAlign: 'right' },
  moreText: { fontSize: 12, textAlign: 'center', paddingVertical: 4 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },
});
