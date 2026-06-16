import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Loader2, Mail, MessageSquare, RefreshCw, Send, ShieldCheck } from "lucide-react";
import "../../styles/notification-channels.css";
import notificationSettingsService, {
  type NotificationEmailConfig,
  type NotificationEmailProvider,
  type NotificationRule,
  type NotificationWhatsappConfig,
  type WhatsappUsage,
} from "../../services/notificationSettingsService";

const PROVIDERS: NotificationEmailProvider[] = ["SMTP", "Azure", "Exchange", "Gmail"];
const emptyEmailConfigs: Record<NotificationEmailProvider, NotificationEmailConfig> = {
  SMTP: { provider: "SMTP", host: "", port: "587", user: "", pass: "", ssl: true, isActive: true },
  Azure: { provider: "Azure", azureTenantId: "", azureClientId: "", azureClientSecret: "", azureUser: "", azurePass: "", isActive: false },
  Exchange: { provider: "Exchange", exchangeEndpoint: "", exchangeDomainUser: "", exchangePass: "", user: "", isActive: false },
  Gmail: { provider: "Gmail", gmailUser: "", gmailPass: "", isActive: false },
};

const DEFAULT_WHATSAPP_LIMIT = 200;

function cloneEmailConfigs() {
  return JSON.parse(JSON.stringify(emptyEmailConfigs)) as Record<NotificationEmailProvider, NotificationEmailConfig>;
}

function titleFromRule(ruleKey: string) {
  return String(ruleKey || "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Request failed");
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="notification-field"><span>{label}</span>{children}</label>;
}

function normalizeUsage(row: WhatsappUsage): WhatsappUsage {
  const count = Math.max(0, Number(row?.count || 0));
  const limit = DEFAULT_WHATSAPP_LIMIT;
  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    activeProvider: row?.activeProvider || "Twilio",
  };
}

export default function NotificationChannelsSettings() {
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp" | "triggers">("whatsapp");
  const [provider, setProvider] = useState<NotificationEmailProvider>("SMTP");
  const [emailConfigs, setEmailConfigs] = useState<Record<NotificationEmailProvider, NotificationEmailConfig>>(cloneEmailConfigs);
  const [whatsapp, setWhatsapp] = useState<NotificationWhatsappConfig>({ accountSid: "", authToken: "", fromNumber: "", isEnabled: false });
  const [usage, setUsage] = useState<WhatsappUsage>({ count: 0, limit: DEFAULT_WHATSAPP_LIMIT, remaining: DEFAULT_WHATSAPP_LIMIT, activeProvider: "Twilio" });
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [testNumber, setTestNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "info" | "error"; text: string } | null>(null);

  const activeEmail = emailConfigs[provider];
  const enabledRules = useMemo(() => rules.filter((rule) => rule.Enabled || rule.WhatsAppEnabled).length, [rules]);
  const usedPercent = Math.min(100, Math.round((usage.count / Math.max(usage.limit, 1)) * 100));

  const patchEmail = (patch: Partial<NotificationEmailConfig>) => {
    setEmailConfigs((current) => ({ ...current, [provider]: { ...current[provider], provider, ...patch } }));
  };

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [emailRows, whatsappRow, usageRow, ruleRows] = await Promise.all([
        notificationSettingsService.getEmailSettings(),
        notificationSettingsService.getWhatsappSettings(),
        notificationSettingsService.getWhatsappUsage(),
        notificationSettingsService.getRules(),
      ]);
      const next = cloneEmailConfigs();
      emailRows.forEach((row) => {
        next[row.provider] = { ...next[row.provider], ...row, pass: "", azureClientSecret: "", azurePass: "", exchangePass: "", gmailPass: "" };
      });
      setEmailConfigs(next);
      const activeProvider = emailRows.find((row) => row.isActive)?.provider;
      if (activeProvider) setProvider(activeProvider);
      setWhatsapp(whatsappRow);
      setUsage(normalizeUsage(usageRow));
      setRules(ruleRows);
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveEmail = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.saveEmailSettings({ ...activeEmail, provider });
      setMessage({ tone: "success", text: `${provider} email configuration saved.` });
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.testEmail({ ...activeEmail, provider });
      setMessage({ tone: "success", text: `${provider} test completed.` });
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const saveWhatsapp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.saveWhatsappSettings(whatsapp);
      setMessage({ tone: "success", text: "WhatsApp configuration saved." });
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const testWhatsapp = async () => {
    if (!testNumber.trim()) {
      setMessage({ tone: "error", text: "Enter a recipient phone number first." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.testWhatsapp({ ...whatsapp, testNumber: testNumber.trim() });
      setMessage({ tone: "success", text: "WhatsApp test recorded successfully." });
      const nextUsage = await notificationSettingsService.getWhatsappUsage();
      setUsage(normalizeUsage(nextUsage));
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (ruleKey: string, channel: "email" | "whatsapp") => {
    const next = rules.map((rule) => {
      if (rule.RuleKey !== ruleKey) return rule;
      return channel === "email" ? { ...rule, Enabled: !rule.Enabled } : { ...rule, WhatsAppEnabled: !rule.WhatsAppEnabled };
    });
    setRules(next);
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.saveRules(next);
      setMessage({ tone: "success", text: "Notification trigger updated." });
    } catch (error) {
      setMessage({ tone: "error", text: readError(error) });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-notification-shell">
      <div className="notification-topbar">
        <div>
          <h2>Notification Channels</h2>
          <p>Email, WhatsApp and event trigger delivery settings for EMA alerts.</p>
        </div>
        <div className="notification-tabs">
          <button className={`notification-tab ${activeTab === "email" ? "active" : ""}`} onClick={() => setActiveTab("email")}><Mail size={15} /> Email</button>
          <button className={`notification-tab ${activeTab === "whatsapp" ? "active" : ""}`} onClick={() => setActiveTab("whatsapp")}><MessageSquare size={15} /> WhatsApp</button>
          <button className={`notification-tab ${activeTab === "triggers" ? "active" : ""}`} onClick={() => setActiveTab("triggers")}><Bell size={15} /> Triggers</button>
          <button className="notification-btn" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
      </div>

      <div className="notification-body">
        {message && <div className={`notification-alert ${message.tone}`}>{message.text}</div>}
        {loading ? (
          <div className="notification-panel notification-status-card"><Loader2 className="spin" /> Loading notification settings...</div>
        ) : activeTab === "email" ? (
          <div className="notification-grid">
            <section className="notification-panel">
              <div className="notification-panel-head">
                <div><h3>Email Provider</h3><p>Configure SMTP, Microsoft 365/Azure, Exchange or Gmail as system email sender.</p></div>
                <div className="notification-provider-tabs">
                  {PROVIDERS.map((item) => <button key={item} className={`notification-provider-tab ${provider === item ? "active" : ""}`} onClick={() => setProvider(item)}>{item}</button>)}
                </div>
              </div>
              <div className="notification-form">
                {provider === "SMTP" && <div className="notification-form-grid">
                  <Field label="SMTP Host"><input value={activeEmail.host || ""} onChange={(e) => patchEmail({ host: e.target.value })} placeholder="smtp.office365.com" /></Field>
                  <Field label="SMTP Port"><input value={String(activeEmail.port || "587")} onChange={(e) => patchEmail({ port: e.target.value })} placeholder="587" /></Field>
                  <Field label="Sender Email"><input value={activeEmail.user || ""} onChange={(e) => patchEmail({ user: e.target.value })} placeholder="alerts@company.com" /></Field>
                  <Field label="Password / App Password"><input type="password" value={activeEmail.pass || ""} onChange={(e) => patchEmail({ pass: e.target.value })} placeholder="Leave blank to keep existing" /></Field>
                </div>}
                {provider === "Azure" && <div className="notification-form-grid">
                  <Field label="Tenant ID"><input value={activeEmail.azureTenantId || ""} onChange={(e) => patchEmail({ azureTenantId: e.target.value })} /></Field>
                  <Field label="Client ID"><input value={activeEmail.azureClientId || ""} onChange={(e) => patchEmail({ azureClientId: e.target.value })} /></Field>
                  <Field label="Client Secret"><input type="password" value={activeEmail.azureClientSecret || ""} onChange={(e) => patchEmail({ azureClientSecret: e.target.value })} placeholder="Leave blank to keep existing" /></Field>
                  <Field label="Mailbox User"><input value={activeEmail.azureUser || ""} onChange={(e) => patchEmail({ azureUser: e.target.value })} /></Field>
                  <Field label="Mailbox Password"><input type="password" value={activeEmail.azurePass || ""} onChange={(e) => patchEmail({ azurePass: e.target.value })} placeholder="Optional password grant" /></Field>
                </div>}
                {provider === "Exchange" && <div className="notification-form-grid">
                  <Field label="Exchange EWS Endpoint"><input value={activeEmail.exchangeEndpoint || ""} onChange={(e) => patchEmail({ exchangeEndpoint: e.target.value })} placeholder="https://mail.company.com/EWS/Exchange.asmx" /></Field>
                  <Field label="Domain User"><input value={activeEmail.exchangeDomainUser || ""} onChange={(e) => patchEmail({ exchangeDomainUser: e.target.value })} placeholder="DOMAIN\\user" /></Field>
                  <Field label="Exchange Password"><input type="password" value={activeEmail.exchangePass || ""} onChange={(e) => patchEmail({ exchangePass: e.target.value })} placeholder="Leave blank to keep existing" /></Field>
                  <Field label="Sender Email"><input value={activeEmail.user || ""} onChange={(e) => patchEmail({ user: e.target.value })} /></Field>
                </div>}
                {provider === "Gmail" && <div className="notification-form-grid">
                  <Field label="Gmail User"><input value={activeEmail.gmailUser || ""} onChange={(e) => patchEmail({ gmailUser: e.target.value })} placeholder="alerts@gmail.com" /></Field>
                  <Field label="Gmail App Password"><input type="password" value={activeEmail.gmailPass || ""} onChange={(e) => patchEmail({ gmailPass: e.target.value })} placeholder="Leave blank to keep existing" /></Field>
                </div>}
                <label className="notification-toggle on email"><input type="checkbox" checked={Boolean(activeEmail.isActive)} onChange={(e) => patchEmail({ isActive: e.target.checked })} /> Set as active email provider</label>
                <div className="notification-actions"><button className="notification-btn" onClick={testEmail} disabled={saving}><Send size={15} /> Test Email</button><button className="notification-btn primary" onClick={saveEmail} disabled={saving}>Save Email Provider</button></div>
              </div>
            </section>
            <aside className="notification-card notification-status-card"><span className={`notification-status-pill ${activeEmail.isActive ? "enabled" : ""}`}><ShieldCheck size={14} /> {activeEmail.isActive ? "Active Provider" : "Inactive Provider"}</span><p>Only one email provider should be active for system alerts. Password fields are never returned from the API.</p></aside>
          </div>
        ) : activeTab === "whatsapp" ? (
          <div className="notification-grid notification-whatsapp-grid">
            <section className="notification-panel">
              <div className="notification-panel-head"><div><h3>WhatsApp Integration</h3><p>Connect WhatsApp Business/Twilio sender for incident, SLA and client alerts.</p></div><span className={`notification-status-pill ${whatsapp.isEnabled ? "enabled" : ""}`}>{whatsapp.isEnabled ? "Enabled" : "Disabled"}</span></div>
              <div className="notification-form">
                <div className="notification-form-grid">
                  <Field label="Account SID"><input value={whatsapp.accountSid} onChange={(e) => setWhatsapp({ ...whatsapp, accountSid: e.target.value })} placeholder="Twilio Account SID" /></Field>
                  <Field label="Auth Token"><input type="password" value={whatsapp.authToken || ""} onChange={(e) => setWhatsapp({ ...whatsapp, authToken: e.target.value })} placeholder="Leave blank to keep existing" /></Field>
                  <Field label="From Number"><input value={whatsapp.fromNumber} onChange={(e) => setWhatsapp({ ...whatsapp, fromNumber: e.target.value })} placeholder="whatsapp:+14155238886" /></Field>
                  <Field label="Test Recipient"><input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="+60123456789" /></Field>
                </div>
                <label className="notification-toggle on whatsapp"><input type="checkbox" checked={whatsapp.isEnabled} onChange={(e) => setWhatsapp({ ...whatsapp, isEnabled: e.target.checked })} /> Enable WhatsApp channel globally</label>
                <div className="notification-actions"><button className="notification-btn" onClick={testWhatsapp} disabled={saving}><Send size={15} /> Send Test</button><button className="notification-btn success" onClick={saveWhatsapp} disabled={saving}>Save WhatsApp</button></div>
              </div>
            </section>
            <aside className="notification-card notification-status-card notification-usage-card">
              <div className="notification-usage-head">
                <span className="notification-status-pill enabled">{usage.activeProvider || "Twilio"}</span>
                <div>
                  <h4>WhatsApp Monthly Usage</h4>
                  <p>Temporary working limit is fixed at <b>{DEFAULT_WHATSAPP_LIMIT}</b> messages for now.</p>
                </div>
              </div>
              <div className="notification-usage-meter"><i style={{ width: `${usedPercent}%` }} /></div>
              <div className="notification-usage">
                <div><span>Sent</span><strong>{usage.count}</strong></div>
                <div><span>Limit</span><strong>{usage.limit}</strong></div>
                <div><span>Remaining</span><strong>{usage.remaining}</strong></div>
              </div>
            </aside>
          </div>
        ) : (
          <section className="notification-panel">
            <div className="notification-panel-head"><div><h3>Notification Event Triggers</h3><p>Choose which system events send Email and/or WhatsApp notifications.</p></div><span className="notification-status-pill">{enabledRules} Active Rules</span></div>
            <div className="notification-form notification-rule-list">
              {rules.length === 0 && <div className="notification-alert">No notification rules returned.</div>}
              {rules.map((rule) => <div key={rule.RuleKey} className="notification-rule-card"><div><div className="notification-rule-title">{titleFromRule(rule.RuleKey)}</div><div className="notification-rule-desc">{rule.Description}</div></div><div className="notification-toggle-group"><button className={`notification-toggle email ${rule.Enabled ? "on" : ""}`} onClick={() => toggleRule(rule.RuleKey, "email")}>Email {rule.Enabled ? "On" : "Off"}</button><button className={`notification-toggle whatsapp ${rule.WhatsAppEnabled ? "on" : ""}`} onClick={() => toggleRule(rule.RuleKey, "whatsapp")}>WhatsApp {rule.WhatsAppEnabled ? "On" : "Off"}</button></div></div>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
