import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import * as Clipboard from 'expo-clipboard';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  path: string;
  message: string;
  rule: string;
}

const SEVERITY_COLORS = { error: '#FF6961', warning: '#D29922', info: '#58A6FF' };
const SEVERITY_ICONS = { error: 'close-circle', warning: 'alert-circle', info: 'information' };

export default function OpenAPIValidationScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const { endpoints } = useApiStore();

  const [schemaText, setSchemaText] = useState('');
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const validate = () => {
    setValidating(true);
    setIssues([]);
    setTimeout(() => {
      const found: ValidationIssue[] = [];
      try {
        const spec = JSON.parse(schemaText);
        // Basic OpenAPI structure checks
        if (!spec.openapi && !spec.swagger) found.push({ severity: 'error', path: '/', message: 'Missing openapi or swagger version field', rule: 'version-required' });
        if (!spec.info) found.push({ severity: 'error', path: '/info', message: 'Missing info object', rule: 'info-required' });
        else {
          if (!spec.info.title) found.push({ severity: 'error', path: '/info/title', message: 'Missing API title', rule: 'info-title-required' });
          if (!spec.info.version) found.push({ severity: 'error', path: '/info/version', message: 'Missing API version', rule: 'info-version-required' });
          if (!spec.info.description) found.push({ severity: 'warning', path: '/info/description', message: 'API description is recommended', rule: 'info-description' });
          if (!spec.info.contact) found.push({ severity: 'info', path: '/info/contact', message: 'Contact information is recommended', rule: 'info-contact' });
        }
        if (!spec.paths || Object.keys(spec.paths).length === 0) found.push({ severity: 'error', path: '/paths', message: 'No paths defined', rule: 'paths-required' });
        else {
          Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
            if (!path.startsWith('/')) found.push({ severity: 'error', path, message: 'Path must start with /', rule: 'path-format' });
            const ops = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
            ops.forEach((op) => {
              if (methods[op]) {
                const operation = methods[op];
                if (!operation.responses) found.push({ severity: 'error', path: `${path}.${op}`, message: 'Missing responses object', rule: 'operation-responses' });
                if (!operation.operationId) found.push({ severity: 'warning', path: `${path}.${op}`, message: 'operationId is recommended', rule: 'operation-id' });
                if (!operation.summary && !operation.description) found.push({ severity: 'info', path: `${path}.${op}`, message: 'Summary or description recommended', rule: 'operation-description' });
                if (operation.parameters) {
                  operation.parameters.forEach((param: any, i: number) => {
                    if (!param.name) found.push({ severity: 'error', path: `${path}.${op}.parameters[${i}]`, message: 'Parameter missing name', rule: 'parameter-name' });
                    if (!param.in) found.push({ severity: 'error', path: `${path}.${op}.parameters[${i}]`, message: 'Parameter missing "in" field', rule: 'parameter-in' });
                    if (!param.schema && !param.type) found.push({ severity: 'warning', path: `${path}.${op}.parameters[${i}]`, message: 'Parameter schema recommended', rule: 'parameter-schema' });
                  });
                }
                if (operation.requestBody) {
                  if (!operation.requestBody.content) found.push({ severity: 'error', path: `${path}.${op}.requestBody`, message: 'requestBody missing content', rule: 'request-body-content' });
                }
                if (operation.responses) {
                  Object.entries(operation.responses).forEach(([code, resp]: [string, any]) => {
                    if (!resp.description) found.push({ severity: 'warning', path: `${path}.${op}.responses.${code}`, message: 'Response description recommended', rule: 'response-description' });
                  });
                }
                if ((op === 'post' || op === 'put' || op === 'patch') && !operation.requestBody) {
                  found.push({ severity: 'info', path: `${path}.${op}`, message: 'Write operation without requestBody', rule: 'write-request-body' });
                }
              }
            });
          });
        }
        if (spec.components?.schemas) {
          Object.entries(spec.components.schemas).forEach(([name, schema]: [string, any]) => {
            if (!schema.type && !schema.allOf && !schema.oneOf && !schema.anyOf && !schema.$ref) {
              found.push({ severity: 'warning', path: `/components/schemas/${name}`, message: 'Schema missing type definition', rule: 'schema-type' });
            }
            if (!schema.description) found.push({ severity: 'info', path: `/components/schemas/${name}`, message: 'Schema description recommended', rule: 'schema-description' });
          });
        }
        if (!spec.servers || spec.servers.length === 0) found.push({ severity: 'warning', path: '/servers', message: 'No servers defined', rule: 'servers-defined' });
        if (spec.security === undefined && !spec.components?.securitySchemes) found.push({ severity: 'info', path: '/security', message: 'No security schemes defined', rule: 'security-schemes' });
      } catch (e: any) {
        found.push({ severity: 'error', path: '/', message: `Invalid JSON: ${e.message}`, rule: 'valid-json' });
      }
      setIssues(found);
      setValidating(false);
      setValidated(true);
    }, 500);
  };

  const loadFromEndpoints = () => {
    const paths: Record<string, any> = {};
    endpoints.forEach((ep) => {
      const p = ep.url.replace(/https?:\/\/[^/]+/, '') || '/';
      if (!paths[p]) paths[p] = {};
      paths[p][ep.method.toLowerCase()] = {
        operationId: ep.name.replace(/\s+/g, '_').toLowerCase(),
        summary: ep.name,
        responses: { '200': { description: 'Success' } },
      };
    });
    const spec = { openapi: '3.0.3', info: { title: 'My API', version: '1.0.0' }, paths };
    setSchemaText(JSON.stringify(spec, null, 2));
  };

  const filtered = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  const score = validated ? Math.max(0, 100 - errorCount * 15 - warnCount * 5 - infoCount * 1) : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'OpenAPI Validation' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20', flex: 1 }]} onPress={loadFromEndpoints}>
              <MaterialCommunityIcons name="download" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>From Endpoints</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3FB95020', flex: 1 }]} onPress={() => { if (schemaText) Clipboard.setStringAsync(schemaText); }}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#3FB950" />
              <Text style={{ color: '#3FB950', fontSize: 13, fontWeight: '600' }}>Copy Schema</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.codeInput, { backgroundColor: cardBg, color: colors.text }]}
            value={schemaText}
            onChangeText={setSchemaText}
            placeholder='Paste your OpenAPI/Swagger JSON here...'
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.validateBtn, { backgroundColor: colors.primary, opacity: !schemaText.trim() || validating ? 0.5 : 1 }]}
            onPress={validate}
            disabled={!schemaText.trim() || validating}
          >
            {validating ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" />}
            <Text style={styles.validateBtnText}>{validating ? 'Validating...' : 'Validate Schema'}</Text>
          </TouchableOpacity>

          {validated && (
            <>
              {/* Score Card */}
              <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
                <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#3FB95020' : score >= 50 ? '#D2992220' : '#FF696120' }]}>
                  <Text style={[styles.scoreText, { color: score >= 80 ? '#3FB950' : score >= 50 ? '#D29922' : '#FF6961' }]}>{score}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scoreTitle, { color: colors.text }]}>
                    {score >= 80 ? 'Good' : score >= 50 ? 'Needs Improvement' : 'Poor'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {errorCount} errors, {warnCount} warnings, {infoCount} info
                  </Text>
                </View>
              </View>

              {/* Filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { key: 'all' as const, label: `All (${issues.length})`, color: colors.primary },
                    { key: 'error' as const, label: `Errors (${errorCount})`, color: '#FF6961' },
                    { key: 'warning' as const, label: `Warnings (${warnCount})`, color: '#D29922' },
                    { key: 'info' as const, label: `Info (${infoCount})`, color: '#58A6FF' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, { backgroundColor: filter === f.key ? f.color + '20' : cardBg, borderColor: filter === f.key ? f.color : 'transparent', borderWidth: 1.5 }]}
                      onPress={() => setFilter(f.key)}
                    >
                      <Text style={{ color: filter === f.key ? f.color : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Issues */}
              {filtered.map((issue, i) => (
                <View key={i} style={[styles.issueCard, { backgroundColor: cardBg, borderLeftColor: SEVERITY_COLORS[issue.severity] }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name={SEVERITY_ICONS[issue.severity] as any} size={18} color={SEVERITY_COLORS[issue.severity]} />
                    <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{issue.path}</Text>
                    <View style={{ marginLeft: 'auto', backgroundColor: SEVERITY_COLORS[issue.severity] + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: SEVERITY_COLORS[issue.severity], fontSize: 9, fontWeight: '800' }}>{issue.rule}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{issue.message}</Text>
                </View>
              ))}

              {filtered.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <MaterialCommunityIcons name="check-circle" size={48} color="#3FB950" />
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No issues found!</Text>
                </View>
              )}
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
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  codeInput: { borderRadius: 14, padding: 14, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minHeight: 160, lineHeight: 18 },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  validateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, marginTop: 16 },
  scoreBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 22, fontWeight: '800' },
  scoreTitle: { fontSize: 17, fontWeight: '700' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  issueCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
});
