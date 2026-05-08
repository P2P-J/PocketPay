import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserPlus, Trash2, ChevronDown, QrCode, Wallet } from "lucide-react-native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const fetchTeams = useTeamStore((s) => s.fetchTeams);

  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || "");
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (selectedTeamId) loadTeam(selectedTeamId);
  }, [selectedTeamId]);

  // 팀 변경 시 편집 폼 초기화
  useEffect(() => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description || "");
      setIsEditingInfo(false);
    }
  }, [team?._id ?? team?.id, team?.name, team?.description]);

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

  const handleSaveInfo = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      showToast("error", "모임 이름을 입력해주세요");
      return;
    }
    if (trimmedName.length > 30) {
      showToast("error", "모임 이름은 30자 이하로 입력해주세요");
      return;
    }
    setSavingInfo(true);
    try {
      await teamApi.update(selectedTeamId, {
        name: trimmedName,
        description: editDescription.trim(),
      });
      showToast("success", "모임 정보 수정 완료");
      await fetchTeams();
      await loadTeam(selectedTeamId);
      setIsEditingInfo(false);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "다시 시도해주세요";
      showToast("error", "수정 실패", msg);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(team?.name ?? "");
    setEditDescription(team?.description ?? "");
    setIsEditingInfo(false);
  };

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
      <ScreenContainer scrollable={false} withKeyboard={false}>
        <Header title="팀 관리" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sub text-text-secondary">불러오는 중...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false} withKeyboard={false}>
      <Header title="모임 관리" showBack />

      <ScrollView
        className="flex-1"
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

        {/* 모임 정보 수정 (모임장만) */}
        {isOwner && !isEditingInfo && (
          <Pressable
            onPress={() => setIsEditingInfo(true)}
            className="self-end mt-2 mb-1"
            hitSlop={8}
          >
            <Text className="text-sub font-pretendard-semibold text-brand">
              모임 정보 수정
            </Text>
          </Pressable>
        )}

        {isOwner && isEditingInfo && (
          <Card variant="default" className="mt-2 mb-4">
            <View style={{ gap: 12 }}>
              <Input
                label="모임 이름"
                value={editName}
                onChangeText={setEditName}
                placeholder="예: 주말 동호회"
                maxLength={30}
              />
              <Input
                label="설명"
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="모임에 대한 간단한 설명"
                maxLength={100}
              />
              <View className="flex-row" style={{ gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="취소"
                    variant="outline"
                    size="md"
                    onPress={handleCancelEdit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="저장"
                    variant="primary"
                    size="md"
                    loading={savingInfo}
                    onPress={handleSaveInfo}
                  />
                </View>
              </View>
            </View>
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
                label="ID로 초대"
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
            ? { _id: member.user, name: "알 수 없음", nickname: "", handle: "", email: "" }
            : member.user;
          const memberId = memberUser._id;
          const isSelf = memberId === getUserId(user);

          const canRemove = isOwner && !isSelf && member.role !== "owner";
          const displayName = memberUser.nickname || memberUser.name || "알 수 없음";
          const displaySubtitle = member.role === "owner"
            ? "팀장"
            : memberUser.handle
              ? `@${memberUser.handle}`
              : memberUser.email;

          return (
            <View key={memberId} className="flex-row items-center">
              <View className="flex-1">
                <ListItem
                  icon={
                    <Text className="text-body font-pretendard-bold text-brand">
                      {displayName.charAt(0) || "?"}
                    </Text>
                  }
                  iconBgColor="#E8FAF2"
                  title={displayName}
                  subtitle={displaySubtitle}
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
    </ScreenContainer>
  );
}
