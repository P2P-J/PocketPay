import { View } from "react-native";
import { cn } from "@/lib/cn";

interface DividerProps {
  inset?: boolean;
  className?: string;
}

export function Divider({ inset = false, className }: DividerProps) {
  return (
    <View
      className={cn(
        "h-px bg-divider",
        inset && "ml-[60px]",
        className
      )}
    />
  );
}
