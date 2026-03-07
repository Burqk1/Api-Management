import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';
import * as Clipboard from 'expo-clipboard';

const FIRST_NAMES = ['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
  'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen',
  'Christopher','Lisa','Daniel','Nancy','Matthew','Betty'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Clark'];
const CITIES = ['New York','London','Tokyo','Paris','Berlin','Sydney','Toronto','Dubai','Singapore','Mumbai',
  'Istanbul','Moscow','Cairo','Bangkok','Seoul','Madrid','Rome','Lagos','Lima','Nairobi',
  'Chicago','Amsterdam','Vienna','Prague','Warsaw'];
const COUNTRIES = ['United States','United Kingdom','Japan','France','Germany','Australia','Canada','UAE','Singapore','India',
  'Turkey','Russia','Egypt','Thailand','South Korea','Spain','Italy','Nigeria','Peru','Kenya',
  'Brazil','Netherlands','Austria','Czech Republic','Poland'];
const STREETS = ['Main St','Oak Ave','Maple Dr','Cedar Ln','Pine Rd','Elm St','Washington Blvd','Park Ave',
  'Lake Dr','Hill St','River Rd','Forest Ave','Sunset Blvd','Broadway','Highland Ave',
  'Valley Rd','Church St','Mill Rd','Spring St','Academy St'];
const STATES = ['California','Texas','Florida','New York','Illinois','Pennsylvania','Ohio','Georgia','Michigan','Virginia',
  'Washington','Arizona','Massachusetts','Tennessee','Indiana','Missouri','Maryland','Wisconsin','Colorado','Minnesota',
  'Oregon','Nevada','Connecticut','Utah','Iowa'];
const LOREM = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do',
  'eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim',
  'ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris'];
const CURRENCIES = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','INR','KRW','BRL','MXN','SEK','NZD','SGD','HKD','NOK','TRY','ZAR','THB'];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/17.0',
  'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
];
const DOMAINS = ['example.com','test.org','demo.net','sample.io','myapp.dev','api.cloud','data.info','web.app'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const hex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const padZ = (n: number, len = 2) => String(n).padStart(len, '0');

type Category = 'Person' | 'Address' | 'Internet' | 'Finance' | 'Date' | 'Text' | 'Custom';

const CATEGORY_ICONS: Record<Category, string> = {
  Person: 'account', Address: 'map-marker', Internet: 'web', Finance: 'credit-card',
  Date: 'calendar', Text: 'format-text', Custom: 'tune-variant',
};
const CATEGORY_COLORS: Record<Category, string> = {
  Person: '#58A6FF', Address: '#3FB950', Internet: '#D29922', Finance: '#BC8CFF',
  Date: '#F778BA', Text: '#F0883E', Custom: '#79C0FF',
};
const CATEGORIES: Category[] = ['Person', 'Address', 'Internet', 'Finance', 'Date', 'Text'];

const generators: Record<Category, Record<string, () => string>> = {
  Person: {
    'Full Name': () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    'First Name': () => pick(FIRST_NAMES),
    'Last Name': () => pick(LAST_NAMES),
    'Email': () => `${pick(FIRST_NAMES).toLowerCase()}${randInt(1, 999)}@${pick(DOMAINS)}`,
    'Phone': () => `+1-${randInt(200, 999)}-${randInt(100, 999)}-${randInt(1000, 9999)}`,
    'Username': () => `${pick(FIRST_NAMES).toLowerCase()}_${pick(LAST_NAMES).toLowerCase()}${randInt(1, 99)}`,
    'Avatar URL': () => `https://i.pravatar.cc/150?u=${hex(8)}`,
  },
  Address: {
    'Street': () => `${randInt(1, 9999)} ${pick(STREETS)}`,
    'City': () => pick(CITIES),
    'State': () => pick(STATES),
    'Country': () => pick(COUNTRIES),
    'Zip Code': () => `${randInt(10000, 99999)}`,
    'Full Address': () => `${randInt(1, 9999)} ${pick(STREETS)}, ${pick(CITIES)}, ${pick(STATES)} ${randInt(10000, 99999)}`,
    'Lat/Lng': () => `${(Math.random() * 180 - 90).toFixed(6)}, ${(Math.random() * 360 - 180).toFixed(6)}`,
  },
  Internet: {
    'URL': () => `https://${pick(DOMAINS)}/${hex(6)}`,
    'Domain': () => pick(DOMAINS),
    'IPv4': () => `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
    'IPv6': () => Array.from({ length: 8 }, () => hex(4)).join(':'),
    'User Agent': () => pick(USER_AGENTS),
    'MAC Address': () => Array.from({ length: 6 }, () => hex(2).toUpperCase()).join(':'),
    'UUID': () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`,
  },
  Finance: {
    'Credit Card': () => `4${Array.from({ length: 3 }, () => padZ(randInt(0, 9999), 4)).join(' ')}`,
    'IBAN': () => `${pick(['DE', 'GB', 'FR', 'NL', 'ES'])}${randInt(10, 99)}${hex(18).toUpperCase().slice(0, 18)}`,
    'Currency Code': () => pick(CURRENCIES),
    'Bitcoin Address': () => `1${hex(32).slice(0, 33)}`,
    'Amount': () => `${pick(CURRENCIES)} ${(Math.random() * 10000).toFixed(2)}`,
  },
  Date: {
    'Past Date': () => { const d = new Date(); d.setDate(d.getDate() - randInt(1, 365)); return d.toISOString().split('T')[0]; },
    'Future Date': () => { const d = new Date(); d.setDate(d.getDate() + randInt(1, 365)); return d.toISOString().split('T')[0]; },
    'Recent Date': () => { const d = new Date(); d.setDate(d.getDate() - randInt(0, 7)); return d.toISOString().split('T')[0]; },
    'ISO Timestamp': () => new Date(Date.now() - randInt(0, 86400000 * 30)).toISOString(),
    'Unix Timestamp': () => `${Math.floor((Date.now() - randInt(0, 86400000 * 365)) / 1000)}`,
  },
  Text: {
    'Lorem Sentence': () => { const w = Array.from({ length: randInt(6, 14) }, () => pick(LOREM)); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; },
    'Lorem Paragraph': () => Array.from({ length: randInt(3, 6) }, () => { const w = Array.from({ length: randInt(6, 12) }, () => pick(LOREM)); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; }).join(' '),
    'Random Word': () => pick(LOREM),
    'Slug': () => Array.from({ length: randInt(2, 4) }, () => pick(LOREM)).join('-'),
    'Hex Color': () => `#${hex(6).toUpperCase()}`,
  },
  Custom: {},
};

export default function FakeGenScreen() {
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);
  const cardBg = isDark ? colors.surface : colors.card;
  const inputBg = isDark ? colors.systemGray5 : '#F2F2F7';

  const [activeCategory, setActiveCategory] = useState<Category>('Person');
  const [output, setOutput] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [arrayCount, setArrayCount] = useState('5');
  const [copied, setCopied] = useState(false);

  const currentGens = generators[activeCategory];
  const genEntries = Object.entries(currentGens);

  const handleGenerate = (name: string) => {
    const value = currentGens[name]();
    Clipboard.setStringAsync(value);
    setOutput(value);
    setCopiedField(name);
    setTimeout(() => setCopiedField(''), 1500);
  };

  const handleGenerateAll = () => {
    const obj: Record<string, string> = {};
    for (const [name, fn] of genEntries) {
      obj[name.replace(/[\s\/]/g, '_').toLowerCase()] = fn();
    }
    const json = JSON.stringify(obj, null, 2);
    setOutput(json);
  };

  const handleGenerateArray = () => {
    const count = Math.max(1, Math.min(100, parseInt(arrayCount) || 5));
    const arr = Array.from({ length: count }, () => {
      const obj: Record<string, string> = {};
      for (const [name, fn] of genEntries) {
        obj[name.replace(/[\s\/]/g, '_').toLowerCase()] = fn();
      }
      return obj;
    });
    setOutput(JSON.stringify(arr, null, 2));
  };

  const handleCopyOutput = () => {
    if (!output) return;
    Clipboard.setStringAsync(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleQuickTemplate = () => {
    const user = {
      id: hex(8),
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email: `${pick(FIRST_NAMES).toLowerCase()}${randInt(1, 99)}@${pick(DOMAINS)}`,
      phone: `+1-${randInt(200, 999)}-${randInt(100, 999)}-${randInt(1000, 9999)}`,
      address: { street: `${randInt(1, 9999)} ${pick(STREETS)}`, city: pick(CITIES), state: pick(STATES), zip: `${randInt(10000, 99999)}`, country: pick(COUNTRIES) },
      username: `${pick(FIRST_NAMES).toLowerCase()}${randInt(1, 99)}`,
      avatar: `https://i.pravatar.cc/150?u=${hex(8)}`,
      created_at: new Date(Date.now() - randInt(0, 86400000 * 365)).toISOString(),
    };
    setOutput(JSON.stringify(user, null, 2));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Fake Data Generator' }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              const clr = CATEGORY_COLORS[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.chip, { backgroundColor: active ? clr : cardBg, borderColor: clr }]}
                >
                  <MaterialCommunityIcons name={CATEGORY_ICONS[cat] as any} size={14} color={active ? '#fff' : clr} />
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Generator Buttons */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeCategory} Generators</Text>
            <View style={styles.genGrid}>
              {genEntries.map(([name]) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => handleGenerate(name)}
                  style={[styles.genBtn, { backgroundColor: CATEGORY_COLORS[activeCategory] + '18' }]}
                >
                  <Text style={[styles.genBtnText, { color: CATEGORY_COLORS[activeCategory] }]}>
                    {copiedField === name ? 'Copied!' : name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleGenerateAll} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="auto-fix" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Generate All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleQuickTemplate} style={[styles.actionBtn, { backgroundColor: '#3FB950' }]}>
              <MaterialCommunityIcons name="account-box-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Fake User</Text>
            </TouchableOpacity>
          </View>

          {/* Generate Array */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Generate Array</Text>
            <View style={styles.arrayRow}>
              <TextInput
                style={[styles.arrayInput, { backgroundColor: inputBg, color: colors.text }]}
                value={arrayCount}
                onChangeText={setArrayCount}
                keyboardType="number-pad"
                placeholder="Count (1-100)"
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity onPress={handleGenerateArray} style={[styles.arrayBtn, { backgroundColor: CATEGORY_COLORS[activeCategory] }]}>
                <MaterialCommunityIcons name="code-array" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Output */}
          {output.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg, marginTop: 14 }]}>
              <View style={styles.outputHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>Output</Text>
                <TouchableOpacity onPress={handleCopyOutput} style={[styles.copyBtn, { backgroundColor: colors.primary + '18' }]}>
                  <MaterialCommunityIcons
                    name={copied ? 'check-circle' : 'content-copy'}
                    size={16}
                    color={copied ? '#3FB950' : colors.primary}
                  />
                  <Text style={{ color: copied ? '#3FB950' : colors.primary, fontSize: 12, fontWeight: '600' }}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal>
                <Text selectable style={[styles.outputText, { color: colors.textSecondary }]}>{output}</Text>
              </ScrollView>
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
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 14, padding: 14, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, letterSpacing: -0.3 },
  genGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  genBtnText: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  arrayRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  arrayInput: { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  arrayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  outputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  outputText: {
    fontSize: 12, lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
