import React from "react";
import clsx from "clsx";
import styles from "./Input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, label, error, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div
        className={clsx(
          styles.inputWrapper,
          { [styles.error]: !!error },
          wrapperClassName,
        )}
      >
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(styles.input, className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} className={styles.errorMessage}>
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
