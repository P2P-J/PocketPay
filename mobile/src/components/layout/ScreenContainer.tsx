import { ReactNode } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

interface Props {
  children: ReactNode;
  scrollable?: boolean;
  /** 탭이 있는 페이지면 true (기본 자동 감지) */
  withTabBar?: boolean;
  /** SafeArea top 적용 (기본 true) */
  withTopInset?: boolean;
  /** 키보드 회피 (기본 true) */
  withKeyboard?: boolean;
  className?: string;
  scrollViewProps?: ScrollViewProps;
  containerProps?: ViewProps;
}

const useTabBarHeightSafe = () => {
  try {
    return useBottomTabBarHeight();
  } catch {
    return 0;
  }
};

export function ScreenContainer({
  children,
  scrollable = false,
  withTabBar,
  withTopInset = true,
  withKeyboard = true,
  scrollViewProps,
  containerProps,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeightSafe();
  const tokens = useResponsiveTokens();

  const effectiveTabBar = withTabBar ?? tabBarHeight > 0;
  const bottomPad =
    (effectiveTabBar ? tabBarHeight : 0) + (insets.bottom || 0) + 16;

  const innerStyle = {
    paddingTop: withTopInset ? insets.top : 0,
    paddingHorizontal: tokens.screenX,
    flexGrow: scrollable ? 1 : undefined,
    flex: scrollable ? undefined : 1,
    paddingBottom: scrollable ? bottomPad : 0,
    width: "100%" as const,
    maxWidth: tokens.contentMaxWidth,
    alignSelf: "center" as const,
  };

  const Inner = scrollable ? ScrollView : View;
  const innerProps = scrollable
    ? {
        contentContainerStyle: innerStyle,
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: false,
        ...scrollViewProps,
      }
    : { style: innerStyle, ...containerProps };

  const content = (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Inner {...(innerProps as any)}>{children}</Inner>
    </View>
  );

  if (!withKeyboard) return content;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
