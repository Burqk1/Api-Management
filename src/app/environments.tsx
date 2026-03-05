import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useEnvironmentStore, Environment } from '../stores/environmentStore';

const ENV_COLORS = ['#3FB950', '#58A6FF', '#D29922', '#FF6961', '#BC8CFF', '#F778BA'];

export default function EnvironmentsScreen() {
  const { colors, isDark } = useTheme();
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvId = useEnvironmentStore((s) => s.activeEnvId);
  const addEnvironment = useEnvironmentStore((s) => s.addEnvironment);
  const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
  const deleteEnvironment = useEnvironmentStore((s) => s.deleteEnvironment);
  const setActiveEnv = useEnvironmentStore((s) => s.setActiveEnv);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ENV_COLORS[0]);
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const padding = Platform.OS === 'web' ? 32 : 20;
  const inputBg = isDark ? colors.surface : colors.card;

  const startEdit = (env: Environment) => {
    setEditingId(env.id);
    setName(env.name);
    setColor(env.color);
    setVariables([...env.variables]);
    setShowAdd(true);
  };

  const reset = () => {
    setShowAdd(false);
    setEditingId(null);
    setName('');
    setColor(ENV_COLORS[0]);
    setVariables([]);
    setNewKey('');
    setNewValue('');
  };

  const addVar = () => {
    if (!newKey.trim()) return;
    setVariables([...variables, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
  };

  const removeVar = (i: number) => setVariables(variables.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateEnvironment(editingId, { name: name.trim(), color, variables });
    } else {
      addEnvironment({ name: name.trim(), color, variables });
    }
    reset();
  };

  const handleDelete = (id: string, envName: string) => {
    Alert.alert('Delete Environment', `Delete "${envName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEnvironment(id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { maxWidth: 600, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Active Env Selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACTIVE ENVIRONMENT</Text>
        <View style={[styles.card, { backgroundColor: inputBg }]}>
          <TouchableOpacity
            style={[styles.envOption, activeEnvId === null && styles.envOptionActive]}
            onPress={() => setActiveEnv(null)}
          >
            <View style={[styles.envDot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.envOptionText, { color: activeEnvId === null ? colors.text : colors.textSecondary }]}>
              None
            </Text>
            {activeEnvId === null && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
          </TouchableOpacity>
          {environments.map((env) => (
            <TouchableOpacity
              key={env.id}
              style={[styles.envOption, activeEnvId === env.id && styles.envOptionActive]}
              onPress={() => setActiveEnv(env.id)}
            >
              <View style={[styles.envDot, { backgroundColor: env.color }]} />
              <Text style={[styles.envOptionText, { color: activeEnvId === env.id ? colors.text : colors.textSecondary }]}>
                {env.name}
              </Text>
              <Text style={[styles.envVarCount, { color: colors.textTertiary }]}>
                {env.variables.length} vars
              </Text>
              {activeEnvId === env.id && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Environment List */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ENVIRONMENTS</Text>
        {environments.map((env) => (
          <View key={env.id} style={[styles.envCard, { backgroundColor: inputBg }]}>
            <View style={styles.envHeader}>
              <View style={[styles.envIconBig, { backgroundColor: env.color + '20' }]}>
                <MaterialCommunityIcons name="server-network" size={20} color={env.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.envName, { color: colors.text }]}>{env.name}</Text>
                <Text style={[styles.envMeta, { color: colors.textTertiary }]}>{env.variables.length} variables</Text>
              </View>
              <TouchableOpacity onPress={() => startEdit(env)} style={{ marginRight: 8 }}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(env.id, env.name)}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
            {env.variables.length > 0 && (
              <View style={[styles.varsTable, { borderTopColor: colors.divider }]}>
                {env.variables.map((v, i) => (
                  <View key={i} style={styles.varRow}>
                    <Text style={[styles.varKey, { color: colors.primary }]}>{`{{${v.key}}}`}</Text>
                    <Text style={[styles.varValue, { color: colors.text }]} numberOfLines={1}>{v.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Add/Edit Form */}
        {showAdd ? (
          <View style={[styles.formCard, { backgroundColor: inputBg }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Edit Environment' : 'New Environment'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Environment Name (e.g. Production)"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.colorRow}>
              {ENV_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                />
              ))}
            </View>

            <Text style={[styles.varsTitle, { color: colors.textSecondary }]}>Variables</Text>
            {variables.map((v, i) => (
              <View key={i} style={styles.varEditRow}>
                <Text style={[styles.varEditKey, { color: colors.primary }]}>{v.key}</Text>
                <Text style={[styles.varEditVal, { color: colors.text }]}>{v.value}</Text>
                <TouchableOpacity onPress={() => removeVar(i)}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addVarRow}>
              <TextInput
                style={[styles.varInput, { backgroundColor: colors.background, color: colors.text }]}
                value={newKey}
                onChangeText={setNewKey}
                placeholder="KEY"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.varInput, { backgroundColor: colors.background, color: colors.text, flex: 2 }]}
                value={newValue}
                onChangeText={setNewValue}
                placeholder="Value"
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity onPress={addVar} style={[styles.addVarBtn, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.systemGray5 }]} onPress={reset}>
                <Text style={[styles.formBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={[styles.formBtnText, { color: '#FFF' }]}>
                  {editingId ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addEnvBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAdd(true)}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.addEnvBtnText}>New Environment</Text>
          </TouchableOpacity>
        )}

        {/* Usage hint */}
        <View style={[styles.hintCard, { backgroundColor: isDark ? '#58A6FF10' : '#58A6FF08' }]}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#58A6FF" />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Use {'{{VARIABLE_NAME}}'} in your endpoint URLs, headers, and body to reference environment variables.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 16, paddingBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '500', letterSpacing: 0.5, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  envOption: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  envOptionActive: {},
  envDot: { width: 10, height: 10, borderRadius: 5 },
  envOptionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  envVarCount: { fontSize: 13 },

  envCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  envHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  envIconBig: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  envName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  envMeta: { fontSize: 13, marginTop: 1 },
  varsTable: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  varRow: { flexDirection: 'row', paddingVertical: 4, gap: 8 },
  varKey: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  varValue: { fontSize: 13, flex: 1 },

  formCard: { borderRadius: 14, padding: 16, marginTop: 10 },
  formTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  varsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  varEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  varEditKey: { fontSize: 13, fontWeight: '600', minWidth: 80 },
  varEditVal: { fontSize: 13, flex: 1 },
  addVarRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  varInput: { flex: 1, fontSize: 13, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  addVarBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  formBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  formBtnText: { fontSize: 15, fontWeight: '600' },

  addEnvBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, marginTop: 10 },
  addEnvBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  hintCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 12, marginTop: 20 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
