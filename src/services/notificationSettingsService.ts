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
    const payload = await api.get("/api/settings/email", { forceRefresh: true, cacheTtlMs: 0 });
    return unwrapArray<AnyRecord>(payload).map(normalizeEmailConfig);
  },
  async saveEmailSettings(payload: NotificationEmailConfig) {
    return unwrapData(await api.post("/api/settings/email", payload));
  },
  async testEmail(payload: NotificationEmailConfig) {
    return unwrapData(await api.post("/api/settings/email/test", payload));
  },
  async getWhatsappSettings() {
    const payload = await api.get("/api/settings/whatsapp", { forceRefresh: true, cacheTtlMs: 0 });
    return normalizeWhatsappConfig(unwrapData<AnyRecord>(payload, {}));
  },
  async saveWhatsappSettings(payload: NotificationWhatsappConfig) {
    return unwrapData(await api.post("/api/settings/whatsapp", payload));
  },
  async testWhatsapp(payload: NotificationWhatsappConfig & { testNumber: string }) {
    return unwrapData(await api.post("/api/settings/whatsapp/test", payload));
  },
  async getWhatsappUsage() {
    const payload = await api.get("/api/settings/whatsapp/usage", { forceRefresh: true, cacheTtlMs: 0 });
    return unwrapData<WhatsappUsage>(payload, { count: 0, limit: 50, remaining: 50, activeProvider: "Twilio" });
  },
  async getRules() {
    const payload = await api.get("/api/settings/notification-rules", { forceRefresh: true, cacheTtlMs: 0 });
    return unwrapArray<AnyRecord>(payload).map(normalizeNotificationRule).filter((rule) => rule.RuleKey);
  },
  async saveRules(rules: NotificationRule[]) {
    return unwrapData(await api.put("/api/settings/notification-rules", rules));
  },
};

export default notificationSettingsService;
