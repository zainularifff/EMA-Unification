import api, { unwrapArray, unwrapData } from "./apiClient";

type AnyRecord = Record<string, any>;

export type NotificationEmailProvider = "SMTP" | "Azure" | "Exchange" | "Gmail";

export type NotificationEmailConfig = {
  provider: NotificationEmailProvider;
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
  ssl?: boolean;
  isActive?: boolean;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  azureUser?: string;
  azurePass?: string;
  exchangeEndpoint?: string;
  exchangeDomainUser?: string;
  exchangePass?: string;
  gmailUser?: string;
  gmailPass?: string;
};

export type NotificationWhatsappConfig = {
  accountSid: string;
  authToken?: string;
  fromNumber: string;
  isEnabled: boolean;
};

export type NotificationRule = {
  RuleKey: string;
  Enabled: boolean;
  WhatsAppEnabled: boolean;
  Description: string;
};

export type WhatsappUsage = {
  count: number;
  limit: number;
  remaining: number;
  activeProvider: string;
};

const WHATSAPP_MONTHLY_LIMIT = 200;
const STORAGE_KEYS = {
  email: "ema.notification.emailSettings",
  whatsapp: "ema.notification.whatsappSettings",
  usage: "ema.notification.whatsappUsage",
  rules: "ema.notification.rules",
};

const ENABLE_REMOTE_NOTIFICATION_API = String((import.meta as any)?.env?.VITE_NOTIFICATION_SETTINGS_API || "").toLowerCase() === "true";

const DEFAULT_EMAIL_SETTINGS: NotificationEmailConfig[] = [
  { provider: "SMTP", host: "", port: "587", user: "", pass: "", ssl: true, isActive: true },
];

const DEFAULT_WHATSAPP_SETTINGS: NotificationWhatsappConfig = {
  accountSid: "",
  authToken: "",
  fromNumber: "",
  isEnabled: false,
};

const DEFAULT_RULES: NotificationRule[] = [
  { RuleKey: "CRM_CREATED", Enabled: false, WhatsAppEnabled: false, Description: "Notify when a new client/customer record is created" },
  { RuleKey: "INCIDENT_CREATED", Enabled: true, WhatsAppEnabled: true, Description: "New incident ticket created" },
  { RuleKey: "INCIDENT_UPDATED", Enabled: true, WhatsAppEnabled: false, Description: "Incident ticket updated" },
  { RuleKey: "INCIDENT_RESOLVED", Enabled: true, WhatsAppEnabled: false, Description: "Incident ticket resolved or closed" },
  { RuleKey: "LEASE_EXPIRY_3M", Enabled: false, WhatsAppEnabled: false, Description: "Lease expiring in 3 months" },
  { RuleKey: "LEASE_EXPIRY_1M", Enabled: false, WhatsAppEnabled: false, Description: "Lease expiring in 1 month" },
  { RuleKey: "LEASE_EXPIRY_1W", Enabled: false, WhatsAppEnabled: false, Description: "Lease expiring in 1 week" },
  { RuleKey: "LICENSE_EXCEEDED", Enabled: false, WhatsAppEnabled: false, Description: "Installed assets exceed licensed count" },
];

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}

function normalizeProvider(value: unknown): NotificationEmailProvider {
  const text = String(value || "SMTP").trim();
  return (["SMTP", "Azure", "Exchange", "Gmail"] as NotificationEmailProvider[]).includes(text as NotificationEmailProvider)
    ? text as NotificationEmailProvider
    : "SMTP";
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best-effort only.
  }
}

function currentUsageFallback(): WhatsappUsage {
  const stored = readLocal<Partial<WhatsappUsage>>(STORAGE_KEYS.usage, {});
  const count = Math.max(0, Number(stored.count || 0));
  return {
    count,
    limit: WHATSAPP_MONTHLY_LIMIT,
    remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - count),
    activeProvider: String(stored.activeProvider || "Twilio"),
  };
}

function saveUsage(countOrUsage: number | Partial<WhatsappUsage>) {
  const count = typeof countOrUsage === "number" ? countOrUsage : Math.max(0, Number(countOrUsage.count || 0));
  const usage = {
    count: Math.max(0, count),
    limit: WHATSAPP_MONTHLY_LIMIT,
    remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - Math.max(0, count)),
    activeProvider: typeof countOrUsage === "number" ? "Twilio" : String(countOrUsage.activeProvider || "Twilio"),
  };
  writeLocal(STORAGE_KEYS.usage, usage);
  return usage;
}

function hasWhatsappSendConfig(payload: Partial<NotificationWhatsappConfig>) {
  return Boolean(String(payload.accountSid || "").trim() && String(payload.fromNumber || "").trim());
}

async function remoteOrLocal<T>(remoteCall: () => Promise<T>, localValue: () => T): Promise<T> {
  if (!ENABLE_REMOTE_NOTIFICATION_API) return localValue();
  try {
    return await remoteCall();
  } catch {
    return localValue();
  }
}

export function normalizeEmailConfig(row: AnyRecord = {}): NotificationEmailConfig {
  const provider = normalizeProvider(row.provider ?? row.Provider);
  return {
    provider,
    host: String(row.host ?? row.SmtpHost ?? ""),
    port: row.port ?? row.SmtpPort ?? "587",
    user: String(row.user ?? row.SmtpUser ?? row.AzureUser ?? row.GmailUser ?? ""),
    pass: "",
    ssl: boolValue(row.ssl ?? row.SslTls, provider === "SMTP"),
    isActive: boolValue(row.isActive ?? row.IsActive, provider === "SMTP"),
    azureTenantId: String(row.azureTenantId ?? row.AzureTenantId ?? ""),
    azureClientId: String(row.azureClientId ?? row.AzureClientId ?? ""),
    azureClientSecret: "",
    azureUser: String(row.azureUser ?? row.AzureUser ?? ""),
    azurePass: "",
    exchangeEndpoint: String(row.exchangeEndpoint ?? row.ExchangeEndpoint ?? ""),
    exchangeDomainUser: String(row.exchangeDomainUser ?? row.ExchangeDomainUser ?? ""),
    exchangePass: "",
    gmailUser: String(row.gmailUser ?? row.GmailUser ?? ""),
    gmailPass: "",
  };
}

export function normalizeWhatsappConfig(row: AnyRecord = {}): NotificationWhatsappConfig {
  return {
    accountSid: String(row.accountSid ?? row.AccountSid ?? ""),
    authToken: "",
    fromNumber: String(row.fromNumber ?? row.FromNumber ?? ""),
    isEnabled: boolValue(row.isEnabled ?? row.IsEnabled, false),
  };
}

export function normalizeNotificationRule(row: AnyRecord = {}): NotificationRule {
  return {
    RuleKey: String(row.RuleKey ?? row.ruleKey ?? ""),
    Enabled: boolValue(row.Enabled ?? row.enabled, false),
    WhatsAppEnabled: boolValue(row.WhatsAppEnabled ?? row.whatsAppEnabled ?? row.whatsappEnabled, false),
    Description: String(row.Description ?? row.description ?? ""),
  };
}

export const notificationSettingsService = {
  async getEmailSettings() {
    return remoteOrLocal(
      async () => unwrapArray<AnyRecord>(await api.get("/api/settings/email", { forceRefresh: true, cacheTtlMs: 0 })).map(normalizeEmailConfig),
      () => readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS).map(normalizeEmailConfig),
    );
  },
  async saveEmailSettings(payload: NotificationEmailConfig) {
    const current = readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS);
    const next = current.filter((item) => item.provider !== payload.provider);
    next.push({ ...payload, pass: "" });
    writeLocal(STORAGE_KEYS.email, next);
    if (ENABLE_REMOTE_NOTIFICATION_API) return unwrapData(await api.post("/api/settings/email", payload));
    return { saved: true, localOnly: true };
  },
  async testEmail(payload: NotificationEmailConfig) {
    if (ENABLE_REMOTE_NOTIFICATION_API) return unwrapData(await api.post("/api/settings/email/test", payload));
    return { simulated: true, provider: payload.provider };
  },
  async getWhatsappSettings() {
    return remoteOrLocal(
      async () => normalizeWhatsappConfig(unwrapData<AnyRecord>(await api.get("/api/settings/whatsapp", { forceRefresh: true, cacheTtlMs: 0 }), {})),
      () => normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS)),
    );
  },
  async saveWhatsappSettings(payload: NotificationWhatsappConfig) {
    writeLocal(STORAGE_KEYS.whatsapp, { ...payload, authToken: "" });
    if (ENABLE_REMOTE_NOTIFICATION_API || hasWhatsappSendConfig(payload)) {
      return unwrapData(await api.post("/api/settings/whatsapp", payload));
    }
    return { saved: true, localOnly: true };
  },
  async testWhatsapp(payload: NotificationWhatsappConfig & { testNumber: string }) {
    if (!String(payload.testNumber || "").trim()) throw new Error("Recipient phone number is required.");
    if (!ENABLE_REMOTE_NOTIFICATION_API && !hasWhatsappSendConfig(payload)) {
      throw new Error("Real WhatsApp test requires Account SID and From Number. Enter the credentials first, then send test.");
    }
    const result = unwrapData<AnyRecord>(await api.post("/api/settings/whatsapp/test", payload), {});
    if (result?.usage) saveUsage(result.usage);
    return result;
  },
  async getWhatsappUsage() {
    return remoteOrLocal(
      async () => {
        const payload = await api.get("/api/settings/whatsapp/usage", { forceRefresh: true, cacheTtlMs: 0 });
        const data = unwrapData<WhatsappUsage>(payload, currentUsageFallback());
        const count = Math.max(0, Number(data.count || 0));
        return { ...data, count, limit: WHATSAPP_MONTHLY_LIMIT, remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - count), activeProvider: data.activeProvider || "Twilio" };
      },
      currentUsageFallback,
    );
  },
  async getRules() {
    return remoteOrLocal(
      async () => unwrapArray<AnyRecord>(await api.get("/api/settings/notification-rules", { forceRefresh: true, cacheTtlMs: 0 })).map(normalizeNotificationRule).filter((rule) => rule.RuleKey),
      () => readLocal<NotificationRule[]>(STORAGE_KEYS.rules, DEFAULT_RULES).map(normalizeNotificationRule).filter((rule) => rule.RuleKey),
    );
  },
  async saveRules(rules: NotificationRule[]) {
    writeLocal(STORAGE_KEYS.rules, rules);
    if (ENABLE_REMOTE_NOTIFICATION_API) return unwrapData(await api.put("/api/settings/notification-rules", rules));
    return { saved: true, localOnly: true };
  },
};

export default notificationSettingsService;
