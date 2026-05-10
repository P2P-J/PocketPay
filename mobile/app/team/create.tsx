import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { showToast } from "@/components/ui/Toast";
import { useTeamStore } from "@/store/teamStore";

export default function CreateTeamScreen() {
  const router = useRouter();
  const createTeam = useTeamStore((s) => s.createTeam);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"friend" | "club">("friend");
  const [displayMode, setDisplayMode] = useState<"nickname" | "realName">(
    "nickname"
  );
  const [accountMode, setAccountMode] = useState<"personal" | "team">(
    "personal"
  );
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("error", "모임 이름을 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        displayMode,
        accountMode,
        feeEnabled,
      });
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
    <ScreenContainer scrollable>
      <Header title="모임 만들기" showBack />
      <View className="gap-3 mt-6 mb-6">
        <Input
          label="모임 이름"
          placeholder="모임 이름을 입력해주세요"
          value={name}
          onChangeText={setName}
          maxLength={50}
        />
        <Input
          label="설명 (선택)"
          placeholder="모임에 대한 설명을 입력해주세요"
          value={description}
          onChangeText={setDescription}
          maxLength={200}
        />
      </View>

      <View className="mb-3">
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
          카테고리
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <ToggleChip
            label="친구 모임"
            selected={category === "friend"}
            onPress={() => setCategory("friend")}
          />
          <ToggleChip
            label="동호회·동아리"
            selected={category === "club"}
            onPress={() => setCategory("club")}
          />
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-1">
          멤버 표시 방식
        </Text>
        <Text className="text-xs text-text-secondary mb-2">
          모임원 목록과 거래 작성자에 보일 이름
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <ToggleChip
            label="닉네임"
            selected={displayMode === "nickname"}
            onPress={() => setDisplayMode("nickname")}
          />
          <ToggleChip
            label="실명"
            selected={displayMode === "realName"}
            onPress={() => setDisplayMode("realName")}
          />
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-1">
          더치페이 받을 계좌
        </Text>
        <Text className="text-xs text-text-secondary mb-2">
          송금받을 계좌 (변경 가능)
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <ToggleChip
            label="개인 통장"
            selected={accountMode === "personal"}
            onPress={() => setAccountMode("personal")}
          />
          <ToggleChip
            label="모임 통장"
            selected={accountMode === "team"}
            onPress={() => setAccountMode("team")}
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
          회비 사용
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <ToggleChip
            label="사용 안 함"
            selected={!feeEnabled}
            onPress={() => setFeeEnabled(false)}
          />
          <ToggleChip
            label="사용"
            selected={feeEnabled}
            onPress={() => setFeeEnabled(true)}
          />
        </View>
      </View>

      <Button
        label="만들기"
        variant="primary"
        size="full"
        onPress={handleCreate}
        loading={loading}
      />
    </ScreenContainer>
  );
}
