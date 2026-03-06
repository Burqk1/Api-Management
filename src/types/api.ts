export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'password' | 'implicit';

export interface OAuth2Config {
  grantType: OAuth2GrantType;
  authUrl?: string;
  tokenUrl?: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: OAuth2Config;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';

export interface FormDataField {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  auth?: { username: string; password: string };
}

export interface SchemaValidation {
  enabled: boolean;
  schema: string;
  lastResult?: { valid: boolean; errors: string[] };
}

export interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  timestamp: number;
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
  bodyType?: BodyType;
  formData?: FormDataField[];
  collectionId: string;
  assertions: TestAssertion[];
  auth?: AuthConfig;
  preRequestScript?: string;
  postRequestScript?: string;
  isGraphQL?: boolean;
  graphqlQuery?: string;
  graphqlVariables?: string;
  isFavorite?: boolean;
  schemaValidation?: SchemaValidation;
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
  responseTime: number;
  responseSize: number;
  success: boolean;
  timestamp: number;
  errorMessage?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  cookies?: Cookie[];
}

export interface MonitorCheck {
  id: string;
  endpointId: string;
  endpointName: string;
  url: string;
  method: HttpMethod;
  interval: number;
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
  type: 'status' | 'body_contains' | 'header_exists' | 'response_time' | 'json_path' | 'schema';
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

export interface BenchmarkResult {
  id: string;
  endpointId: string;
  endpointName: string;
  url: string;
  method: HttpMethod;
  totalRequests: number;
  concurrency: number;
  results: {
    statusCode: number;
    responseTime: number;
    success: boolean;
    size: number;
  }[];
  stats: {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
    successRate: number;
    requestsPerSecond: number;
    totalTime: number;
    errorCount: number;
  };
  timestamp: number;
}

export interface EndpointVersion {
  id: string;
  endpointId: string;
  snapshot: Omit<ApiEndpoint, 'id' | 'collectionId' | 'createdAt'>;
  label?: string;
  timestamp: number;
}

export interface SSLConfig {
  enabled: boolean;
  rejectUnauthorized: boolean;
  clientCertificate?: string;
  clientKey?: string;
  caCertificate?: string;
  passphrase?: string;
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
