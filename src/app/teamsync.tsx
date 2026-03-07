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
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useAuthStore } from '../stores/authStore';
import { useApiStore } from '../stores/apiStore';
import * as Clipboard from 'expo-clipboard';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  joinedAt: number;
}

const ROLES = [
  { value: 'admin' as const, label: 'Admin', desc: 'Full access, manage members', icon: 'shield-account', color: '#FF9500' },
  { value: 'editor' as const, label: 'Editor', desc: 'Edit collections & endpoints', icon: 'pencil-outline', color: '#58A6FF' },
  { value: 'viewer' as const, label: 'Viewer', desc: 'View only access', icon: 'eye-outline', color: '#8B949E' },
];

export default function TeamSyncScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const collections = useApiStore((s) => s.collections);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [members, setMembers] = useState<TeamMember[]>([
    { id: '1', email: user?.email || 'you@example.com', role: 'owner', status: 'active', joinedAt: Date.now() },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [showInvite, setShowInvite] = useState(false);
  const [sharedCollections, setSharedCollections] = useState<Set<string>>(new Set());

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (members.find((m) => m.email === inviteEmail.trim())) {
      Alert.alert('Error', 'This member already exists');
      return;
    }
    setMembers([...members, {
      id: Date.now().toString(36),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'pending',
      joinedAt: Date.now(),
    }]);
    setInviteEmail('');
    setShowInvite(false);
    Alert.alert('Invited', `Invitation sent to ${inviteEmail.trim()}`);
  };

  const removeMember = (id: string) => {
    Alert.alert('Remove Member', 'Remove this team member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMembers(members.filter((m) => m.id !== id)) },
    ]);
  };

  const toggleShareCollection = (colId: string) => {
    const next = new Set(sharedCollections);
    if (next.has(colId)) next.delete(colId);
    else next.add(colId);
    setSharedCollections(next);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('teamSync') || 'Team Sync' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Team Info */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.teamHeader}>
              <View style={[styles.teamIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons name="account-group" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teamName, { color: colors.text }]}>My Team</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {members.length} member{members.length > 1 ? 's' : ''} &middot; {sharedCollections.size} shared collection{sharedCollections.size !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Members */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Members</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setShowInvite(!showInvite)}
            >
              <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Invite</Text>
            </TouchableOpacity>
          </View>

          {showInvite && (
            <View style={[styles.card, { backgroundColor: cardBg, gap: 10 }]}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="team@example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setInviteRole(r.value)}
                    style={[styles.roleChip, { backgroundColor: inviteRole === r.value ? r.color + '20' : inputBg }]}
                  >
                    <MaterialCommunityIcons name={r.icon as any} size={14} color={inviteRole === r.value ? r.color : colors.textSecondary} />
                    <Text style={{ color: inviteRole === r.value ? r.color : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.sendInviteBtn, { backgroundColor: colors.primary }]}
                onPress={handleInvite}
              >
                <MaterialCommunityIcons name="send-outline" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {members.map((member, i) => (
              <View
                key={member.id}
                style={[styles.memberRow, i < members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
              >
                <View style={[styles.avatar, { backgroundColor: member.role === 'owner' ? '#FFD60A20' : colors.primary + '15' }]}>
                  <Text style={{ color: member.role === 'owner' ? '#FFD60A' : colors.primary, fontWeight: '800', fontSize: 14 }}>
                    {member.email[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberEmail, { color: colors.text }]}>{member.email}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: colors.textTertiary, fontSize: 12, textTransform: 'capitalize' }}>{member.role}</Text>
                    {member.status === 'pending' && (
                      <View style={[styles.pendingBadge, { backgroundColor: '#FF950020' }]}>
                        <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '700' }}>Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
                {member.role !== 'owner' && (
                  <TouchableOpacity onPress={() => removeMember(member.id)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Shared Collections */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Shared Collections</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10 }}>
            Toggle collections to share with your team members.
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {collections.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No collections yet</Text>
            ) : (
              collections.map((col, i) => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.memberRow, i < collections.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  onPress={() => toggleShareCollection(col.id)}
                >
                  <View style={[styles.colDot, { backgroundColor: col.color }]} />
                  <Text style={[styles.memberEmail, { color: colors.text, flex: 1 }]}>{col.name}</Text>
                  <MaterialCommunityIcons
                    name={sharedCollections.has(col.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={sharedCollections.has(col.id) ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Activity Feed */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Activity</Text>
          <View style={[styles.card, { backgroundColor: cardBg, padding: 20, alignItems: 'center', gap: 8 }]}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={40} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Team activity feed will appear here when members make changes.
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
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  teamIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontSize: 18, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flex: 1, justifyContent: 'center' },
  sendInviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberEmail: { fontSize: 14, fontWeight: '600' },
  pendingBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  colDot: { width: 12, height: 12, borderRadius: 6 },
});
