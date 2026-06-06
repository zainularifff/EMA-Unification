export function extractData<T = any>(response: any): T | undefined {
  if (response === null || response === undefined) {
    return undefined;
  }

  if (Array.isArray(response)) {
    return response as T;
  }

  if (typeof response !== "object") {
    return response as T;
  }

  if (Array.isArray(response.data)) {
    return response.data as T;
  }

  if (response.data !== undefined) {
    return response.data as T;
  }

  if (Array.isArray(response.rows)) {
    return response.rows as T;
  }

  if (Array.isArray(response.recordset)) {
    return response.recordset as T;
  }

  if (Array.isArray(response.items)) {
    return response.items as T;
  }

  return response as T;
}

export function extractSuccess(response: any) {
  if (response?.success !== undefined) return Boolean(response.success);
  if (response?.status !== undefined) return String(response.status).toLowerCase() === "success";
  return true;
}

export function extractMessage(response: any) {
  return String(response?.message || response?.error || response?.status || "");
}
