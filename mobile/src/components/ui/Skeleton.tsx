import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  circle = false,
  className,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: circle ? height : width,
          height,
          borderRadius: circle ? height / 2 : radius,
          backgroundColor: "#E5E8EB",
        },
        animatedStyle,
      ]}
      className={className}
    />
  );
}
