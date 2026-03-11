import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cookie } from '../types/api';

interface CookieState {
  cookies: Cookie[];
  autoCapture: boolean;
  addCookie: (cookie: Cookie) => void;
  removeCookie: (name: string, domain: string) => void;
  clearCookies: () => void;
  clearDomainCookies: (domain: string) => void;
  setAutoCapture: (enabled: boolean) => void;
  getCookiesForDomain: (domain: string) => Cookie[];
  getCookieHeader: (url: string) => string;
  parseCookiesFromHeaders: (url: string, headers: Record<string, string>) => void;
  initialize: () => Promise<void>;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '';
  }
}

export const useCookieStore = create<CookieState>((set, get) => ({
  cookies: [],
  autoCapture: true,

  addCookie: (cookie) => {
    set((s) => {
      const filtered = s.cookies.filter(
        (c) => !(c.name === cookie.name && c.domain === cookie.domain)
      );
      const updated = [...filtered, cookie];
      AsyncStorage.setItem('cookies', JSON.stringify(updated));
      return { cookies: updated };
    });
  },

  removeCookie: (name, domain) => {
    set((s) => {
      const updated = s.cookies.filter(
        (c) => !(c.name === name && c.domain === domain)
      );
      AsyncStorage.setItem('cookies', JSON.stringify(updated));
      return { cookies: updated };
    });
  },

  clearCookies: () => {
    AsyncStorage.setItem('cookies', '[]');
    set({ cookies: [] });
  },

  clearDomainCookies: (domain) => {
    set((s) => {
      const updated = s.cookies.filter((c) => c.domain !== domain);
      AsyncStorage.setItem('cookies', JSON.stringify(updated));
      return { cookies: updated };
    });
  },

  setAutoCapture: (enabled) => {
    AsyncStorage.setItem('cookie_auto_capture', JSON.stringify(enabled));
    set({ autoCapture: enabled });
  },

  getCookiesForDomain: (domain) => {
    const now = Date.now();
    return get().cookies.filter(
      (c) =>
        (c.domain === domain || domain.endsWith('.' + c.domain)) &&
        (!c.expires || c.expires > now)
    );
  },

  getCookieHeader: (url) => {
    const domain = extractDomain(url);
    if (!domain) return '';
    const cookies = get().getCookiesForDomain(domain);
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  },

  parseCookiesFromHeaders: (url, headers) => {
    if (!get().autoCapture) return;
    const domain = extractDomain(url);
    if (!domain) return;

    const setCookieHeaders: string[] = [];
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'set-cookie') {
        setCookieHeaders.push(value);
      }
    }

    for (const raw of setCookieHeaders) {
      const parts = raw.split(';').map((p) => p.trim());
      const [nameVal, ...attrs] = parts;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx < 0) continue;

      const cookie: Cookie = {
        name: nameVal.slice(0, eqIdx).trim(),
        value: nameVal.slice(eqIdx + 1).trim(),
        domain,
        path: '/',
      };

      for (const attr of attrs) {
        const [ak, av] = attr.split('=').map((s) => s.trim());
        const key = ak.toLowerCase();
        if (key === 'domain' && av) cookie.domain = av.replace(/^\./, '');
        else if (key === 'path' && av) cookie.path = av;
        else if (key === 'expires' && av) cookie.expires = new Date(av).getTime();
        else if (key === 'max-age' && av) cookie.expires = Date.now() + parseInt(av) * 1000;
        else if (key === 'httponly') cookie.httpOnly = true;
        else if (key === 'secure') cookie.secure = true;
      }

      get().addCookie(cookie);
    }
  },

  initialize: async () => {
    try {
      const [saved, autoCapture] = await Promise.all([
        AsyncStorage.getItem('cookies'),
        AsyncStorage.getItem('cookie_auto_capture'),
      ]);
      set({
        cookies: saved ? JSON.parse(saved) : [],
        autoCapture: autoCapture ? JSON.parse(autoCapture) : true,
      });
    } catch (e) { console.warn('[cookieStore] Failed to initialize:', e); }
  },
}));
