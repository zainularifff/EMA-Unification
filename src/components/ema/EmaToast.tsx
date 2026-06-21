import type { ReactNode } from "react";

export type EmaToastTone = "success" | "error" | "warning" | "info";

export type EmaToastItem = {
  id: string | number;
  tone?: EmaToastTone;
  title: ReactNode;
  message?: ReactNode;
};

const toneClass: Record<EmaToastTone, string> = {
  success: "border-emerald-200 bg-white text-emerald-800 shadow-emerald-950/10",
  error: "border-rose-200 bg-white text-rose-800 shadow-rose-950/10",
  warning: "border-amber-200 bg-white text-amber-800 shadow-amber-950/10",
  info: "border-blue-200 bg-white text-blue-800 shadow-blue-950/10",
};

const iconClass: Record<EmaToastTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
};

const iconText: Record<EmaToastTone, string> = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i",
};

export function EmaToastViewport({
  items,
  onClose,
}: {
  items: EmaToastItem[];
  onClose?: (id: string | number) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[2147483500] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((toast) => {
        const tone = toast.tone ?? "info";
        return (
          <div key={toast.id} className={`overflow-hidden rounded-2xl border shadow-2xl backdrop-blur ${toneClass[tone]}`}>
            <div className="flex items-start gap-3 p-3.5">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ring-1 ${iconClass[tone]}`}>
                {iconText[tone]}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-black leading-tight text-slate-950">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm font-semibold leading-snug text-slate-600">{toast.message}</p> : null}
              </div>
              {onClose ? (
                <button type="button" onClick={() => onClose(toast.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  ×
                </button>
              ) : null}
            </div>
            <div className={`h-1 ${tone === "success" ? "bg-emerald-500" : tone === "error" ? "bg-rose-500" : tone === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
          </div>
        );
      })}
    </div>
  );
}
