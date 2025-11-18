import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type TypographyProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  asChild?: boolean;
};

function createTypography<T extends React.ElementType>(Tag: T, baseClass: string) {
  return React.forwardRef<React.ElementRef<T>, TypographyProps<T>>(function Typography(
    { className, asChild = false, ...props },
    ref
  ) {
    const Comp = asChild ? Slot : Tag;
    return <Comp ref={ref} className={cn(baseClass, className)} {...props} />;
  });
}

export const H1 = createTypography("h1", "heading-xl");
export const H2 = createTypography("h2", "heading-lg");
export const H3 = createTypography("h3", "heading-md");
export const H4 = createTypography("h4", "heading-sm");
export const Lead = createTypography("p", "body-lg text-muted-foreground");
export const MutedText = createTypography("p", "text-muted text-sm");
export const Eyebrow = createTypography("p", "text-xs font-semibold uppercase tracking-[0.4em] text-primary/80");
export const Text = createTypography("p", "body-base");
