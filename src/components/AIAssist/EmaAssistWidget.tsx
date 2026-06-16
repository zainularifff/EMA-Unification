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

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "accessToken",
  "token",
  "ema-auth-token",
];

const AI_SESSION_CACHE_KEY = "ema-ai-assist-session";
const AI_SESSION_TTL_MS = 5 * 60 * 1000;

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
    const value = localStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  const authRecord = safeParseJson<{
    token?: string;
    accessToken?: string;
    data?: { token?: string; accessToken?: string };
  }>(localStorage.getItem("ema-auth"));

  return (
    authRecord?.accessToken ||
    authRecord?.token ||
    authRecord?.data?.accessToken ||
    authRecord?.data?.token ||
    ""
  );
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

export default function EmaAssistWidget() {
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
      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/api/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message: content }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.error || "AI assistant request failed");

      const answer = String(payload?.answer || payload?.message || payload?.data?.answer || "No answer returned.");
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

  if (isHidden) return null;

  return (
    <div className={`ema-ai-assist ${isOpen ? "is-open" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      {isOpen && (
        <section className="ema-ai-panel">
          <header className="ema-ai-header">
            <div>
              <Sparkles size={18} />
              <span>EMA AI Assistant</span>
            </div>
            <nav>
              <button type="button" onClick={() => setIsExpanded((value) => !value)} title={isExpanded ? "Minimize" : "Expand"}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} title="Close"><X size={16} /></button>
            </nav>
          </header>

          <div className="ema-ai-messages">
            {!messages.length && (
              <div className="ema-ai-empty">
                <Zap size={22} />
                <strong>Ask about your operations data</strong>
                <p>Use quick prompts or ask for endpoint, risk, patch, service desk, or reporting insight.</p>
                <div className="ema-ai-prompts">
                  {quickPrompts.map((prompt) => (
                    <button type="button" key={prompt.title} onClick={() => sendPrompt(prompt.text)}>
                      <strong>{prompt.title}</strong>
                      <span>{prompt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`ema-ai-message is-${message.role} ${message.status ? `status-${message.status}` : ""}`}>
                <div className="ema-ai-message-meta">
                  {message.status === "loading" && <Loader2 size={14} className="spin" />}
                  {message.status === "ready" && <CheckCircle2 size={14} />}
                  {message.status === "error" && <AlertTriangle size={14} />}
                  {!message.status && <Clock3 size={14} />}
                  <span>{message.role === "user" ? "You" : "Assistant"}</span>
                </div>
                <p>{message.content}</p>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="ema-ai-footer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask EMA AI..." />
            <button type="button" onClick={() => sendPrompt()} disabled={!input.trim() || status === "loading"}>
              {status === "loading" ? <Loader2 size={18} className="spin" /> : <SendHorizontal size={18} />}
            </button>
          </footer>
        </section>
      )}

      <button type="button" className="ema-ai-toggle" onClick={() => setIsOpen((value) => !value)}>
        <Sparkles size={18} />
        <span>AI Assistant</span>
      </button>
      <button type="button" className="ema-ai-hide" onClick={() => setIsHidden(true)} title="Hide AI assistant"><Trash2 size={14} /></button>
    </div>
  );
}
