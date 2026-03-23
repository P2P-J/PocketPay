import { View, Text } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";

const badge = tv({
  base: "rounded-badge px-2 py-0.5 self-start",
  variants: {
    color: {
      brand: "bg-brand-light",
      income: "bg-[#E8F3FF]",
      expense: "bg-[#FFEEEE]",
      neutral: "bg-card",
    },
  },
  defaultVariants: { color: "neutral" },
});

const badgeText = tv({
  base: "text-caption font-pretendard-medium",
  variants: {
    color: {
      brand: "text-brand-dark",
      income: "text-income",
      expense: "text-expense",
      neutral: "text-text-secondary",
    },
  },
  defaultVariants: { color: "neutral" },
});

type BadgeVariants = VariantProps<typeof badge>;

interface BadgeProps extends BadgeVariants {
  label: string;
  className?: string;
}

export function Badge({ label, color, className }: BadgeProps) {
  return (
    <View className={badge({ color, className })}>
      <Text className={badgeText({ color })}>{label}</Text>
    </View>
  );
}
