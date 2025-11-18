import type { ReactNode } from "react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  labelHidden?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FormField({
  label,
  htmlFor,
  description,
  hint,
  error,
  required,
  labelHidden,
  className,
  contentClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2 text-sm", className)}>
      {label && (
        <div className={cn("flex items-baseline justify-between gap-2", labelHidden && "sr-only")}>
          <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
            <span>{label}</span>
            {required && (
              <span aria-hidden="true" className="text-destructive/80 ml-1 font-semibold">
                *
              </span>
            )}
          </Label>
          {hint ? <span className="body-xs text-muted-foreground">{hint}</span> : null}
        </div>
      )}

      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}

      <div className={cn("space-y-1", contentClassName)}>{children}</div>

      {error ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
