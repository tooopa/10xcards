import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MaxWidth = "5xl" | "6xl" | "7xl" | "full";

const maxWidthClass: Record<MaxWidth, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
  padded?: boolean;
  background?: "grid" | "plain";
}

export function PageShell({
  children,
  className,
  maxWidth = "6xl",
  padded = true,
  background = "grid",
}: PageShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full",
        background === "grid"
          ? "bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_55%)]"
          : "bg-background",
        className
      )}
    >
      {background === "grid" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_top,_white,_transparent_70%)]"
          aria-hidden="true"
        />
      ) : null}
      <div
        className={cn("relative mx-auto w-full", maxWidthClass[maxWidth], padded && "px-4 pb-16 pt-6 sm:px-6 lg:px-8")}
      >
        {children}
      </div>
    </div>
  );
}

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "none" | "sm" | "md" | "lg";
}

const spacingMap: Record<NonNullable<PageSectionProps["spacing"]>, string> = {
  none: "space-y-0",
  sm: "space-y-3",
  md: "space-y-6",
  lg: "space-y-8",
};

export function PageSection({ children, className, spacing = "md" }: PageSectionProps) {
  return <section className={cn(spacingMap[spacing], className)}>{children}</section>;
}

type GridColumns = 1 | 2 | 3 | 4;

interface PageGridProps {
  children: ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
  columns?: {
    base?: GridColumns;
    md?: GridColumns;
    lg?: GridColumns;
  };
}

const gapMap: Record<NonNullable<PageGridProps["gap"]>, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

const colMap: Record<GridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function PageGrid({ children, className, gap = "md", columns }: PageGridProps) {
  const baseCols = columns?.base ?? 1;
  const mdCols = columns?.md;
  const lgCols = columns?.lg;

  return (
    <div
      className={cn(
        "grid",
        colMap[baseCols],
        mdCols ? `md:${colMap[mdCols]}` : null,
        lgCols ? `lg:${colMap[lgCols]}` : null,
        gapMap[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
