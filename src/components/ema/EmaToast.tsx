import type { ReactNode } from "react";

export type EmaToastTone = "success" | "error" | "warning" | "info" | "delete";

export type EmaToastItem = {
  id: string | number;
  tone?: EmaToastTone;
  title: ReactNode;
  message?: ReactNode;
};

const toneClass: Record<EmaToastTone, string> = {
  success: "border-emerald-200 bg-white shadow-emerald-950/10",
  error: "border-rose-200 bg-white shadow-rose-950/10",
  warning: "border-amber-200 bg-white shadow-amber-950/10",
  info: "border-blue-200 bg-white shadow-blue-950/10",
  delete: "border-rose-200 bg-white shadow-rose-950/10",
};

const iconClass: Record<EmaToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-600",
  error: "border-rose-200 bg-rose-50 text-rose-600",
  warning: "border-amber-200 bg-amber-50 text-amber-600",
  info: "border-blue-200 bg-blue-50 text-blue-600",
  delete: "border-rose-200 bg-rose-50 text-rose-600",
};

const iconText: Record<EmaToastTone, string> = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i",
  delete: "⌫",
};

type EmaToastViewportProps = {
  items?: EmaToastItem[];
  toasts?: EmaToastItem[];
  onClose?: (id: string | number) => void;
  onDismiss?: (id: string | number) => void;
};

function nodeToText(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function getToastText(toast: EmaToastItem) {
  return `${nodeToText(toast.title)} ${nodeToText(toast.message)}`.trim().toLowerCase();
}

function normalizeToastTone(toast: EmaToastItem): EmaToastTone {
  const text = getToastText(toast);

  if (text.includes("deleted") || text.includes("removed")) return "delete";
  if (toast.tone === "delete") return "delete";

  return toast.tone ?? "info";
}

function getDisplayTitle(toast: EmaToastItem, tone: EmaToastTone) {
  const titleText = nodeToText(toast.title).trim();
  const messageText = nodeToText(toast.message).trim();
  const lowerTitle = titleText.toLowerCase();
  const lowerMessage = messageText.toLowerCase();
  const genericTitle = ["success", "action failed", "error", "attention", "information", "info"].includes(lowerTitle);

  if (!genericTitle || !messageText) return toast.title;

  const entity = lowerMessage.includes("ticket")
    ? "Ticket"
    : lowerMessage.includes("folder")
      ? "Folder"
      : lowerMessage.includes("service desk")
        ? "Service Desk"
        : tone === "delete"
          ? "Record"
          : tone === "success"
            ? "Action"
            : tone === "error"
              ? "Error"
              : tone === "warning"
                ? "Attention"
                : "Information";

  if (lowerMessage.includes("deleted") || lowerMessage.includes("removed")) return `${entity} deleted`;
  if (lowerMessage.includes("created")) return `${entity} created`;
  if (lowerMessage.includes("updated")) return `${entity} updated`;
  if (lowerMessage.includes("refreshed")) return `${entity} refreshed`;

  if (tone === "error") return "Error";
  if (tone === "warning") return "Attention";
  if (tone === "success") return "Success";
  return "Information";
}

export function EmaToastViewport({
  items,
  toasts,
  onClose,
  onDismiss,
}: EmaToastViewportProps) {
  const toastItems = Array.isArray(items) ? items : Array.isArray(toasts) ? toasts : [];
  const handleClose = onClose || onDismiss;

  if (!toastItems.length) return null;

  return (
    <div className="fixed right-6 top-[86px] z-[2147483647] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2 max-sm:left-4 max-sm:right-4 max-sm:top-4 max-sm:w-auto">
      {toastItems.map((toast) => {
        const tone = normalizeToastTone(toast);
        const displayTitle = getDisplayTitle(toast, tone);

        return (
          <div
            key={toast.id}
            className={`ema-toast ema-toast-${tone} pointer-events-auto flex items-start gap-3 rounded-[18px] border px-[18px] py-4 shadow-2xl backdrop-blur ${toneClass[tone]}`}
            role="status"
          >
            <div className={`ema-toast-icon grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border text-base font-black ${iconClass[tone]}`}>
              {iconText[tone]}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <strong className="block text-sm font-black leading-tight text-slate-950">{displayTitle}</strong>
              {toast.message ? <span className="mt-1 block text-sm font-semibold leading-snug text-slate-600">{toast.message}</span> : null}
            </div>
            {handleClose ? (
              <button
                type="button"
                onClick={() => handleClose(toast.id)}
                aria-label="Close notification"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
