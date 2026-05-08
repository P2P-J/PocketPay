import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Users,
  PlusCircle,
  Ticket,
  Calculator,
  ChevronRight,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { showToast } from "@/components/ui/Toast";
import { getTeamId } from "@/types/team";

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const teams = useTeamStore((s) => s.teams);

  return (
    <ScreenContainer scrollable>
      <View className="py-4">
        <Text className="text-section font-pretendard-semibold text-text-primary">
          더보기
        </Text>
      </View>

      {/* 프로필 카드 — 탭하면 /profile */}
      <Pressable onPress={() => router.push("/profile")}>
        <Card variant="elevated" className="mb-section-gap">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-brand items-center justify-center mr-3">
              <Text className="text-title font-pretendard-bold text-white">
                {user?.nickname?.charAt(0) || user?.name?.charAt(0) || "?"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-body font-pretendard-bold text-text-primary">
                {user?.nickname || user?.name || "사용자"}
              </Text>
              <Text className="text-sub text-text-secondary">
                {user?.handle ? `@${user.handle}` : user?.email || ""}
              </Text>
            </View>
            <ChevronRight size={20} color="#B0B8C1" />
          </View>
        </Card>
      </Pressable>

      {/* 도구 */}
      <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">도구</Text>
      <ListItem
        icon={<Calculator size={20} color="#FF8C42" />}
        title="더치페이 계산기"
        onPress={() => router.push("/dutch")}
      />

      <View className="h-6" />
      <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">모임</Text>
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
      <ListItem
        icon={<Ticket size={20} color="#FF8C42" />}
        title="초대 코드로 참가"
        onPress={() => router.push("/team/join")}
        showDivider={false}
      />
    </ScreenContainer>
  );
}
