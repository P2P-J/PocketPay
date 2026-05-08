import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";
import { useTeamStore } from "@/store/teamStore";

export default function JoinTeamScreen() {
  const router = useRouter();
  const fetchTeams = useTeamStore((s) => s.fetchTeams);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("초대 코드를 입력해주세요");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const res = (await teamApi.joinByToken(trimmed)) as { message?: string };
      if (res.message === "이미 팀원입니다.") {
        showToast("info", "이미 참가 중인 모임이에요");
      } else {
        showToast("success", "모임 참가 완료!", "홈에서 확인해보세요");
      }
      await fetchTeams();
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "유효하지 않거나 만료된 초대 코드예요";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable withKeyboard>
      <Header title="초대 코드로 참가" showBack />

      <View className="py-4">
        <Text className="text-body text-text-secondary mb-section-gap">
          모임 초대자에게 받은 코드를 그대로 입력하면 바로 참가할 수 있어요.
        </Text>

        <Input
          label="초대 코드"
          placeholder="공유받은 코드를 입력하세요"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            if (error) setError(undefined);
          }}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <View className="h-6" />

        <Button
          label="모임 참가하기"
          variant="primary"
          size="full"
          onPress={handleSubmit}
          disabled={!code.trim()}
          loading={loading}
        />
      </View>
    </ScreenContainer>
  );
}
