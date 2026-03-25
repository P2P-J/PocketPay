import { useState } from "react";
import { View, Text, Pressable, Platform, Modal } from "react-native";
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

      {/* Android: 기본 다이얼로그 */}
      {show && Platform.OS === "android" && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={handleChange}
          locale="ko"
          maximumDate={new Date()}
        />
      )}

      {/* iOS: Modal로 감싸서 인라인 펼침 방지 */}
      {Platform.OS === "ios" && (
        <Modal
          visible={show}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl pb-8">
              <View className="flex-row justify-end px-4 pt-3 pb-1">
                <Pressable onPress={() => setShow(false)} className="py-2 px-3">
                  <Text className="text-brand font-pretendard-semibold text-body">
                    확인
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="inline"
                onChange={handleChange}
                locale="ko"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
