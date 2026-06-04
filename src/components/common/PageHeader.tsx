import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        {eyebrow ? (
          <span className="badge text-bg-primary rounded-pill px-3 py-2 mb-3">
            {eyebrow}
          </span>
        ) : null}

        <h1 className="app-page-title">{title}</h1>

        {description ? (
          <p className="app-page-subtitle mt-2">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="d-flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
