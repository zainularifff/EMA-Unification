export type OnlinePatchScope = 'all' | 'relation' | 'device';
export type OnlinePatchStatusFilter = 'all' | 'missing' | 'installed';

export type OnlinePatchScopeParams = {
  scope: OnlinePatchScope;
  Object_Rel_Idn?: number;
  Object_Root_Idn?: number;
};

export type OnlinePatchQueryParams = OnlinePatchScopeParams & {
  search?: string;
  severity?: string;
  status?: OnlinePatchStatusFilter;
  page?: number;
  limit?: number;
};

export type OnlinePatchSummary = {
  DeviceCount: number;
  ApplicablePatches: number;
  MissingPatches: number;
  InstalledPatches: number;
  DownloadedPatches: number;
  FailedInstalls: number;
  LastScanTime: string | null;
  LastInstallTime: string | null;
};

export type DepartmentNode = {
  Object_Rel_Idn: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
};

export type AssetItem = {
  id?: number | string;
  _Idn?: number;
  Object_Root_Idn?: number;
  Object_Rel_Idn?: number;
  Object_DeviceID?: string;
  Object_Client_Name?: string;
  ComputerName?: string;
  DeviceName?: string;
  AssetName?: string;
  DeviceID?: string;
  ConnectionStatus?: string;
  IP?: string;
  [key: string]: unknown;
};

export type OnlinePatchRow = {
  id?: string;
  Object_Root_Idn?: number;
  Object_Rel_Idn?: number;
  Object_Full_Name?: string;
  Object_Client_Name?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  DeviceName?: string;
  Department?: string;
  IP?: string;
  UpdateID: string;
  RevisionNumber: number;
  KB?: string;
  KBArticleIDs?: string[];
  SecurityBulletinIDs?: string[];
  CVEIDs?: string[];
  KBArticleUrls?: string[];
  Title?: string;
  Description?: string;
  MsrcSeverity?: string;
  ReleaseDate?: string | null;
  Categories?: unknown[];
  Products?: string[];
  Classifications?: string[];
  SupportUrl?: string;
  IsApplicable?: boolean | number | string;
  IsDownloaded?: boolean | number | string;
  IsInstalled?: boolean | number | string;
  RebootRequired?: boolean | number | string;
  Status?: string;
  FileCount?: number;
  TotalFileSize?: number;
  DeviceCount?: number;
  LastScanTime?: string | null;
  LastInstallTime?: string | null;
  [key: string]: unknown;
};

export type OnlinePatchFile = {
  FileID?: number;
  UpdateID?: string;
  RevisionNumber?: number;
  LocalUpdateID?: string;
  LocalRevisionNumber?: number;
  FileName?: string;
  FileSize?: number;
  DownloadUrl?: string;
  ShortLanguage?: string;
  [key: string]: unknown;
};

export type OnlinePatchDetail = {
  patch: OnlinePatchRow;
  files: OnlinePatchFile[];
  replaces: unknown[];
  statusSummary: Record<string, unknown>;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  totalRecords?: number;
  page?: number;
  limit?: number;
  message?: string;
  error?: string;
};

export type OnlinePatchPagedResponse = {
  data: OnlinePatchRow[];
  page: number;
  limit: number;
  totalRecords: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

function buildQuery(params: Record<string, unknown> = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T;

  if (!response.ok) {
    const errorPayload = payload as ApiEnvelope<T>;
    throw new Error(errorPayload.message || errorPayload.error || `Request failed with HTTP ${response.status}`);
  }

  return payload as T;
}

function unwrapData<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as ApiEnvelope<T>).data as T;
  return payload as T;
}

function normalizePaged(payload: ApiEnvelope<OnlinePatchRow[]>): OnlinePatchPagedResponse {
  return {
    data: payload.data || [],
    page: payload.page || 1,
    limit: payload.limit || 25,
    totalRecords: payload.totalRecords || payload.data?.length || 0,
  };
}

export async function getDepartments(): Promise<DepartmentNode[]> {
  const payload = await requestJson<ApiEnvelope<DepartmentNode[]> | DepartmentNode[]>('/api/departments');
  return unwrapData(payload) || [];
}

export async function getAssetsByRelationID(relationID: number): Promise<AssetItem[]> {
  const payload = await requestJson<ApiEnvelope<AssetItem[]> | AssetItem[]>(`/api/assets/${relationID}`);
  return unwrapData(payload) || [];
}

export async function getOnlinePatchSummary(scope: OnlinePatchScopeParams): Promise<OnlinePatchSummary> {
  const payload = await requestJson<ApiEnvelope<OnlinePatchSummary>>(`/api/patch/online/summary${buildQuery(scope)}`);
  return unwrapData(payload);
}

export async function getOnlinePatchStatus(params: OnlinePatchQueryParams): Promise<OnlinePatchPagedResponse> {
  const payload = await requestJson<ApiEnvelope<OnlinePatchRow[]>>(`/api/patch/online/status${buildQuery(params)}`);
  return normalizePaged(payload);
}

export async function getOnlinePatchCatalog(params: Partial<OnlinePatchQueryParams> = {}): Promise<OnlinePatchPagedResponse> {
  const payload = await requestJson<ApiEnvelope<OnlinePatchRow[]>>(`/api/patch/online/catalog${buildQuery(params)}`);
  return normalizePaged(payload);
}

export async function getOnlinePatchDetail(updateID: string, revisionNumber: number): Promise<OnlinePatchDetail> {
  const safeUpdateID = encodeURIComponent(updateID);
  const payload = await requestJson<ApiEnvelope<OnlinePatchDetail>>(`/api/patch/online/updates/${safeUpdateID}/${revisionNumber}`);
  return unwrapData(payload);
}

export async function createOnlinePatchScanJob(scope: OnlinePatchScopeParams) {
  return requestJson('/api/patch/online/scan', {
    method: 'POST',
    body: JSON.stringify(scope),
  });
}

export async function prepareOnlinePatchInstall(payload: {
  Object_Root_Idn: number;
  UpdateID: string;
  RevisionNumber: number;
}) {
  return requestJson('/api/patch/online/install', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
