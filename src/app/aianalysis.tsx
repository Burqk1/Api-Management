import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useCostGuardStore, simpleHash } from '../stores/costGuardStore';

const PROMPTS = [
  { key: 'analyzeError', icon: 'bug-outline', color: '#FF6961' },
  { key: 'suggestFix', icon: 'lightbulb-outline', color: '#FFD60A' },
  { key: 'explainResponse', icon: 'book-open-outline', color: '#58A6FF' },
  { key: 'generateDocs', icon: 'file-document-outline', color: '#3FB950' },
  { key: 'optimizeSuggestion', icon: 'rocket-launch-outline', color: '#BC8CFF' },
];

export default function AIAnalysisScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const params = useLocalSearchParams<{ logId?: string }>();
  const callLogs = useApiStore((s) => s.callLogs);
  const apiKeys = useApiStore((s) => s.apiKeys);
  const isPro = useAuthStore((s) => s.isPro);
  const requiresPro = useSubscriptionStore((s) => s.requiresPro);
  const { canUseAI, getRemainingAIRequests, getAIDailyLimit, incrementAIUsage, getCachedResponse, setCachedResponse, getOptimalModel } = useCostGuardStore();

  const log = callLogs.find((l) => l.id === params.logId);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardBg = isDark ? colors.surface : colors.card;

  const getApiKey = (): string | null => {
    // Look for an Anthropic/Claude API key in stored keys
    const claudeKey = apiKeys.find((k) =>
      k.service.toLowerCase().includes('anthropic') ||
      k.service.toLowerCase().includes('claude') ||
      k.name.toLowerCase().includes('claude')
    );
    return claudeKey?.key || null;
  };

  const callAI = async (promptType: string) => {
    if (requiresPro('aiAnalysis') && !isPro()) return;

    // Rate limit kontrolü
    if (!canUseAI()) {
      const limit = getAIDailyLimit();
      setResult(`Günlük AI limitinize ulaştınız (${limit} istek/gün). Yarın tekrar deneyebilirsiniz veya planınızı yükseltin.`);
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setResult(t('addClaudeKeyHint'));
      return;
    }

    setFromCache(false);

    const context = log
      ? `API Request:\n${log.method} ${log.url}\nStatus: ${log.statusCode}\nResponse Time: ${log.responseTime}ms\nResponse Body (first 2000 chars):\n${(log.responseBody || '').slice(0, 2000)}\n${log.errorMessage ? `Error: ${log.errorMessage}` : ''}`
      : 'No specific API request context provided.';

    const systemMsg = 'You are an API expert assistant inside a mobile API testing tool. Be concise and actionable. Use markdown formatting.';

    let userMsg = '';
    if (promptType === 'custom') {
      userMsg = `${context}\n\nUser question: ${customPrompt}`;
    } else if (promptType === 'analyzeError') {
      userMsg = `${context}\n\nAnalyze this API error. What went wrong? What are the likely causes?`;
    } else if (promptType === 'suggestFix') {
      userMsg = `${context}\n\nSuggest how to fix this API issue. Provide concrete code examples if applicable.`;
    } else if (promptType === 'explainResponse') {
      userMsg = `${context}\n\nExplain this API response in detail. What does each field mean? Is the response structure normal?`;
    } else if (promptType === 'generateDocs') {
      userMsg = `${context}\n\nGenerate API documentation for this endpoint based on the request and response.`;
    } else if (promptType === 'optimizeSuggestion') {
      userMsg = `${context}\n\nSuggest performance optimizations for this API call. Consider caching, payload size, query optimization.`;
    }

    // Cache kontrolü — aynı sorgu daha önce sorulduysa API'ye gitme
    const promptHash = simpleHash(promptType + userMsg);
    const cached = getCachedResponse(promptHash);
    if (cached) {
      setResult(cached);
      setFromCache(true);
      return;
    }

    setLoading(true);
    setResult('');

    // Model optimizasyonu — basit sorgularda ucuz model kullan
    const { model, maxTokens } = getOptimalModel(promptType);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemMsg,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      const data = await res.json();
      if (data.content?.[0]?.text) {
        const text = data.content[0].text;
        setResult(text);
        // Yanıtı cache'le ve kullanımı say
        setCachedResponse(promptHash, text, model);
        const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
        incrementAIUsage(tokensUsed || 500);
      } else if (data.error) {
        setResult(`Error: ${data.error.message}`);
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('aiAnalysis') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* Context Card */}
          {log && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('context').toUpperCase()}</Text>
              <View style={styles.contextRow}>
                <Text style={[styles.method, { color: log.success ? '#3FB950' : '#FF6961' }]}>{log.method}</Text>
                <Text style={[styles.contextUrl, { color: colors.text }]} numberOfLines={2}>{log.url}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {log.statusCode} · {log.responseTime}ms · {(log.responseSize / 1024).toFixed(1)}KB
                </Text>
              </View>
            </View>
          )}

          {/* AI Kullanım Durumu */}
          <View style={[styles.card, { backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                {getRemainingAIRequests()}/{getAIDailyLimit()} istek kaldı
              </Text>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? colors.systemGray5 : '#E5E5EA', marginTop: 4 }}>
                <View style={{ height: '100%', borderRadius: 2, backgroundColor: getRemainingAIRequests() > 3 ? '#3FB950' : getRemainingAIRequests() > 0 ? '#D29922' : '#FF6961', width: `${getAIDailyLimit() > 0 ? Math.round((getRemainingAIRequests() / getAIDailyLimit()) * 100) : 0}%` }} />
              </View>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>günlük</Text>
          </View>

          {/* Quick Prompts */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickPrompts')}</Text>
          {PROMPTS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.promptBtn, { backgroundColor: cardBg }]}
              onPress={() => callAI(p.key)}
              disabled={loading}
            >
              <View style={[styles.promptIcon, { backgroundColor: p.color + '18' }]}>
                <MaterialCommunityIcons name={p.icon as any} size={20} color={p.color} />
              </View>
              <Text style={[styles.promptText, { color: colors.text }]}>{t(p.key)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}

          {/* Custom Prompt */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>{t('askAnything')}</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.customInput, { backgroundColor: isDark ? colors.systemGray5 : '#F2F2F7', color: colors.text }]}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder={t('aiCustomPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: customPrompt.trim() && !loading ? 1 : 0.4 }]}
              onPress={() => callAI('custom')}
              disabled={!customPrompt.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="robot-outline" size={18} color="#FFF" />
                  <Text style={styles.sendText}>{t('analyze')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Result */}
          {(result || loading) && (
            <View style={[styles.resultCard, { backgroundColor: cardBg }]}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="robot-happy-outline" size={20} color={colors.primary} />
                <Text style={[styles.resultTitle, { color: colors.text }]}>{t('aiResult')}</Text>
                {fromCache && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3FB95020', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 'auto' }}>
                    <MaterialCommunityIcons name="lightning-bolt" size={12} color="#3FB950" />
                    <Text style={{ color: '#3FB950', fontSize: 10, fontWeight: '700' }}>CACHE</Text>
                  </View>
                )}
              </View>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('analyzing')}</Text>
                </View>
              ) : (
                <Text style={[styles.resultText, { color: colors.text }]} selectable>{result}</Text>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  method: { fontSize: 14, fontWeight: '800' },
  contextUrl: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  metaRow: { marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  promptBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8 },
  promptIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  promptText: { flex: 1, fontSize: 15, fontWeight: '600' },
  customInput: { borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultCard: { borderRadius: 14, padding: 16, marginTop: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  loadingBox: { alignItems: 'center', paddingVertical: 24 },
  resultText: { fontSize: 14, lineHeight: 22, fontFamily: 'monospace' },
});
