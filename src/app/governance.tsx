import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { METHOD_COLORS, HttpMethod, ApiEndpoint } from '../types/api';

type Severity = 'error' | 'warning' | 'info';

interface LintIssue {
  endpointId: string;
  endpointName: string;
  method: HttpMethod;
  url: string;
  severity: Severity;
  rule: string;
  description: string;
  suggestion: string;
}

const SEVERITY_CONFIG: Record<Severity, { icon: string; color: string; label: string }> = {
  error: { icon: 'close-circle', color: '#FF6961', label: 'Error' },
  warning: { icon: 'alert-circle', color: '#D29922', label: 'Warning' },
  info: { icon: 'information', color: '#58A6FF', label: 'Info' },
};

const VERB_PATTERNS = /\/(get|post|put|delete|create|update|remove|fetch|add|edit|set|list|find|search|save|make|do)[A-Z]/i;

function computeGrade(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: 'A', color: '#3FB950' };
  if (pct >= 75) return { letter: 'B', color: '#58A6FF' };
  if (pct >= 60) return { letter: 'C', color: '#D29922' };
  if (pct >= 40) return { letter: 'D', color: '#FF8C00' };
  return { letter: 'F', color: '#FF6961' };
}

function lintEndpoint(ep: ApiEndpoint, allEndpoints: ApiEndpoint[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const base = { endpointId: ep.id, endpointName: ep.name, method: ep.method, url: ep.url };

  const add = (severity: Severity, rule: string, description: string, suggestion: string) =>
    issues.push({ ...base, severity, rule, description, suggestion });

  let path = '';
  try { path = new URL(ep.url).pathname; } catch { path = ep.url; }

  // Lowercase & hyphens
  if (/[A-Z]/.test(path)) {
    add('error', 'URL Casing', 'URL contains uppercase characters', 'Use lowercase with hyphens: ' + path.toLowerCase());
  }
  if (/_/.test(path)) {
    add('error', 'URL Underscores', 'URL uses underscores instead of hyphens', 'Replace underscores with hyphens: ' + path.replace(/_/g, '-'));
  }

  // Trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    add('warning', 'Trailing Slash', 'URL has a trailing slash', 'Remove the trailing slash from the path');
  }

  // Plural nouns
  const segments = path.split('/').filter(Boolean).filter(s => !/^v\d+$/i.test(s));
  const singulars = ['user', 'item', 'product', 'order', 'post', 'comment', 'category', 'tag', 'role', 'file', 'message', 'task', 'project', 'team', 'group'];
  for (const seg of segments) {
    if (singulars.includes(seg.toLowerCase()) && !seg.match(/^[0-9a-f-]+$/)) {
      add('info', 'Plural Nouns', `"/${seg}" should use plural form`, `Use "/${seg}s" instead`);
    }
  }

  // GET with body
  if (ep.method === 'GET' && ep.body && ep.body.trim().length > 0 && ep.bodyType !== 'none') {
    add('error', 'GET with Body', 'GET requests should not have a request body', 'Remove the body or change the HTTP method');
  }

  // DELETE with body
  if (ep.method === 'DELETE' && ep.body && ep.body.trim().length > 0 && ep.bodyType !== 'none') {
    add('warning', 'DELETE with Body', 'DELETE requests typically should not have a body', 'Consider using query params or path params instead');
  }

  // POST/PUT Content-Type
  if (['POST', 'PUT'].includes(ep.method)) {
    const hasCT = ep.headers?.some(h => h.enabled !== false && h.key.toLowerCase() === 'content-type');
    if (!hasCT) {
      add('warning', 'Missing Content-Type', `${ep.method} request lacks a Content-Type header`, 'Add Content-Type: application/json (or appropriate type)');
    }
  }

  // File extensions
  if (/\.(json|xml|html|csv|txt|yaml|yml)(\?|$)/i.test(ep.url)) {
    add('warning', 'File Extension', 'URL contains a file extension', 'Use Accept header for content negotiation instead');
  }

  // Verb in path
  if (VERB_PATTERNS.test(path)) {
    add('warning', 'Verb in URL', 'URL path contains a verb — use nouns for resources', 'Rely on HTTP methods to indicate the action');
  }

  // HTTPS
  if (ep.url.startsWith('http://')) {
    add('info', 'HTTPS', 'URL uses HTTP instead of HTTPS', 'Use HTTPS for secure communication');
  }

  // Versioning consistency (checked per-endpoint against the group)
  const hasVersion = /\/v\d+\//i.test(ep.url);
  const versionedCount = allEndpoints.filter(e => /\/v\d+\//i.test(e.url)).length;
  if (allEndpoints.length > 1 && versionedCount > 0 && versionedCount < allEndpoints.length) {
    if (!hasVersion) {
      add('info', 'Versioning', 'Inconsistent API versioning — some endpoints use /vN/', 'Add version prefix like /v1/ for consistency');
    }
  }

  return issues;
}

export default function GovernanceScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const endpoints = useApiStore((s) => s.endpoints);

  const cardBg = isDark ? colors.surface : colors.card;

  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const runAudit = () => {
    const allIssues: LintIssue[] = [];
    for (const ep of endpoints) {
      allIssues.push(...lintEndpoint(ep, endpoints));
    }
    allIssues.sort((a, b) => {
      const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    setIssues(allIssues);
    setHasRun(true);
    setFilter('all');
    setExpandedIdx(null);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return issues;
    return issues.filter(i => i.severity === filter);
  }, [issues, filter]);

  const totalEndpoints = endpoints.length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const affectedIds = new Set(issues.map(i => i.endpointId));
  const passRate = totalEndpoints > 0 ? Math.round(((totalEndpoints - affectedIds.size) / totalEndpoints) * 100) : 100;
  const grade = computeGrade(passRate);

  const severities: (Severity | 'all')[] = ['all', 'error', 'warning', 'info'];
  const chipLabels: Record<string, string> = { all: `All (${issues.length})`, error: `Errors (${errorCount})`, warning: `Warnings (${warnCount})`, info: `Info (${infoCount})` };

  return (
    <>
      <Stack.Screen options={{ title: 'API Governance' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Run Audit Button */}
          <TouchableOpacity style={[styles.runBtn, { backgroundColor: colors.primary }]} onPress={runAudit} activeOpacity={0.8}>
            <MaterialCommunityIcons name="shield-search" size={20} color="#FFF" />
            <Text style={styles.runBtnText}>Run Audit</Text>
          </TouchableOpacity>

          {hasRun && (
            <>
              {/* Grade Card */}
              <View style={[styles.gradeCard, { backgroundColor: cardBg }]}>
                <View style={[styles.gradeBadge, { borderColor: grade.color }]}>
                  <Text style={[styles.gradeLetter, { color: grade.color }]}>{grade.letter}</Text>
                </View>
                <View style={styles.gradeInfo}>
                  <Text style={[styles.gradePercent, { color: colors.text }]}>{passRate}% Pass Rate</Text>
                  <Text style={[styles.gradeSub, { color: colors.textSecondary }]}>
                    {totalEndpoints} endpoints analyzed
                  </Text>
                </View>
              </View>

              {/* Summary Row */}
              <View style={styles.summaryRow}>
                {[
                  { label: 'Endpoints', value: totalEndpoints, color: colors.primary },
                  { label: 'Issues', value: issues.length, color: '#FF6961' },
                  { label: 'Clean', value: totalEndpoints - affectedIds.size, color: '#3FB950' },
                ].map(s => (
                  <View key={s.label} style={[styles.summaryItem, { backgroundColor: cardBg }]}>
                    <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
                {severities.map(sev => {
                  const active = filter === sev;
                  const chipColor = sev === 'all' ? colors.primary : SEVERITY_CONFIG[sev].color;
                  return (
                    <TouchableOpacity
                      key={sev}
                      onPress={() => { setFilter(sev); setExpandedIdx(null); }}
                      style={[styles.chip, { backgroundColor: active ? chipColor : cardBg, borderColor: chipColor }]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#FFF' : chipColor }]}>{chipLabels[sev]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Issues List */}
              {filtered.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                  <MaterialCommunityIcons name="check-decagram" size={40} color="#3FB950" />
                  <Text style={[styles.emptyText, { color: colors.text }]}>All endpoints pass!</Text>
                </View>
              ) : (
                filtered.map((issue, idx) => {
                  const sev = SEVERITY_CONFIG[issue.severity];
                  const expanded = expandedIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => setExpandedIdx(expanded ? null : idx)}
                      style={[styles.issueCard, { backgroundColor: cardBg, borderLeftColor: sev.color }]}
                    >
                      <View style={styles.issueHeader}>
                        <MaterialCommunityIcons name={sev.icon as any} size={18} color={sev.color} />
                        <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[issue.method] + '22' }]}>
                          <Text style={[styles.methodText, { color: METHOD_COLORS[issue.method] }]}>{issue.method}</Text>
                        </View>
                        <Text style={[styles.issueName, { color: colors.text }]} numberOfLines={1}>{issue.endpointName}</Text>
                        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                      </View>
                      <Text style={[styles.issueRule, { color: sev.color }]}>{issue.rule}</Text>
                      <Text style={[styles.issueDesc, { color: colors.textSecondary }]}>{issue.description}</Text>
                      {expanded && (
                        <View style={[styles.expandedBlock, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
                          <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>URL</Text>
                          <Text style={[styles.expandedValue, { color: colors.text }]} selectable>{issue.url}</Text>
                          <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 8 }]}>Suggestion</Text>
                          <Text style={[styles.expandedValue, { color: '#3FB950' }]}>{issue.suggestion}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}

          {!hasRun && (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>API Governance</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Analyze your endpoints for REST best practices, naming conventions, and security standards.
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
  scroll: { padding: 16, paddingBottom: 40 },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 8, marginBottom: 16,
  },
  runBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  gradeCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    padding: 16, marginBottom: 12, gap: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }),
  },
  gradeBadge: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeLetter: { fontSize: 30, fontWeight: '800' },
  gradeInfo: { flex: 1 },
  gradePercent: { fontSize: 18, fontWeight: '700' },
  gradeSub: { fontSize: 13, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryItem: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }),
  },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  chipRow: { marginBottom: 12 },
  chipContent: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  issueCard: {
    borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }),
  },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  methodText: { fontSize: 10, fontWeight: '800' },
  issueName: { flex: 1, fontSize: 14, fontWeight: '600' },
  issueRule: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  issueDesc: { fontSize: 12 },
  expandedBlock: { marginTop: 10, padding: 10, borderRadius: 8 },
  expandedLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  expandedValue: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  emptyCard: {
    borderRadius: 14, padding: 32, alignItems: 'center', gap: 8, marginTop: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }),
  },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
