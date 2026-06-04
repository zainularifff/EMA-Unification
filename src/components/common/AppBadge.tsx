import type { ReactNode } from "react";

type AppBadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary"
  | "light";

type AppBadgeProps = {
  children: ReactNode;
  tone?: AppBadgeTone;
  pill?: boolean;
  className?: string;
};

const toneClass: Record<AppBadgeTone, string> = {
  primary: "text-bg-primary",
  success: "text-bg-success",
  warning: "text-bg-warning",
  danger: "text-bg-danger",
  info: "text-bg-info",
  secondary: "text-bg-secondary",
  light: "text-bg-light",
};

export function AppBadge({
  children,
  tone = "primary",
  pill = true,
  className = "",
}: AppBadgeProps) {
  return (
    <span
      className={[
        "badge",
        toneClass[tone],
        pill ? "rounded-pill" : "rounded-3",
        "px-3 py-2",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
