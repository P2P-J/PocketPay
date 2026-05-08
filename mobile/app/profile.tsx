import { useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Lock, Pencil } from "lucide-react-native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { HandleInput } from "@/components/profile/HandleInput";
import { useAuthStore } from "@/store/authStore";
import { accountApi } from "@/api/account";
import { authApi } from "@/api/auth";

const HANDLE_COOLDOWN_DAYS = 30;

function getDaysUntilHandleChangeable(changedAt?: string): number {
  if (!changedAt) return 0;
  const elapsed = Date.now() - new Date(changedAt).getTime();
  const remaining = HANDLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

type EditField = "name" | "nickname" | "handle" | null;

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logout = useAuthStore((s) => s.logout);

  const [editingField, setEditingField] = useState<EditField>(null);
  const [draftName, setDraftName] = useState(user?.name ?? "");
  const [draftNickname, setDraftNickname] = useState(user?.nickname ?? "");
  const [draftHandle, setDraftHandle] = useState(user?.handle ?? "");
  const [saving, setSaving] = useState(false);

  const handleDaysLeft = getDaysUntilHandleChangeable(user?.handleChangedAt);
  const canChangeHandle = handleDaysLeft === 0;

  const startEdit = (field: NonNullable<EditField>) => {
    if (field === "handle" && !canChangeHandle) {
      showToast(
        "info",
        `${handleDaysLeft}일 후에 변경 가능합니다`,
        "ID는 30일에 1회 변경할 수 있어요"
      );
      return;
    }
    setDraftName(user?.name ?? "");
    setDraftNickname(user?.nickname ?? "");
    setDraftHandle(user?.handle ?? "");
    setEditingField(field);
  };

  const cancelEdit = () => setEditingField(null);

  const saveEdit = async () => {
    setSaving(true);
    try {
      if (editingField === "name") {
        await accountApi.updateProfile({ name: draftName.trim() });
      } else if (editingField === "nickname") {
        await accountApi.updateProfile({ nickname: draftNickname.trim() });
      } else if (editingField === "handle") {
        await accountApi.updateHandle(draftHandle.trim().toLowerCase());
      }
      await refreshUser();
      showToast("success", "수정 완료");
      setEditingField(null);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "다시 시도해주세요";
      showToast("error", "수정 실패", msg);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const onWithdraw = () => {
    Alert.alert(
      "회원 탈퇴",
      "정말 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            try {
              await authApi.deleteAccount();
              await logout();
              router.replace("/(auth)/login");
            } catch (e: unknown) {
              const msg =
                e instanceof Error ? e.message : "다시 시도해주세요";
              showToast("error", "탈퇴 실패", msg);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="프로필" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 프로필 헤더 */}
        <View className="items-center py-6">
          <View className="w-24 h-24 rounded-full bg-brand items-center justify-center mb-4">
            <Text className="text-white text-xl font-pretendard-bold">
              {user?.nickname?.charAt(0) ?? "?"}
            </Text>
          </View>
          <Text className="text-title font-pretendard-bold text-text-primary">
            {user?.nickname ?? "닉네임"}
          </Text>
          <Text className="text-sub text-text-secondary mt-1">
            @{user?.handle ?? "—"}
          </Text>
        </View>

        {/* 정보 행들 */}
        <ProfileRow
          label="실명"
          value={user?.name ?? ""}
          editing={editingField === "name"}
          onStartEdit={() => startEdit("name")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <Input
              label="실명"
              value={draftName}
              onChangeText={setDraftName}
              maxLength={30}
            />
          }
          saving={saving && editingField === "name"}
        />

        <ProfileRow
          label="닉네임"
          value={user?.nickname ?? ""}
          editing={editingField === "nickname"}
          onStartEdit={() => startEdit("nickname")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <Input
              label="닉네임"
              value={draftNickname}
              onChangeText={setDraftNickname}
              maxLength={20}
            />
          }
          saving={saving && editingField === "nickname"}
        />

        <ProfileRow
          label="ID"
          value={user?.handle ? `@${user.handle}` : ""}
          editing={editingField === "handle"}
          onStartEdit={() => startEdit("handle")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <HandleInput
              value={draftHandle}
              onChange={setDraftHandle}
              ownHandle={user?.handle}
            />
          }
          saving={saving && editingField === "handle"}
          locked={!canChangeHandle}
          lockedHint={`${handleDaysLeft}일 후 변경 가능`}
        />

        {/* 이메일 (수정 불가) */}
        <View className="px-4 py-4 border-b border-divider flex-row items-center justify-between">
          <Text className="text-body text-text-secondary">이메일</Text>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-body text-text-primary">{user?.email}</Text>
            <Lock size={14} color="#B0B8C1" />
          </View>
        </View>

        {/* 비밀번호 변경 (local 가입자만) */}
        {user?.provider === "local" && (
          <Pressable
            onPress={() => router.push("/change-password")}
            className="px-4 py-4 border-b border-divider flex-row items-center justify-between"
          >
            <Text className="text-body text-text-primary">비밀번호 변경</Text>
            <ChevronRight size={20} color="#B0B8C1" />
          </Pressable>
        )}

        {/* 로그아웃 / 탈퇴 */}
        <View className="mt-section-gap">
          <Pressable
            onPress={onLogout}
            className="px-4 py-4 border-b border-divider"
          >
            <Text className="text-body text-text-primary">로그아웃</Text>
          </Pressable>
          <Pressable onPress={onWithdraw} className="px-4 py-4">
            <Text className="text-body text-expense">회원 탈퇴</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileRow({
  label,
  value,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  editor,
  saving,
  locked,
  lockedHint,
}: {
  label: string;
  value: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editor: React.ReactNode;
  saving: boolean;
  locked?: boolean;
  lockedHint?: string;
}) {
  if (editing) {
    return (
      <View className="px-4 py-4 border-b border-divider">
        {editor}
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="취소" variant="outline" size="md" onPress={onCancel} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="저장"
              variant="primary"
              size="md"
              loading={saving}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onStartEdit}
      className="px-4 py-4 border-b border-divider flex-row items-center justify-between"
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text className="text-body text-text-secondary">{label}</Text>
        {locked && lockedHint && (
          <Text className="text-xs text-text-secondary">({lockedHint})</Text>
        )}
      </View>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text className="text-body text-text-primary" numberOfLines={1}>
          {value}
        </Text>
        {locked ? (
          <Lock size={14} color="#B0B8C1" />
        ) : (
          <Pencil size={14} color="#B0B8C1" />
        )}
      </View>
    </Pressable>
  );
}
