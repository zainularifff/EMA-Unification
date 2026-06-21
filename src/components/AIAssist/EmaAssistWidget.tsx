import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Maximize2,
  Minimize2,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_BASE_URL } from "../../config/api";
import "./ema-assist-widget.css";

type AiStatus = "idle" | "loading" | "ready" | "error";

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: AiStatus;
};

type CachedAiSession = {
  messages: AiMessage[];
  input: string;
  isOpen: boolean;
  isExpanded: boolean;
  isHidden: boolean;
  expiresAt: number;
};

type EmaAssistWidgetProps = {
  /**
   * TopNavbar renders its own AI button. When this is false, only the panel is rendered
   * after the global `ema-ai-assist-open` event is fired.
   */
  showFloatingLauncher?: boolean;
};

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "accessToken",
  "token",
  "authToken",
  "emaToken",
  "ema-token",
  "ema-auth-token",
];

const AI_SESSION_CACHE_KEY = "ema-ai-assist-session";
const AI_SESSION_TTL_MS = 5 * 60 * 1000;
const AI_ENDPOINT_PATHS = ["/api/ai-assist", "/api/ai/assist", "/api/assistant/chat"];

const quickPrompts = [
  {
    title: "Endpoint health",
    text: "Show endpoint health summary",
    desc: "Asset and connectivity overview",
  },
  {
    title: "Settings changes",
    text: "Summarize latest settings changes",
    desc: "Recent updates, approvals and policy changes",
  },
  {
    title: "Risk review",
    text: "How many devices are at risk right now?",
    desc: "Lifecycle and exposure insight",
  },
  {
    title: "Patch risks",
    text: "Show patch risks",
    desc: "Patch and security visibility",
  },
];

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") return "";

  for (const key of TOKEN_STORAGE_KEYS) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim().replace(/^Bearer\s+/i, "");
    }
  }

  const authRecord = safeParseJson<{
    token?: string;
    accessToken?: string;
    authToken?: string;
    data?: { token?: string; accessToken?: string; authToken?: string };
  }>(localStorage.getItem("ema-auth") || sessionStorage.getItem("ema-auth"));

  return (
    authRecord?.accessToken ||
    authRecord?.token ||
    authRecord?.authToken ||
    authRecord?.data?.accessToken ||
    authRecord?.data?.token ||
    authRecord?.data?.authToken ||
    ""
  ).replace(/^Bearer\s+/i, "");
}

function createMessage(
  role: AiMessage["role"],
  content: string,
  status?: AiStatus,
): AiMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "now";
  }
}

function getCurrentModuleLabel() {
  if (typeof window === "undefined") return "current page";
  const path = window.location.pathname.replace(/^\//, "").replace(/-/g, " ");
  return path ? path.replace(/\b\w/g, (char) => char.toUpperCase()) : "Dashboard";
}

function buildLocalAssistantAnswer(prompt: string) {
  const text = prompt.toLowerCase();
  const moduleName = getCurrentModuleLabel();

  if (text.includes("service") || text.includes("ticket") || text.includes("sla")) {
    return `Service Desk is open. Use the ticket table to review Created By, Asset, Incident, Urgency, Assigner, SLA and Status. For faster work, use the top search or table filter, then edit with the pencil action. SLA Risk should be handled first, followed by Awaiting and In Progress tickets.`;
  }

  if (text.includes("endpoint") || text.includes("hardware") || text.includes("device")) {
    return `For endpoint health, check total devices, online/recently connected devices, stale sync and security state. Focus first on stale devices, unmanaged records and devices with missing owner or branch mapping.`;
  }

  if (text.includes("risk") || text.includes("patch") || text.includes("compliance")) {
    return `Prioritise items with expired support, overdue patch status, high urgency tickets and stale inventory data. Review the affected device list first, then assign ownership and action plan.`;
  }

  if (text.includes("report")) {
    return `For reporting, generate the relevant report from the Report module and verify branch, date range and source data before exporting. Use dynamic reporting only when you need AI-written management summary.`;
  }

  return `AI Assistant is ready for ${moduleName}. Ask about tickets, endpoints, SLA, risk, patch, reports or what to check next. I can also help you decide which record needs action first based on the current module.`;
}

async function requestAssistantAnswer(content: string) {
  const token = getStoredToken();
  let lastError = "";

  for (const path of AI_ENDPOINT_PATHS) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message: content, prompt: content }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload?.message || payload?.error || `Request failed ${response.status}`;
        continue;
      }

      return String(payload?.answer || payload?.message || payload?.data?.answer || payload?.data?.message || "No answer returned.");
    } catch (error) {
      lastError = error instanceof Error ? error.message : "AI assistant request failed.";
    }
  }

  console.warn("AI assistant API unavailable. Using local assistant mode.", lastError);
  return buildLocalAssistantAnswer(content);
}

function AiAvatar() {
  return (
    <span className="ema-ai-avatar" aria-hidden="true">
      <span className="ema-ai-avatar-core">
        <span className="ema-ai-avatar-ring" />
        <span className="ema-ai-avatar-face">
          <span className="ema-ai-avatar-eye" />
          <span className="ema-ai-avatar-eye" />
        </span>
      </span>
      <span className="ema-ai-avatar-status" />
    </span>
  );
}

export default function EmaAssistWidget({ showFloatingLauncher = true }: EmaAssistWidgetProps) {
  const restored = useMemo(() => {
    if (typeof window === "undefined") return null;
    const cached = safeParseJson<CachedAiSession>(localStorage.getItem(AI_SESSION_CACHE_KEY));
    if (!cached || cached.expiresAt < Date.now()) return null;
    return cached;
  }, []);

  const [messages, setMessages] = useState<AiMessage[]>(restored?.messages || []);
  const [input, setInput] = useState(restored?.input || "");
  const [isOpen, setIsOpen] = useState(restored?.isOpen ?? false);
  const [isExpanded, setIsExpanded] = useState(restored?.isExpanded ?? false);
  const [isHidden, setIsHidden] = useState(restored?.isHidden ?? false);
  const [status, setStatus] = useState<AiStatus>("idle");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(
      AI_SESSION_CACHE_KEY,
      JSON.stringify({
        messages,
        input,
        isOpen,
        isExpanded,
        isHidden,
        expiresAt: Date.now() + AI_SESSION_TTL_MS,
      }),
    );
  }, [messages, input, isOpen, isExpanded, isHidden]);

  useEffect(() => {
    const openAssistant = () => {
      setIsHidden(false);
      setIsOpen(true);
    };

    window.addEventListener("ema-ai-assist-open", openAssistant);
    return () => window.removeEventListener("ema-ai-assist-open", openAssistant);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendPrompt = async (promptText = input.trim()) => {
    const content = promptText.trim();
    if (!content || status === "loading") return;

    const userMessage = createMessage("user", content);
    const loadingMessage = createMessage("assistant", "Thinking...", "loading");
    setMessages((current) => [...current, userMessage, loadingMessage]);
    setInput("");
    setStatus("loading");

    try {
      const answer = await requestAssistantAnswer(content);
      setMessages((current) => current.map((message) => message.id === loadingMessage.id ? { ...message, content: answer, status: "ready" } : message));
      setStatus("ready");
    } catch (error) {
      const answer = error instanceof Error ? error.message : "AI assistant request failed.";
      setMessages((current) => current.map((message) => message.id === loadingMessage.id ? { ...message, content: answer, status: "error" } : message));
      setStatus("error");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt();
    }
  };

  const clearSession = () => {
    setMessages([]);
    setInput("");
    setStatus("idle");
  };

  if (isHidden) return null;
  if (!isOpen && !showFloatingLauncher) return null;

  return (
    <div className={`ema-assist-widget ${isOpen ? "is-open" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      {isOpen ? (
        <section className="ema-ai-command-panel" role="dialog" aria-label="EMA AI Assistant">
          <header className="ema-ai-panel-top">
            <div className="ema-ai-brand">
              <AiAvatar />
              <div>
                <span className="ema-ai-kicker">EMA Intelligence</span>
                <strong>AI Assistant</strong>
                <small>Ask about endpoint, risk, patch, support and reporting data.</small>
              </div>
            </div>
            <div className="ema-ai-top-actions">
              <span className={`ema-ai-status-pill is-${status}`}>
                {status === "loading" ? <Loader2 size={14} className="spin" /> : status === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {status === "loading" ? "Thinking" : status === "error" ? "Needs attention" : "Ready"}
              </span>
              <button type="button" onClick={() => setIsExpanded((value) => !value)} title={isExpanded ? "Minimize" : "Expand"}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} title="Close"><X size={16} /></button>
            </div>
          </header>

          <div className="ema-ai-panel-body">
            <aside className="ema-ai-sidecar">
              <div className="ema-ai-sidecar-card">
                <Zap size={20} />
                <h3>Quick prompts</h3>
                <p>Start with common operational questions.</p>
              </div>
              <div className="ema-ai-prompt-stack">
                {quickPrompts.map((prompt) => (
                  <button type="button" key={prompt.title} onClick={() => sendPrompt(prompt.text)} disabled={status === "loading"}>
                    <span>{prompt.title}</span>
                    <small>{prompt.desc}</small>
                  </button>
                ))}
              </div>
            </aside>

            <main className="ema-ai-chat-stage">
              {!messages.length && (
                <div className="ema-ai-empty-state">
                  <span className="ema-ai-empty-orb"><Sparkles size={26} /></span>
                  <h2>Ask about your operations data</h2>
                  <p>Use the quick prompts or ask for endpoint, risk, patch, service desk, or reporting insight.</p>
                </div>
              )}

              {messages.map((message) => (
                <article key={message.id} className={`ema-ai-message is-${message.role} ${message.status === "error" ? "is-error" : ""}`}>
                  <div className="ema-ai-message-meta">
                    <span>{message.role === "user" ? "You" : "Assistant"}</span>
                    <small>
                      {message.status === "loading" && <Loader2 size={13} className="spin" />}
                      {message.status === "ready" && <CheckCircle2 size={13} />}
                      {message.status === "error" && <AlertTriangle size={13} />}
                      {!message.status && <Clock3 size={13} />}
                      {formatTime(message.createdAt)}
                    </small>
                  </div>
                  {message.status === "loading" ? (
                    <div className="ema-ai-loading-block"><i /><i /><i /></div>
                  ) : (
                    <div className="ema-ai-markdown"><p>{message.content}</p></div>
                  )}
                </article>
              ))}
              <div ref={messagesEndRef} />
            </main>
          </div>

          <footer className="ema-ai-composer">
            <div className="ema-ai-input-shell">
              <span><Sparkles size={17} /></span>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask EMA AI..." />
            </div>
            <button type="button" className="ema-ai-clear-btn" onClick={clearSession} title="Clear chat">
              <Trash2 size={18} />
            </button>
            <button type="button" className="ema-ai-send-btn" onClick={() => sendPrompt()} disabled={!input.trim() || status === "loading"} title="Send">
              {status === "loading" ? <Loader2 size={18} className="spin" /> : <SendHorizontal size={18} />}
            </button>
          </footer>
        </section>
      ) : (
        <div className="ema-ai-launcher-shell">
          <button type="button" className="ema-ai-launcher" onClick={() => setIsOpen(true)}>
            <AiAvatar />
            <span>
              <strong>AI Assistant</strong>
              <small>Open EMA intelligence</small>
            </span>
          </button>
          <button type="button" className="ema-ai-launcher-dismiss" onClick={() => setIsHidden(true)} title="Hide AI assistant"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}
