import axios from 'axios';
import api from './api';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  totalRecords?: number;
  message?: string;
  error?: string;
  errorMessage?: string;
};

export type RestrictionModule = 'appBlacklist' | 'appWhitelist' | 'webRestriction';
export type RestrictionTargetKind = 'root' | 'department' | 'device' | 'org';

export type RestrictionTreeNode = {
  id: string;
  label: string;
  type: RestrictionTargetKind;
  badge?: string;
  target_type?: 1 | 2;
  target_id?: string;
  Object_Rel_Idn?: number;
  Object_Root_Idn?: number;
  Object_DeviceID?: string;
  Object_Full_Name?: string;
  Object_Agent?: string;
  children?: RestrictionTreeNode[];
};

export type RestrictionTarget = {
  id: string;
  label: string;
  type: Exclude<RestrictionTargetKind, 'org'>;
  target_type: 1 | 2;
  target_id: string;
  Object_Rel_Idn?: number;
  Object_Root_Idn?: number;
  Object_DeviceID?: string;
  Object_Full_Name?: string;
};

export type RestrictionSettingItem = {
  policy_id?: number;
  policy_key: string;
  policy_value: string;
  seq?: number;
};

export type RestrictionPolicyDetail = {
  policy_id: number;
  policy_type: number;
  source: 'none' | 'device' | 'department' | 'root';
  sourceLabel?: string;
  target_type?: 1 | 2;
  target_id?: string;
  target_name?: string;
  object_full_name?: string;
  version?: string;
  upd_dt?: string;
  settings: Record<string, string>;
  settingItems: RestrictionSettingItem[];
  packages?: RestrictionPackage[];
  selectedPackageIds?: string[];
  whitelistSoftware?: WhitelistSoftware[];
  selectedWhitelistIds?: string[];
  urls?: string[];
};

export type RestrictionPolicyRow = {
  policy_id: number;
  target_type: 1 | 2;
  target_id: string;
  target_name: string;
  object_full_name: string;
  use_policy?: string;
  Version?: string;
  version?: string;
  policy_type?: number;
};

export type RestrictionPackage = {
  SW_Pkg_Idn: number;
  SW_Pkg_Name: string;
  SW_Pkg_Company?: string;
  License_Qnt?: number;
  Use_Statistices?: number;
  Cur_Count?: number;
  SW_Package_EtcInfo?: string;
  SW_Catg?: number;
  SW_Pkg_Guid?: string;
  Selected?: number;
  Manufacturer?: string;
  FileName?: string;
  FileSize?: string | number;
  sha256Hash?: string | null;
  file_count?: number;
  used_policy_count?: number;
  sample_file?: string;
  files?: RestrictionPackageFile[];
};

export type RestrictionPackageFile = {
  ID?: number;
  SW_Pkg_Idn?: number;
  FileName: string;
  FileVersion?: string;
  FileVersionSub?: string;
  bHide?: number;
  SW_Pkg_Guid?: string;
  FileSize?: string | number;
  RegKey?: string;
  md5Hash?: string;
  sha256Hash?: string | null;
  SW_Idn?: number;
  OriginalFileName?: string;
};

export type PackageManagerPayload = {
  SW_Pkg_Name: string;
  SW_Pkg_Company?: string;
  License_Qnt?: number;
  Use_Statistices?: number;
  Cur_Count?: number;
  SW_Package_EtcInfo?: string;
  SW_Catg?: number;
  Selected?: number;
  files?: RestrictionPackageFile[];
};

export type WhitelistSoftware = {
  WLSWIdn: number;
  Name: string;
  Vendor?: string;
  Type?: string;
  IsBase?: number;
};

export type WhitelistCollectedFile = {
  WLSWIdn?: number;
  Type?: string;
  ProcessName?: string;
  FontName?: string;
  OriginalFileName?: string;
  FileSize?: string | number;
  FileVersion?: string;
  Company?: string;
  SWType?: string;
  Remark?: string;
  Name?: string;
};

export type WebGroup = {
  idx: number;
  name: string;
  description?: string;
  url_count?: number;
  urls?: WebGroupUrl[];
};

export type WebGroupUrl = {
  idx: number;
  seq: number;
  url: string;
};

export type RestrictionStatusRow = Record<string, unknown>;

export type SaveRestrictionPolicyPayload = {
  policy_id: number;
  target_type: 1 | 2;
  target_id: string;
  use_parent_policy: '0' | '1';
  use_policy: '0' | '1';
  update_interval?: string | number;
  restrict_type?: string;
  restrict_message?: string;
  version_compare?: '0' | '1';
  use_weekly_policy?: '0' | '1';
  day_select?: string;
  use_schedule?: '0' | '1';
  softwareRestrictSchedule1?: string;
  softwareRestrictSchedule2?: string;
  softwareRestrictSchedule3?: string;
  softwareRestrictSchedule4?: string;
  font_restrict_type?: string;
  font_restrict_message?: string;
  web_restrict_type?: string;
  default_url?: string;
  RestrictSchedule1?: string;
  RestrictSchedule2?: string;
  RestrictSchedule3?: string;
  RestrictSchedule4?: string;
  package_list?: Array<string | number>;
  web_list?: string[];
  login_id?: string;
  console_ip?: string;
};

type RequestParams = Record<string, string | number | boolean | undefined | null>;

const API_BASE_URL = (() => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  const rawBaseUrl = typeof envBaseUrl === 'string' && envBaseUrl.trim() !== ''
    ? envBaseUrl.trim()
    : String(api.defaults.baseURL || 'http://localhost:3001/api');

  const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
  return cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;
})();

const restrictionApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const normalizeBearerToken = (value: string): string => value.replace(/^Bearer\s+/i, '').trim();

const isLikelyJwt = (value: string): boolean => {
  const token = normalizeBearerToken(value);
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
};

type JwtPayloadLite = {
  exp?: number;
  iat?: number;
  aud?: string;
  iss?: string;
  [key: string]: unknown;
};

const decodeJwtPayload = (tokenValue: string): JwtPayloadLite | null => {
  const token = normalizeBearerToken(tokenValue);
  if (!isLikelyJwt(token)) return null;

  try {
    const [, payload] = token.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as JwtPayloadLite;
  } catch {
    return null;
  }
};

const isUsableJwt = (tokenValue: string): boolean => {
  const payload = decodeJwtPayload(tokenValue);
  if (!payload) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= nowSeconds + 10) return false;

  return true;
};

const scoreJwtCandidate = (tokenValue: string, storageKey = ''): number => {
  const payload = decodeJwtPayload(tokenValue);
  if (!payload) return -1;

  let score = 0;

  if (payload.aud === 'ema-react-app') score += 1000;
  if (payload.iss === 'ema-node-api') score += 1000;

  const preferredKeys = ['ema_token', 'accessToken', 'authToken', 'jwt', 'loginData', 'currentUser', 'authUser', 'auth', 'user', 'token'];
  const keyIndex = preferredKeys.indexOf(storageKey);
  if (keyIndex >= 0) score += preferredKeys.length - keyIndex;

  if (typeof payload.exp === 'number') score += Math.min(payload.exp, 4102444800) / 100000000;
  if (typeof payload.iat === 'number') score += Math.min(payload.iat, 4102444800) / 1000000000;

  return score;
};

const collectTokensFromStorageValue = (value: string | null): string[] => {
  if (!value) return [];
  const trimmed = value.trim();

  const normalizeCandidate = (candidate: unknown): string[] => {
    if (typeof candidate === 'string' && isLikelyJwt(candidate)) {
      return [normalizeBearerToken(candidate)];
    }
    return [];
  };

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const candidates: unknown[] = [
        record.token,
        record.accessToken,
        record.access_token,
      ];

      const nestedData = record.data;
      if (nestedData && typeof nestedData === 'object') {
        const dataRecord = nestedData as Record<string, unknown>;
        candidates.push(dataRecord.token, dataRecord.accessToken, dataRecord.access_token);

        const nestedUser = dataRecord.user;
        if (nestedUser && typeof nestedUser === 'object') {
          const userRecord = nestedUser as Record<string, unknown>;
          candidates.push(userRecord.token, userRecord.accessToken, userRecord.access_token);
        }
      }

      const nestedUser = record.user;
      if (nestedUser && typeof nestedUser === 'object') {
        const userRecord = nestedUser as Record<string, unknown>;
        candidates.push(userRecord.token, userRecord.accessToken, userRecord.access_token);
      }

      return candidates.flatMap(normalizeCandidate);
    }

    return [];
  } catch {
    return isLikelyJwt(trimmed) ? [normalizeBearerToken(trimmed)] : [];
  }
};

const readTokenFromStorageValue = (value: string | null): string => {
  return collectTokensFromStorageValue(value).find(isUsableJwt) || '';
};

export const getAccessToken = (): string => {
  const tokenKeys = [
    'ema_token',
    'accessToken',
    'authToken',
    'jwt',
    'loginData',
    'currentUser',
    'authUser',
    'auth',
    'user',
    'token',
  ];

  const candidates = tokenKeys.flatMap((key) =>
    collectTokensFromStorageValue(localStorage.getItem(key))
      .filter(isUsableJwt)
      .map((token) => ({ token, key, score: scoreJwtCandidate(token, key) }))
  );

  if (candidates.length === 0) return '';

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].token.trim();
};

export const getCurrentLoginId = (): string => {
  const keys = ['user', 'auth', 'authUser', 'currentUser', 'loginData'];

  for (const key of keys) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null') as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== 'object') continue;

      const direct = parsed.userID || parsed.userId || parsed.username || parsed.login_id;
      if (typeof direct === 'string' && direct.trim()) return direct.trim();

      const nested = parsed.data;
      if (nested && typeof nested === 'object') {
        const nestedRecord = nested as Record<string, unknown>;
        const nestedDirect = nestedRecord.userID || nestedRecord.userId || nestedRecord.username || nestedRecord.login_id;
        if (typeof nestedDirect === 'string' && nestedDirect.trim()) return nestedDirect.trim();

        const nestedUser = nestedRecord.user;
        if (nestedUser && typeof nestedUser === 'object') {
          const userRecord = nestedUser as Record<string, unknown>;
          const userValue = userRecord.userID || userRecord.userId || userRecord.username || userRecord.login_id;
          if (typeof userValue === 'string' && userValue.trim()) return userValue.trim();
        }
      }
    } catch {
      // Ignore malformed local storage values.
    }
  }

  return 'system';
};

const getAuthHeaders = (): { Authorization?: string } => {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` };
};

const cleanParams = (params?: RequestParams) => {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
};

const requestConfig = (params?: RequestParams) => ({
  headers: getAuthHeaders(),
  params: cleanParams(params),
});

const normalizeDataArray = <T>(response: { data?: unknown }): T[] => {
  const payload = response.data as ApiResponse<T[]> | T[] | { data?: T[] } | undefined;

  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as ApiResponse<T[]>).data)) {
    return (payload as ApiResponse<T[]>).data;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: T[] }).data)) {
    return (payload as { data?: T[] }).data || [];
  }

  return [];
};

const normalizeSingle = <T>(response: { data?: unknown }, fallback: T): T => {
  const payload = response.data as ApiResponse<T> | T | undefined;
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as ApiResponse<T>).data;
  return (payload as T) || fallback;
};

const toModulePath = (module: RestrictionModule): string => {
  if (module === 'appBlacklist') return 'app';
  if (module === 'appWhitelist') return 'whitelist';
  return 'web';
};

export const restrictionService = {
  async getTree(): Promise<RestrictionTreeNode[]> {
    const response = await restrictionApi.get('/restrictions/tree', requestConfig());
    return normalizeDataArray<RestrictionTreeNode>(response);
  },

  async getEffectivePolicy(module: RestrictionModule, target: RestrictionTarget): Promise<RestrictionPolicyDetail> {
    const response = await restrictionApi.get(`/restrictions/${toModulePath(module)}/effective-policy`, requestConfig({
      target_type: target.target_type,
      target_id: target.target_id,
    }));

    return normalizeSingle<RestrictionPolicyDetail>(response, {
      policy_id: 0,
      policy_type: module === 'appBlacklist' ? 1006 : module === 'appWhitelist' ? 1012 : 1005,
      source: 'none',
      settings: {},
      settingItems: [],
      packages: [],
      selectedPackageIds: [],
      whitelistSoftware: [],
      selectedWhitelistIds: [],
      urls: [],
    });
  },

  async getPolicyList(module: RestrictionModule, target?: RestrictionTarget): Promise<RestrictionPolicyRow[]> {
    const response = await restrictionApi.get(`/restrictions/${toModulePath(module)}/policies`, requestConfig(target ? {
      target_type: target.target_type,
      target_id: target.target_id,
    } : undefined));
    return normalizeDataArray<RestrictionPolicyRow>(response);
  },

  async getRestrictionStatus(module: RestrictionModule, target: RestrictionTarget, params: RequestParams): Promise<RestrictionStatusRow[]> {
    const response = await restrictionApi.get(`/restrictions/${toModulePath(module)}/status`, requestConfig({
      ...params,
      target_type: target.target_type,
      target_id: target.target_id,
    }));
    return normalizeDataArray<RestrictionStatusRow>(response);
  },

  async getPackages(search = ''): Promise<RestrictionPackage[]> {
    const response = await restrictionApi.get('/restrictions/app/packages', requestConfig({ search }));
    return normalizeDataArray<RestrictionPackage>(response);
  },

  async getPackageManagerPackages(search = '', includeInactive = false): Promise<RestrictionPackage[]> {
    const response = await restrictionApi.get('/restrictions/app/package-manager', requestConfig({
      search,
      includeInactive: includeInactive ? 1 : 0,
    }));
    return normalizeDataArray<RestrictionPackage>(response);
  },

  async getPackageManagerPackage(packageId: number | string): Promise<RestrictionPackage> {
    const response = await restrictionApi.get(`/restrictions/app/package-manager/${packageId}`, requestConfig());
    return normalizeSingle<RestrictionPackage>(response, { SW_Pkg_Idn: Number(packageId), SW_Pkg_Name: '', files: [] });
  },

  async createPackageManagerPackage(payload: PackageManagerPayload): Promise<ApiResponse<RestrictionPackage>> {
    const response = await restrictionApi.post('/restrictions/app/package-manager', payload, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPackage>;
  },

  async updatePackageManagerPackage(packageId: number | string, payload: PackageManagerPayload): Promise<ApiResponse<RestrictionPackage>> {
    const response = await restrictionApi.put(`/restrictions/app/package-manager/${packageId}`, payload, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPackage>;
  },

  async deletePackageManagerPackage(packageId: number | string): Promise<ApiResponse<null>> {
    const response = await restrictionApi.delete(`/restrictions/app/package-manager/${packageId}`, { headers: getAuthHeaders() });
    return response.data as ApiResponse<null>;
  },

  async searchPackageManagerFiles(filename = '', extension = 'EXE'): Promise<RestrictionPackageFile[]> {
    const response = await restrictionApi.get('/restrictions/app/package-manager/file-search', requestConfig({ filename, extension }));
    return normalizeDataArray<RestrictionPackageFile>(response);
  },

  async addPackageManagerFile(packageId: number | string, file: RestrictionPackageFile): Promise<ApiResponse<RestrictionPackage>> {
    const response = await restrictionApi.post(`/restrictions/app/package-manager/${packageId}/files`, file, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPackage>;
  },

  async updatePackageManagerFile(packageId: number | string, fileId: number | string, file: RestrictionPackageFile): Promise<ApiResponse<RestrictionPackage>> {
    const response = await restrictionApi.put(`/restrictions/app/package-manager/${packageId}/files/${fileId}`, file, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPackage>;
  },

  async deletePackageManagerFile(packageId: number | string, fileId: number | string): Promise<ApiResponse<RestrictionPackage>> {
    const response = await restrictionApi.delete(`/restrictions/app/package-manager/${packageId}/files/${fileId}`, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPackage>;
  },

  async getWhitelistSoftware(search = ''): Promise<WhitelistSoftware[]> {
    const response = await restrictionApi.get('/restrictions/whitelist/software', requestConfig({ search }));
    return normalizeDataArray<WhitelistSoftware>(response);
  },

  async getWhitelistManagedSoftware(search = ''): Promise<WhitelistSoftware[]> {
    const response = await restrictionApi.get('/restrictions/whitelist/manage/software', requestConfig({ search }));
    return normalizeDataArray<WhitelistSoftware>(response);
  },

  async createWhitelistSoftware(name: string): Promise<ApiResponse<WhitelistSoftware>> {
    const response = await restrictionApi.post('/restrictions/whitelist/manage/software', { name }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WhitelistSoftware>;
  },

  async updateWhitelistSoftware(id: number | string, name: string): Promise<ApiResponse<WhitelistSoftware>> {
    const response = await restrictionApi.put(`/restrictions/whitelist/manage/software/${id}`, { name }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WhitelistSoftware>;
  },

  async deleteWhitelistSoftware(id: number | string): Promise<ApiResponse<null>> {
    const response = await restrictionApi.delete(`/restrictions/whitelist/manage/software/${id}`, { headers: getAuthHeaders() });
    return response.data as ApiResponse<null>;
  },

  async getDefaultPermittedSoftware(): Promise<WhitelistSoftware[]> {
    const response = await restrictionApi.get('/restrictions/whitelist/default-permitted', requestConfig());
    return normalizeDataArray<WhitelistSoftware>(response);
  },

  async saveDefaultPermittedSoftware(ids: Array<string | number>): Promise<ApiResponse<WhitelistSoftware[]>> {
    const response = await restrictionApi.post('/restrictions/whitelist/default-permitted', { software_ids: ids }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WhitelistSoftware[]>;
  },

  async getWhitelistCollectedFiles(search = '', type: 'process' | 'font' = 'process'): Promise<WhitelistCollectedFile[]> {
    const response = await restrictionApi.get('/restrictions/whitelist/manage/files', requestConfig({ search, type }));
    return normalizeDataArray<WhitelistCollectedFile>(response);
  },

  async refreshWhitelistRestrictionInformation(): Promise<ApiResponse<{ requestedAt: string }>> {
    const response = await restrictionApi.post('/restrictions/whitelist/restriction-info-update', { login_id: getCurrentLoginId() }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<{ requestedAt: string }>;
  },

  async getWebGroups(): Promise<WebGroup[]> {
    const response = await restrictionApi.get('/restrictions/web/groups', requestConfig());
    return normalizeDataArray<WebGroup>(response);
  },

  async getWebGroupUrls(groupId: number): Promise<WebGroupUrl[]> {
    const response = await restrictionApi.get(`/restrictions/web/groups/${groupId}/urls`, requestConfig());
    return normalizeDataArray<WebGroupUrl>(response);
  },

  async getWebGroup(groupId: number): Promise<WebGroup> {
    const response = await restrictionApi.get(`/restrictions/web/groups/${groupId}`, requestConfig());
    return response.data.data as WebGroup;
  },

  async createWebGroup(name: string, urls: string[] = [], description = ''): Promise<ApiResponse<WebGroup>> {
    const response = await restrictionApi.post('/restrictions/web/groups', { name, description, urls }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WebGroup>;
  },

  async updateWebGroup(groupId: number, name: string, description = ''): Promise<ApiResponse<WebGroup>> {
    const response = await restrictionApi.put(`/restrictions/web/groups/${groupId}`, { name, description }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WebGroup>;
  },

  async deleteWebGroup(groupId: number): Promise<ApiResponse<null>> {
    const response = await restrictionApi.delete(`/restrictions/web/groups/${groupId}`, { headers: getAuthHeaders() });
    return response.data as ApiResponse<null>;
  },

  async addWebGroupUrl(groupId: number, url: string): Promise<ApiResponse<WebGroupUrl>> {
    const response = await restrictionApi.post(`/restrictions/web/groups/${groupId}/urls`, { url }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WebGroupUrl>;
  },

  async updateWebGroupUrl(groupId: number, seq: number, url: string): Promise<ApiResponse<WebGroupUrl>> {
    const response = await restrictionApi.put(`/restrictions/web/groups/${groupId}/urls/${seq}`, { url }, { headers: getAuthHeaders() });
    return response.data as ApiResponse<WebGroupUrl>;
  },

  async deleteWebGroupUrl(groupId: number, seq: number): Promise<ApiResponse<null>> {
    const response = await restrictionApi.delete(`/restrictions/web/groups/${groupId}/urls/${seq}`, { headers: getAuthHeaders() });
    return response.data as ApiResponse<null>;
  },

  async savePolicy(module: RestrictionModule, payload: SaveRestrictionPolicyPayload): Promise<ApiResponse<RestrictionPolicyDetail>> {
    const response = await restrictionApi.post(`/restrictions/${toModulePath(module)}/policy`, payload, { headers: getAuthHeaders() });
    return response.data as ApiResponse<RestrictionPolicyDetail>;
  },
};

export default restrictionService;
