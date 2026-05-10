import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ToggleChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: selected ? "#3DD598" : "#E5E8EB",
        backgroundColor: selected ? "#E8FAF2" : "#FFFFFF",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Pretendard-SemiBold",
          color: selected ? "#3DD598" : "#8B95A1",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
