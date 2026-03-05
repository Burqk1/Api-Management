import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { HttpMethod, METHOD_COLORS } from '../types/api';

interface ChainStep {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
  extractVar?: string; // JSONPath to extract from response
  extractAs?: string;  // Variable name to store extracted value
}

interface StepResult {
  stepId: string;
  status: number;
  time: number;
  body: string;
  extracted?: string;
  error?: string;
}

let idCounter = 0;
const makeId = () => `step_${Date.now()}_${++idCounter}`;

export default function ChainingScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const addCallLog = useApiStore((s) => s.addCallLog);
  const resolveVariables = useEnvironmentStore((s) => s.resolveVariables);

  const [steps, setSteps] = useState<ChainStep[]>([
    { id: makeId(), name: 'Step 1', method: 'GET', url: '', headers: '', body: '', extractVar: '', extractAs: '' },
  ]);
  const [results, setResults] = useState<StepResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const addStep = () => {
    const n = steps.length + 1;
    setSteps([...steps, { id: makeId(), name: `Step ${n}`, method: 'GET', url: '', headers: '', body: '', extractVar: '', extractAs: '' }]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<ChainStep>) => {
    setSteps(steps.map((s) => s.id === id ? { ...s, ...patch } : s));
  };

  const extractJsonPath = (json: string, path: string): string => {
    try {
      const obj = JSON.parse(json);
      const keys = path.replace(/^\$\.?/, '').split('.');
      let val: any = obj;
      for (const k of keys) {
        if (val == null) return '';
        const arrMatch = k.match(/^(.+)\[(\d+)\]$/);
        if (arrMatch) {
          val = val[arrMatch[1]]?.[Number(arrMatch[2])];
        } else {
          val = val[k];
        }
      }
      return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
    } catch {
      return '';
    }
  };

  const runChain = async () => {
    setRunning(true);
    setResults([]);
    const chainVars: Record<string, string> = {};

    for (const step of steps) {
      let url = resolveVariables(step.url);
      let body = step.body;
      let headers = step.headers;

      // Replace chain variables like {{chain.varName}}
      Object.entries(chainVars).forEach(([k, v]) => {
        const pattern = new RegExp(`\\{\\{chain\\.${k}\\}\\}`, 'g');
        url = url.replace(pattern, v);
        body = body.replace(pattern, v);
        headers = headers.replace(pattern, v);
      });

      const start = Date.now();
      try {
        const reqHeaders: Record<string, string> = {};
        if (headers.trim()) {
          headers.split('\n').forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > 0) reqHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          });
        }

        const opts: RequestInit = { method: step.method, headers: reqHeaders };
        if (body.trim() && !['GET', 'HEAD', 'OPTIONS'].includes(step.method)) {
          opts.body = body;
        }

        const res = await fetch(url, opts);
        const resBody = await res.text();
        const elapsed = Date.now() - start;

        let extracted: string | undefined;
        if (step.extractVar && step.extractAs) {
          extracted = extractJsonPath(resBody, step.extractVar);
          chainVars[step.extractAs] = extracted;
        }

        setResults((prev) => [...prev, { stepId: step.id, status: res.status, time: elapsed, body: resBody.slice(0, 5000), extracted }]);

        addCallLog({
          endpointId: '',
          endpointName: `Chain: ${step.name}`,
          collectionId: '',
          url,
          method: step.method,
          statusCode: res.status,
          responseTime: elapsed,
          responseSize: resBody.length,
          success: res.status >= 200 && res.status < 400,
          timestamp: Date.now(),
          responseBody: resBody.slice(0, 50000),
        });
      } catch (err: any) {
        const elapsed = Date.now() - start;
        setResults((prev) => [...prev, { stepId: step.id, status: 0, time: elapsed, body: '', error: err.message }]);
        break; // Stop chain on error
      }
    }
    setRunning(false);
  };

  const getResult = (stepId: string) => results.find((r) => r.stepId === stepId);

  return (
    <>
      <Stack.Screen options={{ title: t('requestChaining') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '12' }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('chainingHint')}
            </Text>
          </View>

          {/* Steps */}
          {steps.map((step, i) => {
            const res = getResult(step.id);
            const isExpanded = expandedStep === step.id;
            return (
              <View key={step.id}>
                {i > 0 && (
                  <View style={styles.connector}>
                    <MaterialCommunityIcons name="arrow-down" size={20} color={colors.textTertiary} />
                    {step.extractAs && (
                      <Text style={[styles.varTag, { color: colors.primary }]}>
                        {'{{chain.' + (steps[i - 1]?.extractAs || '') + '}}'}
                      </Text>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.stepCard, { backgroundColor: cardBg, borderLeftColor: res ? (res.error ? '#FF6961' : '#3FB950') : colors.textTertiary }]}
                  onPress={() => setExpandedStep(isExpanded ? null : step.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNum, { backgroundColor: METHOD_COLORS[step.method] + '20' }]}>
                      <Text style={[styles.stepNumText, { color: METHOD_COLORS[step.method] }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.stepName, { color: colors.text }]}
                      value={step.name}
                      onChangeText={(v) => updateStep(step.id, { name: v })}
                      placeholder="Step name"
                      placeholderTextColor={colors.textTertiary}
                    />
                    {res && (
                      <Text style={{ color: res.error ? '#FF6961' : '#3FB950', fontSize: 13, fontWeight: '700' }}>
                        {res.error ? 'ERR' : res.status} · {res.time}ms
                      </Text>
                    )}
                    {steps.length > 1 && (
                      <TouchableOpacity onPress={() => removeStep(step.id)}>
                        <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.stepBody}>
                      {/* Method */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                            <TouchableOpacity
                              key={m}
                              onPress={() => updateStep(step.id, { method: m })}
                              style={[styles.methodChip, { backgroundColor: step.method === m ? METHOD_COLORS[m] + '25' : inputBg }]}
                            >
                              <Text style={{ color: step.method === m ? METHOD_COLORS[m] : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{m}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>

                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                        value={step.url}
                        onChangeText={(v) => updateStep(step.id, { url: v })}
                        placeholder="https://api.example.com/..."
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="none"
                      />

                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, minHeight: 50 }]}
                        value={step.headers}
                        onChangeText={(v) => updateStep(step.id, { headers: v })}
                        placeholder="Content-Type: application/json"
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        autoCapitalize="none"
                      />

                      {!['GET', 'HEAD', 'OPTIONS'].includes(step.method) && (
                        <TextInput
                          style={[styles.input, { backgroundColor: inputBg, color: colors.text, minHeight: 60 }]}
                          value={step.body}
                          onChangeText={(v) => updateStep(step.id, { body: v })}
                          placeholder='{"key": "value"}'
                          placeholderTextColor={colors.textTertiary}
                          multiline
                          autoCapitalize="none"
                        />
                      )}

                      {/* Extract */}
                      <View style={[styles.extractRow]}>
                        <Text style={[styles.extractLabel, { color: colors.textSecondary }]}>{t('extract')}:</Text>
                        <TextInput
                          style={[styles.extractInput, { backgroundColor: inputBg, color: colors.text }]}
                          value={step.extractVar}
                          onChangeText={(v) => updateStep(step.id, { extractVar: v })}
                          placeholder="$.data.token"
                          placeholderTextColor={colors.textTertiary}
                          autoCapitalize="none"
                        />
                        <Text style={[styles.extractLabel, { color: colors.textSecondary }]}>{t('as')}:</Text>
                        <TextInput
                          style={[styles.extractInput, { backgroundColor: inputBg, color: colors.text }]}
                          value={step.extractAs}
                          onChangeText={(v) => updateStep(step.id, { extractAs: v })}
                          placeholder="token"
                          placeholderTextColor={colors.textTertiary}
                          autoCapitalize="none"
                        />
                      </View>

                      {/* Result */}
                      {res && (
                        <View style={[styles.resultBox, { backgroundColor: inputBg }]}>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{t('response')}</Text>
                          {res.extracted && (
                            <Text style={{ color: colors.primary, fontSize: 12, marginBottom: 4 }}>
                              Extracted: {res.extracted}
                            </Text>
                          )}
                          <Text style={{ color: colors.text, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={10}>
                            {res.error || res.body.slice(0, 1000)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add Step */}
          <TouchableOpacity style={[styles.addBtn, { borderColor: colors.textTertiary }]} onPress={addStep}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('addStep')}</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Run Button */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: colors.primary, opacity: running ? 0.6 : 1 }]}
            onPress={runChain}
            disabled={running}
          >
            {running ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={20} color="#FFF" />
                <Text style={styles.runText}>{t('runChain')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13 },
  connector: { alignItems: 'center', paddingVertical: 4 },
  varTag: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  stepCard: { borderRadius: 14, padding: 14, marginBottom: 4, borderLeftWidth: 3 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 14, fontWeight: '800' },
  stepName: { flex: 1, fontSize: 15, fontWeight: '600' },
  stepBody: { marginTop: 12, gap: 8 },
  methodChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'monospace' },
  extractRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  extractLabel: { fontSize: 12, fontWeight: '600' },
  extractInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontFamily: 'monospace' },
  resultBox: { borderRadius: 8, padding: 10, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginTop: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 40 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  runText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
