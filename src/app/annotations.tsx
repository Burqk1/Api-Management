import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { generateId } from '../types/api';

interface Annotation {
  id: string;
  endpointId: string;
  endpointName: string;
  collectionName: string;
  author: string;
  text: string;
  type: 'comment' | 'todo' | 'bug' | 'question' | 'note';
  resolved: boolean;
  createdAt: number;
  replies: { id: string; author: string; text: string; createdAt: number }[];
}

const TYPE_CONFIG = {
  comment: { icon: 'comment-text-outline', color: '#58A6FF' },
  todo: { icon: 'checkbox-marked-circle-outline', color: '#3FB950' },
  bug: { icon: 'bug-outline', color: '#FF6961' },
  question: { icon: 'help-circle-outline', color: '#D29922' },
  note: { icon: 'note-outline', color: '#BC8CFF' },
};

const STORAGE_KEY = 'api_annotations';

export default function AnnotationsScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { collections, endpoints } = useApiStore();

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [author, setAuthor] = useState('Me');
  const [text, setText] = useState('');
  const [type, setType] = useState<Annotation['type']>('comment');
  const [filter, setFilter] = useState<'all' | Annotation['type']>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((d) => { if (d) setAnnotations(JSON.parse(d)); });
  }, []);

  const save = (list: Annotation[]) => {
    setAnnotations(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const allEndpoints = endpoints.map((e) => ({ ...e, collectionName: collections.find((c) => c.id === e.collectionId)?.name || '' }));

  const addAnnotation = () => {
    if (!text.trim() || !selectedEndpoint) return;
    const ep = allEndpoints.find((e) => e.id === selectedEndpoint);
    const ann: Annotation = {
      id: generateId(), endpointId: selectedEndpoint, endpointName: ep?.name || 'Unknown',
      collectionName: ep?.collectionName || '', author, text: text.trim(),
      type, resolved: false, createdAt: Date.now(), replies: [],
    };
    save([ann, ...annotations]);
    setText('');
    setShowAdd(false);
  };

  const addReply = (annId: string) => {
    if (!replyText.trim()) return;
    save(annotations.map((a) => a.id === annId ? {
      ...a, replies: [...a.replies, { id: generateId(), author, text: replyText.trim(), createdAt: Date.now() }]
    } : a));
    setReplyText('');
    setReplyingTo(null);
  };

  const toggleResolved = (id: string) => save(annotations.map((a) => a.id === id ? { ...a, resolved: !a.resolved } : a));
  const deleteAnnotation = (id: string) => {
    Alert.alert('Delete', 'Delete this annotation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => save(annotations.filter((a) => a.id !== id)) },
    ]);
  };

  const filtered = annotations
    .filter((a) => showResolved || !a.resolved)
    .filter((a) => filter === 'all' || a.type === filter);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Annotations' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Total', value: annotations.length, color: colors.primary },
              { label: 'Open', value: annotations.filter((a) => !a.resolved).length, color: '#D29922' },
              { label: 'Resolved', value: annotations.filter((a) => a.resolved).length, color: '#3FB950' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[{ key: 'all' as const, label: 'All' }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k as Annotation['type'], label: k }))].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, { backgroundColor: filter === f.key ? colors.primary + '20' : cardBg }]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={{ color: filter === f.key ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: showResolved ? '#3FB95020' : cardBg }]}
                onPress={() => setShowResolved(!showResolved)}
              >
                <Text style={{ color: showResolved ? '#3FB950' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Resolved</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Add Button */}
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
            <MaterialCommunityIcons name={showAdd ? 'close' : 'plus'} size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{showAdd ? 'Cancel' : 'Add Annotation'}</Text>
          </TouchableOpacity>

          {/* Add Form */}
          {showAdd && (
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Endpoint</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {allEndpoints.slice(0, 20).map((ep) => (
                    <TouchableOpacity
                      key={ep.id}
                      style={[styles.epChip, { backgroundColor: selectedEndpoint === ep.id ? colors.primary + '20' : colors.background }]}
                      onPress={() => setSelectedEndpoint(ep.id)}
                    >
                      <Text style={{ color: selectedEndpoint === ep.id ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{ep.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Type</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {(Object.entries(TYPE_CONFIG) as [Annotation['type'], typeof TYPE_CONFIG.comment][]).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.typeChip, { backgroundColor: type === k ? v.color + '20' : colors.background }]}
                    onPress={() => setType(k)}
                  >
                    <MaterialCommunityIcons name={v.icon as any} size={14} color={type === k ? v.color : colors.textTertiary} />
                    <Text style={{ color: type === k ? v.color : colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
                value={text}
                onChangeText={setText}
                placeholder="Write your annotation..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: text.trim() && selectedEndpoint ? 1 : 0.4 }]} onPress={addAnnotation}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Annotations List */}
          {filtered.map((ann) => {
            const cfg = TYPE_CONFIG[ann.type];
            return (
              <View key={ann.id} style={[styles.annCard, { backgroundColor: cardBg, opacity: ann.resolved ? 0.6 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{ann.endpointName}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{timeAgo(ann.createdAt)}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{ann.collectionName}</Text>
                <Text style={{ color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 20 }}>{ann.text}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>- {ann.author}</Text>

                {/* Replies */}
                {ann.replies.map((r) => (
                  <View key={r.id} style={{ marginTop: 8, marginLeft: 16, borderLeftWidth: 2, borderLeftColor: colors.divider, paddingLeft: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 12 }}>{r.text}</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>- {r.author} {timeAgo(r.createdAt)}</Text>
                  </View>
                ))}

                {/* Reply input */}
                {replyingTo === ann.id && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, fontSize: 13 }}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Reply..."
                      placeholderTextColor={colors.textTertiary}
                    />
                    <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' }} onPress={() => addReply(ann.id)}>
                      <MaterialCommunityIcons name="send" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setReplyingTo(replyingTo === ann.id ? null : ann.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="reply" size={14} color={colors.textTertiary} />
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Reply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleResolved(ann.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name={ann.resolved ? 'undo' : 'check'} size={14} color={ann.resolved ? '#D29922' : '#3FB950'} />
                    <Text style={{ color: ann.resolved ? '#D29922' : '#3FB950', fontSize: 11 }}>{ann.resolved ? 'Reopen' : 'Resolve'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteAnnotation(ann.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF6961" />
                    <Text style={{ color: '#FF6961', fontSize: 11 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <MaterialCommunityIcons name="comment-off-outline" size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No annotations yet</Text>
            </View>
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
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  formCard: { borderRadius: 14, padding: 14, marginBottom: 12, gap: 2 },
  epChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, maxWidth: 150 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  textInput: { borderRadius: 10, padding: 10, fontSize: 14, minHeight: 60 },
  submitBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  annCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
});
