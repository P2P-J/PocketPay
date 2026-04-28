import { forwardRef, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { X } from "lucide-react-native";
import { colors } from "@/tokens/colors";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface BottomSheetProps {
  title?: string;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
  enableDynamicSizing?: boolean;
}

export const BottomSheet = forwardRef<BottomSheetMethods, BottomSheetProps>(
  function BottomSheet(
    { title, snapPoints: customSnapPoints, children, onClose, enableDynamicSizing = true },
    ref
  ) {
    const snapPoints = useMemo(
      () => customSnapPoints || ["50%", "85%"],
      [customSnapPoints]
    );

    const bp = useBreakpoint();
    const sheetStyle =
      bp !== "phone"
        ? { maxWidth: 600, alignSelf: "center" as const, width: "100%" as const }
        : undefined;

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.2}
        />
      ),
      []
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={enableDynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: colors.divider,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
        backgroundStyle={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: colors.background,
        }}
        onChange={(index) => {
          if (index === -1) onClose?.();
        }}
      >
        <BottomSheetView style={sheetStyle}>
          <View className="px-screen-x pb-8">
            {/* 헤더 */}
            {title && (
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-section font-pretendard-semibold text-text-primary">
                  {title}
                </Text>
                <Pressable
                  onPress={() => {
                    if (ref && "current" in ref && ref.current) {
                      ref.current.close();
                    }
                  }}
                  className="w-11 h-11 items-center justify-center active:opacity-70"
                >
                  <X size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* 콘텐츠 */}
            {children}
          </View>
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);
