import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useOfflineStore } from '../stores/offlineStore';
import { METHOD_COLORS } from '../types/api';

export default function OfflineQueueScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { queue, isOnline, processQueue, removeFromQueue, clearQueue } = useOfflineStore();

  const inputBg = isDark ? colors.surface : colors.card;
  const pending = queue.filter((r) => r.status === 'queued');
  const sent = queue.filter((r) => r.status === 'sent');
  const failed = queue.filter((r) => r.status === 'failed');

  const statusColor = (s: string) =>
    s === 'queued' ? '#D29922' : s === 'sending' ? '#58A6FF' : s === 'sent' ? '#3FB950' : '#FF6961';
  const statusIcon = (s: string) =>
    s === 'queued' ? 'clock-outline' : s === 'sending' ? 'loading' : s === 'sent' ? 'check-circle' : 'alert-circle';

  return (
    <>
      <Stack.Screen options={{ title: t('offlineQueue') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Status */}
          <View style={[styles.statusCard, { backgroundColor: inputBg, marginTop: 12 }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#3FB950' : '#FF6961' }]} />
            <Text style={[styles.statusLabel, { color: colors.text }]}>
              {isOnline ? t('online') : t('offline')}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {pending.length} {t('pending').toLowerCase()} · {sent.length} {t('passed').toLowerCase()} · {failed.length} {t('failed').toLowerCase()}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: pending.length > 0 && isOnline ? 1 : 0.4 }]}
              onPress={processQueue}
              disabled={pending.length === 0 || !isOnline}
            >
              <MaterialCommunityIcons name="play" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('processQueue')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FF696120', opacity: queue.length > 0 ? 1 : 0.4 }]}
              onPress={() => {
                Alert.alert(t('clearQueue'), t('clearCallLogsConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('clear'), style: 'destructive', onPress: clearQueue },
                ]);
              }}
              disabled={queue.length === 0}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6961" />
              <Text style={[styles.actionBtnText, { color: '#FF6961' }]}>{t('clearQueue')}</Text>
            </TouchableOpacity>
          </View>

          {/* Queue List */}
          {queue.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: inputBg }]}>
              <MaterialCommunityIcons name="cloud-check-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noQueuedRequests')}</Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: inputBg }]}>
              {queue.map((req, i) => (
                <View
                  key={req.id}
                  style={[
                    styles.queueRow,
                    i < queue.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                >
                  <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[req.method] + '20' }]}>
                    <Text style={[styles.methodText, { color: METHOD_COLORS[req.method] }]}>{req.method}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reqName, { color: colors.text }]} numberOfLines={1}>{req.endpointName}</Text>
                    <Text style={[styles.reqUrl, { color: colors.textTertiary }]} numberOfLines={1}>{req.url}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialCommunityIcons name={statusIcon(req.status) as any} size={14} color={statusColor(req.status)} />
                      <Text style={[styles.statusBadge, { color: statusColor(req.status) }]}>{req.status}</Text>
                    </View>
                    <Text style={[styles.queueTime, { color: colors.textTertiary }]}>
                      {new Date(req.queuedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  {(req.status === 'queued' || req.status === 'failed') && (
                    <TouchableOpacity onPress={() => removeFromQueue(req.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {failed.length > 0 && (
            <View style={[styles.hintCard, { backgroundColor: '#FF696112', marginTop: 12 }]}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#FF6961" />
              <Text style={[styles.hintText, { color: '#FF6961' }]}>
                {failed.length} request(s) failed. Remove them or retry when online.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  countText: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 10, marginTop: 20 },
  emptyText: { fontSize: 14 },
  listCard: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  queueRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, minWidth: 42, alignItems: 'center' },
  methodText: { fontSize: 10, fontWeight: '700' },
  reqName: { fontSize: 14, fontWeight: '600' },
  reqUrl: { fontSize: 12, marginTop: 1 },
  statusBadge: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  queueTime: { fontSize: 11 },
  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12,
  },
  hintText: { fontSize: 13, flex: 1 },
});
