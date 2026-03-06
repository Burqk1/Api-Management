import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { getStatusColor } from '../types/api';
import * as Clipboard from 'expo-clipboard';
import JsonHighlight from '../components/JsonHighlight';

type TabKey = 'body' | 'headers' | 'preview';

interface JsonTreeProps {
  data: unknown;
  level: number;
  colors: { text: string; textSecondary: string; primary: string; background: string };
}

function JsonTreeView({ data, level, colors }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleKey = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderValue = (value: unknown, path: string, isLast: boolean): React.ReactNode => {
    if (value === null) {
      return (
        <Text style={[styles.treeValue, { color: '#8B949E' }]}>
          null{!isLast ? ',' : ''}
        </Text>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Text style={[styles.treeValue, { color: '#FF7B72' }]}>
          {value.toString()}{!isLast ? ',' : ''}
        </Text>
      );
    }

    if (typeof value === 'number') {
      return (
        <Text style={[styles.treeValue, { color: '#79C0FF' }]}>
          {value.toString()}{!isLast ? ',' : ''}
        </Text>
      );
    }

    if (typeof value === 'string') {
      return (
        <Text style={[styles.treeValue, { color: '#A5D6FF' }]} numberOfLines={3}>
          "{value}"{!isLast ? ',' : ''}
        </Text>
      );
    }

    if (Array.isArray(value)) {
      const isCollapsed = collapsed.has(path);
      return (
        <View>
          <TouchableOpacity onPress={() => toggleKey(path)} style={styles.treeToggle} activeOpacity={0.6}>
            <Text style={[styles.treeIcon, { color: colors.textSecondary }]}>
              {isCollapsed ? '\u25B6' : '\u25BC'}
            </Text>
            <Text style={[styles.treeBracket, { color: '#8B949E' }]}>
              [{isCollapsed ? ` ... ${value.length} items ]${!isLast ? ',' : ''}` : ''}
            </Text>
          </TouchableOpacity>
          {!isCollapsed && (
            <View style={{ marginLeft: 16 }}>
              {value.map((item, idx) => (
                <View key={`${path}[${idx}]`} style={styles.treeRow}>
                  <Text style={[styles.treeIndex, { color: colors.textSecondary }]}>{idx}: </Text>
                  {renderValue(item, `${path}[${idx}]`, idx === value.length - 1)}
                </View>
              ))}
              <Text style={[styles.treeBracket, { color: '#8B949E' }]}>]{!isLast ? ',' : ''}</Text>
            </View>
          )}
        </View>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      const isCollapsed = collapsed.has(path);
      return (
        <View>
          <TouchableOpacity onPress={() => toggleKey(path)} style={styles.treeToggle} activeOpacity={0.6}>
            <Text style={[styles.treeIcon, { color: colors.textSecondary }]}>
              {isCollapsed ? '\u25B6' : '\u25BC'}
            </Text>
            <Text style={[styles.treeBracket, { color: '#8B949E' }]}>
              {'{'}{isCollapsed ? ` ... ${entries.length} keys }${!isLast ? ',' : ''}` : ''}
            </Text>
          </TouchableOpacity>
          {!isCollapsed && (
            <View style={{ marginLeft: 16 }}>
              {entries.map(([k, v], idx) => (
                <View key={`${path}.${k}`} style={styles.treeRow}>
                  <Text style={[styles.treeKey, { color: '#58A6FF' }]}>"{k}": </Text>
                  {renderValue(v, `${path}.${k}`, idx === entries.length - 1)}
                </View>
              ))}
              <Text style={[styles.treeBracket, { color: '#8B949E' }]}>{'}'}{!isLast ? ',' : ''}</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <Text style={[styles.treeValue, { color: colors.text }]}>
        {String(value)}{!isLast ? ',' : ''}
      </Text>
    );
  };

  return <View style={styles.treeContainer}>{renderValue(data, 'root', true)}</View>;
}

export default function ResponseViewerScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const callLogs = useApiStore((s) => s.callLogs);
  const { logId } = useLocalSearchParams<{ logId: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>('body');
  const [isRawView, setIsRawView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;

  const log = useMemo(() => callLogs.find((l) => l.id === logId), [callLogs, logId]);

  const formattedBody = useMemo(() => {
    if (!log?.responseBody) return '';
    try {
      return JSON.stringify(JSON.parse(log.responseBody), null, 2);
    } catch {
      return log.responseBody;
    }
  }, [log?.responseBody]);

  const parsedJson = useMemo(() => {
    if (!log?.responseBody) return null;
    try {
      return JSON.parse(log.responseBody);
    } catch {
      return null;
    }
  }, [log?.responseBody]);

  const contentType = useMemo(() => {
    if (!log?.responseHeaders) return '';
    const ct = Object.entries(log.responseHeaders).find(
      ([key]) => key.toLowerCase() === 'content-type',
    );
    return ct ? ct[1].toLowerCase() : '';
  }, [log?.responseHeaders]);

  const searchMatches = useMemo(() => {
    if (!searchQuery || !formattedBody) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (formattedBody.match(regex) || []).length;
  }, [searchQuery, formattedBody]);

  const handleCopy = async () => {
    if (!formattedBody) return;
    await Clipboard.setStringAsync(formattedBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'body', label: t('bodyTab'), icon: 'code-braces' },
    { key: 'headers', label: t('headersTab'), icon: 'format-list-bulleted' },
    { key: 'preview', label: t('previewTab'), icon: 'eye-outline' },
  ];

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const renderHeaderTable = (headers: Record<string, string> | undefined, title: string) => {
    if (!headers || Object.keys(headers).length === 0) return null;
    const entries = Object.entries(headers);
    return (
      <View style={[styles.headerSection, { backgroundColor: cardBg, marginTop: 12 }]}>
        <Text style={[styles.headerSectionTitle, { color: colors.text }]}>{title}</Text>
        {entries.map(([key, value], idx) => (
          <View
            key={key}
            style={[
              styles.headerRow,
              { borderBottomColor: colors.divider },
              idx === entries.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <Text style={[styles.headerKey, { color: colors.primary }]} numberOfLines={1}>
              {key}
            </Text>
            <Text style={[styles.headerValue, { color: colors.text }]} numberOfLines={3} selectable>
              {value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderBodyTab = () => {
    if (!log?.responseBody) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="code-braces-box" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResponseData')}</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Search bar */}
        <View style={[styles.searchRow, { marginHorizontal: 20, marginTop: 12 }]}>
          <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('searchInResponse')}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <>
                <Text style={[styles.matchCount, { color: colors.textSecondary }]}>
                  {searchMatches}
                </Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Toolbar */}
        <View style={[styles.toolbar, { marginHorizontal: 20 }]}>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: !isRawView ? colors.primary + '20' : cardBg }]}
            onPress={() => setIsRawView(false)}
          >
            <MaterialCommunityIcons
              name="code-json"
              size={16}
              color={!isRawView ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.toolBtnText, { color: !isRawView ? colors.primary : colors.textSecondary }]}>
              {t('formattedView')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: isRawView ? colors.primary + '20' : cardBg }]}
            onPress={() => setIsRawView(true)}
          >
            <MaterialCommunityIcons
              name="text"
              size={16}
              color={isRawView ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.toolBtnText, { color: isRawView ? colors.primary : colors.textSecondary }]}>
              {t('rawView')}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: cardBg }]} onPress={handleCopy}>
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={16}
              color={copied ? colors.secondary : colors.textSecondary}
            />
            <Text style={[styles.toolBtnText, { color: copied ? colors.secondary : colors.textSecondary }]}>
              {t('copyResponse')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Body content */}
        <ScrollView
          style={[styles.bodyContainer, { backgroundColor: cardBg, marginHorizontal: 20 }]}
          contentContainerStyle={{ padding: 12 }}
          nestedScrollEnabled
        >
          {isRawView ? (
            <Text style={[styles.rawText, { color: colors.text }]} selectable>
              {log.responseBody}
            </Text>
          ) : parsedJson ? (
            <JsonHighlight json={log.responseBody} colors={colors} />
          ) : (
            <Text style={[styles.rawText, { color: colors.text }]} selectable>
              {log.responseBody}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderHeadersTab = () => {
    if (!log) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="format-list-bulleted" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResponseData')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {renderHeaderTable(log.requestHeaders, 'Request Headers')}
        {renderHeaderTable(log.responseHeaders, 'Response Headers')}
        {!log.requestHeaders && !log.responseHeaders && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="format-list-bulleted" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResponseData')}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderPreviewTab = () => {
    if (!log) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="eye-off-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResponseData')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Response stats */}
        <View style={[styles.statsCard, { backgroundColor: cardBg, marginTop: 12 }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>{t('responseStats')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getStatusColor(log.statusCode) }]}>
                {log.statusCode || 'ERR'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Status</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{log.responseTime}ms</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatSize(log.responseSize)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Size</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{log.method}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Method</Text>
            </View>
          </View>
          {contentType ? (
            <View style={[styles.contentTypeRow, { borderTopColor: colors.divider }]}>
              <Text style={[styles.contentTypeLabel, { color: colors.textSecondary }]}>Content-Type</Text>
              <Text style={[styles.contentTypeValue, { color: colors.text }]} numberOfLines={1}>
                {contentType}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Preview content */}
        {contentType.includes('image') ? (
          <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="image-off-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.previewMessage, { color: colors.textSecondary }]}>
              Image preview not available in mobile
            </Text>
          </View>
        ) : contentType.includes('text/html') ? (
          <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
            <View style={[styles.htmlHeader, { borderBottomColor: colors.divider }]}>
              <MaterialCommunityIcons name="language-html5" size={20} color={colors.primary} />
              <Text style={[styles.htmlHeaderText, { color: colors.text }]}>HTML Preview</Text>
            </View>
            <ScrollView
              style={styles.htmlScroll}
              nestedScrollEnabled
              contentContainerStyle={{ padding: 12 }}
            >
              <Text style={[styles.htmlText, { color: colors.text }]} selectable>
                {log.responseBody || ''}
              </Text>
            </ScrollView>
          </View>
        ) : parsedJson ? (
          <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
            <View style={[styles.treeHeader, { borderBottomColor: colors.divider }]}>
              <MaterialCommunityIcons name="file-tree-outline" size={20} color={colors.primary} />
              <Text style={[styles.treeHeaderText, { color: colors.text }]}>{t('treeView')}</Text>
            </View>
            <ScrollView
              style={styles.treeScroll}
              nestedScrollEnabled
              contentContainerStyle={{ padding: 12 }}
            >
              <JsonTreeView data={parsedJson} level={0} colors={colors} />
            </ScrollView>
          </View>
        ) : log.responseBody ? (
          <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
            <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: 12 }}>
              <Text style={[styles.rawText, { color: colors.text }]} selectable>
                {log.responseBody}
              </Text>
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="eye-off-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.previewMessage, { color: colors.textSecondary }]}>
              {t('noResponseData')}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t('responseViewer') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Status bar */}
        {log && (
          <View style={[styles.statusBar, { backgroundColor: cardBg, marginHorizontal: 20, marginTop: 12 }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(log.statusCode) }]} />
            <Text style={[styles.statusCode, { color: getStatusColor(log.statusCode) }]}>
              {log.statusCode || 'ERR'}
            </Text>
            <Text style={[styles.statusUrl, { color: colors.textSecondary }]} numberOfLines={1}>
              {log.url}
            </Text>
            <Text style={[styles.statusTime, { color: colors.text }]}>{log.responseTime}ms</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabRow, { marginHorizontal: 20 }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary + '20' : 'transparent',
                  borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'body' && renderBodyTab()}
        {activeTab === 'headers' && renderHeadersTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusCode: { fontSize: 15, fontWeight: '700' },
  statusUrl: { flex: 1, fontSize: 12 },
  statusTime: { fontSize: 13, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderBottomWidth: 2,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  matchCount: { fontSize: 12, fontWeight: '600' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnText: { fontSize: 12, fontWeight: '600' },
  bodyContainer: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  rawText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, fontWeight: '500' },
  headerSection: {
    borderRadius: 12,
    padding: 14,
    overflow: 'hidden',
  },
  headerSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerKey: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    width: 130,
  },
  headerValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  statsCard: {
    borderRadius: 12,
    padding: 14,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  contentTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  contentTypeLabel: { fontSize: 12, fontWeight: '600' },
  contentTypeValue: { fontSize: 12, flex: 1 },
  previewCard: {
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    overflow: 'hidden',
  },
  previewMessage: { fontSize: 14, fontWeight: '500', marginTop: 12 },
  htmlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  htmlHeaderText: { fontSize: 14, fontWeight: '600' },
  htmlScroll: { width: '100%', maxHeight: 500 },
  htmlText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  treeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  treeHeaderText: { fontSize: 14, fontWeight: '600' },
  treeScroll: { width: '100%', maxHeight: 600 },
  treeContainer: { paddingVertical: 4 },
  treeRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
  treeToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 1 },
  treeIcon: { fontSize: 8 },
  treeBracket: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  treeKey: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  treeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  treeIndex: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
