import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserPlus, Trash2, ChevronDown, QrCode, Wallet } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import type { Team, Member } from "@/types/team";
import { isTeamOwner, getTeamId } from "@/types/team";
import { getUserId } from "@/types/user";

export default function TeamDetailScreen() {
  const { teamId: initialTeamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const teams = useTeamStore((s) => s.teams);
  const deleteTeamStore = useTeamStore((s) => s.deleteTeam);
  const leaveTeamStore = useTeamStore((s) => s.leaveTeam);

  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || "");
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  useEffect(() => {
    if (selectedTeamId) loadTeam(selectedTeamId);
  }, [selectedTeamId]);

  const loadTeam = async (tid?: string) => {
    const id = tid || selectedTeamId;
    if (!id) return;
    setLoading(true);
    try {
      const res = await teamApi.getTeam(id);
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

    Alert.alert("팀원 삭제", `${memberName}님을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await teamApi.removeMember(selectedTeamId, memberId);
            showToast("success", `${memberName}님이 삭제되었습니다`);
            loadTeam();
          } catch {
            showToast("error", "삭제 실패");
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
                      await deleteTeamStore(selectedTeamId);
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
            await leaveTeamStore(selectedTeamId);
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
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#FFFFFF" }}>
        <Header title="팀 관리" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sub text-text-secondary">불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#FFFFFF" }}>
      <Header title="모임 관리" showBack />

      <ScrollView
        className="flex-1 px-screen-x"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* 모임 선택 드롭다운 */}
        <Pressable
          onPress={() => setShowTeamPicker(!showTeamPicker)}
          className="mt-4 mb-2"
        >
          <Card variant="elevated">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-body font-pretendard-bold text-text-primary">
                  {team?.name || "모임 선택"}
                </Text>
                <Text className="text-sub text-text-secondary mt-0.5">
                  {team?.description || "설명 없음"}
                </Text>
              </View>
              <ChevronDown
                size={20}
                color="#8B95A1"
                style={{ transform: [{ rotate: showTeamPicker ? "180deg" : "0deg" }] }}
              />
            </View>
          </Card>
        </Pressable>

        {/* 모임 목록 (펼침) */}
        {showTeamPicker && (
          <Card variant="default" className="mb-4">
            {teams.map((t) => {
              const tid = getTeamId(t);
              const isSelected = tid === selectedTeamId;
              return (
                <Pressable
                  key={tid}
                  onPress={() => {
                    setSelectedTeamId(tid);
                    setShowTeamPicker(false);
                  }}
                  className={`px-4 py-3 ${isSelected ? "bg-brand/10" : ""}`}
                >
                  <Text
                    className={`text-body font-pretendard${isSelected ? "-bold text-brand" : " text-text-primary"}`}
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        )}

        <View className="mb-section-gap" />

        {/* 멤버 목록 */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-section font-pretendard-semibold text-text-primary">
            멤버 ({team?.members?.length || 0})
          </Text>
          {isOwner && (
            <View className="flex-row gap-2">
              <Button
                label="QR 초대"
                variant="ghost"
                size="sm"
                icon={<QrCode size={16} color="#3DD598" />}
                onPress={() =>
                  router.push(
                    `/team/qr?teamId=${selectedTeamId}&teamName=${encodeURIComponent(team?.name || "")}`
                  )
                }
              />
              <Button
                label="이메일 초대"
                variant="ghost"
                size="sm"
                icon={<UserPlus size={16} color="#3DD598" />}
                onPress={() => router.push(`/team/invite?teamId=${selectedTeamId}`)}
              />
            </View>
          )}
        </View>

        {team?.members?.map((member, i) => {
          const memberUser = typeof member.user === "string"
            ? { _id: member.user, name: "알 수 없음", email: "" }
            : member.user;
          const memberId = memberUser._id;
          const isSelf = memberId === getUserId(user);

          const canRemove = isOwner && !isSelf && member.role !== "owner";

          return (
            <View key={memberId} className="flex-row items-center">
              <View className="flex-1">
                <ListItem
                  icon={
                    <Text className="text-body font-pretendard-bold text-brand">
                      {memberUser.name?.charAt(0) || "?"}
                    </Text>
                  }
                  iconBgColor="#E8FAF2"
                  title={memberUser.name || "알 수 없음"}
                  subtitle={member.role === "owner" ? "팀장" : memberUser.email}
                  amountLabel=""
                  showDivider={i < (team.members?.length || 0) - 1}
                />
              </View>
              {canRemove && (
                <Pressable
                  onPress={() => handleRemoveMember(member)}
                  className="p-2 ml-1"
                >
                  <Trash2 size={18} color="#F04452" />
                </Pressable>
              )}
            </View>
          );
        })}

        {/* 회비 현황 버튼 */}
        <Button
          label="회비 현황"
          variant="outline"
          size="full"
          icon={<Wallet size={20} color="#3DD598" />}
          onPress={() => router.push(`/team/fee?teamId=${selectedTeamId}`)}
          className="mt-4"
        />

        {/* 액션 버튼 */}
        <View className="mt-3 mb-8 gap-3">
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
