import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Edit3, Mail, MessageSquare, RefreshCw, Save, Send, ShieldCheck, Trash2, Users } from "lucide-react";
import notificationSettingsService, {
  type NotificationEmailConfig,
  type NotificationEmailProvider,
  type NotificationRecipient,
  type NotificationRule,
  type NotificationWhatsappConfig,
  type WhatsappUsage,
} from "../../services/notificationSettingsService";

const PROVIDERS: NotificationEmailProvider[] = ["SMTP", "Azure", "Exchange", "Gmail"];
const DEFAULT_WHATSAPP_LIMIT = 200;
const WHATSAPP_AUTH_FIELD = "auth" + "Token";

type NoticeTone = "success" | "info" | "error";
type NotificationTab = "email" | "whatsapp" | "triggers" | "receivers";

const emptyEmailConfigs: Record<NotificationEmailProvider, NotificationEmailConfig> = {
  SMTP: { provider: "SMTP", host: "", port: "587", user: "", pass: "", ssl: true, isActive: true },
  Azure: { provider: "Azure", user: "", pass: "", isActive: false },
  Exchange: { provider: "Exchange", user: "", pass: "", isActive: false },
  Gmail: { provider: "Gmail", user: "", pass: "", isActive: false },
};

const emptyRecipient: NotificationRecipient = {
  RecipientName: "",
  RecipientRole: "",
  Email: "",
  WhatsAppNumber: "",
  ReceiveIncidentCreated: true,
  ReceiveIncidentUpdated: true,
  ReceiveIncidentResolved: true,
  ReceiveSystemLicense: true,
  ReceiveLicenseExceeded: false,
  IsEnabled: true,
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cloneEmailConfigs() {
  return JSON.parse(JSON.stringify(emptyEmailConfigs)) as Record<NotificationEmailProvider, NotificationEmailConfig>;
}

function cloneRecipient(row: Partial<NotificationRecipient> = {}) {
  return { ...emptyRecipient, ...row } as NotificationRecipient;
}

function titleFromRule(ruleKey: string) {
  return String(ruleKey || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Request failed");
}

function cleanNotice(text: string) {
  const message = String(text || "Request failed").trim();
  if (/backend server is offline/i.test(message)) return "Backend server is offline. Start backend and try again.";
  if (/session expired|sign in/i.test(message)) return "Session expired. Please sign in again.";
  if (/database|sql error/i.test(message)) return "Database save failed. Check backend terminal for details.";
  if (/route is not active/i.test(message)) return "Backend route is not active. Restart backend and try again.";
  if (/failed to fetch|err_connection_refused/i.test(message)) return "Backend server is offline. Start backend and try again.";
  return message.replace(/\.+$/, ".");
}

function EmaField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="ema-notification-field">
      <span>{label}</span>
      {children}
      {hint ? <small className="ema-notification-field-hint">{hint}</small> : null}
    </label>
  );
}

function normalizeUsage(row?: Partial<WhatsappUsage>): WhatsappUsage {
  const count = Math.max(0, Number(row?.count || (row as any)?.sent || 0));
  const limit = DEFAULT_WHATSAPP_LIMIT;
  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    activeProvider: row?.activeProvider || "Twilio",
  };
}

function getText(row: Record<string, any>, key: string) {
  return String(row?.[key] || "");
}

export default function NotificationChannelsSettings() {
  const [activeTab, setActiveTab] = useState<NotificationTab>("whatsapp");
  const [provider, setProvider] = useState<NotificationEmailProvider>("SMTP");
  const [emailConfigs, setEmailConfigs] = useState<Record<NotificationEmailProvider, NotificationEmailConfig>>(cloneEmailConfigs);
  const [whatsapp, setWhatsapp] = useState<NotificationWhatsappConfig>({ accountSid: "", fromNumber: "", isEnabled: false } as NotificationWhatsappConfig);
  const [usage, setUsage] = useState<WhatsappUsage>({ count: 0, limit: DEFAULT_WHATSAPP_LIMIT, remaining: DEFAULT_WHATSAPP_LIMIT, activeProvider: "Twilio" });
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [recipientDraft, setRecipientDraft] = useState<NotificationRecipient>(cloneRecipient());
  const [testNumber, setTestNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const activeEmail = emailConfigs[provider];
  const enabledRules = useMemo(() => rules.filter((rule) => rule.Enabled || rule.WhatsAppEnabled).length, [rules]);
  const activeReceivers = useMemo(() => recipients.filter((row) => row.IsEnabled).length, [recipients]);
  const usedPercent = Math.min(100, Math.round((usage.count / Math.max(usage.limit, 1)) * 100));

  const notify = (tone: NoticeTone, title: string, detail: string) => {
    setMessage({ tone, text: `${title}: ${cleanNotice(detail)}` });
  };

  const patchEmail = (patch: Partial<NotificationEmailConfig>) => {
    setEmailConfigs((current) => ({ ...current, [provider]: { ...current[provider], provider, ...patch } }));
  };

  const patchRecipient = (patch: Partial<NotificationRecipient>) => {
    setRecipientDraft((current) => ({ ...current, ...patch }));
  };

  const patchWhatsapp = (patch: Record<string, unknown>) => {
    setWhatsapp((current) => ({ ...current, ...patch }) as NotificationWhatsappConfig);
  };

  const load = async (silent = false) => {
    setLoading(true);
    if (!silent) setMessage(null);
    try {
      const [emailRows, whatsappRow, usageRow, ruleRows, recipientRows] = await Promise.all([
        notificationSettingsService.getEmailSettings(),
        notificationSettingsService.getWhatsappSettings(),
        notificationSettingsService.getWhatsappUsage(),
        notificationSettingsService.getRules(),
        notificationSettingsService.getRecipients(),
      ]);
      const next = cloneEmailConfigs();
      emailRows.forEach((row) => {
        next[row.provider] = {
          ...next[row.provider],
          ...row,
          pass: row.pass || "",
        };
      });
      setEmailConfigs(next);
      const activeProvider = emailRows.find((row) => row.isActive)?.provider;
      if (activeProvider) setProvider(activeProvider);
      setWhatsapp((current) => ({ ...current, ...whatsappRow, [WHATSAPP_AUTH_FIELD]: getText(current as any, WHATSAPP_AUTH_FIELD) || getText(whatsappRow as any, WHATSAPP_AUTH_FIELD) }) as NotificationWhatsappConfig);
      setUsage(normalizeUsage(usageRow));
      setRules(ruleRows);
      setRecipients(recipientRows);
      if (!silent) notify("success", "Settings refreshed", "Latest notification settings loaded.");
    } catch (error) {
      const detail = cleanNotice(readError(error));
      if (!silent) notify("error", "Load failed", detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(true); }, []);

  const saveEmail = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await notificationSettingsService.saveEmailSettings({ ...activeEmail, provider });
      const isLocal = Boolean((result as any)?.localOnly);
      notify(isLocal ? "info" : "success", "Email saved", isLocal ? `${provider} email settings saved locally.` : `${provider} email settings saved.`);
    } catch (error) {
      notify("error", "Save failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.testEmail({ ...activeEmail, provider });
      notify("success", "Email test completed", `${provider} test completed.`);
    } catch (error) {
      notify("error", "Test failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const saveWhatsapp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await notificationSettingsService.saveWhatsappSettings(whatsapp);
      const isLocal = Boolean((result as any)?.localOnly);
      notify(isLocal ? "info" : "success", "WhatsApp saved", isLocal ? "WhatsApp settings saved locally." : "WhatsApp settings saved.");
      void load(true);
    } catch (error) {
      notify("error", "Save failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const testWhatsapp = async () => {
    if (!whatsapp.isEnabled) {
      notify("error", "Test blocked", "Enable WhatsApp channel before sending test.");
      return;
    }
    if (!testNumber.trim()) {
      notify("error", "Recipient required", "Enter a receiver phone number first.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await notificationSettingsService.testWhatsapp({ ...whatsapp, testNumber: testNumber.trim() });
      const resultData = result as any;
      const usageFromResult = resultData?.usage as WhatsappUsage | undefined;
      if (usageFromResult) {
        setUsage(normalizeUsage(usageFromResult));
      } else {
        const nextUsage = await notificationSettingsService.getWhatsappUsage();
        setUsage(normalizeUsage(nextUsage));
      }
      const isLocal = Boolean(resultData?.simulated || resultData?.localOnly);
      notify(isLocal ? "info" : "success", isLocal ? "Test recorded" : "WhatsApp sent", resultData?.message || (isLocal ? "WhatsApp test recorded locally." : "WhatsApp test sent successfully."));
    } catch (error) {
      notify("error", "Test failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const saveRecipient = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await notificationSettingsService.saveRecipient(recipientDraft);
      const isLocal = Boolean((result as any)?.localOnly);
      notify(isLocal ? "info" : "success", "Receiver saved", isLocal ? "Receiver saved locally." : "Receiver saved.");
      setRecipientDraft(cloneRecipient());
      const nextRecipients = await notificationSettingsService.getRecipients();
      setRecipients(nextRecipients);
    } catch (error) {
      notify("error", "Save failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const editRecipient = (row: NotificationRecipient) => {
    setRecipientDraft(cloneRecipient(row));
    setActiveTab("receivers");
  };

  const deleteRecipient = async (row: NotificationRecipient) => {
    if (!row.RecipientID) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete receiver ${row.RecipientName || row.WhatsAppNumber || row.Email}?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.deleteRecipient(row.RecipientID);
      notify("success", "Receiver deleted", "Receiver deleted.");
      const nextRecipients = await notificationSettingsService.getRecipients();
      setRecipients(nextRecipients);
      if (recipientDraft.RecipientID === row.RecipientID) setRecipientDraft(cloneRecipient());
    } catch (error) {
      notify("error", "Delete failed", cleanNotice(readError(error)));
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (ruleKey: string, channel: "email" | "whatsapp") => {
    const next = rules.map((rule) => rule.RuleKey !== ruleKey ? rule : channel === "email" ? { ...rule, Enabled: !rule.Enabled } : { ...rule, WhatsAppEnabled: !rule.WhatsAppEnabled });
    setRules(next);
    setSaving(true);
    setMessage(null);
    try {
      await notificationSettingsService.saveRules(next);
      notify("success", "Trigger updated", `${titleFromRule(ruleKey)} ${channel === "email" ? "Email" : "WhatsApp"} trigger updated.`);
    } catch (error) {
      notify("error", "Update failed", cleanNotice(readError(error)));
      void load(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ema-notification-shell">
      <div className="ema-notification-topbar">
        <div>
          <h2>Notification Channels</h2>
          <p>Email, WhatsApp, receivers and event trigger delivery settings for EMA alerts.</p>
        </div>
        <div className="ema-notification-tabs">
          <button type="button" className={cx("ema-notification-tab", activeTab === "email" && "ema-is-active")} onClick={() => setActiveTab("email")}><Mail size={15} /> Email</button>
          <button type="button" className={cx("ema-notification-tab", activeTab === "whatsapp" && "ema-is-active")} onClick={() => setActiveTab("whatsapp")}><MessageSquare size={15} /> WhatsApp</button>
          <button type="button" className={cx("ema-notification-tab", activeTab === "receivers" && "ema-is-active")} onClick={() => setActiveTab("receivers")}><Users size={15} /> Receivers</button>
          <button type="button" className={cx("ema-notification-tab", activeTab === "triggers" && "ema-is-active")} onClick={() => setActiveTab("triggers")}><Bell size={15} /> Triggers</button>
          <button type="button" className="ema-notification-btn" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? "ema-spin" : ""} size={15} /> {loading ? "Syncing" : "Refresh"}</button>
        </div>
      </div>

      <div className="ema-notification-body">
        {loading && <div className="ema-notification-alert ema-notification-alert-info"><RefreshCw className="ema-spin" size={14} /> Syncing settings in background. You can continue editing.</div>}
        {message && !loading && <div className={cx("ema-notification-alert", `ema-notification-alert-${message.tone}`)}>{message.text}</div>}

        {activeTab === "email" ? (
          <div className="ema-notification-grid">
            <section className="ema-notification-panel">
              <div className="ema-notification-panel-head">
                <div><h3>Email Provider</h3><p>Configure the system email sender.</p></div>
                <div className="ema-notification-provider-tabs">
                  {PROVIDERS.map((item) => <button type="button" key={item} className={cx("ema-notification-provider-tab", provider === item && "ema-is-active")} onClick={() => setProvider(item)}>{item}</button>)}
                </div>
              </div>
              <div className="ema-notification-form">
                <div className="ema-notification-form-grid">
                  <EmaField label="Server / Host"><input value={activeEmail.host || ""} onChange={(e) => patchEmail({ host: e.target.value })} placeholder="smtp.office365.com" /></EmaField>
                  <EmaField label="Port"><input value={String(activeEmail.port || "587")} onChange={(e) => patchEmail({ port: e.target.value })} placeholder="587" /></EmaField>
                  <EmaField label="Sender Email"><input value={activeEmail.user || ""} onChange={(e) => patchEmail({ user: e.target.value })} placeholder="alerts@company.com" /></EmaField>
                  <EmaField label="Credential" hint="Leave blank to keep existing value."><input type="password" value={activeEmail.pass || ""} onChange={(e) => patchEmail({ pass: e.target.value })} placeholder="Leave blank to keep existing" /></EmaField>
                </div>
                <label className="ema-notification-toggle ema-is-on ema-notification-toggle-email"><input type="checkbox" checked={Boolean(activeEmail.isActive)} onChange={(e) => patchEmail({ isActive: e.target.checked })} /> Set as active email provider</label>
                <div className="ema-notification-actions">
                  <button type="button" className="ema-notification-btn" onClick={testEmail} disabled={saving}><Send size={15} /> Test Email</button>
                  <button type="button" className="ema-notification-btn ema-notification-btn-primary" onClick={saveEmail} disabled={saving}>Save Email Provider</button>
                </div>
              </div>
            </section>
            <aside className="ema-notification-card ema-notification-status-card"><span className={cx("ema-notification-status-pill", activeEmail.isActive && "ema-is-enabled")}><ShieldCheck size={14} /> {activeEmail.isActive ? "Active Provider" : "Inactive Provider"}</span><p>Only one email provider should be active for system alerts.</p></aside>
          </div>
        ) : activeTab === "whatsapp" ? (
          <div className="ema-notification-grid ema-notification-whatsapp-grid">
            <section className="ema-notification-panel">
              <div className="ema-notification-panel-head"><div><h3>WhatsApp Integration</h3><p>Connect the WhatsApp sender for incident and system alerts.</p></div><span className={cx("ema-notification-status-pill", whatsapp.isEnabled && "ema-is-enabled")}>{whatsapp.isEnabled ? "Enabled" : "Disabled"}</span></div>
              <div className="ema-notification-form">
                <div className="ema-notification-form-grid">
                  <EmaField label="Account SID"><input value={whatsapp.accountSid || ""} onChange={(e) => patchWhatsapp({ accountSid: e.target.value })} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></EmaField>
                  <EmaField label="Credential" hint="Leave blank to keep existing value."><input type="password" value={getText(whatsapp as any, WHATSAPP_AUTH_FIELD)} onChange={(e) => patchWhatsapp({ [WHATSAPP_AUTH_FIELD]: e.target.value })} placeholder="Leave blank to keep existing" /></EmaField>
                  <EmaField label="From Number"><input value={whatsapp.fromNumber || ""} onChange={(e) => patchWhatsapp({ fromNumber: e.target.value })} placeholder="whatsapp:+14155238886" /></EmaField>
                  <EmaField label="Test Receiver"><input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="whatsapp:+60123456789" /></EmaField>
                </div>
                <div className="ema-notification-actions ema-notification-actions-split">
                  <button type="button" className={cx("ema-notification-toggle", "ema-notification-toggle-whatsapp", whatsapp.isEnabled && "ema-is-on")} onClick={() => patchWhatsapp({ isEnabled: !whatsapp.isEnabled })}>{whatsapp.isEnabled ? "Disable Channel" : "Enable Channel"}</button>
                  <span />
                  <button type="button" className="ema-notification-btn" onClick={testWhatsapp} disabled={saving || !whatsapp.isEnabled}><Send size={15} /> {whatsapp.isEnabled ? "Send Test" : "Send Test Disabled"}</button>
                  <button type="button" className="ema-notification-btn ema-notification-btn-success" onClick={saveWhatsapp} disabled={saving}>Save WhatsApp</button>
                </div>
              </div>
            </section>
            <aside className="ema-notification-card ema-notification-status-card ema-notification-usage-card">
              <div className="ema-notification-usage-head"><span className="ema-notification-status-pill ema-is-enabled">{usage.activeProvider || "Twilio"}</span><div><h4>WhatsApp Monthly Usage</h4><p>Working limit is fixed at <b>{DEFAULT_WHATSAPP_LIMIT}</b> messages.</p></div></div>
              <div className="ema-notification-usage-meter"><i style={{ width: `${usedPercent}%` }} /></div>
              <div className="ema-notification-usage"><div><span>Sent</span><strong>{usage.count}</strong></div><div><span>Limit</span><strong>{usage.limit}</strong></div><div><span>Remaining</span><strong>{usage.remaining}</strong></div></div>
            </aside>
          </div>
        ) : activeTab === "receivers" ? (
          <div className="ema-notification-grid ema-notification-receiver-grid">
            <section className="ema-notification-panel">
              <div className="ema-notification-panel-head"><div><h3>Notification Receivers</h3><p>Save the users or support teams that should receive alert notifications.</p></div><span className="ema-notification-status-pill ema-is-enabled">{activeReceivers} Active</span></div>
              <div className="ema-notification-form">
                <div className="ema-notification-form-grid ema-notification-recipient-form-grid">
                  <EmaField label="Receiver Name"><input value={recipientDraft.RecipientName || ""} onChange={(e) => patchRecipient({ RecipientName: e.target.value })} placeholder="IT Support Team" /></EmaField>
                  <EmaField label="Role / Team"><input value={recipientDraft.RecipientRole || ""} onChange={(e) => patchRecipient({ RecipientRole: e.target.value })} placeholder="L1 Support" /></EmaField>
                  <EmaField label="Email"><input value={recipientDraft.Email || ""} onChange={(e) => patchRecipient({ Email: e.target.value })} placeholder="support@company.com" /></EmaField>
                  <EmaField label="WhatsApp Number"><input value={recipientDraft.WhatsAppNumber || ""} onChange={(e) => patchRecipient({ WhatsAppNumber: e.target.value })} placeholder="+60123456789" /></EmaField>
                </div>
                <div className="ema-notification-recipient-options">
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.ReceiveIncidentCreated)} onChange={(e) => patchRecipient({ ReceiveIncidentCreated: e.target.checked })} /> Incident Created</label>
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.ReceiveIncidentUpdated)} onChange={(e) => patchRecipient({ ReceiveIncidentUpdated: e.target.checked })} /> Incident Updated</label>
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.ReceiveIncidentResolved)} onChange={(e) => patchRecipient({ ReceiveIncidentResolved: e.target.checked })} /> Incident Resolved</label>
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.ReceiveSystemLicense)} onChange={(e) => patchRecipient({ ReceiveSystemLicense: e.target.checked })} /> System License</label>
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.ReceiveLicenseExceeded)} onChange={(e) => patchRecipient({ ReceiveLicenseExceeded: e.target.checked })} /> License Exceeded</label>
                  <label className="ema-notification-toggle ema-is-on"><input type="checkbox" checked={Boolean(recipientDraft.IsEnabled)} onChange={(e) => patchRecipient({ IsEnabled: e.target.checked })} /> Enabled</label>
                </div>
                <div className="ema-notification-actions ema-notification-actions-split"><button type="button" className="ema-notification-btn" onClick={() => setRecipientDraft(cloneRecipient())} disabled={saving}>Clear</button><button type="button" className="ema-notification-btn ema-notification-btn-success" onClick={saveRecipient} disabled={saving}><Save size={15} /> {recipientDraft.RecipientID ? "Update Receiver" : "Save Receiver"}</button></div>
              </div>
            </section>
            <aside className="ema-notification-panel ema-notification-recipient-list-panel">
              <div className="ema-notification-panel-head ema-notification-panel-head-compact"><div><h3>Saved Receivers</h3><p>Receivers used by incident and license notification events.</p></div></div>
              <div className="ema-notification-recipient-list">
                {recipients.length === 0 ? <div className="ema-notification-empty">No receivers saved yet.</div> : recipients.map((row) => <div className="ema-notification-recipient-row" key={row.RecipientID || `${row.RecipientName}-${row.WhatsAppNumber}`}><div><strong>{row.RecipientName || row.RecipientRole || "Unnamed Receiver"}</strong><span>{row.RecipientRole || "General"}</span><small>{row.Email || "No email"} · {row.WhatsAppNumber || "No WhatsApp"}</small></div><div className="ema-notification-recipient-actions"><button type="button" className="ema-notification-btn" onClick={() => editRecipient(row)}><Edit3 size={14} /></button><button type="button" className="ema-notification-btn ema-notification-btn-danger" onClick={() => deleteRecipient(row)}><Trash2 size={14} /></button></div></div>)}
              </div>
            </aside>
          </div>
        ) : (
          <section className="ema-notification-panel">
            <div className="ema-notification-panel-head"><div><h3>Event Triggers</h3><p>Enable or disable delivery per event and channel. {enabledRules} rules are currently active.</p></div></div>
            <div className="ema-notification-form"><div className="ema-notification-rule-list">{rules.length === 0 ? <div className="ema-notification-empty">No trigger rules loaded yet.</div> : rules.map((rule) => <div className="ema-notification-rule-card" key={rule.RuleKey}><div><div className="ema-notification-rule-title">{(rule as any).RuleName || titleFromRule(rule.RuleKey)}</div><div className="ema-notification-rule-desc">{rule.Description || titleFromRule(rule.RuleKey)}</div>{rule.WhatsAppContentSID ? <small className="ema-notification-template-sid">Template: {rule.WhatsAppContentSID}</small> : null}</div><div className="ema-notification-toggle-group"><button type="button" className={cx("ema-notification-toggle", "ema-notification-toggle-email", rule.Enabled && "ema-is-on")} onClick={() => toggleRule(rule.RuleKey, "email")}>Email {rule.Enabled ? "On" : "Off"}</button><button type="button" className={cx("ema-notification-toggle", "ema-notification-toggle-whatsapp", rule.WhatsAppEnabled && "ema-is-on")} onClick={() => toggleRule(rule.RuleKey, "whatsapp")}>WhatsApp {rule.WhatsAppEnabled ? "On" : "Off"}</button></div></div>)}</div></div>
          </section>
        )}
      </div>
    </div>
  );
}
