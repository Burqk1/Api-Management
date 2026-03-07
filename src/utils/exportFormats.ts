import {
  ApiCollection,
  ApiEndpoint,
  AuthConfig,
  generateId,
} from '../types/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseUrl(raw: string) {
  try {
    const u = new URL(raw);
    const host = u.hostname.split('.');
    const path = u.pathname.split('/').filter(Boolean);
    const query = Array.from(u.searchParams.entries()).map(([key, value]) => ({
      key,
      value,
    }));
    return {
      raw,
      protocol: u.protocol.replace(':', ''),
      host,
      port: u.port || undefined,
      path,
      query: query.length > 0 ? query : undefined,
    };
  } catch {
    // Fallback for URLs that cannot be parsed (e.g. containing {{variables}})
    return { raw };
  }
}

function authToPostman(auth?: AuthConfig) {
  if (!auth || auth.type === 'none') return undefined;

  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer' as const,
        bearer: [
          { key: 'token', value: auth.bearer?.token ?? '', type: 'string' },
        ],
      };
    case 'basic':
      return {
        type: 'basic' as const,
        basic: [
          { key: 'username', value: auth.basic?.username ?? '', type: 'string' },
          { key: 'password', value: auth.basic?.password ?? '', type: 'string' },
        ],
      };
    case 'apikey':
      return {
        type: 'apikey' as const,
        apikey: [
          { key: 'key', value: auth.apikey?.key ?? '', type: 'string' },
          { key: 'value', value: auth.apikey?.value ?? '', type: 'string' },
          { key: 'in', value: auth.apikey?.addTo ?? 'header', type: 'string' },
        ],
      };
    case 'oauth2':
      return {
        type: 'oauth2' as const,
        oauth2: [
          { key: 'grant_type', value: auth.oauth2?.grantType ?? 'authorization_code', type: 'string' },
          { key: 'authUrl', value: auth.oauth2?.authUrl ?? '', type: 'string' },
          { key: 'tokenUrl', value: auth.oauth2?.tokenUrl ?? '', type: 'string' },
          { key: 'clientId', value: auth.oauth2?.clientId ?? '', type: 'string' },
          { key: 'clientSecret', value: auth.oauth2?.clientSecret ?? '', type: 'string' },
          { key: 'scope', value: auth.oauth2?.scope ?? '', type: 'string' },
          { key: 'accessToken', value: auth.oauth2?.accessToken ?? '', type: 'string' },
        ],
      };
    default:
      return undefined;
  }
}

function buildPostmanBody(endpoint: ApiEndpoint) {
  const bodyType = endpoint.bodyType ?? 'none';
  if (bodyType === 'none') return undefined;

  switch (bodyType) {
    case 'json':
      return {
        mode: 'raw' as const,
        raw: endpoint.body || '{}',
        options: { raw: { language: 'json' } },
      };
    case 'raw':
      return {
        mode: 'raw' as const,
        raw: endpoint.body || '',
        options: { raw: { language: 'text' } },
      };
    case 'xml':
      return {
        mode: 'raw' as const,
        raw: endpoint.body || '',
        options: { raw: { language: 'xml' } },
      };
    case 'form-data':
      return {
        mode: 'formdata' as const,
        formdata: (endpoint.formData ?? [])
          .filter((f) => f.enabled)
          .map((f) => ({ key: f.key, value: f.value, type: f.type })),
      };
    case 'x-www-form-urlencoded':
      return {
        mode: 'urlencoded' as const,
        urlencoded: (endpoint.formData ?? [])
          .filter((f) => f.enabled)
          .map((f) => ({ key: f.key, value: f.value, type: 'text' })),
      };
    case 'graphql':
      return {
        mode: 'graphql' as const,
        graphql: {
          query: endpoint.graphqlQuery ?? '',
          variables: endpoint.graphqlVariables ?? '{}',
        },
      };
    case 'binary':
      return {
        mode: 'file' as const,
        file: { src: endpoint.body || '' },
      };
    default:
      return undefined;
  }
}

function buildPostmanEvents(endpoint: ApiEndpoint) {
  const events: any[] = [];
  if (endpoint.preRequestScript) {
    events.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: endpoint.preRequestScript.split('\n'),
      },
    });
  }
  if (endpoint.postRequestScript) {
    events.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: endpoint.postRequestScript.split('\n'),
      },
    });
  }
  return events.length > 0 ? events : undefined;
}

// ---------------------------------------------------------------------------
// Export to Postman v2.1
// ---------------------------------------------------------------------------

export function exportToPostman(
  collection: ApiCollection,
  endpoints: ApiEndpoint[],
): string {
  const postmanCollection: Record<string, any> = {
    info: {
      name: collection.name,
      description: collection.description || '',
      _postman_id: collection.id || generateId(),
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: endpoints.map((ep) => {
      const item: Record<string, any> = {
        name: ep.name,
        request: {
          method: ep.method,
          header: ep.headers
            .filter((h) => h.enabled)
            .map((h) => ({ key: h.key, value: h.value, type: 'text' })),
          url: parseUrl(ep.url),
        },
      };

      const body = buildPostmanBody(ep);
      if (body) {
        item.request.body = body;
      }

      const auth = authToPostman(ep.auth);
      if (auth) {
        item.request.auth = auth;
      }

      const events = buildPostmanEvents(ep);
      if (events) {
        item.event = events;
      }

      return item;
    }),
  };

  // Collection-level auth
  const collectionAuth = authToPostman(collection.auth);
  if (collectionAuth) {
    postmanCollection.auth = collectionAuth;
  }

  return JSON.stringify(postmanCollection, null, 2);
}

// ---------------------------------------------------------------------------
// OpenAPI helpers
// ---------------------------------------------------------------------------

function extractPathFromUrl(rawUrl: string, baseUrl?: string): string {
  try {
    const url = new URL(rawUrl);
    return url.pathname || '/';
  } catch {
    // If not a full URL, try stripping base
    if (baseUrl && rawUrl.startsWith(baseUrl)) {
      const path = rawUrl.slice(baseUrl.length);
      return path.startsWith('/') ? path : `/${path}`;
    }
    // Return as-is, ensuring it starts with /
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }
}

function authToOpenAPISecuritySchemes(auth?: AuthConfig) {
  if (!auth || auth.type === 'none') return {};

  switch (auth.type) {
    case 'bearer':
      return {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      };
    case 'basic':
      return {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
        },
      };
    case 'apikey':
      return {
        apiKeyAuth: {
          type: 'apiKey',
          in: auth.apikey?.addTo === 'query' ? 'query' : 'header',
          name: auth.apikey?.key ?? 'X-API-Key',
        },
      };
    case 'oauth2': {
      const flows: Record<string, any> = {};
      const gt = auth.oauth2?.grantType ?? 'authorization_code';
      const scopes: Record<string, string> = {};
      if (auth.oauth2?.scope) {
        auth.oauth2.scope.split(' ').forEach((s) => {
          scopes[s] = s;
        });
      }
      if (gt === 'authorization_code') {
        flows.authorizationCode = {
          authorizationUrl: auth.oauth2?.authUrl ?? '',
          tokenUrl: auth.oauth2?.tokenUrl ?? '',
          scopes,
        };
      } else if (gt === 'client_credentials') {
        flows.clientCredentials = {
          tokenUrl: auth.oauth2?.tokenUrl ?? '',
          scopes,
        };
      } else if (gt === 'password') {
        flows.password = {
          tokenUrl: auth.oauth2?.tokenUrl ?? '',
          scopes,
        };
      } else if (gt === 'implicit') {
        flows.implicit = {
          authorizationUrl: auth.oauth2?.authUrl ?? '',
          scopes,
        };
      }
      return {
        oauth2Auth: {
          type: 'oauth2',
          flows,
        },
      };
    }
    default:
      return {};
  }
}

function authToOpenAPISecurity(auth?: AuthConfig): Record<string, any[]>[] {
  if (!auth || auth.type === 'none') return [];

  switch (auth.type) {
    case 'bearer':
      return [{ bearerAuth: [] }];
    case 'basic':
      return [{ basicAuth: [] }];
    case 'apikey':
      return [{ apiKeyAuth: [] }];
    case 'oauth2':
      return [{ oauth2Auth: [] }];
    default:
      return [];
  }
}

function buildOpenAPIRequestBody(endpoint: ApiEndpoint) {
  const bodyType = endpoint.bodyType ?? 'none';
  if (bodyType === 'none') return undefined;

  switch (bodyType) {
    case 'json': {
      let schema: Record<string, any> = { type: 'object' };
      try {
        const parsed = JSON.parse(endpoint.body || '{}');
        schema = jsonToSchema(parsed);
      } catch {
        // keep default schema
      }
      return {
        required: true,
        content: {
          'application/json': { schema },
        },
      };
    }
    case 'form-data':
      return {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(
                (endpoint.formData ?? [])
                  .filter((f) => f.enabled)
                  .map((f) => [
                    f.key,
                    f.type === 'file'
                      ? { type: 'string', format: 'binary' }
                      : { type: 'string' },
                  ]),
              ),
            },
          },
        },
      };
    case 'x-www-form-urlencoded':
      return {
        required: true,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(
                (endpoint.formData ?? [])
                  .filter((f) => f.enabled)
                  .map((f) => [f.key, { type: 'string' }]),
              ),
            },
          },
        },
      };
    case 'raw':
      return {
        required: true,
        content: {
          'text/plain': {
            schema: { type: 'string' },
          },
        },
      };
    case 'xml':
      return {
        required: true,
        content: {
          'application/xml': {
            schema: { type: 'string' },
          },
        },
      };
    case 'graphql':
      return {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                variables: { type: 'object' },
              },
            },
          },
        },
      };
    default:
      return undefined;
  }
}

function jsonToSchema(value: any): Record<string, any> {
  if (value === null) return { type: 'string', nullable: true };
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? jsonToSchema(value[0]) : { type: 'string' },
    };
  }
  if (typeof value === 'object') {
    const properties: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      properties[k] = jsonToSchema(v);
    }
    return { type: 'object', properties };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }
  if (typeof value === 'boolean') return { type: 'boolean' };
  return { type: 'string' };
}

// ---------------------------------------------------------------------------
// Export to OpenAPI 3.0
// ---------------------------------------------------------------------------

export function exportToOpenAPI(
  collection: ApiCollection,
  endpoints: ApiEndpoint[],
): string {
  // Gather security schemes from all endpoints + collection
  let securitySchemes: Record<string, any> = {};
  const globalSecurity = authToOpenAPISecurity(collection.auth);
  Object.assign(securitySchemes, authToOpenAPISecuritySchemes(collection.auth));

  for (const ep of endpoints) {
    Object.assign(securitySchemes, authToOpenAPISecuritySchemes(ep.auth));
  }

  // Build paths grouped by path string
  const paths: Record<string, any> = {};
  for (const ep of endpoints) {
    const pathStr = extractPathFromUrl(ep.url, collection.baseUrl);
    const method = ep.method.toLowerCase();

    if (!paths[pathStr]) {
      paths[pathStr] = {};
    }

    const operation: Record<string, any> = {
      summary: ep.name,
      operationId: ep.id,
    };

    // Headers → parameters
    const parameters = ep.headers
      .filter((h) => h.enabled)
      .map((h) => ({
        name: h.key,
        in: 'header' as const,
        required: false,
        schema: { type: 'string' },
        example: h.value,
      }));

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Request body
    const requestBody = buildOpenAPIRequestBody(ep);
    if (requestBody) {
      operation.requestBody = requestBody;
    }

    // Per-endpoint security
    const epSecurity = authToOpenAPISecurity(ep.auth);
    if (epSecurity.length > 0) {
      operation.security = epSecurity;
    }

    // Default response
    operation.responses = {
      '200': { description: 'Success' },
    };

    paths[pathStr][method] = operation;
  }

  // Servers
  const servers: { url: string }[] = [];
  if (collection.baseUrl) {
    servers.push({ url: collection.baseUrl });
  } else if (endpoints.length > 0) {
    try {
      const u = new URL(endpoints[0].url);
      servers.push({ url: `${u.protocol}//${u.host}` });
    } catch {
      // skip
    }
  }

  const spec: Record<string, any> = {
    openapi: '3.0.0',
    info: {
      title: collection.name,
      description: collection.description || '',
      version: '1.0.0',
    },
  };

  if (servers.length > 0) {
    spec.servers = servers;
  }

  spec.paths = paths;

  // Components
  if (Object.keys(securitySchemes).length > 0) {
    spec.components = { securitySchemes };
  }

  if (globalSecurity.length > 0) {
    spec.security = globalSecurity;
  }

  return JSON.stringify(spec, null, 2);
}
