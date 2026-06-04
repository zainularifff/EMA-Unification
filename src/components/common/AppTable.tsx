import type { ReactNode, TableHTMLAttributes } from "react";

type AppTableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  className?: string;
};

export function AppTable({ children, className = "", ...props }: AppTableProps) {
  return (
    <div className="table-responsive">
      <table className={`table table-hover app-table mb-0 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}
