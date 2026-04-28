import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useTeamStore } from "@/store/teamStore";

export default function CreateTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createTeam = useTeamStore((s) => s.createTeam);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("error", "모임 이름을 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await createTeam(name.trim(), description.trim());
      showToast("success", "모임이 생성되었습니다");
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "모임 생성에 실패했습니다.";
      showToast("error", "생성 실패", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#FFFFFF" }}>
      <Header title="모임 만들기" showBack />
      <ScreenContainer scrollable withTopInset={false}>
        <View className="gap-3 mt-6 mb-6">
          <Input
            label="모임 이름"
            placeholder="모임 이름을 입력해주세요"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="설명 (선택)"
            placeholder="모임에 대한 설명을 입력해주세요"
            value={description}
            onChangeText={setDescription}
          />
        </View>
        <Button
          label="만들기"
          variant="primary"
          size="full"
          onPress={handleCreate}
          loading={loading}
        />
      </ScreenContainer>
    </View>
  );
}
