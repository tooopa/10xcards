const cssVar = (token: string) => `var(${token})`;

export const colorTokens = {
  background: cssVar("--color-background"),
  foreground: cssVar("--color-foreground"),
  card: cssVar("--color-card"),
  cardForeground: cssVar("--color-card-foreground"),
  popover: cssVar("--color-popover"),
  popoverForeground: cssVar("--color-popover-foreground"),
  primary: cssVar("--color-primary"),
  primaryForeground: cssVar("--color-primary-foreground"),
  secondary: cssVar("--color-secondary"),
  secondaryForeground: cssVar("--color-secondary-foreground"),
  muted: cssVar("--color-muted"),
  mutedForeground: cssVar("--color-muted-foreground"),
  accent: cssVar("--color-accent"),
  accentForeground: cssVar("--color-accent-foreground"),
  info: cssVar("--color-info"),
  infoForeground: cssVar("--color-info-foreground"),
  infoStrong: cssVar("--color-info-strong"),
  infoSoft: cssVar("--color-info-soft"),
  infoBorder: cssVar("--color-info-border"),
  success: cssVar("--color-success"),
  successForeground: cssVar("--color-success-foreground"),
  successStrong: cssVar("--color-success-strong"),
  successSoft: cssVar("--color-success-soft"),
  successBorder: cssVar("--color-success-border"),
  warning: cssVar("--color-warning"),
  warningForeground: cssVar("--color-warning-foreground"),
  warningStrong: cssVar("--color-warning-strong"),
  warningSoft: cssVar("--color-warning-soft"),
  warningBorder: cssVar("--color-warning-border"),
  destructive: cssVar("--color-destructive"),
  destructiveForeground: cssVar("--color-destructive-foreground"),
  destructiveStrong: cssVar("--color-destructive-strong"),
  destructiveSoft: cssVar("--color-destructive-soft"),
  destructiveBorder: cssVar("--color-destructive-border"),
  border: cssVar("--color-border"),
  input: cssVar("--color-input"),
  ring: cssVar("--color-ring"),
  sidebar: cssVar("--color-sidebar"),
  sidebarForeground: cssVar("--color-sidebar-foreground"),
  sidebarPrimary: cssVar("--color-sidebar-primary"),
  sidebarPrimaryForeground: cssVar("--color-sidebar-primary-foreground"),
  sidebarAccent: cssVar("--color-sidebar-accent"),
  sidebarAccentForeground: cssVar("--color-sidebar-accent-foreground"),
  sidebarBorder: cssVar("--color-sidebar-border"),
  sidebarRing: cssVar("--color-sidebar-ring"),
} as const;

export type ColorToken = keyof typeof colorTokens;

export const radiusTokens = {
  sm: cssVar("--radius-sm"),
  md: cssVar("--radius-md"),
  lg: cssVar("--radius-lg"),
  xl: cssVar("--radius-xl"),
} as const;

export type RadiusToken = keyof typeof radiusTokens;

export const spacingTokens = {
  "1": cssVar("--space-1"),
  "2": cssVar("--space-2"),
  "2_5": cssVar("--space-2-5"),
  "3": cssVar("--space-3"),
  "4": cssVar("--space-4"),
  "5": cssVar("--space-5"),
  "6": cssVar("--space-6"),
  "7": cssVar("--space-7"),
  "8": cssVar("--space-8"),
  "9": cssVar("--space-9"),
  "10": cssVar("--space-10"),
  "12": cssVar("--space-12"),
  "14": cssVar("--space-14"),
  "16": cssVar("--space-16"),
  "18": cssVar("--space-18"),
} as const;

export type SpacingToken = keyof typeof spacingTokens;

export const typographyTokens = {
  headingXl: {
    fontSize: cssVar("--font-size-4xl"),
    lineHeight: "1.15",
    letterSpacing: "-0.025em",
    fontWeight: "700",
  },
  headingLg: {
    fontSize: cssVar("--font-size-3xl"),
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
    fontWeight: "600",
  },
  headingMd: {
    fontSize: cssVar("--font-size-2xl"),
    lineHeight: "1.3",
    letterSpacing: "-0.01em",
    fontWeight: "600",
  },
  headingSm: {
    fontSize: cssVar("--font-size-xl"),
    lineHeight: "1.35",
    letterSpacing: "-0.005em",
    fontWeight: "600",
  },
  bodyLg: {
    fontSize: cssVar("--font-size-lg"),
    lineHeight: "1.55",
    fontWeight: "500",
  },
  bodyBase: {
    fontSize: cssVar("--font-size-base"),
    lineHeight: "1.6",
    fontWeight: "400",
  },
  bodySm: {
    fontSize: cssVar("--font-size-sm"),
    lineHeight: "1.5",
    fontWeight: "400",
  },
  bodyXs: {
    fontSize: cssVar("--font-size-xs"),
    lineHeight: "1.4",
    fontWeight: "500",
  },
} as const;

export type TypographyToken = keyof typeof typographyTokens;

export const tokens = {
  colors: colorTokens,
  radii: radiusTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
};
