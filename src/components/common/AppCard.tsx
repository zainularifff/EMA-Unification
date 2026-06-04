import type { ReactNode } from "react";

type AppCardProps = {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noBody?: boolean;
};

export function AppCard({
  children,
  className = "",
  bodyClassName = "",
  noBody = false,
}: AppCardProps) {
  return (
    <div className={`card app-card border-0 ${className}`}>
      {noBody ? children : <div className={`card-body ${bodyClassName}`}>{children}</div>}
    </div>
  );
}
