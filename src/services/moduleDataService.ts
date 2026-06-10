import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  normalizeApiEnvelope,
  type ApiEnvelope,
} from "./apiClient";
import {
  moduleApiRegistry,
  type ApiCallConfig,
  type ModuleKey,
} from "./moduleApiRegistry";

export type ModuleDataResult<T = Record<string, unknown>> = T & {
  __errors?: Record<string, string>;
  __loadedAt?: string;
  __fromCache?: boolean;
};

type CacheEntry = {
  timestamp: number;
  data: unknown;
};

type LoadModuleOptions = {
  /**
   * Params used by endpoint builders and query/body params.
   */
  params?: Record<string, unknown>;

  /**
   * Ignore cache for this load.
   */
  force?: boolean;

  /**
   * Optional AbortController signal.
   */
  signal?: AbortSignal;
};

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function resolveEnabled(call: ApiCallConfig, params?: Record<string, unknown>) {
  if (typeof call.enabled === "function") return call.enabled(params);
  if (typeof call.enabled === "boolean") return call.enabled;
  return true;
}

function resolveUrl(call: ApiCallConfig, params?: Record<string, unknown>) {
  return typeof call.url === "function" ? call.url(params) : call.url;
}

function resolveParams(call: ApiCallConfig, params?: Record<string, unknown>) {
  if (typeof call.params === "function") return call.params(params);
  if (call.params) return call.params;
  return params;
}

function buildCacheKey(moduleKey: ModuleKey, call: ApiCallConfig, params?: Record<string, unknown>) {
  return `${moduleKey}:${call.key}:${resolveUrl(call, params)}:${JSON.stringify(resolveParams(call, params) || {})}`;
}

function isCacheValid(cacheKey: string, cacheMs?: number) {
  if (!cacheMs) return false;

  const cached = responseCache.get(cacheKey);
  if (!cached) return false;

  return Date.now() - cached.timestamp < cacheMs;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "API request failed.";
}

async function executeApiCall(
  moduleKey: ModuleKey,
  call: ApiCallConfig,
  options: LoadModuleOptions
) {
  const params = options.params;
  const url = resolveUrl(call, params);
  const method = call.method || "GET";
  const requestParams = resolveParams(call, params);
  const cacheKey = buildCacheKey(moduleKey, call, params);

  if (!options.force && isCacheValid(cacheKey, call.cacheMs)) {
    return responseCache.get(cacheKey)?.data;
  }

  if (!options.force && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  let request: Promise<unknown>;

  if (method === "POST") {
    request = apiPost(url, requestParams, { signal: options.signal });
  } else if (method === "PUT") {
    request = apiPut(url, requestParams, { signal: options.signal });
  } else if (method === "PATCH") {
    request = apiPatch(url, requestParams, { signal: options.signal });
  } else if (method === "DELETE") {
    request = apiDelete(url, { signal: options.signal, params: requestParams });
  } else {
    request = apiGet(url, { signal: options.signal, params: requestParams });
  }

  pendingRequests.set(cacheKey, request);

  try {
    const rawData = await request;
    const data = call.transform ? call.transform(rawData, params) : rawData;

    if (call.cacheMs) {
      responseCache.set(cacheKey, {
        timestamp: Date.now(),
        data,
      });
    }

    return data;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export async function loadModuleData<T = Record<string, unknown>>(
  moduleKey: ModuleKey,
  options: LoadModuleOptions = {}
): Promise<ModuleDataResult<T>> {
  const apiCalls = moduleApiRegistry[moduleKey];

  if (!apiCalls) {
    throw new Error(`No API registry found for module: ${moduleKey}`);
  }

  const enabledCalls = apiCalls.filter((call) => resolveEnabled(call, options.params));

  const results = await Promise.allSettled(
    enabledCalls.map(async (call) => {
      const data = await executeApiCall(moduleKey, call, options);
      return [call.key, data] as const;
    })
  );

  const output: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const call = enabledCalls[index];

    if (result.status === "fulfilled") {
      const [key, data] = result.value;
      output[key] = data;
    } else {
      const message = getErrorMessage(result.reason);
      errors[call.key] = message;

      if (call.required) {
        throw new Error(`Required API failed for ${moduleKey}.${call.key}: ${message}`);
      }
    }
  }

  return {
    ...(output as T),
    __errors: errors,
    __loadedAt: new Date().toISOString(),
  };
}

export async function loadSingleModuleApi<T = unknown>(
  moduleKey: ModuleKey,
  apiKey: string,
  options: LoadModuleOptions = {}
): Promise<T> {
  const apiCall = moduleApiRegistry[moduleKey]?.find((call) => call.key === apiKey);

  if (!apiCall) {
    throw new Error(`No API config found for ${moduleKey}.${apiKey}`);
  }

  return executeApiCall(moduleKey, apiCall, options) as Promise<T>;
}

export function clearModuleCache(moduleKey?: ModuleKey) {
  if (!moduleKey) {
    responseCache.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (key.startsWith(`${moduleKey}:`)) {
      responseCache.delete(key);
    }
  }
}

export function clearApiCache(moduleKey: ModuleKey, apiKey: string) {
  for (const key of responseCache.keys()) {
    if (key.startsWith(`${moduleKey}:${apiKey}:`)) {
      responseCache.delete(key);
    }
  }
}

export function getModuleCacheSnapshot() {
  return Array.from(responseCache.entries()).map(([key, value]) => ({
    key,
    ageMs: Date.now() - value.timestamp,
  }));
}

/**
 * Compatibility wrapper for old pages that expect:
 * apiRequest<T>(path, { method, body })
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const method = (options.method || "GET").toUpperCase();
  const headers = options.headers ? Object.fromEntries(new Headers(options.headers).entries()) : undefined;

  let data: unknown = undefined;

  if (typeof options.body === "string") {
    try {
      data = JSON.parse(options.body);
    } catch {
      data = options.body;
    }
  } else {
    data = options.body;
  }

  if (method === "POST") {
    return normalizeApiEnvelope<T>(await apiPost(path, data, { headers, signal: options.signal }));
  }

  if (method === "PUT") {
    return normalizeApiEnvelope<T>(await apiPut(path, data, { headers, signal: options.signal }));
  }

  if (method === "PATCH") {
    return normalizeApiEnvelope<T>(await apiPatch(path, data, { headers, signal: options.signal }));
  }

  if (method === "DELETE") {
    return normalizeApiEnvelope<T>(await apiDelete(path, { headers, signal: options.signal }));
  }

  return normalizeApiEnvelope<T>(await apiGet(path, { headers, signal: options.signal }));
}
