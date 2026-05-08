import { Pressable, View, Text } from "react-native";
import { Bell } from "lucide-react-native";

type Props = {
  count: number;
  onPress: () => void;
};

export function NotificationBell({ count, onPress }: Props) {
  const display = count > 99 ? "99+" : String(count);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Bell size={24} color="#191F28" strokeWidth={2} />
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 10,
              fontFamily: "Pretendard-Bold",
              lineHeight: 14,
            }}
          >
            {display}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
