import { forwardRef } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerClassName, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? "border-expense"
      : focused
        ? "border-brand"
        : "border-transparent";

    return (
      <View className={cn("w-full", containerClassName)}>
        {label && (
          <Text className="text-sub text-text-secondary mb-2 font-pretendard-medium">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#B0B8C1"
          className={cn(
            "h-input bg-card rounded-input px-4 text-body font-pretendard text-text-primary border",
            borderColor,
            props.editable === false && "opacity-50",
            className
          )}
        />
        {error && (
          <Text className="text-caption text-expense mt-1 font-pretendard">
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
