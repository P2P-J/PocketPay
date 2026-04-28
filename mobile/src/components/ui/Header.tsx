import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "@/tokens/colors";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const router = useRouter();
  const t = useResponsiveTokens();

  return (
    <View
      className="flex-row items-center border-b border-divider bg-background"
      style={{ paddingHorizontal: t.screenX, height: t.headerHeight }}
    >
      {/* 좌측: 뒤로가기 */}
      <View className="w-11 h-11 items-center justify-center">
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 items-center justify-center active:opacity-70"
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {/* 중앙: 타이틀 */}
      <View className="flex-1 items-center">
        <Text className="text-section font-pretendard-semibold text-text-primary">
          {title}
        </Text>
      </View>

      {/* 우측: 액션 */}
      <View className="w-11 h-11 items-center justify-center">
        {rightAction}
      </View>
    </View>
  );
}
