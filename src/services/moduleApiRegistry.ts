export type ModuleKey =
  | "hardwareInventory"
  | "softwareInventory"
  | "itOperationsDashboard"
  | "managementDashboard"
  | "reports"
  | "settings"
  | "endpointDetails";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiCallConfig = {
  /**
   * Unique result key returned to UI.
   * Example: data.software, data.categories, data.departments
   */
  key: string;

  /**
   * Static endpoint or endpoint builder.
   * Use function when endpoint depends on params.
   */
  url: string | ((params?: Record<string, unknown>) => string);

  method?: ApiMethod;

  /**
   * Query params for GET or body for POST/PUT/PATCH.
   */
  params?: Record<string, unknown> | ((params?: Record<string, unknown>) => Record<string, unknown> | undefined);

  /**
   * If true and this API fails, the whole module load fails.
   * If false, module still returns other API data with __errors.
   */
  required?: boolean;

  /**
   * Cache duration in milliseconds.
   * Set 0 or undefined to disable cache.
   */
  cacheMs?: number;

  /**
   * Skip this API call based on current params.
   */
  enabled?: boolean | ((params?: Record<string, unknown>) => boolean);

  /**
   * Optional transform before data reaches UI.
   */
  transform?: (data: unknown, params?: Record<string, unknown>) => unknown;
};

const ONE_MINUTE = 60 * 1000;

export const moduleApiRegistry: Record<ModuleKey, ApiCallConfig[]> = {
  hardwareInventory: [
    {
      key: "departments",
      url: "/api/departments",
      method: "GET",
      required: true,
      cacheMs: 5 * ONE_MINUTE,
    },

    /**
     * Recommended backend improvement:
     * Create one aggregate endpoint later:
     * GET /api/hardware/inventory
     *
     * Then UI no longer needs to call /api/assets/{relationID} many times.
     */
    {
      key: "hardwareSummary",
      url: "/api/hardware/summary",
      method: "GET",
      required: false,
      cacheMs: 2 * ONE_MINUTE,
    },
  ],

  softwareInventory: [
    {
      key: "software",
      url: "/api/software",
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
    },
    {
      key: "categories",
      url: "/api/software/categories",
      method: "GET",
      required: false,
      cacheMs: 10 * ONE_MINUTE,
    },
  ],

  itOperationsDashboard: [
    {
      key: "assetSummary",
      url: "/api/dashboard/assets",
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
    },
    {
      key: "riskSummary",
      url: "/api/dashboard/risks",
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
    },
    {
      key: "helpdeskSummary",
      url: "/api/dashboard/helpdesk",
      method: "GET",
      required: false,
      cacheMs: 2 * ONE_MINUTE,
    },
  ],

  managementDashboard: [
    {
      key: "executiveKpi",
      url: "/api/management/kpi",
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
    },
    {
      key: "riskExposure",
      url: "/api/management/risk-exposure",
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
    },
    {
      key: "costOptimization",
      url: "/api/management/cost",
      method: "GET",
      required: false,
      cacheMs: 2 * ONE_MINUTE,
    },
  ],

  reports: [
    {
      key: "reportList",
      url: "/api/reports",
      method: "GET",
      required: true,
      cacheMs: 10 * ONE_MINUTE,
    },
  ],

  settings: [
    {
      key: "roles",
      url: "/api/settings/roles",
      method: "GET",
      required: true,
      cacheMs: 5 * ONE_MINUTE,
    },
    {
      key: "moduleAccess",
      url: "/api/settings/module-access",
      method: "GET",
      required: true,
      cacheMs: 5 * ONE_MINUTE,
    },
  ],

  endpointDetails: [
    {
      key: "deviceDetails",
      url: (params) => `/api/asset/${params?.objectAgent}/${params?.assetId}`,
      method: "GET",
      required: true,
      cacheMs: 2 * ONE_MINUTE,
      enabled: (params) => Boolean(params?.objectAgent && params?.assetId),
    },
  ],
};
