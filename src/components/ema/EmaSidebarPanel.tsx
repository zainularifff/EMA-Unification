import type { ReactNode } from "react";
import { Search } from "lucide-react";

type EmaSidebarTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type EmaSidebarPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tabs?: EmaSidebarTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  action?: ReactNode;
  children?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EmaSidebarPanel({
  eyebrow,
  title,
  description,
  tabs = [],
  activeTab,
  onTabChange,
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  action,
  children,
}: EmaSidebarPanelProps) {
  return (
    <div className="settings-menu ema-left-panel ema-panel-surface h-full min-h-0">
      <div className="panel-head">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </div>

      {tabs.length ? (
        <nav className="settings-menu-list ema-module-sidebar-nav ema-module-sidebar-switcher" role="tablist" aria-label={`${title} navigation`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" className={cx("setting-btn", isActive && "active")} onClick={() => onTabChange?.(tab.id)}>
                {tab.icon ? <span className="setting-icon">{tab.icon}</span> : null}
                <span>
                  <strong>{tab.label}</strong>
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}

      <div className="ema-sidebar-content">
        <div className="ema-sidebar-subpanel">
          {onSearchChange ? (
            <div className="section-search ema-sidebar-field">
              <Search size={15} />
              <input value={searchValue ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} />
            </div>
          ) : null}

          {action ? <div className="ema-sidebar-action-wrap">{action}</div> : null}

          <div className="ema-sidebar-tree">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function EmaSidebarActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="soft-btn d-inline-flex align-items-center gap-1 px-2">
      {children}
    </button>
  );
}

export function EmaSidebarTreeRow({
  children,
  active,
  depth = 0,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  depth?: number;
  onClick?: () => void;
}) {
  return (
    <div className="ema-sidebar-tree-branch">
      <div className={cx("ema-sidebar-tree-node", `depth-${Math.min(depth, 8)}`, active && "is-selected is-active")}>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onClick?.();
          }}
          style={{ paddingLeft: `${0.3 + depth * 0.75}rem` }}
          className="ema-sidebar-tree-main flex min-h-10 w-full min-w-0 items-center gap-2 rounded-xl text-left text-sm font-extrabold transition"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
