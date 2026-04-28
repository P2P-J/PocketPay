import { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/constants/terms";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

interface Agreement {
  id: string;
  label: string;
  required: boolean;
  content: string;
}

const AGREEMENTS: Agreement[] = [
  {
    id: "terms",
    label: "서비스 이용약관",
    required: true,
    content: TERMS_OF_SERVICE,
  },
  {
    id: "privacy",
    label: "개인정보 수집 및 이용",
    required: true,
    content: PRIVACY_POLICY,
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신",
    required: false,
    content: "작은 모임의 새로운 기능, 이벤트, 혜택 등의 정보를 푸시 알림 또는 이메일로 받아보실 수 있습니다. 동의하지 않아도 서비스를 이용할 수 있습니다.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const allChecked = AGREEMENTS.every((a) => checked[a.id]);
  const requiredChecked = AGREEMENTS.filter((a) => a.required).every(
    (a) => checked[a.id]
  );

  const toggleAll = () => {
    if (allChecked) {
      setChecked({});
    } else {
      const all: Record<string, boolean> = {};
      AGREEMENTS.forEach((a) => (all[a.id] = true));
      setChecked(all);
    }
  };

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNext = () => {
    router.push("/(auth)/signup");
  };

  return (
    <ScreenContainer scrollable={false} withTabBar={false} withKeyboard={false}>
      <Header title="약관 동의" showBack />

      <ScrollView className="flex-1">
        {/* 전체 동의 */}
        <Pressable
          onPress={toggleAll}
          className="flex-row items-center py-4 mb-2"
        >
          <View
            className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
              allChecked ? "bg-brand" : "bg-card border border-divider"
            }`}
          >
            {allChecked && <Check size={14} color="#FFFFFF" />}
          </View>
          <Text className="text-body font-pretendard-bold text-text-primary flex-1">
            전체 동의하기
          </Text>
        </Pressable>

        <View className="h-px bg-divider mb-2" />

        {/* 개별 동의 항목 */}
        {AGREEMENTS.map((agreement) => (
          <View key={agreement.id} className="flex-row items-center py-3">
            <Pressable
              onPress={() => toggle(agreement.id)}
              className="flex-row items-center flex-1"
            >
              <View
                className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                  checked[agreement.id]
                    ? "bg-brand"
                    : "bg-card border border-divider"
                }`}
              >
                {checked[agreement.id] && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text className="text-body font-pretendard text-text-primary flex-1">
                <Text className={agreement.required ? "text-expense" : "text-text-disabled"}>
                  {agreement.required ? "[필수] " : "[선택] "}
                </Text>
                {agreement.label}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setModalContent({
                  title: agreement.label,
                  content: agreement.content,
                })
              }
              className="p-2"
            >
              <ChevronRight size={16} color="#B0B8C1" />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* 다음 버튼 */}
      <View
        className="py-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label="동의하고 계속하기"
          variant="primary"
          size="full"
          disabled={!requiredChecked}
          onPress={handleNext}
        />
      </View>

      {/* 약관 상세 모달 */}
      <Modal
        visible={!!modalContent}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-screen-x py-4">
            <Text className="text-section font-pretendard-bold text-text-primary">
              {modalContent?.title}
            </Text>
            <Pressable onPress={() => setModalContent(null)}>
              <Text className="text-brand font-pretendard-semibold text-body">
                닫기
              </Text>
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-screen-x">
            <Text className="text-sub font-pretendard text-text-secondary leading-6 mb-8">
              {modalContent?.content}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
