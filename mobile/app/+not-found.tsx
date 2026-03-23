import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-screen-x">
      <Text className="text-title font-pretendard-bold text-text-primary mb-2">
        페이지를 찾을 수 없어요
      </Text>
      <Text className="text-sub text-text-secondary mb-6">
        요청하신 페이지가 존재하지 않습니다
      </Text>
      <Link href="/(tabs)" className="text-body text-brand font-pretendard-semibold">
        홈으로 돌아가기
      </Link>
    </View>
  );
}
