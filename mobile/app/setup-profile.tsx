import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { HandleInput } from "@/components/profile/HandleInput";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth";

export default function SetupProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [realName, setRealName] = useState(user?.name ?? "");
  const [nickname, setNickname] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  const realNameAlreadyProvided = !!user?.name;

  const handleSave = async () => {
    const trimmedName = realName.trim();
    const trimmedNickname = nickname.trim();
    const trimmedHandle = handle.trim().toLowerCase();

    if (!trimmedName) {
      showToast("error", "실명을 입력해주세요");
      return;
    }
    if (!trimmedNickname) {
      showToast("error", "닉네임을 입력해주세요");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedHandle)) {
      showToast("error", "ID 형식이 올바르지 않습니다");
      return;
    }

    setSaving(true);
    try {
      await authApi.completeOAuthProfile({
        name: trimmedName,
        nickname: trimmedNickname,
        handle: trimmedHandle,
      });
      await refreshUser();
      showToast("success", "프로필 완성", "환영합니다!");
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "다시 시도해주세요";
      showToast("error", "저장 실패", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="프로필 설정" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-body text-text-secondary mb-6">
          작은 모임을 사용하기 전에{"\n"}프로필 정보를 입력해주세요.
        </Text>
        <View style={{ gap: 16 }}>
          <Input
            label={realNameAlreadyProvided ? "실명 (수정 가능)" : "실명"}
            value={realName}
            onChangeText={setRealName}
            maxLength={30}
            placeholder="실명을 입력해주세요"
          />
          <Input
            label="닉네임"
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            placeholder="모임에서 보일 이름"
          />
          <HandleInput value={handle} onChange={setHandle} />
          <Button
            label="시작하기"
            variant="primary"
            size="full"
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
