import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  errorMessage?: string;
  error?: string;
  data?: T;
  totalRecords?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ApiClientOptions = AxiosRequestConfig & {
  skipAuth?: boolean;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

function cleanToken(value: string | null | undefined) {
  if (!value || value === "undefined" || value === "null") return "";
  return value.trim().replace(/^"|"$/g, "").replace(/^Bearer\s+/i, "");
}

function findTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    const direct = cleanToken(value);
    if (direct && direct.startsWith("eyJ")) return direct;

    try {
      return findTokenInValue(JSON.parse(value), depth + 1);
    } catch {
      return direct;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const direct =
      record.token ||
      record.accessToken ||
      record.access_token ||
      record.authToken ||
      record.jwt ||
      record.jwtToken ||
      record.bearerToken ||
      (record.data as Record<string, unknown> | undefined)?.token ||
      (record.data as Record<string, unknown> | undefined)?.accessToken ||
      (record.data as Record<string, unknown> | undefined)?.access_token ||
      (record.user as Record<string, unknown> | undefined)?.token ||
      (record.user as Record<string, unknown> | undefined)?.accessToken;

    const token = findTokenInValue(direct, depth + 1);
    if (token) return token;

    for (const item of Object.values(record)) {
      const nestedToken = findTokenInValue(item, depth + 1);
      if (nestedToken) return nestedToken;
    }
  }

  return "";
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return "";

  const tokenKeys = [
    "ema_token",
    "ema-access-token",
    "emaToken",
    "accessToken",
    "access_token",
    "token",
    "authToken",
    "jwt",
    "jwtToken",
    "bearerToken",
  ];

  const payloadKeys = ["ema-auth", "auth", "user", "ema-user"];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of tokenKeys) {
      const token = cleanToken(storage.getItem(key));
      if (token) return token;
    }

    for (const key of payloadKeys) {
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return "";
}

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
    return (
      axiosError.response?.data?.errorMessage ||
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      "API request failed."
    );
  }

  if (error instanceof Error) return error.message;
  return "API request failed.";
}

export function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export function normalizeApiEnvelope<T>(payload: T | ApiEnvelope<T>): ApiEnvelope<T> {
  if (payload && typeof payload === "object" && ("data" in payload || "success" in payload || "message" in payload)) {
    const envelope = payload as ApiEnvelope<T>;
    return {
      success: envelope.success !== false,
      ...envelope,
      data: "data" in envelope ? envelope.data : (payload as T),
    };
  }

  return {
    success: true,
    data: payload as T,
  };
}

apiClient.interceptors.request.use((config) => {
  const skipAuth = (config as ApiClientOptions).skipAuth;

  if (!skipAuth) {
    const token = getStoredAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(getApiErrorMessage(error)))
);

export async function apiGet<T>(url: string, config?: ApiClientOptions): Promise<T> {
  const response = await apiClient.get<T | ApiEnvelope<T>>(url, config);
  return unwrapApiData<T>(response.data);
}

export async function apiPost<T, B = unknown>(url: string, body?: B, config?: ApiClientOptions): Promise<T> {
  const response = await apiClient.post<T | ApiEnvelope<T>>(url, body, config);
  return unwrapApiData<T>(response.data);
}

export async function apiPut<T, B = unknown>(url: string, body?: B, config?: ApiClientOptions): Promise<T> {
  const response = await apiClient.put<T | ApiEnvelope<T>>(url, body, config);
  return unwrapApiData<T>(response.data);
}

export async function apiPatch<T, B = unknown>(url: string, body?: B, config?: ApiClientOptions): Promise<T> {
  const response = await apiClient.patch<T | ApiEnvelope<T>>(url, body, config);
  return unwrapApiData<T>(response.data);
}

export async function apiDelete<T>(url: string, config?: ApiClientOptions): Promise<T> {
  const response = await apiClient.delete<T | ApiEnvelope<T>>(url, config);
  return unwrapApiData<T>(response.data);
}

export default apiClient;
