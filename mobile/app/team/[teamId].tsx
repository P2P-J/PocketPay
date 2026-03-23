import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserPlus, UserMinus, Trash2 } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import type { Team, Member } from "@/types/team";
import { isTeamOwner } from "@/types/team";
import { getUserId } from "@/types/user";

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const deleteTeamStore = useTeamStore((s) => s.deleteTeam);
  const leaveTeamStore = useTeamStore((s) => s.leaveTeam);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) loadTeam();
  }, [teamId]);

  const loadTeam = async () => {
    try {
      const res = await teamApi.getTeam(teamId!);
      setTeam(res.data);
    } catch {
      showToast("error", "팀 정보를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  const isOwner = isTeamOwner(team?.members, user);

  const handleRemoveMember = (member: Member) => {
    const memberUser = typeof member.user === "string" ? null : member.user;
    const memberId = typeof member.user === "string" ? member.user : member.user._id;
    const memberName = memberUser?.name || "멤버";

    Alert.alert("멤버 추방", `${memberName}님을 추방하시겠어요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "추방",
        style: "destructive",
        onPress: async () => {
          try {
            await teamApi.removeMember(teamId!, memberId);
            showToast("success", `${memberName}님이 추방되었습니다`);
            loadTeam();
          } catch {
            showToast("error", "추방 실패");
          }
        },
      },
    ]);
  };

  const handleDeleteTeam = () => {
    Alert.alert(
      "⚠️ 모임 삭제",
      "이 모임의 모든 거래 내역이 영구적으로 삭제됩니다.\n삭제된 데이터는 복구할 수 없습니다.\n\n정말 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            // 2차 확인
            Alert.alert(
              "🚨 마지막 확인",
              `"${team?.name}" 모임과 모든 거래 내역이 완전히 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.`,
              [
                { text: "취소", style: "cancel" },
                {
                  text: "영구 삭제",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteTeamStore(teamId!);
                      showToast("success", "모임이 삭제되었습니다");
                      router.replace("/(tabs)");
                    } catch {
                      showToast("error", "삭제 실패");
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

  const handleLeaveTeam = () => {
    Alert.alert("모임 나가기", "정말 나가시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        onPress: async () => {
          try {
            await leaveTeamStore(teamId!);
            showToast("success", "모임을 나갔습니다");
            router.back();
          } catch {
            showToast("error", "나가기 실패");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <Header title="팀 관리" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sub text-text-secondary">불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Header title={team?.name || "팀 관리"} showBack />

      <ScrollView className="flex-1 px-screen-x">
        {/* 팀 정보 */}
        <Card variant="elevated" className="mt-4 mb-section-gap">
          <Text className="text-body font-pretendard-bold text-text-primary mb-1">
            {team?.name}
          </Text>
          <Text className="text-sub text-text-secondary">
            {team?.description || "설명 없음"}
          </Text>
        </Card>

        {/* 멤버 목록 */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-section font-pretendard-semibold text-text-primary">
            멤버 ({team?.members?.length || 0})
          </Text>
          {isOwner && (
            <Button
              label="초대"
              variant="ghost"
              size="sm"
              icon={<UserPlus size={16} color="#3DD598" />}
              onPress={() => router.push(`/team/invite?teamId=${teamId}`)}
            />
          )}
        </View>

        {team?.members?.map((member, i) => {
          const memberUser = typeof member.user === "string"
            ? { _id: member.user, name: "알 수 없음", email: "" }
            : member.user;
          const memberId = memberUser._id;
          const isSelf = memberId === getUserId(user);

          return (
            <ListItem
              key={memberId}
              icon={
                <Text className="text-body font-pretendard-bold text-brand">
                  {memberUser.name?.charAt(0) || "?"}
                </Text>
              }
              iconBgColor="#E8FAF2"
              title={memberUser.name || "알 수 없음"}
              subtitle={memberUser.email}
              amountLabel=""
              showDivider={i < (team.members?.length || 0) - 1}
              onPress={
                isOwner && !isSelf && member.role !== "owner"
                  ? () => handleRemoveMember(member)
                  : undefined
              }
            />
          );
        })}

        {/* 액션 버튼 */}
        <View className="mt-8 mb-8 gap-3">
          {isOwner ? (
            <Button
              label="모임 삭제"
              variant="danger"
              size="full"
              icon={<Trash2 size={20} color="#FFFFFF" />}
              onPress={handleDeleteTeam}
            />
          ) : (
            <Button
              label="모임 나가기"
              variant="outline"
              size="full"
              onPress={handleLeaveTeam}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
