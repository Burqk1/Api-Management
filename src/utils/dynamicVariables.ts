import { generateId } from '../types/api';

const dynamicVarHandlers: Record<string, () => string> = {
  $timestamp: () => String(Date.now()),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => String(Math.floor(Math.random() * 1000000)),
  $randomFloat: () => (Math.random() * 1000).toFixed(4),
  $guid: () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  },
  $randomUUID: () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-4${s4().slice(1)}-${s4()}-${s4()}${s4()}${s4()}`;
  },
  $randomEmail: () => {
    const names = ['john', 'jane', 'alex', 'sam', 'chris', 'pat', 'taylor', 'morgan'];
    const domains = ['example.com', 'test.com', 'demo.org', 'mail.com'];
    return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 999)}@${domains[Math.floor(Math.random() * domains.length)]}`;
  },
  $randomName: () => {
    const first = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Pat', 'Taylor', 'Morgan', 'Jordan', 'Casey'];
    const last = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Clark', 'Lee', 'Hall'];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  },
  $randomBoolean: () => String(Math.random() > 0.5),
  $randomColor: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
  $randomIP: () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.'),
  $randomUserAgent: () => {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  },
  $randomHexColor: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
  $randomAlphaNumeric: () => generateId(),
  $randomPhoneNumber: () => `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
  $randomDateRecent: () => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    return d.toISOString().split('T')[0];
  },
  $randomDateFuture: () => {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 365));
    return d.toISOString().split('T')[0];
  },
};

export function resolveDynamicVariables(text: string): string {
  return text.replace(/\{\{(\$\w+)\}\}/g, (match, varName) => {
    const handler = dynamicVarHandlers[varName];
    return handler ? handler() : match;
  });
}

export function getDynamicVariableList(): { name: string; description: string; example: string }[] {
  return [
    { name: '$timestamp', description: 'Unix timestamp (ms)', example: String(Date.now()) },
    { name: '$isoTimestamp', description: 'ISO 8601 timestamp', example: new Date().toISOString() },
    { name: '$randomInt', description: 'Random integer 0-999999', example: '482931' },
    { name: '$randomFloat', description: 'Random float', example: '483.2910' },
    { name: '$guid', description: 'UUID v4', example: 'a3b2c1d0-e5f6-7890-abcd-ef1234567890' },
    { name: '$randomUUID', description: 'Random UUID', example: '550e8400-e29b-41d4-a716-446655440000' },
    { name: '$randomEmail', description: 'Random email', example: 'john123@example.com' },
    { name: '$randomName', description: 'Random full name', example: 'Jane Smith' },
    { name: '$randomBoolean', description: 'true or false', example: 'true' },
    { name: '$randomColor', description: 'Random hex color', example: '#a3f2b1' },
    { name: '$randomIP', description: 'Random IPv4', example: '192.168.1.42' },
    { name: '$randomUserAgent', description: 'Random user agent', example: 'Mozilla/5.0...' },
    { name: '$randomPhoneNumber', description: 'Random phone', example: '+12345678901' },
    { name: '$randomDateRecent', description: 'Recent date', example: '2026-02-15' },
    { name: '$randomDateFuture', description: 'Future date', example: '2027-01-20' },
  ];
}
