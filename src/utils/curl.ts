import { HttpMethod, ApiHeader } from '../types/api';

interface CurlData {
  method: HttpMethod;
  url: string;
  headers: ApiHeader[];
  body: string;
}

export function endpointToCurl(data: CurlData): string {
  const parts = ['curl'];
  if (data.method !== 'GET') parts.push(`-X ${data.method}`);
  parts.push(`'${data.url}'`);
  data.headers.filter((h) => h.enabled).forEach((h) => {
    parts.push(`-H '${h.key}: ${h.value}'`);
  });
  if (data.body.trim() && ['POST', 'PUT', 'PATCH'].includes(data.method)) {
    parts.push(`-d '${data.body.replace(/'/g, "\\'")}'`);
  }
  return parts.join(' \\\n  ');
}

export function parseCurl(curlStr: string): CurlData | null {
  try {
    const cleaned = curlStr.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned.toLowerCase().startsWith('curl')) return null;

    let method: HttpMethod = 'GET';
    let url = '';
    const headers: ApiHeader[] = [];
    let body = '';

    // Tokenize respecting quotes
    const tokens: string[] = [];
    let current = '';
    let inQuote: string | null = null;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inQuote) {
        if (ch === inQuote && cleaned[i - 1] !== '\\') {
          inQuote = null;
        } else {
          current += ch;
        }
      } else if (ch === "'" || ch === '"') {
        inQuote = ch;
      } else if (ch === ' ') {
        if (current) { tokens.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === 'curl') continue;

      if (tok === '-X' || tok === '--request') {
        const m = tokens[++i]?.toUpperCase();
        if (m && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(m)) {
          method = m as HttpMethod;
        }
      } else if (tok === '-H' || tok === '--header') {
        const hVal = tokens[++i];
        if (hVal) {
          const colonIdx = hVal.indexOf(':');
          if (colonIdx > 0) {
            headers.push({
              key: hVal.slice(0, colonIdx).trim(),
              value: hVal.slice(colonIdx + 1).trim(),
              enabled: true,
            });
          }
        }
      } else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
        body = tokens[++i] || '';
        if (method === 'GET') method = 'POST';
      } else if (tok.startsWith('http://') || tok.startsWith('https://')) {
        url = tok;
      }
    }

    if (!url) return null;
    return { method, url, headers, body };
  } catch {
    return null;
  }
}
