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
  Calculator,
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
  const teams = useTeamStore((s) => s.teams);
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
    // 내가 팀장인 모임 찾기
    const userId = user?.userId || user?._id || user?.id;
    const ownedTeams = teams.filter((t) => {
      const members = t.members || [];
      return members.some((m) => {
        const mid = typeof m.user === "string" ? m.user : m.user._id;
        return mid === userId && m.role === "owner";
      });
    });

    const ownedNames = ownedTeams.map((t) => t.name).join(", ");
    const teamWarning = ownedTeams.length > 0
      ? `\n\n팀장으로 있는 모임 [${ownedNames}]이(가) 모든 거래 내역, 팀원 정보와 함께 영구 삭제됩니다.`
      : "";

    Alert.alert(
      "⚠️ 회원 탈퇴",
      `탈퇴하면 계정 정보가 영구적으로 삭제됩니다.${teamWarning}\n\n삭제된 데이터는 복구할 수 없습니다.`,
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
          도구
        </Text>
        <ListItem
          icon={<Calculator size={20} color="#FF8C42" />}
          title="더치페이 계산기"
          onPress={() => router.push("/dutch")}
        />

        <View className="h-6" />
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
          모임
        </Text>
        <ListItem
          icon={<Users size={20} color="#3DD598" />}
          title="모임 관리"

          onPress={() => {
            if (teams.length > 0) {
              const teamId = currentTeam ? getTeamId(currentTeam) : getTeamId(teams[0]);
              router.push(`/team/${teamId}`);
            } else {
              showToast("info", "모임이 없습니다", "먼저 모임을 만들어주세요");
            }
          }}
        />
        <ListItem
          icon={<PlusCircle size={20} color="#3182F6" />}
          title="새 모임 만들기"

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
  
            onPress={() => router.push("/change-password")}
          />
        )}
        <ListItem
          icon={<LogOut size={20} color="#8B95A1" />}
          title="로그아웃"

          onPress={handleLogout}
        />
        <ListItem
          icon={<Trash2 size={20} color="#F04452" />}
          title="회원 탈퇴"

          onPress={handleDeleteAccount}
          showDivider={false}
        />
      </View>
    </View>
  );
}
