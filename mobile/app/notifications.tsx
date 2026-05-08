import { useEffect } from "react";
import { View, Text, FlatList } from "react-native";
import { Bell } from "lucide-react-native";
import { useTeamStore } from "@/store/teamStore";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import type { Invitation } from "@/types/invitation";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function InvitationCard({
  invitation,
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View
      className="bg-card rounded-2xl p-4 mb-3"
      style={{ borderWidth: 1, borderColor: "#E5E8EB" }}
    >
      <Text className="text-lg font-pretendard-bold text-text-primary mb-1">
        {invitation.teamName}
      </Text>
      <Text className="text-sub text-text-secondary mb-4">
        {invitation.invitedBy?.name ?? "알 수 없음"}님이 초대했어요 ·{" "}
        {formatRelativeTime(invitation.invitedAt)}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="거절" variant="outline" size="md" onPress={onReject} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="수락" variant="primary" size="md" onPress={onAccept} />
        </View>
      </View>
    </View>
  );
}

function EmptyView() {
  return (
    <View className="flex-1 items-center justify-center py-24">
      <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
        <Bell size={28} color="#B0B8C1" strokeWidth={2} />
      </View>
      <Text className="text-section font-pretendard-semibold text-text-primary">
        새 알림이 없어요
      </Text>
      <Text className="text-sub text-text-secondary mt-1">
        모임 초대를 받으면 여기에 표시돼요
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const invitations = useTeamStore((s) => s.pendingInvitations);
  const fetchPendingInvitations = useTeamStore(
    (s) => s.fetchPendingInvitations
  );
  const acceptInvitation = useTeamStore((s) => s.acceptInvitation);
  const rejectInvitation = useTeamStore((s) => s.rejectInvitation);

  useEffect(() => {
    fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  const onAccept = async (inv: Invitation) => {
    try {
      await acceptInvitation(inv.teamId);
      showToast("success", "초대 수락", `${inv.teamName}에 참가했어요`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "다시 시도해주세요";
      showToast("error", "수락 실패", msg);
    }
  };

  const onReject = async (inv: Invitation) => {
    try {
      await rejectInvitation(inv.teamId);
      showToast("info", "초대 거절");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "다시 시도해주세요";
      showToast("error", "거절 실패", msg);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="알림" showBack />
      {invitations.length === 0 ? (
        <EmptyView />
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.teamId}
          renderItem={({ item }) => (
            <InvitationCard
              invitation={item}
              onAccept={() => onAccept(item)}
              onReject={() => onReject(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        />
      )}
    </ScreenContainer>
  );
}
