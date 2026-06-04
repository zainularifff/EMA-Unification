import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonVariant =
  | "primary"
  | "secondary"
  | "light"
  | "outline"
  | "danger"
  | "success";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: AppButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

const variantClass: Record<AppButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  light: "btn-light",
  outline: "btn-outline-secondary",
  danger: "btn-danger",
  success: "btn-success",
};

export function AppButton({
  children,
  icon,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: AppButtonProps) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const widthClass = fullWidth ? "w-100" : "";

  return (
    <button
      type={type}
      className={[
        "btn d-inline-flex align-items-center justify-content-center gap-2",
        variantClass[variant],
        sizeClass,
        widthClass,
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
