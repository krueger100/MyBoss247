/**
 * Boss Mode — Dark Theme Design System
 *
 * Corporate/professional aesthetic. The app should feel like a real
 * workplace tool, not a fun gamified app. Think Slack meets HR software.
 */

export const colors = {
  // Core backgrounds
  background: "#0a0a0a",
  surface: "#1C1C1E",
  surfaceSecondary: "#2C2C2E",
  surfaceTertiary: "#3A3A3C",

  // Text
  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#6B7280",

  // Borders
  border: "#3A3A3C",
  borderLight: "#2C2C2E",

  // Warning system (consistent throughout the app per PDR)
  green: "#22C55E", // On Track
  yellow: "#EAB308", // Warning
  orange: "#F97316", // Serious Warning
  red: "#EF4444", // Final Warning / Penalty
  nearBlack: "#1C1C1E", // Penalty Triggered

  // Primary accent (green = "on track" / active)
  primary: "#22C55E",
  primaryMuted: "#166534",

  // Tab bar
  tabBarBackground: "#1C1C1E",
  tabBarActive: "#22C55E",
  tabBarInactive: "#6B7280",
  tabBarBorder: "#2C2C2E",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;
