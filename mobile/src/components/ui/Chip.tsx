import { Pressable, Text } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/cn";

const chip = tv({
  base: "rounded-badge px-3 py-1.5 border self-start",
  variants: {
    selected: {
      true: "bg-brand border-brand",
      false: "bg-background border-divider",
    },
  },
  defaultVariants: { selected: false },
});

const chipText = tv({
  base: "text-sub",
  variants: {
    selected: {
      true: "text-white font-pretendard-semibold",
      false: "text-text-secondary font-pretendard",
    },
  },
  defaultVariants: { selected: false },
});

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Chip({ label, selected = false, onPress, className }: ChipProps) {
  return (
    <Pressable onPress={onPress} className={chip({ selected, className })}>
      <Text className={chipText({ selected })}>{label}</Text>
    </Pressable>
  );
}
