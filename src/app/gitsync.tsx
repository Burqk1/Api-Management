import React, { useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';

interface GitConfig {
  repoUrl: string;
  branch: string;
  token: string;
  autoSync: boolean;
  syncInterval: number;
}

interface SyncLog {
  id: string;
  action: 'push' | 'pull' | 'conflict';
  message: string;
  timestamp: number;
  success: boolean;
}

export default function GitSyncScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [config, setConfig] = useState<GitConfig>({
    repoUrl: '',
    branch: 'main',
    token: '',
    autoSync: false,
    syncInterval: 5,
  });
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const handleConnect = () => {
    if (!config.repoUrl.trim()) {
      Alert.alert('Error', 'Repository URL is required');
      return;
    }
    if (!config.token.trim()) {
      Alert.alert('Error', 'Access token is required');
      return;
    }
    setConnected(true);
    setLogs([{
      id: Date.now().toString(36),
      action: 'pull',
      message: 'Connected to repository',
      timestamp: Date.now(),
      success: true,
    }]);
  };

  const handlePush = async () => {
    setSyncing(true);
    // Simulate push
    await new Promise((r) => setTimeout(r, 1500));
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: collections.map((c) => ({
        ...c,
        endpoints: endpoints.filter((e) => e.collectionId === c.id),
      })),
    };
    setLogs([{
      id: Date.now().toString(36),
      action: 'push',
      message: `Pushed ${collections.length} collections, ${endpoints.length} endpoints`,
      timestamp: Date.now(),
      success: true,
    }, ...logs]);
    setSyncing(false);
    Alert.alert('Success', 'Changes pushed to repository');
  };

  const handlePull = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLogs([{
      id: Date.now().toString(36),
      action: 'pull',
      message: 'Pulled latest changes (already up to date)',
      timestamp: Date.now(),
      success: true,
    }, ...logs]);
    setSyncing(false);
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from this repository?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => { setConnected(false); setLogs([]); } },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('gitSync') || 'Git Sync' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!connected ? (
            <>
              {/* Setup */}
              <View style={[styles.infoBox, { backgroundColor: '#58A6FF12' }]}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#58A6FF" />
                <Text style={{ color: '#58A6FF', fontSize: 13, flex: 1 }}>
                  Connect to a Git repository to version control your collections and sync across devices.
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Repository</Text>
              <View style={[styles.card, { backgroundColor: cardBg, gap: 10, padding: 14 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>REPOSITORY URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={config.repoUrl}
                  onChangeText={(v) => setConfig({ ...config, repoUrl: v })}
                  placeholder="https://github.com/user/api-collections.git"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>BRANCH</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={config.branch}
                  onChangeText={(v) => setConfig({ ...config, branch: v })}
                  placeholder="main"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>ACCESS TOKEN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                  value={config.token}
                  onChangeText={(v) => setConfig({ ...config, token: v })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  secureTextEntry
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Auto Sync</Text>
                  <TouchableOpacity
                    onPress={() => setConfig({ ...config, autoSync: !config.autoSync })}
                    style={[styles.toggle, { backgroundColor: config.autoSync ? colors.primary : colors.textTertiary + '40' }]}
                  >
                    <View style={[styles.toggleThumb, { transform: [{ translateX: config.autoSync ? 18 : 2 }] }]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Providers */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Setup</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {[
                  { name: 'GitHub', icon: 'github', color: '#FFF', bg: '#24292E' },
                  { name: 'GitLab', icon: 'gitlab', color: '#FC6D26', bg: '#FC6D2615' },
                  { name: 'Bitbucket', icon: 'bitbucket', color: '#0052CC', bg: '#0052CC15' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.providerCard, { backgroundColor: cardBg }]}
                    onPress={() => setConfig({ ...config, repoUrl: `https://${p.name.toLowerCase()}.com/user/repo.git` })}
                  >
                    <View style={[styles.providerIcon, { backgroundColor: p.bg }]}>
                      <MaterialCommunityIcons name={p.icon as any} size={24} color={p.color} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: colors.primary, opacity: config.repoUrl && config.token ? 1 : 0.4 }]}
                onPress={handleConnect}
                disabled={!config.repoUrl || !config.token}
              >
                <MaterialCommunityIcons name="git" size={20} color="#FFF" />
                <Text style={styles.connectBtnText}>Connect Repository</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Connected State */}
              <View style={[styles.card, { backgroundColor: cardBg, padding: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.connectedDot, { backgroundColor: '#3FB950' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.repoName, { color: colors.text }]}>{config.repoUrl.split('/').slice(-1)[0].replace('.git', '')}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{config.branch} &middot; Connected</Text>
                  </View>
                  <TouchableOpacity onPress={handleDisconnect}>
                    <MaterialCommunityIcons name="link-variant-off" size={20} color="#FF6961" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sync Actions */}
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
                <TouchableOpacity
                  style={[styles.syncBtn, { backgroundColor: '#3FB95015', flex: 1 }]}
                  onPress={handlePush}
                  disabled={syncing}
                >
                  {syncing ? <ActivityIndicator size="small" color="#3FB950" /> : (
                    <MaterialCommunityIcons name="cloud-upload-outline" size={22} color="#3FB950" />
                  )}
                  <Text style={{ color: '#3FB950', fontWeight: '700' }}>Push</Text>
                  <Text style={{ color: '#3FB95080', fontSize: 11 }}>{collections.length} col, {endpoints.length} ep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.syncBtn, { backgroundColor: '#58A6FF15', flex: 1 }]}
                  onPress={handlePull}
                  disabled={syncing}
                >
                  {syncing ? <ActivityIndicator size="small" color="#58A6FF" /> : (
                    <MaterialCommunityIcons name="cloud-download-outline" size={22} color="#58A6FF" />
                  )}
                  <Text style={{ color: '#58A6FF', fontWeight: '700' }}>Pull</Text>
                  <Text style={{ color: '#58A6FF80', fontSize: 11 }}>Get latest</Text>
                </TouchableOpacity>
              </View>

              {/* Sync Logs */}
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Sync History</Text>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {logs.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No sync history yet</Text>
                ) : (
                  logs.map((log, i) => (
                    <View key={log.id} style={[styles.logRow, i < logs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                      <MaterialCommunityIcons
                        name={log.action === 'push' ? 'arrow-up-circle' : log.action === 'pull' ? 'arrow-down-circle' : 'alert-circle'}
                        size={20}
                        color={log.success ? (log.action === 'push' ? '#3FB950' : '#58A6FF') : '#FF6961'}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{log.message}</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{new Date(log.timestamp).toLocaleString()}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
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
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  providerCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  providerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  connectBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  connectedDot: { width: 10, height: 10, borderRadius: 5 },
  repoName: { fontSize: 16, fontWeight: '700' },
  syncBtn: { borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
