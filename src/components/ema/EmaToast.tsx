import type { ReactNode } from "react";

export type EmaToastTone = "success" | "error" | "warning" | "info";

export type EmaToastItem = {
  id: string | number;
  tone?: EmaToastTone;
  title: ReactNode;
  message?: ReactNode;
};

const toneClass: Record<EmaToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
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
    <div className="fixed right-4 top-4 z-[1000] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((toast) => {
        const tone = toast.tone ?? "info";
        return (
          <div key={toast.id} className={`rounded-xl border p-3 shadow-lg backdrop-blur ${toneClass[tone]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm font-semibold opacity-90">{toast.message}</p> : null}
              </div>
              {onClose ? (
                <button type="button" onClick={() => onClose(toast.id)} className="shrink-0 rounded-lg px-2 text-lg leading-none hover:bg-white/60">
                  ×
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
