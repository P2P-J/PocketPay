import { Pressable, Text, ActivityIndicator } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "items-center justify-center rounded-button flex-row",
  variants: {
    variant: {
      primary: "bg-brand active:bg-brand-dark",
      secondary: "bg-card active:bg-divider",
      outline: "border border-divider bg-transparent active:bg-card",
      ghost: "bg-transparent active:bg-card",
      danger: "bg-expense active:opacity-80",
    },
    size: {
      sm: "h-btn-sm px-3 gap-1",
      md: "h-btn-md px-4 gap-2",
      lg: "h-btn-lg px-5 gap-2",
      full: "h-btn-lg w-full px-5 gap-2",
    },
    disabled: {
      true: "opacity-40",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

const buttonText = tv({
  base: "font-pretendard-semibold",
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-text-primary",
      outline: "text-text-primary",
      ghost: "text-brand",
      danger: "text-white",
    },
    size: {
      sm: "text-sub",
      md: "text-body",
      lg: "text-body",
      full: "text-body",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

type ButtonVariants = VariantProps<typeof button>;

interface ButtonProps extends ButtonVariants {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({
  label,
  variant,
  size,
  disabled,
  loading,
  onPress,
  icon,
  className,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!!disabled || loading}
      className={button({ variant, size, disabled: !!disabled || loading, className })}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#FFFFFF" : "#3DD598"}
        />
      ) : (
        <>
          {icon}
          <Text className={buttonText({ variant, size })}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
