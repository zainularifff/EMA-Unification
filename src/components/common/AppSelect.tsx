import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type AppSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  children?: ReactNode;
};

export function AppSelect({
  label,
  helperText,
  error,
  options,
  children,
  className = "",
  id,
  ...props
}: AppSelectProps) {
  const selectId = id || props.name;

  return (
    <div>
      {label ? (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      ) : null}

      <select
        id={selectId}
        className={`form-select ${error ? "is-invalid" : ""} ${className}`}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>

      {error ? <div className="invalid-feedback d-block">{error}</div> : null}

      {!error && helperText ? (
        <div className="form-text">{helperText}</div>
      ) : null}
    </div>
  );
}
