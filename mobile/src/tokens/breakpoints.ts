export const BREAKPOINTS = {
  phone: 0,
  tablet: 600,
  large: 1024,
} as const;

export type Breakpoint = "phone" | "tablet" | "large";

export const resolveBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.large) return "large";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
};
