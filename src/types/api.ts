export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface WebSocketMessage {
  id: string;
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
}

export interface WebSocketConnection {
  id: string;
  name: string;
  url: string;
  headers: ApiHeader[];
  messages: WebSocketMessage[];
  createdAt: number;
}

export interface ApiHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: ApiHeader[];
  body: string;
  collectionId: string;
  assertions: TestAssertion[];
  auth?: AuthConfig;
  preRequestScript?: string;
  isGraphQL?: boolean;
  graphqlQuery?: string;
  graphqlVariables?: string;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApiCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  baseUrl: string;
  createdAt: number;
}

export interface ApiCallLog {
  id: string;
  endpointId: string;
  endpointName: string;
  collectionId: string;
  url: string;
  method: HttpMethod;
  statusCode: number;
  responseTime: number; // ms
  responseSize: number; // bytes
  success: boolean;
  timestamp: number;
  errorMessage?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface MonitorCheck {
  id: string;
  endpointId: string;
  endpointName: string;
  url: string;
  method: HttpMethod;
  interval: number; // minutes
  enabled: boolean;
  lastCheck?: number;
  lastStatus?: number;
  lastResponseTime?: number;
  isUp?: boolean;
  consecutiveFailures: number;
  history: MonitorPing[];
}

export interface MonitorPing {
  timestamp: number;
  statusCode: number;
  responseTime: number;
  success: boolean;
}

export interface TestAssertion {
  id: string;
  type: 'status' | 'body_contains' | 'header_exists' | 'response_time' | 'json_path';
  expected: string;
  passed?: boolean;
}

export interface RunnerResult {
  endpointId: string;
  endpointName: string;
  method: HttpMethod;
  url: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
  assertionsPassed: number;
  assertionsTotal: number;
  timestamp: number;
  error?: string;
}

export interface Incident {
  id: string;
  checkId: string;
  endpointName: string;
  url: string;
  startedAt: number;
  resolvedAt?: number;
  duration?: number;
  errorMessage?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  createdAt: number;
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#3FB950',
  POST: '#58A6FF',
  PUT: '#D29922',
  PATCH: '#BC8CFF',
  DELETE: '#FF6961',
  HEAD: '#8B949E',
  OPTIONS: '#F778BA',
};

export const STATUS_COLORS: Record<string, string> = {
  '2xx': '#3FB950',
  '3xx': '#58A6FF',
  '4xx': '#D29922',
  '5xx': '#FF6961',
};

export function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return STATUS_COLORS['2xx'];
  if (code >= 300 && code < 400) return STATUS_COLORS['3xx'];
  if (code >= 400 && code < 500) return STATUS_COLORS['4xx'];
  return STATUS_COLORS['5xx'];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
