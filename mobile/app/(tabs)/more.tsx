import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Users,
  PlusCircle,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { authApi } from "@/api/auth";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { showToast } from "@/components/ui/Toast";
import { isLocalUser } from "@/types/user";
import { getTeamId } from "@/types/team";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const reset = useTeamStore((s) => s.reset);

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        onPress: () => {
          logout();
          reset();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ 회원 탈퇴",
      "탈퇴하면 모든 모임, 거래 내역, 계정 정보가 영구적으로 삭제됩니다.\n\n삭제된 데이터는 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "🚨 마지막 확인",
              "정말 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "영구 탈퇴",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await authApi.deleteAccount();
                      logout();
                      reset();
                      showToast("success", "탈퇴가 완료되었습니다");
                    } catch {
                      showToast("error", "탈퇴 실패");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-screen-x py-4">
        <Text className="text-section font-pretendard-semibold text-text-primary">
          더보기
        </Text>
      </View>

      <View className="px-screen-x">
        {/* 프로필 카드 */}
        <Card variant="elevated" className="mb-section-gap">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-brand items-center justify-center mr-3">
              <Text className="text-title font-pretendard-bold text-white">
                {user?.name?.charAt(0) || "?"}
              </Text>
            </View>
            <View>
              <Text className="text-body font-pretendard-bold text-text-primary">
                {user?.name || "사용자"}
              </Text>
              <Text className="text-sub text-text-secondary">{user?.email || ""}</Text>
            </View>
          </View>
        </Card>

        {/* 메뉴 */}
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
          모임
        </Text>
        {currentTeam && (
          <ListItem
            icon={<Users size={20} color="#3DD598" />}
            title="팀 관리"
            subtitle={currentTeam.name}
            amountLabel=""
            onPress={() => router.push(`/team/${getTeamId(currentTeam)}`)}
          />
        )}
        <ListItem
          icon={<PlusCircle size={20} color="#3182F6" />}
          title="새 모임 만들기"
          amountLabel=""
          onPress={() => router.push("/team/create")}
        />

        <View className="h-6" />
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
          계정
        </Text>
        {isLocalUser(user) && (
          <ListItem
            icon={<Lock size={20} color="#8B95A1" />}
            title="비밀번호 변경"
            amountLabel=""
            onPress={() => router.push("/(auth)/change-password")}
          />
        )}
        <ListItem
          icon={<LogOut size={20} color="#8B95A1" />}
          title="로그아웃"
          amountLabel=""
          onPress={handleLogout}
        />
        <ListItem
          icon={<Trash2 size={20} color="#F04452" />}
          title="회원 탈퇴"
          amountLabel=""
          onPress={handleDeleteAccount}
          showDivider={false}
        />
      </View>
    </View>
  );
}
