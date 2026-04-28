import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

const card = tv({
  base: "rounded-card p-card-p",
  variants: {
    variant: {
      default: "bg-card",
      elevated: "bg-background shadow-sm shadow-black/5",
      outlined: "bg-background border border-divider",
    },
  },
  defaultVariants: { variant: "default" },
});

type CardVariants = VariantProps<typeof card>;

interface CardProps extends ViewProps, CardVariants {
  className?: string;
}

export function Card({ variant, className, children, style, ...props }: CardProps) {
  const t = useResponsiveTokens();
  return (
    <View
      className={card({ variant, className })}
      style={[
        { padding: t.cardPadding, borderRadius: t.cardRadius },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
