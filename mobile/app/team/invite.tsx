import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";

export default function InviteScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();

  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    const trimmed = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setError("ID는 영문 소문자, 숫자, 언더스코어 3~20자");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await teamApi.inviteMember(teamId!, trimmed);
      showToast("success", "초대 완료", `@${trimmed}님께 초대를 보냈어요`);
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "초대에 실패했어요";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Header title="ID로 초대" showBack />
      <View className="mt-6">
        <Input
          label="ID"
          placeholder="aen_kim"
          value={handle}
          onChangeText={(v) => {
            setHandle(v.toLowerCase());
            setError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          error={error}
        />
      </View>
      <View className="mt-6">
        <Button
          label="초대하기"
          variant="primary"
          size="full"
          onPress={handleInvite}
          loading={loading}
        />
      </View>
    </ScreenContainer>
  );
}
