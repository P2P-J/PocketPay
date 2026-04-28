import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";

export default function InviteScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("올바른 이메일을 입력해주세요");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await teamApi.inviteMember(teamId!, email);
      showToast("success", "초대 완료", `${email}님을 초대했습니다`);
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "초대에 실패했습니다.";
      showToast("error", "초대 실패", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#FFFFFF" }}>
      <Header title="멤버 초대" showBack />
      <ScreenContainer scrollable withTopInset={false}>
        <View className="mt-6">
          <Input
            label="이메일"
            placeholder="초대할 멤버의 이메일을 입력해주세요"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
    </View>
  );
}
