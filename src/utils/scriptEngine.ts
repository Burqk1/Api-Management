/**
 * Script Execution Engine
 * Provides sandboxed execution of pre/post request scripts with:
 * - Environment variable access (pm.environment.get/set)
 * - Console output capture
 * - Request/Response context
 * - Test assertion helpers (pm.test, pm.expect)
 */

export interface ScriptContext {
  // Environment
  envVars: Record<string, string>;
  globalVars: Record<string, string>;

  // Request context (available in both pre and post)
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };

  // Response context (only in post-request)
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  };
}

export interface ScriptResult {
  success: boolean;
  error?: string;
  console: string[];
  headerChanges: Record<string, string>;
  envChanges: Record<string, string>;
  globalChanges: Record<string, string>;
  urlOverride?: string;
  bodyOverride?: string;
  testResults: { name: string; passed: boolean; error?: string }[];
}

export function runScript(script: string, context: ScriptContext): ScriptResult {
  const result: ScriptResult = {
    success: true,
    console: [],
    headerChanges: {},
    envChanges: {},
    globalChanges: {},
    testResults: [],
  };

  if (!script.trim()) return result;

  try {
    // Build the sandbox environment
    const envStore = { ...context.envVars };
    const globalStore = { ...context.globalVars };
    const headerStore = { ...context.request.headers };
    let currentUrl = context.request.url;
    let currentBody = context.request.body;

    // pm object (Postman-compatible API)
    const pm = {
      environment: {
        get: (key: string) => envStore[key] || '',
        set: (key: string, value: string) => {
          envStore[key] = value;
          result.envChanges[key] = value;
        },
        unset: (key: string) => {
          delete envStore[key];
          result.envChanges[key] = '';
        },
        toObject: () => ({ ...envStore }),
      },
      globals: {
        get: (key: string) => globalStore[key] || '',
        set: (key: string, value: string) => {
          globalStore[key] = value;
          result.globalChanges[key] = value;
        },
        toObject: () => ({ ...globalStore }),
      },
      request: {
        url: context.request.url,
        method: context.request.method,
        headers: { ...context.request.headers },
        body: context.request.body,
        addHeader: (key: string, value: string) => {
          headerStore[key] = value;
          result.headerChanges[key] = value;
        },
        removeHeader: (key: string) => {
          delete headerStore[key];
          result.headerChanges[key] = '';
        },
      },
      response: context.response ? {
        code: context.response.status,
        status: context.response.statusText,
        responseTime: context.response.time,
        responseSize: context.response.size,
        text: () => context.response!.body,
        json: () => {
          try { return JSON.parse(context.response!.body); } catch { return null; }
        },
        headers: { ...context.response.headers },
      } : undefined,
      test: (name: string, fn: () => void) => {
        try {
          fn();
          result.testResults.push({ name, passed: true });
        } catch (e: any) {
          result.testResults.push({ name, passed: false, error: e.message });
        }
      },
      expect: (value: any) => createExpect(value),
    };

    // Console capture
    const consoleMock = {
      log: (...args: any[]) => result.console.push(args.map(String).join(' ')),
      warn: (...args: any[]) => result.console.push('[WARN] ' + args.map(String).join(' ')),
      error: (...args: any[]) => result.console.push('[ERROR] ' + args.map(String).join(' ')),
      info: (...args: any[]) => result.console.push('[INFO] ' + args.map(String).join(' ')),
    };

    // Helper functions
    const setUrl = (newUrl: string) => { currentUrl = newUrl; result.urlOverride = newUrl; };
    const setBody = (newBody: string) => { currentBody = newBody; result.bodyOverride = newBody; };

    // Execute script
    const scriptFn = new Function(
      'pm', 'console', 'setUrl', 'setBody',
      'request', 'response',
      'environment', 'globals',
      'headers',
      script
    );

    scriptFn(
      pm, consoleMock, setUrl, setBody,
      pm.request, pm.response,
      pm.environment, pm.globals,
      headerStore,
    );
  } catch (e: any) {
    result.success = false;
    result.error = e.message;
    result.console.push(`[ERROR] ${e.message}`);
  }

  return result;
}

function createExpect(value: any) {
  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(msg);
  };

  return {
    to: {
      equal: (expected: any) => assert(value === expected, `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`),
      eql: (expected: any) => assert(JSON.stringify(value) === JSON.stringify(expected), `Expected deep equal`),
      be: {
        a: (type: string) => assert(typeof value === type, `Expected ${typeof value} to be ${type}`),
        an: (type: string) => assert(typeof value === type, `Expected ${typeof value} to be ${type}`),
        above: (n: number) => assert(value > n, `Expected ${value} to be above ${n}`),
        below: (n: number) => assert(value < n, `Expected ${value} to be below ${n}`),
        true: assert(value === true, `Expected ${value} to be true`),
        false: assert(value === false, `Expected ${value} to be false`),
        null: assert(value === null, `Expected ${value} to be null`),
        undefined: assert(value === undefined, `Expected ${value} to be undefined`),
        ok: assert(!!value, `Expected ${value} to be truthy`),
      },
      have: {
        property: (prop: string) => assert(value != null && prop in value, `Expected to have property "${prop}"`),
        length: (len: number) => assert(value?.length === len, `Expected length ${len}, got ${value?.length}`),
        status: (code: number) => assert(value === code, `Expected status ${code}, got ${value}`),
      },
      include: (item: any) => {
        if (typeof value === 'string') assert(value.includes(item), `Expected "${value}" to include "${item}"`);
        else if (Array.isArray(value)) assert(value.includes(item), `Expected array to include ${item}`);
        else assert(false, `Cannot check include on ${typeof value}`);
      },
      contain: (item: any) => {
        if (typeof value === 'string') assert(value.includes(item), `Expected to contain "${item}"`);
        else if (Array.isArray(value)) assert(value.includes(item), `Expected array to contain ${item}`);
      },
      not: {
        equal: (expected: any) => assert(value !== expected, `Expected ${value} to not equal ${expected}`),
        include: (item: any) => {
          if (typeof value === 'string') assert(!value.includes(item), `Expected not to include "${item}"`);
        },
        be: {
          null: assert(value !== null, `Expected not null`),
          undefined: assert(value !== undefined, `Expected not undefined`),
          empty: assert(value?.length > 0, `Expected not empty`),
        },
      },
    },
  };
}
