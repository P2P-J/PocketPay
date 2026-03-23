import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface DatePickerInputProps {
  label?: string;
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
}

export function DatePickerInput({ label, value, onChange }: DatePickerInputProps) {
  const [show, setShow] = useState(false);

  const dateObj = value ? new Date(value + "T00:00:00") : new Date();

  const formatDisplay = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${y}년 ${m}월 ${day}일 (${days[d.getDay()]})`;
  };

  const handleChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, "0");
      const d = String(selected.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View>
      {label && (
        <Text className="text-sub font-pretendard-medium text-text-secondary mb-1.5">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setShow(true)}
        className="h-input bg-card rounded-input px-4 justify-center"
      >
        <Text className="text-body font-pretendard text-text-primary">
          {formatDisplay(dateObj)}
        </Text>
      </Pressable>

      {show && (
        <View>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            locale="ko"
            maximumDate={new Date()}
          />
          {Platform.OS === "ios" && (
            <Pressable
              onPress={() => setShow(false)}
              className="items-center py-2"
            >
              <Text className="text-brand font-pretendard-semibold text-body">
                확인
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
