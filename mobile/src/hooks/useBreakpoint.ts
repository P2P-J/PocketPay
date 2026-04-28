import { useWindowDimensions } from "react-native";
import { resolveBreakpoint, type Breakpoint } from "@/tokens/breakpoints";

export const useBreakpoint = (): Breakpoint => {
  const { width } = useWindowDimensions();
  return resolveBreakpoint(width);
};
