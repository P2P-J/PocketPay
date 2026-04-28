import { useBreakpoint } from "./useBreakpoint";
import type { Breakpoint } from "@/tokens/breakpoints";

interface ResponsiveTokens {
  screenX: number;
  contentMaxWidth: number | undefined;
  cardPadding: number;
  cardRadius: number;
  sectionGap: number;
  fontDisplay: number;
  fontTitle: number;
  fontSection: number;
  fontBody: number;
  fontSub: number;
  buttonHeight: number;
  inputHeight: number;
  listItemHeight: number;
  headerHeight: number;
  iconLg: number;
}

const TOKENS: Record<Breakpoint, ResponsiveTokens> = {
  phone: {
    screenX: 20,
    contentMaxWidth: undefined,
    cardPadding: 16,
    cardRadius: 16,
    sectionGap: 24,
    fontDisplay: 32,
    fontTitle: 22,
    fontSection: 18,
    fontBody: 16,
    fontSub: 14,
    buttonHeight: 52,
    inputHeight: 52,
    listItemHeight: 68,
    headerHeight: 56,
    iconLg: 56,
  },
  tablet: {
    screenX: 40,
    contentMaxWidth: 720,
    cardPadding: 20,
    cardRadius: 20,
    sectionGap: 32,
    fontDisplay: 36,
    fontTitle: 24,
    fontSection: 20,
    fontBody: 16,
    fontSub: 15,
    buttonHeight: 56,
    inputHeight: 56,
    listItemHeight: 72,
    headerHeight: 60,
    iconLg: 64,
  },
  large: {
    screenX: 80,
    contentMaxWidth: 840,
    cardPadding: 24,
    cardRadius: 24,
    sectionGap: 40,
    fontDisplay: 40,
    fontTitle: 26,
    fontSection: 22,
    fontBody: 17,
    fontSub: 15,
    buttonHeight: 56,
    inputHeight: 56,
    listItemHeight: 76,
    headerHeight: 60,
    iconLg: 72,
  },
};

export const useResponsiveTokens = (): ResponsiveTokens => {
  const bp = useBreakpoint();
  return TOKENS[bp];
};
