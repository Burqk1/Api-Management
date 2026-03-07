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
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useApiStore } from '../../stores/apiStore';
import { METHOD_COLORS } from '../../types/api';
import { useLanguageStore } from '../../stores/languageStore';
import * as Clipboard from 'expo-clipboard';
import SwipeableRow from '../../components/SwipeableRow';
import { exportToPostman, exportToOpenAPI } from '../../utils/exportFormats';

export default function ApisScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);
  const deleteCollection = useApiStore((s) => s.deleteCollection);
  const deleteEndpoint = useApiStore((s) => s.deleteEndpoint);
  const toggleFavorite = useApiStore((s) => s.toggleFavorite);
  const duplicateEndpoint = useApiStore((s) => s.addEndpoint);
  const moveCollection = useApiStore((s) => s.moveCollection);
  const exportCollection = useApiStore((s) => s.exportCollection);
  const importCollection = useApiStore((s) => s.importCollection);
  const addCollection = useApiStore((s) => s.addCollection);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [importModal, setImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const t = useLanguageStore((s) => s.t);

  const rootCollections = collections.filter((c) => !c.parentId);
  const getSubFolders = (parentId: string) => collections.filter((c) => c.parentId === parentId);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    addCollection({ name: folderName.trim(), description: '', color: '#58A6FF', icon: 'folder-outline', baseUrl: '', parentId: folderParentId || undefined });
    setShowFolderModal(false);
    setFolderName('');
    setFolderParentId(null);
  };

  const padding = Platform.OS === 'web' ? 32 : 20;

  const handleExport = (colId: string) => {
    const col = collections.find((c) => c.id === colId);
    const colEps = endpoints.filter((e) => e.collectionId === colId);
    if (!col) return;

    Alert.alert(t('exportFormat'), t('selectExportFormat'), [
      {
        text: 'JSON',
        onPress: async () => {
          const json = exportCollection(colId);
          await Clipboard.setStringAsync(json);
          Alert.alert(t('exported'), t('exportedToClipboard'));
        },
      },
      {
        text: 'Postman v2.1',
        onPress: async () => {
          const postman = exportToPostman(col, colEps);
          await Clipboard.setStringAsync(postman);
          Alert.alert(t('exported'), t('exportedToClipboard'));
        },
      },
      {
        text: 'OpenAPI 3.0',
        onPress: async () => {
          const openapi = exportToOpenAPI(col, colEps);
          await Clipboard.setStringAsync(openapi);
          Alert.alert(t('exported'), t('exportedToClipboard'));
        },
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const handleImport = () => {
    if (!importJson.trim()) return;
    const success = importCollection(importJson.trim());
    if (success) {
      setImportModal(false);
      setImportJson('');
      Alert.alert(t('imported'), t('collectionImported'));
    } else {
      Alert.alert(t('error'), t('invalidJsonFormat'));
    }
  };

  const handleDeleteCollection = (id: string, name: string) => {
    Alert.alert(
      t('deleteCollection'),
      t('deleteCollectionConfirm').replace('{name}', name),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteCollection(id) },
      ]
    );
  };

  const renderCollection = (col: typeof collections[0], depth: number): React.ReactNode => {
    const colEndpoints = endpoints.filter((e) => e.collectionId === col.id);
    const subFolders = getSubFolders(col.id);
    const isExpanded = expandedId === col.id;
    const isFolderOpen = expandedFolders.has(col.id);
    const hasChildren = subFolders.length > 0;

    return (
      <View key={col.id} style={{ marginBottom: depth === 0 ? 12 : 4, marginLeft: depth * 16 }}>
        {/* Collection Header */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpandedId(isExpanded ? null : col.id)}
          onLongPress={() => { setFolderParentId(col.id); setShowFolderModal(true); }}
          style={[styles.colCard, { backgroundColor: isDark ? colors.surface : colors.card }]}
        >
          {hasChildren && (
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => toggleFolder(col.id)}>
              <MaterialCommunityIcons name={isFolderOpen ? 'chevron-down' : 'chevron-right'} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <View style={[styles.colIcon, { backgroundColor: col.color + '20' }]}>
            <MaterialCommunityIcons name={col.icon as any || 'folder-outline'} size={22} color={col.color} />
          </View>
          <View style={styles.colInfo}>
            <Text style={[styles.colName, { color: colors.text }]}>{col.name}</Text>
            <Text style={[styles.colMeta, { color: colors.textSecondary }]}>
              {colEndpoints.length} endpoints{subFolders.length > 0 ? ` · ${subFolders.length} folders` : ''}{col.baseUrl ? ` · ${col.baseUrl}` : ''}
            </Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => moveCollection(col.id, 'up')}>
            <MaterialCommunityIcons name="arrow-up" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => moveCollection(col.id, 'down')}>
            <MaterialCommunityIcons name="arrow-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => handleExport(col.id)}>
            <MaterialCommunityIcons name="export-variant" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => handleDeleteCollection(col.id, col.name)}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Sub-folders */}
        {isFolderOpen && subFolders.map((sub) => renderCollection(sub, depth + 1))}

        {/* Endpoints List */}
        {isExpanded && (
          <View style={[styles.endpointList, { backgroundColor: isDark ? colors.surface : colors.card }]}>
            {colEndpoints.length === 0 ? (
              <View style={styles.noEndpoints}>
                <Text style={[styles.noEndpointsText, { color: colors.textTertiary }]}>
                  {t('noEndpointsYet')}
                </Text>
              </View>
            ) : (
              colEndpoints.map((ep, i) => (
                <SwipeableRow
                  key={ep.id}
                  leftActions={[{
                    icon: ep.isFavorite ? 'star' : 'star-outline',
                    color: '#FFD60A',
                    bgColor: '#FFD60A18',
                    onPress: () => toggleFavorite(ep.id),
                    label: ep.isFavorite ? 'Unfav' : 'Fav',
                  }]}
                  rightActions={[
                    {
                      icon: 'content-duplicate',
                      color: '#58A6FF',
                      bgColor: '#58A6FF18',
                      onPress: () => {
                        const { id: _, createdAt: _c, updatedAt: _u, ...rest } = ep;
                        duplicateEndpoint({ ...rest, name: `${ep.name} (copy)` });
                      },
                      label: 'Duplicate',
                    },
                    {
                      icon: 'trash-can-outline',
                      color: '#FF6961',
                      bgColor: '#FF696118',
                      onPress: () => {
                        Alert.alert(t('deleteEndpoint'), t('deleteEndpointConfirm'), [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('delete'), style: 'destructive', onPress: () => deleteEndpoint(ep.id) },
                        ]);
                      },
                      label: t('delete'),
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => router.push(`/endpoint/${ep.id}` as any)}
                    style={[
                      styles.epRow,
                      { backgroundColor: isDark ? colors.surface : colors.card },
                      i < colEndpoints.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.divider,
                      },
                    ]}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[ep.method] + '20' }]}>
                      <Text style={[styles.methodText, { color: METHOD_COLORS[ep.method] }]}>
                        {ep.method}
                      </Text>
                    </View>
                    <View style={styles.epInfo}>
                      <Text style={[styles.epName, { color: colors.text }]}>{ep.name}</Text>
                      <Text style={[styles.epUrl, { color: colors.textTertiary }]} numberOfLines={1}>
                        {ep.url}
                      </Text>
                    </View>
                    {ep.isFavorite && <MaterialCommunityIcons name="star" size={14} color="#FFD60A" />}
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </SwipeableRow>
              ))
            )}
            <View style={[styles.epActions, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={styles.epActionBtn}
                onPress={() => router.push(`/endpoint/new?collectionId=${col.id}` as any)}
              >
                <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                <Text style={[styles.epActionText, { color: colors.primary }]}>{t('addEndpoint')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.epActionBtn}
                onPress={() => { setFolderParentId(col.id); setShowFolderModal(true); }}
              >
                <MaterialCommunityIcons name="folder-plus-outline" size={16} color={colors.primary} />
                <Text style={[styles.epActionText, { color: colors.primary }]}>{t('addFolder') || 'Add Folder'}</Text>
              </TouchableOpacity>
              {colEndpoints.length > 0 && (
                <TouchableOpacity
                  style={styles.epActionBtn}
                  onPress={() => router.push(`/runner/${col.id}` as any)}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={16} color="#3FB950" />
                  <Text style={[styles.epActionText, { color: '#3FB950' }]}>{t('runAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: padding }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('apis')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {collections.length} {t('collectionsCount')} · {endpoints.length} {t('endpointsCount')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => setImportModal(true)}
            >
              <MaterialCommunityIcons name="import" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/collection/new' as any)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: padding, marginTop: 16 }}>
          {collections.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
              <MaterialCommunityIcons name="folder-open-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noCollections')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('createFirstCollection')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/collection/new' as any)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                <Text style={styles.emptyBtnText}>{t('newCollection')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rootCollections.map((col) => renderCollection(col, 0))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Import Modal */}
      <Modal visible={importModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importCollection')}</Text>
              <TouchableOpacity onPress={() => { setImportModal(false); setImportJson(''); }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>{t('pasteJsonHint')}</Text>
            <TextInput
              style={[styles.importInput, { backgroundColor: isDark ? colors.surface : colors.card, color: colors.text }]}
              value={importJson}
              onChangeText={setImportJson}
              placeholder='{"collection": {...}, "endpoints": [...]}'
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: colors.primary, opacity: importJson.trim() ? 1 : 0.5 }]}
              onPress={handleImport}
              disabled={!importJson.trim()}
            >
              <MaterialCommunityIcons name="import" size={18} color="#FFF" />
              <Text style={styles.importBtnText}>{t('importCollection')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Folder Create Modal */}
      <Modal visible={showFolderModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('newFolder') || 'New Folder'}</Text>
              <TouchableOpacity onPress={() => { setShowFolderModal(false); setFolderName(''); setFolderParentId(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.importInput, { backgroundColor: isDark ? colors.surface : colors.card, color: colors.text, minHeight: 48 }]}
              value={folderName}
              onChangeText={setFolderName}
              placeholder={t('folderName') || 'Folder name'}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: colors.primary, opacity: folderName.trim() ? 1 : 0.5 }]}
              onPress={handleCreateFolder}
              disabled={!folderName.trim()}
            >
              <MaterialCommunityIcons name="folder-plus" size={18} color="#FFF" />
              <Text style={styles.importBtnText}>{t('create') || 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: {
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2, letterSpacing: -0.2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  emptyCard: {
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', letterSpacing: -0.2 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  colCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  colIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colInfo: { flex: 1 },
  colName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  colMeta: { fontSize: 13, marginTop: 2, letterSpacing: -0.1 },

  endpointList: {
    borderRadius: 14,
    marginTop: 2,
    overflow: 'hidden',
  },
  noEndpoints: { padding: 20, alignItems: 'center' },
  noEndpointsText: { fontSize: 13 },
  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 14,
    gap: 10,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  methodText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  epInfo: { flex: 1 },
  epName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  epUrl: { fontSize: 12, marginTop: 1, letterSpacing: -0.1 },

  addEpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  addEpText: { fontSize: 14, fontWeight: '600' },

  epActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  epActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    flex: 1,
  },
  epActionText: { fontSize: 14, fontWeight: '600' },

  // Import Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalHint: { fontSize: 13, marginBottom: 12 },
  importInput: {
    borderRadius: 12,
    padding: 14,
    minHeight: 180,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  importBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
