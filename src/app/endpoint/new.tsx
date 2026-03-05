import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { HttpMethod, METHOD_COLORS } from '../../types/api';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function NewEndpointScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { collectionId } = useLocalSearchParams<{ collectionId?: string }>();
  const collections = useApiStore((s) => s.collections);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [selectedCollection, setSelectedCollection] = useState(collectionId || '');
  const [body, setBody] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !url.trim() || !selectedCollection) return;
    addEndpoint({
      name: name.trim(),
      url: url.trim(),
      method,
      headers: [],
      body: body.trim(),
      assertions: [],
      collectionId: selectedCollection,
    });
    router.back();
  };

  const inputBg = isDark ? colors.surface : colors.card;
  const padding = Platform.OS === 'web' ? 32 : 20;
  const canCreate = name.trim() && url.trim() && selectedCollection;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { maxWidth: 600, alignSelf: 'center', width: '100%', paddingHorizontal: padding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>ENDPOINT NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Get Users"
          placeholderTextColor={colors.textTertiary}
          autoFocus
        />

        {/* Method */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>METHOD</Text>
        <View style={styles.methodRow}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMethod(m)}
              style={[
                styles.methodBtn,
                {
                  backgroundColor: method === m ? METHOD_COLORS[m] + '20' : inputBg,
                  borderWidth: method === m ? 1.5 : 0,
                  borderColor: METHOD_COLORS[m],
                },
              ]}
            >
              <Text style={[styles.methodBtnText, { color: method === m ? METHOD_COLORS[m] : colors.textSecondary }]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* URL */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>URL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
          value={url}
          onChangeText={setUrl}
          placeholder="https://api.example.com/users"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Collection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>COLLECTION</Text>
        {collections.length === 0 ? (
          <Text style={[styles.noColText, { color: colors.textTertiary }]}>
            Create a collection first from the APIs tab.
          </Text>
        ) : (
          <View style={styles.colList}>
            {collections.map((col) => (
              <TouchableOpacity
                key={col.id}
                onPress={() => setSelectedCollection(col.id)}
                style={[
                  styles.colBtn,
                  {
                    backgroundColor: selectedCollection === col.id ? col.color + '20' : inputBg,
                    borderWidth: selectedCollection === col.id ? 1.5 : 0,
                    borderColor: col.color,
                  },
                ]}
              >
                <View style={[styles.colDot, { backgroundColor: col.color }]} />
                <Text style={[styles.colBtnText, { color: selectedCollection === col.id ? col.color : colors.text }]}>
                  {col.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Body (for POST/PUT/PATCH) */}
        {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>BODY (JSON)</Text>
            <TextInput
              style={[styles.input, styles.bodyInput, { backgroundColor: inputBg, color: colors.text }]}
              value={body}
              onChangeText={setBody}
              placeholder='{"key": "value"}'
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </>
        )}

        {/* Create */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary, opacity: canCreate ? 1 : 0.5 }]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <Text style={styles.createBtnText}>Create Endpoint</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  bodyInput: {
    minHeight: 100,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  methodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  colList: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colBtnText: { fontSize: 14, fontWeight: '600' },
  noColText: { fontSize: 14, marginLeft: 4 },
  createBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
