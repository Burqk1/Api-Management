import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import { useApiStore } from '../stores/apiStore';
import { HttpMethod, METHOD_COLORS } from '../types/api';

interface Template {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
}

const TEMPLATES: { category: string; icon: string; color: string; items: Template[] }[] = [
  {
    category: 'REST CRUD',
    icon: 'database',
    color: '#58A6FF',
    items: [
      {
        name: 'GET List',
        description: 'Fetch a list of resources',
        method: 'GET',
        path: '/api/resources',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
      {
        name: 'GET Detail',
        description: 'Fetch a single resource by ID',
        method: 'GET',
        path: '/api/resources/:id',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
      {
        name: 'POST Create',
        description: 'Create a new resource',
        method: 'POST',
        path: '/api/resources',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
        body: '{\n  "name": "",\n  "description": ""\n}',
      },
      {
        name: 'PUT Update',
        description: 'Update a resource by ID',
        method: 'PUT',
        path: '/api/resources/:id',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
        body: '{\n  "name": "",\n  "description": ""\n}',
      },
      {
        name: 'DELETE Remove',
        description: 'Delete a resource by ID',
        method: 'DELETE',
        path: '/api/resources/:id',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
    ],
  },
  {
    category: 'Authentication',
    icon: 'shield-lock-outline',
    color: '#3FB950',
    items: [
      {
        name: 'Login',
        description: 'User login with credentials',
        method: 'POST',
        path: '/api/auth/login',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{\n  "email": "",\n  "password": ""\n}',
      },
      {
        name: 'Register',
        description: 'User registration',
        method: 'POST',
        path: '/api/auth/register',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{\n  "name": "",\n  "email": "",\n  "password": ""\n}',
      },
      {
        name: 'Refresh Token',
        description: 'Refresh access token',
        method: 'POST',
        path: '/api/auth/refresh',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{\n  "refreshToken": ""\n}',
      },
      {
        name: 'Get Profile',
        description: 'Get authenticated user profile',
        method: 'GET',
        path: '/api/auth/me',
        headers: [
          { key: 'Authorization', value: 'Bearer {{TOKEN}}', enabled: true },
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
        body: '',
      },
    ],
  },
  {
    category: 'Upload & Files',
    icon: 'file-upload-outline',
    color: '#D29922',
    items: [
      {
        name: 'File Upload',
        description: 'Upload a file (multipart)',
        method: 'POST',
        path: '/api/upload',
        headers: [{ key: 'Content-Type', value: 'multipart/form-data', enabled: true }],
        body: '',
      },
      {
        name: 'Download File',
        description: 'Download a file by ID',
        method: 'GET',
        path: '/api/files/:id/download',
        headers: [],
        body: '',
      },
    ],
  },
  {
    category: 'Search & Filter',
    icon: 'magnify',
    color: '#BC8CFF',
    items: [
      {
        name: 'Search',
        description: 'Search with query params',
        method: 'GET',
        path: '/api/search?q=keyword&page=1&limit=20',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
      {
        name: 'Filter & Paginate',
        description: 'Filter with pagination',
        method: 'GET',
        path: '/api/resources?status=active&sort=createdAt&order=desc&page=1&limit=10',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
    ],
  },
  {
    category: 'GraphQL',
    icon: 'graphql',
    color: '#E535AB',
    items: [
      {
        name: 'GraphQL Query',
        description: 'Basic GraphQL query',
        method: 'POST',
        path: '/graphql',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{\n  "query": "query { users { id name email } }"\n}',
      },
      {
        name: 'GraphQL Mutation',
        description: 'GraphQL mutation',
        method: 'POST',
        path: '/graphql',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{\n  "query": "mutation { createUser(input: { name: \\"Test\\" }) { id } }"\n}',
      },
    ],
  },
];

export default function TemplatesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const collections = useApiStore((s) => s.collections);
  const addEndpoint = useApiStore((s) => s.addEndpoint);

  const cardBg = isDark ? colors.surface : colors.card;

  const applyTemplate = (template: Template) => {
    if (collections.length === 0) {
      Alert.alert(t('error'), t('createFirstCollectionHint'));
      return;
    }

    const colId = collections[0].id;
    const ep = addEndpoint({
      name: template.name,
      url: template.path,
      method: template.method,
      headers: template.headers,
      body: template.body,
      collectionId: colId,
      assertions: [],
    });
    router.push(`/endpoint/${ep.id}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('templates') }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {TEMPLATES.map((section) => (
            <View key={section.category} style={{ marginTop: 20 }}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name={section.icon as any} size={20} color={section.color} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.category}</Text>
              </View>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                {section.items.map((template, i) => (
                  <TouchableOpacity
                    key={template.name}
                    onPress={() => applyTemplate(template)}
                    style={[
                      styles.templateRow,
                      i < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                    ]}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[template.method] + '20' }]}>
                      <Text style={[styles.methodText, { color: METHOD_COLORS[template.method] }]}>{template.method}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                      <Text style={[styles.templateDesc, { color: colors.textTertiary }]}>{template.description}</Text>
                    </View>
                    <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },
  templateRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  methodText: { fontSize: 10, fontWeight: '700' },
  templateName: { fontSize: 15, fontWeight: '600' },
  templateDesc: { fontSize: 12, marginTop: 2 },
});
