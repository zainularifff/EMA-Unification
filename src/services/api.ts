type QueryValue = string | number | boolean | null | undefined;

type ApiRequestConfig = RequestInit & {
  params?: Record<string, QueryValue>;
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "accessToken",
  "token",
  "ema-auth-token",
];

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStoredToken() {
  for (const key of TOKEN_STORAGE_KEYS) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value && value.trim()) return value.trim();
  }

  const authRecord = safeParseJson<{
    token?: string;
    accessToken?: string;
    data?: { token?: string; accessToken?: string };
  }>(localStorage.getItem("ema-auth") || sessionStorage.getItem("ema-auth"));

  return (
    authRecord?.accessToken ||
    authRecord?.token ||
    authRecord?.data?.accessToken ||
    authRecord?.data?.token ||
    ""
  );
}

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T = any>(
  method: string,
  path: string,
  data?: unknown,
  config: ApiRequestConfig = {}
): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  const headers = new Headers(config.headers || {});

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isFormData && headers.get("Content-Type")?.includes("multipart/form-data")) {
    headers.delete("Content-Type");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, config.params), {
    ...config,
    method,
    credentials: config.credentials || "include",
    headers,
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : isFormData
          ? (data as BodyInit)
          : data !== undefined
            ? JSON.stringify(data)
            : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().then((text) => (text ? { data: text } : {}));

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.status ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

const api = {
  get<T = any>(path: string, config: ApiRequestConfig = {}) {
    return request<T>("GET", path, undefined, config);
  },

  post<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("POST", path, data, config);
  },

  put<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("PUT", path, data, config);
  },

  patch<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("PATCH", path, data, config);
  },

  delete<T = any>(path: string, config: ApiRequestConfig = {}) {
    return request<T>("DELETE", path, undefined, config);
  },
};

export default api;
