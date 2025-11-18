import * as React from "react";
import { cn } from "@/lib/utils";

const Toolbar = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(function Toolbar(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm backdrop-blur",
        className
      )}
      {...props}
    />
  );
});

const ToolbarGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(function ToolbarGroup(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("flex flex-wrap items-center gap-2 [&>*]:whitespace-nowrap", className)} {...props} />
  );
});

const ToolbarTitle = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(function ToolbarTitle(
  { className, ...props },
  ref
) {
  return <p ref={ref} className={cn("heading-sm text-foreground", className)} {...props} />;
});

export { Toolbar, ToolbarGroup, ToolbarTitle };
