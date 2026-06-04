import type { InputHTMLAttributes, ReactNode } from "react";

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
};

export function AppInput({
  label,
  helperText,
  error,
  leftIcon,
  className = "",
  id,
  ...props
}: AppInputProps) {
  const inputId = id || props.name;

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      ) : null}

      {leftIcon ? (
        <div className="input-group">
          <span className="input-group-text">{leftIcon}</span>
          <input
            id={inputId}
            className={`form-control ${error ? "is-invalid" : ""} ${className}`}
            {...props}
          />
        </div>
      ) : (
        <input
          id={inputId}
          className={`form-control ${error ? "is-invalid" : ""} ${className}`}
          {...props}
        />
      )}

      {error ? <div className="invalid-feedback d-block">{error}</div> : null}

      {!error && helperText ? (
        <div className="form-text">{helperText}</div>
      ) : null}
    </div>
  );
}
