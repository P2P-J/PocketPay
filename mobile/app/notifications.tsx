import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Bell } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useTeamStore } from "@/store/teamStore";
import { useAuthStore } from "@/store/authStore";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { accountApi } from "@/api/account";
import type { Invitation } from "@/types/invitation";
import type { DutchRequestNotification } from "@/types/dutch";

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
  isHighlighted,
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  isHighlighted?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (isHighlighted) {
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isHighlighted]);

  return (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: glow ? "#E8FAF2" : "#FFFFFF",
        borderWidth: 1,
        borderColor: glow ? "#3DD598" : "#E5E8EB",
      }}
    >
      <Text className="text-lg font-pretendard-bold text-text-primary mb-1">
        {invitation.teamName}
      </Text>
      <Text className="text-sub text-text-secondary mb-4">
        {invitation.invitedBy?.nickname ?? invitation.invitedBy?.name ?? "알 수 없음"}님이 초대했어요 ·{" "}
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

function DutchRequestCard({
  request,
  isHighlighted,
  onDismiss,
}: {
  request: DutchRequestNotification;
  isHighlighted?: boolean;
  onDismiss: () => void;
}) {
  const title = request.memo || "더치페이 요청";
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isHighlighted]);

  const handleCopyAccount = async () => {
    await Clipboard.setStringAsync(request.accountSnapshot.number);
    showToast("success", "계좌번호 복사됨");
  };

  return (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: glow ? "#E8FAF2" : "#FFFFFF",
        borderWidth: 1,
        borderColor: glow ? "#3DD598" : "#E5E8EB",
      }}
    >
      <Text className="text-lg font-pretendard-bold text-text-primary mb-1">
        {title}
      </Text>
      <Text className="text-body text-text-primary mb-1">
        {request.requesterDisplayName}님이 ₩{request.amount.toLocaleString()} 요청
      </Text>
      <Text className="text-sub text-text-secondary mb-3">
        {request.teamName} · {formatRelativeTime(request.createdAt)}
      </Text>

      <View
        className="bg-background rounded-lg p-3 mb-3"
        style={{ borderWidth: 1, borderColor: "#F2F4F6" }}
      >
        <Text className="text-xs text-text-secondary mb-1">송금 계좌</Text>
        <Text className="text-body text-text-primary">
          {request.accountSnapshot.bank} {request.accountSnapshot.number}
        </Text>
        <Text className="text-sub text-text-secondary">
          예금주: {request.accountSnapshot.holder}
        </Text>
        <Pressable onPress={handleCopyAccount} className="mt-2 self-start" hitSlop={4}>
          <Text className="text-sub text-brand font-pretendard-semibold">
            계좌번호 복사
          </Text>
        </Pressable>
      </View>

      <Button label="확인" variant="primary" size="md" onPress={onDismiss} />
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
        모임 초대나 더치페이 요청이 오면 여기에 표시돼요
      </Text>
    </View>
  );
}

type UnifiedItem =
  | { type: "invite"; data: Invitation; createdAt: string }
  | { type: "dutch"; data: DutchRequestNotification; createdAt: string };

export default function NotificationsScreen() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const flatListRef = useRef<FlatList<UnifiedItem>>(null);

  const invitations = useTeamStore((s) => s.pendingInvitations);
  const dutchRequests = useTeamStore((s) => s.pendingDutchRequests);
  const fetchPendingInvitations = useTeamStore((s) => s.fetchPendingInvitations);
  const fetchPendingDutchRequests = useTeamStore((s) => s.fetchPendingDutchRequests);
  const acceptInvitation = useTeamStore((s) => s.acceptInvitation);
  const rejectInvitation = useTeamStore((s) => s.rejectInvitation);
  const dismissDutchRequestAction = useTeamStore((s) => s.dismissDutchRequest);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  useEffect(() => {
    fetchPendingInvitations();
    fetchPendingDutchRequests();
    // 알림 화면 진입 — 미확인 카운트 리셋
    accountApi.markNotificationsViewed().catch(() => {});
    refreshUser();
  }, [fetchPendingInvitations, fetchPendingDutchRequests, refreshUser]);

  const unified = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [
      ...invitations.map((i) => ({
        type: "invite" as const,
        data: i,
        createdAt: i.invitedAt,
      })),
      ...dutchRequests.map((d) => ({
        type: "dutch" as const,
        data: d,
        createdAt: d.createdAt,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [invitations, dutchRequests]);

  // highlight 자동 스크롤
  useEffect(() => {
    if (!highlight || unified.length === 0) return;
    const index = unified.findIndex((item) => {
      const id =
        item.type === "invite" ? item.data.teamId : item.data._id;
      return String(id) === String(highlight);
    });
    if (index >= 0) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3,
        });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [highlight, unified]);

  const onAccept = async (inv: Invitation) => {
    try {
      await acceptInvitation(inv.teamId);
      showToast("success", "초대 수락", `${inv.teamName}에 참가했어요`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "다시 시도해주세요";
      showToast("error", "수락 실패", msg);
    }
  };

  const onReject = async (inv: Invitation) => {
    try {
      await rejectInvitation(inv.teamId);
      showToast("info", "초대 거절");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "다시 시도해주세요";
      showToast("error", "거절 실패", msg);
    }
  };

  const onDismissDutch = async (id: string) => {
    try {
      await dismissDutchRequestAction(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "다시 시도해주세요";
      showToast("error", "실패", msg);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="알림" showBack />
      {unified.length === 0 ? (
        <EmptyView />
      ) : (
        <FlatList
          ref={flatListRef}
          data={unified}
          keyExtractor={(item) =>
            `${item.type}-${
              item.type === "invite" ? item.data.teamId : item.data._id
            }`
          }
          renderItem={({ item }) => {
            const itemId =
              item.type === "invite" ? item.data.teamId : item.data._id;
            const isHighlighted =
              !!highlight && String(itemId) === String(highlight);
            return item.type === "invite" ? (
              <InvitationCard
                invitation={item.data}
                isHighlighted={isHighlighted}
                onAccept={() => onAccept(item.data)}
                onReject={() => onReject(item.data)}
              />
            ) : (
              <DutchRequestCard
                request={item.data}
                isHighlighted={isHighlighted}
                onDismiss={() => onDismissDutch(item.data._id)}
              />
            );
          }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }, 100);
          }}
        />
      )}
    </ScreenContainer>
  );
}
