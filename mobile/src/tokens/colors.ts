export const colors = {
  brand: "#3DD598",
  brandDark: "#2EAE7D",
  brandLight: "#E8FAF2",
  background: "#FFFFFF",
  card: "#F5F6F8",
  textPrimary: "#191F28",
  textSecondary: "#8B95A1",
  textDisabled: "#B0B8C1",
  income: "#3182F6",
  expense: "#F04452",
  divider: "#E5E8EB",
  overlay: "rgba(0,0,0,0.2)",
  overlayHeavy: "rgba(0,0,0,0.4)",
} as const;

export type ColorKey = keyof typeof colors;
