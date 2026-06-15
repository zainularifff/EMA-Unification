const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

const runtimeOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";

export const API_BASE_URL = (rawApiBaseUrl || runtimeOrigin).replace(/\/+$/, "");
