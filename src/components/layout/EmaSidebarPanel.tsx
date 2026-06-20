import type { InputHTMLAttributes, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type EmaModuleSidebarProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

type EmaSidebarTabsProps = {
  children: ReactNode;
  className?: string;
};

type EmaSidebarTabButtonProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

type EmaSidebarSearchProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  wrapperClassName?: string;
};

type EmaSidebarButtonProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

type EmaSidebarTreeProps = {
  children: ReactNode;
  className?: string;
};

type EmaSidebarTreeRowProps = {
  icon?: ReactNode;
  toggle?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  active?: boolean;
  depth?: number;
  onClick?: () => void;
  className?: string;
};

export function EmaModuleSidebar({ eyebrow, title, description, children, actions, className }: EmaModuleSidebarProps) {
  return (
    <aside className={cx("flex min-h-[calc(100vh-6rem)] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="border-b border-slate-100 px-3 pb-3 pt-3">
        {eyebrow ? <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</span> : null}
        <h2 className="m-0 mt-1 text-sm font-black tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="m-0 mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
        {actions ? <div className="mt-3 grid gap-2">{actions}</div> : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">{children}</div>
    </aside>
  );
}

export function EmaSidebarTabs({ children, className }: EmaSidebarTabsProps) {
  return <div className={cx("grid gap-2", className)}>{children}</div>;
}

export function EmaSidebarTabButton({ icon, title, description, active, onClick, className }: EmaSidebarTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition",
        active ? "border-blue-200 bg-blue-50 text-blue-950" : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
        className,
      )}
    >
      {icon ? <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md", active ? "bg-white text-blue-600" : "bg-slate-50 text-slate-500")}>{icon}</span> : null}
      <span className="min-w-0">
        <strong className="block text-xs font-black leading-4 text-slate-950">{title}</strong>
        {description ? <small className="block text-[0.68rem] font-semibold leading-4 text-slate-500">{description}</small> : null}
      </span>
    </button>
  );
}

export function EmaSidebarSearch({ icon, wrapperClassName, className, ...props }: EmaSidebarSearchProps) {
  return (
    <label className={cx("flex h-9 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 shadow-sm", wrapperClassName)}>
      {icon ? <span className="grid shrink-0 place-items-center">{icon}</span> : null}
      <input
        {...props}
        className={cx("min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400", className)}
      />
    </label>
  );
}

export function EmaSidebarButton({ icon, children, onClick, disabled, className }: EmaSidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-8 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {icon ? <span className="grid shrink-0 place-items-center text-slate-500">{icon}</span> : null}
      {children}
    </button>
  );
}

export function EmaSidebarTree({ children, className }: EmaSidebarTreeProps) {
  return <div className={cx("min-h-0 flex-1 overflow-auto rounded-lg border border-slate-100 bg-slate-50/40 p-1", className)}>{children}</div>;
}

export function EmaSidebarTreeRow({ icon, toggle, label, meta, active, depth = 0, onClick, className }: EmaSidebarTreeRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black transition",
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-700 hover:bg-white",
        className,
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      {toggle ? <span className="grid h-4 w-4 shrink-0 place-items-center text-slate-400">{toggle}</span> : <span className="h-4 w-4 shrink-0" />}
      {icon ? <span className="grid h-5 w-5 shrink-0 place-items-center text-slate-500">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta ? <span className="shrink-0 text-[0.65rem] font-black text-slate-400">{meta}</span> : null}
    </button>
  );
}
