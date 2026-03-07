import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useWorkspaceStore, Workspace } from '../stores/workspaceStore';

const WS_COLORS = ['#58A6FF', '#3FB950', '#D29922', '#BC8CFF', '#FF6961', '#F778BA', '#FF9500', '#64D2FF'];
const WS_ICONS = ['briefcase-outline', 'folder-outline', 'rocket-launch-outline', 'test-tube', 'server-outline', 'shield-lock-outline', 'cellphone-link', 'web'];

export default function WorkspacesScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const router = useRouter();

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(WS_COLORS[0]);
  const [icon, setIcon] = useState(WS_ICONS[0]);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const handleSave = () => {
    if (!name.trim()) return;
    if (editId) {
      updateWorkspace(editId, { name, description, color, icon });
    } else {
      addWorkspace({ name, description, color, icon });
    }
    resetForm();
  };

  const handleEdit = (ws: Workspace) => {
    setEditId(ws.id);
    setName(ws.name);
    setDescription(ws.description);
    setColor(ws.color);
    setIcon(ws.icon);
    setShowForm(true);
  };

  const handleDelete = (ws: Workspace) => {
    Alert.alert(t('delete'), `Delete workspace "${ws.name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteWorkspace(ws.id) },
    ]);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setDescription('');
    setColor(WS_COLORS[0]);
    setIcon(WS_ICONS[0]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('workspaces') || 'Workspaces' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Active Workspace */}
          {workspaces.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.primary + '10', marginBottom: 16 }]}>
              <Text style={[styles.activeLabel, { color: colors.primary }]}>Active Workspace</Text>
              <Text style={[styles.activeName, { color: colors.text }]}>
                {workspaces.find((w) => w.id === activeWorkspaceId)?.name || 'None (All Collections)'}
              </Text>
            </View>
          )}

          {/* Workspace List */}
          {/* "All" option */}
          <TouchableOpacity
            style={[styles.wsCard, { backgroundColor: cardBg, borderColor: !activeWorkspaceId ? colors.primary : 'transparent', borderWidth: 2 }]}
            onPress={() => setActiveWorkspace(null)}
          >
            <View style={[styles.wsIcon, { backgroundColor: colors.textTertiary + '20' }]}>
              <MaterialCommunityIcons name="infinity" size={24} color={colors.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.wsName, { color: colors.text }]}>All Collections</Text>
              <Text style={[styles.wsDesc, { color: colors.textSecondary }]}>Show all collections across workspaces</Text>
            </View>
            {!activeWorkspaceId && (
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          {workspaces.map((ws) => (
            <TouchableOpacity
              key={ws.id}
              style={[styles.wsCard, { backgroundColor: cardBg, borderColor: activeWorkspaceId === ws.id ? ws.color : 'transparent', borderWidth: 2 }]}
              onPress={() => setActiveWorkspace(ws.id)}
              onLongPress={() => handleEdit(ws)}
            >
              <View style={[styles.wsIcon, { backgroundColor: ws.color + '20' }]}>
                <MaterialCommunityIcons name={ws.icon as any} size={24} color={ws.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.wsName, { color: colors.text }]}>{ws.name}</Text>
                {ws.description ? (
                  <Text style={[styles.wsDesc, { color: colors.textSecondary }]} numberOfLines={1}>{ws.description}</Text>
                ) : null}
              </View>
              {activeWorkspaceId === ws.id && (
                <MaterialCommunityIcons name="check-circle" size={22} color={ws.color} />
              )}
              <TouchableOpacity onPress={() => handleDelete(ws)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Add/Edit Form */}
          {showForm ? (
            <View style={[styles.card, { backgroundColor: cardBg, marginTop: 16 }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editId ? 'Edit Workspace' : 'New Workspace'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Workspace name"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, marginTop: 8 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Color */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Color</Text>
              <View style={styles.colorRow}>
                {WS_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#FFF' }]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>

              {/* Icon */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconRow}>
                {WS_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconBtn, { backgroundColor: icon === ic ? color + '20' : 'transparent' }]}
                    onPress={() => setIcon(ic)}
                  >
                    <MaterialCommunityIcons name={ic as any} size={22} color={icon === ic ? color : colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: inputBg }]} onPress={resetForm}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.4 }]}
                  onPress={handleSave}
                  disabled={!name.trim()}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary + '15', marginTop: 16 }]}
              onPress={() => setShowForm(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>New Workspace</Text>
            </TouchableOpacity>
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
  card: { borderRadius: 14, padding: 14 },
  activeLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  activeName: { fontSize: 18, fontWeight: '700' },
  wsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 8 },
  wsIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wsName: { fontSize: 16, fontWeight: '700' },
  wsDesc: { fontSize: 13, marginTop: 2 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 15 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  iconRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { fontSize: 16, fontWeight: '700' },
});
