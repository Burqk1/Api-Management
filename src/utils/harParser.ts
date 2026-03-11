import { HttpMethod, ApiHeader } from '../types/api';

export interface HAREntry {
  name: string;
  url: string;
  method: HttpMethod;
  headers: ApiHeader[];
  body: string;
  statusCode?: number;
  responseTime?: number;
}

export function parseHAR(jsonStr: string): HAREntry[] {
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON: could not parse HAR file');
  }
  const entries: HAREntry[] = [];

  const log = data.log;
  if (!log || !log.entries) {
    throw new Error('Invalid HAR format: missing log.entries');
  }

  for (const entry of log.entries) {
    const req = entry.request;
    if (!req) continue;

    const method = (req.method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) continue;

    const url = req.url || '';
    // Skip browser internal URLs
    if (url.startsWith('data:') || url.startsWith('chrome-extension:') || url.startsWith('about:')) continue;

    const headers: ApiHeader[] = (req.headers || [])
      .filter((h: any) => {
        // Filter out browser-internal headers
        const key = (h.name || '').toLowerCase();
        return !key.startsWith(':') && !['cookie', 'host', 'connection', 'accept-encoding', 'user-agent'].includes(key);
      })
      .map((h: any) => ({
        key: h.name || '',
        value: h.value || '',
        enabled: true,
      }));

    let body = '';
    if (req.postData?.text) {
      body = req.postData.text;
    } else if (req.postData?.params) {
      const params = req.postData.params.map((p: any) => `${p.name}=${p.value}`).join('&');
      body = params;
    }

    const res = entry.response;
    const statusCode = res?.status || 0;
    const responseTime = entry.time || 0;

    // Create a readable name from the URL
    let name = '';
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split('/').filter(Boolean);
      name = pathParts.length > 0 ? pathParts[pathParts.length - 1] : u.hostname;
    } catch {
      name = url.slice(0, 50);
    }

    entries.push({
      name,
      url,
      method: method as HttpMethod,
      headers,
      body,
      statusCode,
      responseTime,
    });
  }

  return entries;
}
