import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useOfflineStore } from '../stores/offlineStore';
import { useApiStore } from '../stores/apiStore';

interface NetworkInfo {
  type: string;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  details: any;
}

interface PingResult {
  url: string;
  reachable: boolean;
  time: number;
}

export default function NetworkStatusScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queue = useOfflineStore((s) => s.queue);
  const callLogs = useApiStore((s) => s.callLogs);

  const [netInfo, setNetInfo] = useState<NetworkInfo>({
    type: 'unknown',
    isConnected: isOnline,
    isInternetReachable: null,
    details: null,
  });
  const [pingResults, setPingResults] = useState<PingResult[]>([]);
  const [pinging, setPinging] = useState(false);
  const [history, setHistory] = useState<{ time: number; online: boolean }[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetInfo({
        type: state.type,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      });
      setHistory((h) => [...h, { time: Date.now(), online: state.isConnected ?? false }].slice(-20));
    });
    return () => unsubscribe();
  }, []);

  const pingUrls = async () => {
    setPinging(true);
    const targets = [
      'https://httpbin.org/get',
      'https://api.github.com',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://google.com',
    ];

    const results: PingResult[] = [];
    for (const url of targets) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        results.push({ url, reachable: true, time: Date.now() - start });
      } catch {
        results.push({ url, reachable: false, time: Date.now() - start });
      }
    }
    setPingResults(results);
    setPinging(false);
  };

  const queuedCount = queue.filter((r) => r.status === 'queued').length;
  const failedCount = queue.filter((r) => r.status === 'failed').length;
  const recentErrors = callLogs.filter((l) => l.statusCode >= 500 && Date.now() - l.timestamp < 3600000).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wifi': return 'wifi';
      case 'cellular': return 'signal-cellular-3';
      case 'ethernet': return 'ethernet';
      case 'bluetooth': return 'bluetooth';
      default: return 'help-network-outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'wifi': return 'Wi-Fi';
      case 'cellular': return 'Cellular';
      case 'ethernet': return 'Ethernet';
      case 'bluetooth': return 'Bluetooth';
      case 'none': return 'No Connection';
      default: return 'Unknown';
    }
  };

  const statusColor = netInfo.isConnected ? '#3FB950' : '#FF6961';
  const reachableColor = netInfo.isInternetReachable === true ? '#3FB950' : netInfo.isInternetReachable === false ? '#FF6961' : '#FFD60A';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Network Status', headerBackTitle: t('cancel') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Main Status */}
        <View style={[styles.statusCard, { backgroundColor: statusColor + '12' }]}>
          <MaterialCommunityIcons
            name={netInfo.isConnected ? 'check-network-outline' : 'close-network-outline'}
            size={48}
            color={statusColor}
          />
          <Text style={[styles.statusTitle, { color: statusColor }]}>
            {netInfo.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <Text style={{ color: statusColor, fontSize: 13, opacity: 0.8 }}>
            {netInfo.isConnected ? 'Your device is connected to the network' : 'No network connection detected'}
          </Text>
        </View>

        {/* Connection Details */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connection Details</Text>
          {[
            { label: 'Connection Type', value: getTypeLabel(netInfo.type), icon: getTypeIcon(netInfo.type), color: '#58A6FF' },
            { label: 'Connected', value: netInfo.isConnected ? 'Yes' : 'No', icon: netInfo.isConnected ? 'check-circle' : 'close-circle', color: statusColor },
            { label: 'Internet Reachable', value: netInfo.isInternetReachable === true ? 'Yes' : netInfo.isInternetReachable === false ? 'No' : 'Checking...', icon: 'earth', color: reachableColor },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>{item.label}</Text>
                <Text style={{ color: item.color, fontSize: 14, fontWeight: '700' }}>{item.value}</Text>
              </View>
            </React.Fragment>
          ))}

          {netInfo.details && netInfo.type === 'wifi' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="wifi-strength-4" size={20} color="#58A6FF" />
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>SSID</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {netInfo.details.ssid || 'Unknown'}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="signal-variant" size={20} color="#58A6FF" />
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>Strength</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {netInfo.details.strength != null ? `${netInfo.details.strength}%` : 'N/A'}
                </Text>
              </View>
            </>
          )}

          {netInfo.details && netInfo.type === 'cellular' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="signal-cellular-3" size={20} color="#58A6FF" />
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>Generation</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {netInfo.details.cellularGeneration || 'Unknown'}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="antenna" size={20} color="#58A6FF" />
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>Carrier</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {netInfo.details.carrier || 'Unknown'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Queue Status */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Queue</Text>
          <View style={styles.queueGrid}>
            <View style={[styles.queueItem, { backgroundColor: '#FFD60A18' }]}>
              <Text style={[styles.queueValue, { color: '#FFD60A' }]}>{queuedCount}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Queued</Text>
            </View>
            <View style={[styles.queueItem, { backgroundColor: '#FF696118' }]}>
              <Text style={[styles.queueValue, { color: '#FF6961' }]}>{failedCount}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Failed</Text>
            </View>
            <View style={[styles.queueItem, { backgroundColor: '#FF950018' }]}>
              <Text style={[styles.queueValue, { color: '#FF9500' }]}>{recentErrors}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11 }}>5xx (1h)</Text>
            </View>
          </View>
        </View>

        {/* Ping Test */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.pingHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Connectivity Test</Text>
            <TouchableOpacity
              style={[styles.pingBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={pingUrls}
              disabled={pinging}
            >
              <MaterialCommunityIcons name={pinging ? 'loading' : 'play'} size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                {pinging ? 'Testing...' : 'Run Test'}
              </Text>
            </TouchableOpacity>
          </View>

          {pingResults.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {pingResults.map((r) => {
                let host = '';
                try { host = new URL(r.url).hostname; } catch { host = r.url; }
                return (
                  <View key={r.url} style={styles.pingRow}>
                    <MaterialCommunityIcons
                      name={r.reachable ? 'check-circle' : 'close-circle'}
                      size={18}
                      color={r.reachable ? '#3FB950' : '#FF6961'}
                    />
                    <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{host}</Text>
                    <Text style={{ color: r.reachable ? '#3FB950' : '#FF6961', fontSize: 12, fontWeight: '600' }}>
                      {r.reachable ? `${r.time}ms` : 'Failed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {pingResults.length === 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 8 }}>
              Tap "Run Test" to check connectivity to popular endpoints
            </Text>
          )}
        </View>

        {/* Connection History */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Connection History</Text>
            <View style={styles.historyRow}>
              {history.map((h, i) => (
                <View
                  key={i}
                  style={[styles.historyDot, { backgroundColor: h.online ? '#3FB950' : '#FF6961' }]}
                />
              ))}
            </View>
            <View style={styles.historyLabels}>
              <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Oldest</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 10 }}>Now</Text>
            </View>
          </View>
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
  statusCard: { borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginBottom: 16 },
  statusTitle: { fontSize: 24, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  queueGrid: { flexDirection: 'row', gap: 8 },
  queueItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  queueValue: { fontSize: 22, fontWeight: '800' },
  pingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
