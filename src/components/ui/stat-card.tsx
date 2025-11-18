import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardVariant = "default" | "success" | "warning" | "danger";

const variantMap: Record<StatCardVariant, string> = {
  default: "bg-card/90 border-border/70",
  success: "bg-[color:var(--color-success-soft)] border-[color:var(--color-success-border)]",
  warning: "bg-[color:var(--color-warning-soft)] border-[color:var(--color-warning-border)]",
  danger: "bg-[color:var(--color-destructive-soft)] border-[color:var(--color-destructive-border)]",
};

const textVariantMap: Record<StatCardVariant, string> = {
  default: "text-primary",
  success: "text-[color:var(--color-success-strong)]",
  warning: "text-[color:var(--color-warning-strong)]",
  danger: "text-[color:var(--color-destructive-strong)]",
};

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  variant?: StatCardVariant;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  trend,
  trendLabel,
  icon,
  variant = "default",
  className,
}: StatCardProps) {
  const isNegative = typeof trend === "number" && trend < 0;
  const trendColor =
    variant === "default"
      ? isNegative
        ? "text-[color:var(--color-destructive-strong)]"
        : "text-[color:var(--color-success-strong)]"
      : textVariantMap[variant];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border px-4 py-5 shadow-sm transition-colors",
        variantMap[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>

      <div className={cn("heading-lg", textVariantMap[variant])}>{value}</div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {description ? <p>{description}</p> : <span />}

        {typeof trend === "number" ? (
          <span className={cn("flex items-center gap-1 font-semibold", trendColor)}>
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "•"}
            {Math.abs(trend)}%
            {trendLabel ? <span className="text-muted-foreground font-normal">{trendLabel}</span> : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
