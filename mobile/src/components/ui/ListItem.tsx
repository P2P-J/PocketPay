import { View, Text, Pressable } from "react-native";
import { cn } from "@/lib/cn";

interface ListItemProps {
  icon?: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  amount?: number;
  amountLabel?: string;
  onPress?: () => void;
  showDivider?: boolean;
  className?: string;
}

export function ListItem({
  icon,
  iconBgColor = "transparent",
  title,
  subtitle,
  amount,
  amountLabel,
  onPress,
  showDivider = true,
  className,
}: ListItemProps) {
  const isIncome = amount !== undefined && amount > 0;
  const isExpense = amount !== undefined && amount < 0;
  const formattedAmount = amount !== undefined
    ? `${isIncome ? "+" : isExpense ? "-" : ""}₩${Math.abs(amount).toLocaleString()}`
    : amountLabel;

  return (
    <>
      <Pressable
        onPress={onPress}
        className={cn(
          "flex-row items-center px-screen-x h-list-item active:bg-card/50",
          className
        )}
      >
        {/* 아이콘 (40px 원형) */}
        <View
          className="w-icon-md h-icon-md rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </View>

        {/* 텍스트 영역 */}
        <View className="flex-1">
          <Text
            className="text-body font-pretendard-semibold text-text-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sub text-text-secondary mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* 금액 */}
        {formattedAmount && (
          <Text
            className={cn(
              "text-body font-pretendard-bold ml-3",
              isIncome ? "text-income" : isExpense ? "text-expense" : "text-text-primary"
            )}
          >
            {formattedAmount}
          </Text>
        )}
      </Pressable>

      {/* 인덴트 구분선 (토스 스타일) */}
      {showDivider && <View className="h-px bg-divider ml-[76px]" />}
    </>
  );
}
