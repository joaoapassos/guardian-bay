import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className="text-sm leading-relaxed text-muted">
          {help}
        </p>
      )}
      <p id={`${id}-error`} className="text-sm font-medium text-danger">
        {error}
      </p>
    </div>
  );
}
