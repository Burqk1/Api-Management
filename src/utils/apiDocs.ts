import { ApiCollection, ApiEndpoint, ApiCallLog, HttpMethod } from '../types/api';

export function generateMarkdownDocs(
  collection: ApiCollection,
  endpoints: ApiEndpoint[],
  logs: ApiCallLog[]
): string {
  const lines: string[] = [];

  lines.push(`# ${collection.name}`);
  lines.push('');
  if (collection.description) {
    lines.push(collection.description);
    lines.push('');
  }
  if (collection.baseUrl) {
    lines.push(`**Base URL:** \`${collection.baseUrl}\``);
    lines.push('');
  }
  lines.push(`**Endpoints:** ${endpoints.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const ep of endpoints) {
    const methodColor = getMethodEmoji(ep.method);
    lines.push(`## ${methodColor} ${ep.method} ${ep.name}`);
    lines.push('');
    lines.push(`\`\`\`\n${ep.method} ${ep.url}\n\`\`\``);
    lines.push('');

    // Headers
    const enabledHeaders = ep.headers.filter((h) => h.enabled);
    if (enabledHeaders.length > 0) {
      lines.push('### Headers');
      lines.push('');
      lines.push('| Key | Value |');
      lines.push('|-----|-------|');
      for (const h of enabledHeaders) {
        lines.push(`| \`${h.key}\` | \`${h.value}\` |`);
      }
      lines.push('');
    }

    // Auth
    if (ep.auth && ep.auth.type !== 'none') {
      lines.push(`### Authentication`);
      lines.push('');
      lines.push(`Type: **${ep.auth.type.toUpperCase()}**`);
      lines.push('');
    }

    // Body
    if (ep.body && !['GET', 'HEAD', 'OPTIONS'].includes(ep.method)) {
      lines.push('### Request Body');
      lines.push('');
      try {
        const parsed = JSON.parse(ep.body);
        lines.push('```json');
        lines.push(JSON.stringify(parsed, null, 2));
        lines.push('```');
      } catch {
        lines.push('```');
        lines.push(ep.body);
        lines.push('```');
      }
      lines.push('');
    }

    // GraphQL
    if (ep.isGraphQL && ep.graphqlQuery) {
      lines.push('### GraphQL Query');
      lines.push('');
      lines.push('```graphql');
      lines.push(ep.graphqlQuery);
      lines.push('```');
      lines.push('');
    }

    // Assertions
    if (ep.assertions.length > 0) {
      lines.push('### Assertions');
      lines.push('');
      for (const a of ep.assertions) {
        lines.push(`- **${a.type}**: \`${a.expected}\``);
      }
      lines.push('');
    }

    // Example Response (from logs)
    const epLogs = logs.filter((l) => l.endpointId === ep.id);
    const successLog = epLogs.find((l) => l.success);
    if (successLog) {
      lines.push('### Example Response');
      lines.push('');
      lines.push(`**Status:** ${successLog.statusCode}  `);
      lines.push(`**Time:** ${successLog.responseTime}ms  `);
      lines.push(`**Size:** ${(successLog.responseSize / 1024).toFixed(1)}KB`);
      lines.push('');
      if (successLog.responseBody) {
        try {
          const parsed = JSON.parse(successLog.responseBody);
          lines.push('```json');
          lines.push(JSON.stringify(parsed, null, 2).slice(0, 3000));
          lines.push('```');
        } catch {
          lines.push('```');
          lines.push(successLog.responseBody.slice(0, 3000));
          lines.push('```');
        }
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(`*Generated on ${new Date().toISOString().split('T')[0]}*`);
  return lines.join('\n');
}

export function generateOpenAPISpec(
  collection: ApiCollection,
  endpoints: ApiEndpoint[],
  logs: ApiCallLog[]
): object {
  const paths: Record<string, any> = {};

  for (const ep of endpoints) {
    let urlPath = ep.url;
    // Remove base URL if present
    if (collection.baseUrl && urlPath.startsWith(collection.baseUrl)) {
      urlPath = urlPath.slice(collection.baseUrl.length);
    }
    // Remove query params
    urlPath = urlPath.split('?')[0];
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;

    const method = ep.method.toLowerCase();
    if (!paths[urlPath]) paths[urlPath] = {};

    const operation: any = {
      summary: ep.name,
      parameters: [],
      responses: {},
    };

    // Headers as parameters
    for (const h of ep.headers.filter((h) => h.enabled)) {
      operation.parameters.push({
        name: h.key,
        in: 'header',
        schema: { type: 'string' },
        example: h.value,
      });
    }

    // Request body
    if (ep.body && !['get', 'head', 'options'].includes(method)) {
      try {
        operation.requestBody = {
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: JSON.parse(ep.body),
            },
          },
        };
      } catch {
        operation.requestBody = {
          content: { 'text/plain': { schema: { type: 'string' } } },
        };
      }
    }

    // Responses from logs
    const epLogs = logs.filter((l) => l.endpointId === ep.id);
    const statusCodes = [...new Set(epLogs.map((l) => l.statusCode))];
    if (statusCodes.length === 0) statusCodes.push(200);

    for (const code of statusCodes) {
      const log = epLogs.find((l) => l.statusCode === code);
      const resp: any = { description: `Status ${code}` };
      if (log?.responseBody) {
        try {
          resp.content = {
            'application/json': { example: JSON.parse(log.responseBody) },
          };
        } catch {}
      }
      operation.responses[String(code)] = resp;
    }

    paths[urlPath][method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: collection.name,
      description: collection.description,
      version: '1.0.0',
    },
    servers: collection.baseUrl ? [{ url: collection.baseUrl }] : [],
    paths,
  };
}

function getMethodEmoji(method: HttpMethod): string {
  const map: Record<HttpMethod, string> = {
    GET: '[GET]',
    POST: '[POST]',
    PUT: '[PUT]',
    PATCH: '[PATCH]',
    DELETE: '[DEL]',
    HEAD: '[HEAD]',
    OPTIONS: '[OPT]',
  };
  return map[method] || '';
}
