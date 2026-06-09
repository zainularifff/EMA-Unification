type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type ItOperationsDashboardPayload = Record<string, unknown>;
export type ItOperationsRecordPayload = Record<string, unknown>;

// EMA stores the JWT token in localStorage as `ema_token` from AuthContext.tsx.
// Keep the other keys as fallback in case another page/service stores it differently.
const TOKEN_STORAGE_KEYS = [
  'ema_token',
  'ema-access-token',
  'ema-token',
  'accessToken',
  'token',
  'authToken',
  'jwt',
  'jwtToken',
];

const AUTH_PAYLOAD_KEYS = [
  'ema_user',
  'ema-auth',
  'auth',
  'user',
  'ema-user',
  'currentUser',
  'authUser',
  'ema-current-user',
];

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isViteDevPort = port === '5173' || port === '5174' || port === '3000';

    if (isLocalHost && isViteDevPort) {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return '';
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeToken(value: string) {
  return value.replace(/^Bearer\s+/i, '').trim();
}

function isLikelyJwt(value: string) {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(normalizeToken(value));
}

function findTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 5) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (isLikelyJwt(trimmed)) return normalizeToken(trimmed);

    const parsed = safeParseJson<unknown>(trimmed);
    return parsed ? findTokenInValue(parsed, depth + 1) : '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
    return '';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const data = record.data as Record<string, unknown> | undefined;
    const user = record.user as Record<string, unknown> | undefined;

    const directToken =
      record.token ||
      record.accessToken ||
      record.authToken ||
      record.jwt ||
      record.jwtToken ||
      record.bearerToken ||
      data?.token ||
      data?.accessToken ||
      user?.token ||
      user?.accessToken;

    if (typeof directToken === 'string' && directToken.trim()) {
      const token = normalizeToken(directToken);
      if (token) return token;
    }

    for (const item of Object.values(record)) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
  }

  return '';
}

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return '';

  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of TOKEN_STORAGE_KEYS) {
      const directValue = storage.getItem(key);
      const token = findTokenInValue(directValue);
      if (token) return token;
    }

    for (const key of AUTH_PAYLOAD_KEYS) {
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return '';
}

function buildAuthHeaders() {
  const headers = new Headers({ Accept: 'application/json' });
  const token = getStoredAccessToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function getItOperationsDashboard(mode: 'fast' | 'full' = 'fast'): Promise<ItOperationsDashboardPayload> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/dashboard/it-operations?mode=${encodeURIComponent(mode)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ItOperationsDashboardPayload> | null;

  if (response.status === 401) {
    throw new Error('Authorization token missing or expired. Please login again, then reopen IT Operations Dashboard.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `IT Operations API failed: ${response.status}`);
  }

  return (payload?.data ?? payload ?? {}) as ItOperationsDashboardPayload;
}

export async function getItOperationsModule(moduleId: string): Promise<ItOperationsDashboardPayload> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/dashboard/it-operations/module/${encodeURIComponent(moduleId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ItOperationsDashboardPayload> | null;

  if (response.status === 401) {
    throw new Error('Authorization token missing or expired. Please login again, then reopen IT Operations Dashboard.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `IT Operations module API failed: ${response.status}`);
  }

  return (payload?.data ?? payload ?? {}) as ItOperationsDashboardPayload;
}

export type ItOperationsDrilldownOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function getItOperationsDrilldown(
  moduleId: string,
  options: number | ItOperationsDrilldownOptions = { page: 1, limit: 10 },
): Promise<ItOperationsDashboardPayload> {
  const apiBaseUrl = resolveApiBaseUrl();
  const normalizedOptions: ItOperationsDrilldownOptions = typeof options === 'number'
    ? { page: 1, limit: options }
    : options;
  const query = buildQuery({
    page: normalizedOptions.page ?? 1,
    limit: normalizedOptions.limit ?? 10,
    search: normalizedOptions.search,
  });

  const response = await fetch(`${apiBaseUrl}/api/dashboard/it-operations/drilldown/${encodeURIComponent(moduleId)}${query}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ItOperationsDashboardPayload> | null;

  if (response.status === 401) {
    throw new Error('Authorization token missing or expired. Please login again, then reopen IT Operations Dashboard.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `IT Operations drilldown API failed: ${response.status}`);
  }

  return (payload?.data ?? payload ?? {}) as ItOperationsDashboardPayload;
}

function buildQuery(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function getItOperationsRecordDetail(
  moduleId: string,
  recordId: string | number,
  context: Record<string, unknown> = {},
): Promise<ItOperationsRecordPayload> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/dashboard/it-operations/drilldown/${encodeURIComponent(moduleId)}/${encodeURIComponent(String(recordId))}${buildQuery(context)}`,
    {
      method: 'GET',
      headers: buildAuthHeaders(),
      credentials: 'include',
    },
  );

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ItOperationsRecordPayload> | null;

  if (response.status === 401) {
    throw new Error('Authorization token missing or expired. Please login again, then reopen IT Operations Dashboard.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `IT Operations Level 3 API failed: ${response.status}`);
  }

  return (payload?.data ?? payload ?? {}) as ItOperationsRecordPayload;
}

async function postOperationalAction<T = Record<string, unknown>>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl();
  const headers = buildAuthHeaders();
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (response.status === 401) {
    throw new Error('Authorization token missing or expired. Please login again, then retry the action.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Operational action failed: ${response.status}`);
  }

  return (payload?.data ?? payload ?? {}) as T;
}

export function startItOpsRemoteControl(row: Record<string, unknown>) {
  return postOperationalAction('/api/mdm/remote-control', {
    objectAgent: row.source || row.objectAgent || row.Object_Agent,
    Object_Root_Idn: row.source === 'EM' ? row.id : row.Object_Root_Idn,
    MDM_Asset_Idn: row.source === 'MDM' ? row.id : row.MDM_Asset_Idn,
    DeviceName: row.deviceName || row.name,
    DeviceID: row.deviceID || row.deviceId || row.Object_DeviceID,
    assetId: row.id,
  });
}

export function sendItOpsTextMessage(row: Record<string, unknown>, subject: string, body: string) {
  return postOperationalAction('/api/mdm/text-message', {
    objectAgent: row.source || row.objectAgent || row.Object_Agent,
    Object_Root_Idn: row.source === 'EM' ? row.id : row.Object_Root_Idn,
    MDM_Asset_Idn: row.source === 'MDM' ? row.id : row.MDM_Asset_Idn,
    DeviceName: row.deviceName || row.name,
    DeviceID: row.deviceID || row.deviceId || row.Object_DeviceID,
    Subject: subject,
    Body: body,
  });
}

export function setItOpsDeviceLock(row: Record<string, unknown>, action: 'lock' | 'unlock') {
  return postOperationalAction('/api/mdm/lock-unlock', {
    action,
    objectAgent: row.source || row.objectAgent || row.Object_Agent,
    Object_Root_Idn: row.source === 'EM' ? row.id : row.Object_Root_Idn,
    MDM_Asset_Idn: row.source === 'MDM' ? row.id : row.MDM_Asset_Idn,
    DeviceName: row.deviceName || row.name,
    DeviceID: row.deviceID || row.deviceId || row.Object_DeviceID,
    PlatformType: row.platform,
  });
}

export default {
  getItOperationsDashboard,
  getItOperationsModule,
  getItOperationsDrilldown,
  getItOperationsRecordDetail,
  startItOpsRemoteControl,
  sendItOpsTextMessage,
  setItOpsDeviceLock,
};
