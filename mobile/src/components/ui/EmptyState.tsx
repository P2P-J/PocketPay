import { View, Text } from "react-native";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View className="items-center py-16 px-screen-x">
      {icon && (
        <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
          {icon}
        </View>
      )}
      <Text className="text-section font-pretendard-semibold text-text-primary mb-2 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-sub text-text-secondary text-center mb-6">
          {description}
        </Text>
      )}
      {ctaLabel && (
        <Button label={ctaLabel} variant="primary" size="md" onPress={onCtaPress} />
      )}
    </View>
  );
}
