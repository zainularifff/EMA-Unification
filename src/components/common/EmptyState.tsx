import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="app-empty-state">
      <div className="app-icon-box app-icon-box-lg mx-auto mb-3">
        {icon || <Inbox size={24} />}
      </div>

      <h2 className="h5 fw-bold mb-2">{title}</h2>

      {description ? (
        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: 460 }}>
          {description}
        </p>
      ) : null}

      {action}
    </div>
  );
}
