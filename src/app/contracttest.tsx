import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { METHOD_COLORS, HttpMethod } from '../types/api';
import { tryValidateSchema } from '../utils/schemaValidator';

interface ContractRule {
  expectedStatus: string;
  responseSchema: string;
  requiredHeaders: string;
  maxResponseTime: string;
}

interface ContractResult {
  statusCheck: { pass: boolean; expected: number; actual: number };
  schemaCheck: { pass: boolean; errors: string[] };
  headerChecks: { header: string; pass: boolean }[];
  responseTimeCheck: { pass: boolean; expected: number; actual: number };
  overallPass: boolean;
}

interface SavedContract {
  endpointId: string;
  contract: ContractRule;
}

const CONTRACTS_KEY = 'contracts';

export default function ContractTestScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const endpoints = useApiStore((s) => s.endpoints);
  const collections = useApiStore((s) => s.collections);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('');
  const [contract, setContract] = useState<ContractRule>({
    expectedStatus: '200',
    responseSchema: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
    requiredHeaders: '',
    maxResponseTime: '2000',
  });
  const [result, setResult] = useState<ContractResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);
  const [showEndpointPicker, setShowEndpointPicker] = useState(false);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId);

  // Load saved contracts on mount
  useEffect(() => {
    loadContracts();
  }, []);

  // Auto-load contract when endpoint changes
  useEffect(() => {
    if (selectedEndpointId) {
      const saved = savedContracts.find((c) => c.endpointId === selectedEndpointId);
      if (saved) {
        setContract(saved.contract);
      } else {
        setContract({
          expectedStatus: '200',
          responseSchema: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
          requiredHeaders: '',
          maxResponseTime: '2000',
        });
      }
      setResult(null);
    }
  }, [selectedEndpointId, savedContracts]);

  const loadContracts = async () => {
    try {
      const raw = await AsyncStorage.getItem(CONTRACTS_KEY);
      if (raw) setSavedContracts(JSON.parse(raw));
    } catch {}
  };

  const saveContract = async () => {
    if (!selectedEndpointId) {
      Alert.alert('Error', 'Please select an endpoint first.');
      return;
    }
    try {
      const updated = savedContracts.filter((c) => c.endpointId !== selectedEndpointId);
      updated.push({ endpointId: selectedEndpointId, contract });
      await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(updated));
      setSavedContracts(updated);
      Alert.alert('Saved', 'Contract saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const runContractTest = useCallback(async () => {
    if (!selectedEndpoint) {
      Alert.alert('Error', 'Please select an endpoint first.');
      return;
    }

    setLoading(true);
    setResult(null);

    const url = resolveVariables(selectedEndpoint.url);
    const method = selectedEndpoint.method;

    const headers: Record<string, string> = {};
    if (selectedEndpoint.headers) {
      selectedEndpoint.headers
        .filter((h) => h.enabled)
        .forEach((h) => {
          headers[resolveVariables(h.key)] = resolveVariables(h.value);
        });
    }

    const start = Date.now();
    let res: Response | null = null;
    let responseBody = '';
    let responseHeaders: Record<string, string> = {};
    let elapsed = 0;

    try {
      const fetchOpts: RequestInit = {
        method,
        headers,
      };
      if (method !== 'GET' && method !== 'HEAD' && selectedEndpoint.body) {
        fetchOpts.body = resolveVariables(selectedEndpoint.body);
      }

      res = await fetch(url, fetchOpts);
      elapsed = Date.now() - start;
      responseBody = await res.text();

      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    } catch (e: any) {
      elapsed = Date.now() - start;
      setResult({
        statusCheck: { pass: false, expected: parseInt(contract.expectedStatus, 10) || 200, actual: 0 },
        schemaCheck: { pass: false, errors: [`Network error: ${e.message}`] },
        headerChecks: [],
        responseTimeCheck: {
          pass: false,
          expected: parseInt(contract.maxResponseTime, 10) || 2000,
          actual: elapsed,
        },
        overallPass: false,
      });
      setLoading(false);
      return;
    }

    // 1. Status code check
    const expectedStatus = parseInt(contract.expectedStatus, 10) || 200;
    const statusPass = res.status === expectedStatus;

    // 2. Schema validation
    let schemaPass = true;
    let schemaErrors: string[] = [];
    if (contract.responseSchema.trim()) {
      const validation = tryValidateSchema(responseBody, contract.responseSchema);
      schemaPass = validation.valid;
      schemaErrors = validation.errors;
    }

    // 3. Header checks
    const requiredHeadersList = contract.requiredHeaders
      .split('\n')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const headerChecks = requiredHeadersList.map((header) => ({
      header,
      pass: header in responseHeaders,
    }));

    // 4. Response time check
    const maxTime = parseInt(contract.maxResponseTime, 10) || 2000;
    const timePass = elapsed <= maxTime;

    const headersAllPass = headerChecks.every((h) => h.pass);
    const overallPass = statusPass && schemaPass && headersAllPass && timePass;

    setResult({
      statusCheck: { pass: statusPass, expected: expectedStatus, actual: res.status },
      schemaCheck: { pass: schemaPass, errors: schemaErrors },
      headerChecks,
      responseTimeCheck: { pass: timePass, expected: maxTime, actual: elapsed },
      overallPass,
    });

    setLoading(false);
  }, [selectedEndpoint, contract, resolveVariables]);

  const getCollectionName = (collectionId: string) => {
    return collections.find((c) => c.id === collectionId)?.name || 'Unknown';
  };

  const renderPassFail = (pass: boolean) => (
    <View style={[styles.badge, { backgroundColor: pass ? '#3FB950' + '20' : '#F85149' + '20' }]}>
      <MaterialCommunityIcons
        name={pass ? 'check-circle' : 'close-circle'}
        size={14}
        color={pass ? '#3FB950' : '#F85149'}
      />
      <Text style={[styles.badgeText, { color: pass ? '#3FB950' : '#F85149' }]}>
        {pass ? 'PASS' : 'FAIL'}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('contractTesting') || 'Contract Testing' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Endpoint Selector */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('selectEndpoint') || 'Select Endpoint'}
          </Text>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setShowEndpointPicker(!showEndpointPicker)}
          >
            {selectedEndpoint ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[selectedEndpoint.method as HttpMethod] || '#8B949E') + '20' }]}>
                  <Text style={[styles.methodBadgeText, { color: METHOD_COLORS[selectedEndpoint.method as HttpMethod] || '#8B949E' }]}>
                    {selectedEndpoint.method}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.epName, { color: colors.text }]} numberOfLines={1}>{selectedEndpoint.name}</Text>
                  <Text style={[styles.epUrl, { color: colors.textTertiary }]} numberOfLines={1}>{selectedEndpoint.url}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textTertiary, fontSize: 15 }}>
                {t('tapToSelectEndpoint') || 'Tap to select an endpoint...'}
              </Text>
            )}
            <MaterialCommunityIcons
              name={showEndpointPicker ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Endpoint List */}
          {showEndpointPicker && (
            <View style={[styles.card, { backgroundColor: cardBg, marginTop: 8, maxHeight: 300 }]}>
              <ScrollView nestedScrollEnabled>
                {endpoints.length === 0 ? (
                  <Text style={{ color: colors.textTertiary, fontSize: 14, padding: 8 }}>
                    {t('noEndpoints') || 'No endpoints available. Add endpoints in your collections first.'}
                  </Text>
                ) : (
                  endpoints.map((ep, idx) => (
                    <TouchableOpacity
                      key={ep.id}
                      style={[
                        styles.epPickerRow,
                        selectedEndpointId === ep.id && { backgroundColor: colors.primary + '10' },
                        idx < endpoints.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                      ]}
                      onPress={() => {
                        setSelectedEndpointId(ep.id);
                        setShowEndpointPicker(false);
                      }}
                    >
                      <View style={[styles.methodBadge, { backgroundColor: (METHOD_COLORS[ep.method as HttpMethod] || '#8B949E') + '20' }]}>
                        <Text style={[styles.methodBadgeText, { color: METHOD_COLORS[ep.method as HttpMethod] || '#8B949E' }]}>
                          {ep.method}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.epName, { color: colors.text }]} numberOfLines={1}>{ep.name}</Text>
                        <Text style={[styles.epUrl, { color: colors.textTertiary }]} numberOfLines={1}>
                          {getCollectionName(ep.collectionId)} - {ep.url}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Contract Definition */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={colors.primary} />
            {'  '}{t('defineContract') || 'Define Contract'}
          </Text>

          {/* Expected Status Code */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>
            {t('expectedStatusCode') || 'Expected Status Code'}
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={contract.expectedStatus}
              onChangeText={(v) => setContract({ ...contract, expectedStatus: v })}
              placeholder="200"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Response Body Schema */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
            {t('responseBodySchema') || 'Response Body JSON Schema'}
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
              value={contract.responseSchema}
              onChangeText={(v) => setContract({ ...contract, responseSchema: v })}
              placeholder={'{\n  "type": "object",\n  "required": ["id", "name"],\n  "properties": {\n    "id": { "type": "integer" },\n    "name": { "type": "string" }\n  }\n}'}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Required Headers */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
            {t('requiredHeaders') || 'Required Headers (one per line)'}
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.metaInput, { backgroundColor: inputBg, color: colors.text }]}
              value={contract.requiredHeaders}
              onChangeText={(v) => setContract({ ...contract, requiredHeaders: v })}
              placeholder={'content-type\nx-request-id\ncache-control'}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Max Response Time */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
            {t('maxResponseTime') || 'Max Response Time (ms)'}
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
              value={contract.maxResponseTime}
              onChangeText={(v) => setContract({ ...contract, maxResponseTime: v })}
              placeholder="2000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary + '20' }]}
              onPress={saveContract}
            >
              <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.primary} />
              <Text style={[styles.saveBtnText, { color: colors.primary }]}>
                {t('saveContract') || 'Save Contract'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={runContractTest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialCommunityIcons name="play-circle-outline" size={20} color="#FFF" />
              )}
              <Text style={styles.runBtnText}>
                {loading
                  ? (t('running') || 'Running...')
                  : (t('runContractTest') || 'Run Contract Test')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Results Panel */}
          {result && (
            <View style={{ marginTop: 20 }}>
              {/* Overall Result Banner */}
              <View
                style={[
                  styles.resultBanner,
                  { backgroundColor: result.overallPass ? '#3FB950' + '15' : '#F85149' + '15', borderColor: result.overallPass ? '#3FB950' + '40' : '#F85149' + '40' },
                ]}
              >
                <MaterialCommunityIcons
                  name={result.overallPass ? 'shield-check' : 'shield-alert'}
                  size={28}
                  color={result.overallPass ? '#3FB950' : '#F85149'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultBannerTitle, { color: result.overallPass ? '#3FB950' : '#F85149' }]}>
                    {result.overallPass
                      ? (t('contractPassed') || 'Contract Test Passed')
                      : (t('contractFailed') || 'Contract Test Failed')}
                  </Text>
                  <Text style={[styles.resultBannerSub, { color: colors.textSecondary }]}>
                    {result.overallPass
                      ? (t('allRulesPassed') || 'All contract rules passed successfully.')
                      : (t('someRulesFailed') || 'One or more contract rules did not pass.')}
                  </Text>
                </View>
              </View>

              {/* Detailed Results */}
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
                {t('detailedResults') || 'Detailed Results'}
              </Text>

              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {/* Status Code */}
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="numeric" size={18} color={colors.primary} />
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        {t('statusCode') || 'Status Code'}
                      </Text>
                    </View>
                    <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>
                      Expected: {result.statusCheck.expected} | Actual: {result.statusCheck.actual}
                    </Text>
                  </View>
                  {renderPassFail(result.statusCheck.pass)}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                {/* Schema Validation */}
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="code-braces" size={18} color={colors.primary} />
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        {t('schemaValidation') || 'Schema Validation'}
                      </Text>
                    </View>
                    {result.schemaCheck.errors.length > 0 ? (
                      result.schemaCheck.errors.map((err, i) => (
                        <Text key={i} style={[styles.errorLine, { color: '#F85149' }]}>
                          {err}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>
                        {t('schemaMatches') || 'Response matches the defined JSON Schema.'}
                      </Text>
                    )}
                  </View>
                  {renderPassFail(result.schemaCheck.pass)}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                {/* Header Checks */}
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="format-list-checks" size={18} color={colors.primary} />
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        {t('headerChecks') || 'Required Headers'}
                      </Text>
                    </View>
                    {result.headerChecks.length === 0 ? (
                      <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>
                        {t('noHeadersDefined') || 'No required headers defined.'}
                      </Text>
                    ) : (
                      result.headerChecks.map((hc, i) => (
                        <View key={i} style={styles.headerCheckRow}>
                          <MaterialCommunityIcons
                            name={hc.pass ? 'check' : 'close'}
                            size={14}
                            color={hc.pass ? '#3FB950' : '#F85149'}
                          />
                          <Text style={[styles.headerCheckText, { color: hc.pass ? colors.textSecondary : '#F85149' }]}>
                            {hc.header}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                  {renderPassFail(
                    result.headerChecks.length === 0 || result.headerChecks.every((h) => h.pass)
                  )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                {/* Response Time */}
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        {t('responseTime') || 'Response Time'}
                      </Text>
                    </View>
                    <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>
                      Max: {result.responseTimeCheck.expected}ms | Actual: {result.responseTimeCheck.actual}ms
                    </Text>
                  </View>
                  {renderPassFail(result.responseTimeCheck.pass)}
                </View>
              </View>
            </View>
          )}

          {/* Info Card */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {t('aboutContractTesting') || 'About Contract Testing'}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('contractTestingInfo') ||
                'Contract testing validates that an API response conforms to a predefined contract. ' +
                'Define the expected status code, response body JSON Schema, required headers, and maximum ' +
                'response time. The test sends a real HTTP request and checks each rule against the actual response. ' +
                'Contracts are saved per endpoint for repeated validation.'}
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
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  card: { borderRadius: 14, padding: 14 },
  input: { borderRadius: 10, padding: 12, fontSize: 15 },
  textArea: {
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    minHeight: 180,
  },
  metaInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    minHeight: 60,
  },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  methodBadgeText: { fontSize: 11, fontWeight: '700' },
  epPickerRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderRadius: 8 },
  epName: { fontSize: 15, fontWeight: '600' },
  epUrl: { fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
  runBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  runBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultBannerTitle: { fontSize: 17, fontWeight: '700' },
  resultBannerSub: { fontSize: 13, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 12 },
  resultLabel: { fontSize: 15, fontWeight: '600' },
  resultDetail: { fontSize: 13, marginTop: 4, marginLeft: 26 },
  errorLine: { fontSize: 12, marginTop: 4, marginLeft: 26, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  divider: { height: StyleSheet.hairlineWidth },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  headerCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 26 },
  headerCheckText: { fontSize: 13 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },
});
