import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
  subdued?: boolean;
}

export function PageHeader({ children, className, subdued }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "rounded-3xl border bg-card/80 px-6 py-8 shadow-sm backdrop-blur",
        subdued && "bg-transparent border-transparent px-0 py-0 shadow-none",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">{children}</div>
    </header>
  );
}

interface PageHeaderHeadingProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function PageHeaderHeading({ title, eyebrow, description, className }: PageHeaderHeadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">{eyebrow}</p> : null}
      <div className="heading-lg text-balance">{title}</div>
      {description ? <p className="text-muted-foreground max-w-2xl text-sm">{description}</p> : null}
    </div>
  );
}

interface PageHeaderActionsProps {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

export function PageHeaderActions({ children, align = "end", className }: PageHeaderActionsProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-3 lg:w-auto",
        align === "start" && "justify-start",
        align === "center" && "justify-center",
        align === "end" && "justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
