import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  bleed?: boolean;
}

export function SectionShell({ children, className, padded = true, bleed }: SectionShellProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur",
        padded && "p-6",
        bleed && "!px-0 !py-0 border-transparent bg-transparent shadow-none",
        className
      )}
    >
      {children}
    </section>
  );
}

interface SectionShellHeaderProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionShellHeader({ title, description, actions, className }: SectionShellHeaderProps) {
  if (!title && !description && !actions) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        {title ? <div className="heading-md">{title}</div> : null}
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface SectionShellContentProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function SectionShellContent({ children, className, padded = true }: SectionShellContentProps) {
  return <div className={cn(padded && "pt-4", className)}>{children}</div>;
}
