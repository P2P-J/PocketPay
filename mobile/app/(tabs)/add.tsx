import { useState, useRef, useEffect } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { showToast } from "@/components/ui/Toast";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useTeamStore } from "@/store/teamStore";
import { ocrApi } from "@/api/ocr";
import {
  TRANSACTION_TYPE,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionType,
} from "@/constants/categories";

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createTransaction = useTeamStore((s) => s.createTransaction);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const merchantRef = useRef<RNTextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // 화면 진입 시 스크롤 상단 + 상점명 포커스
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => merchantRef.current?.focus(), 300);
  }, []);

  const [type, setType] = useState<TransactionType>(TRANSACTION_TYPE.EXPENSE);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("etc");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const categories =
    type === TRANSACTION_TYPE.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const processOcr = async (uri: string) => {
    if (__DEV__) console.log("[OCR] 파일 URI:", uri);
    setOcrLoading(true);
    try {
      const res = await ocrApi.analyze(uri);
      if (__DEV__) console.log("[OCR] 응답:", JSON.stringify(res));
      const data = res.data;
      if (data.storeInfo) setMerchant(data.storeInfo);
      if (data.price) setAmount(Number(data.price).toLocaleString("ko-KR"));
      if (data.date) setDate(data.date);
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);
      showToast("success", "영수증 인식 완료");
    } catch (err) {
      if (__DEV__) console.log("[OCR] 에러:", err instanceof Error ? err.message : err);
      showToast("error", "영수증 인식 실패", err instanceof Error ? err.message : "다시 시도해주세요");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcr = () => {
    Alert.alert("영수증 스캔", "영수증을 어떻게 가져올까요?", [
      {
        text: "앨범에서 선택",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await processOcr(result.assets[0].uri);
          }
        },
      },
      {
        text: "카메라로 촬영",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            showToast("error", "카메라 권한이 필요합니다");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await processOcr(result.assets[0].uri);
          }
        },
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    const rawAmount = Number(amount.replace(/,/g, ""));
    if (!amount || rawAmount <= 0) {
      showToast("error", "금액을 입력해주세요");
      return;
    }
    if (!currentTeam) {
      showToast("error", "팀을 먼저 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      await createTransaction({
        merchant,
        type,
        amount: rawAmount,
        category,
        description,
        date,
        receiptUrl: receiptUrl ?? undefined,
      });
      showToast("success", "거래가 추가되었습니다");
      // 폼 초기화 — 날짜는 오늘로 복원 (다음 거래 입력 시 헷갈림 방지)
      setType(TRANSACTION_TYPE.EXPENSE);
      setMerchant("");
      setAmount("");
      setCategory("etc");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setReceiptUrl(null);
      router.back();
    } catch {
      showToast("error", "거래 추가 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View style={{ paddingTop: insets.top }}>
        <Header title="거래 추가" showBack />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-screen-x"
        keyboardShouldPersistTaps="handled"
      >
        {/* 수입/지출 토글 */}
        <View className="flex-row gap-2 my-4">
          <Chip
            label="지출"
            selected={type === TRANSACTION_TYPE.EXPENSE}
            onPress={() => {
              setType(TRANSACTION_TYPE.EXPENSE);
              setCategory("etc");
            }}
          />
          <Chip
            label="수입"
            selected={type === TRANSACTION_TYPE.INCOME}
            onPress={() => {
              setType(TRANSACTION_TYPE.INCOME);
              setCategory("membership");
            }}
          />
        </View>

        {/* OCR 버튼 */}
        <Button
          label={ocrLoading ? "인식 중..." : "영수증 스캔"}
          variant="outline"
          size="full"
          onPress={handleOcr}
          loading={ocrLoading}
          icon={<Camera size={20} color="#8B95A1" />}
        />

        {/* 입력 폼 */}
        <View className="gap-3 mt-4">
          <Input
            ref={merchantRef}
            label="상점명"
            placeholder="상점명을 입력해주세요"
            value={merchant}
            onChangeText={setMerchant}
          />
          <Input
            label="금액"
            placeholder="0"
            value={amount}
            onChangeText={(v) => {
              const nums = v.replace(/[^0-9]/g, "");
              if (nums === "") { setAmount(""); return; }
              const n = Number(nums);
              if (n > 1_000_000_000_000) {
                showToast("info", "최대 1조원까지 입력 가능합니다");
                return;
              }
              setAmount(n.toLocaleString("ko-KR"));
            }}
            keyboardType="numeric"
          />
          <DatePickerInput
            label="날짜"
            value={date}
            onChange={setDate}
          />
          <Input
            label="설명 (선택)"
            placeholder="메모를 입력해주세요"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* 카테고리 선택 */}
        <Text className="text-sub font-pretendard-medium text-text-secondary mt-4 mb-2">
          카테고리
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <Chip
              key={cat.value}
              label={`${cat.emoji} ${cat.label}`}
              selected={category === cat.value}
              onPress={() => setCategory(cat.value)}
            />
          ))}
        </View>

        {/* 저장 버튼 */}
        <Button
          label="저장"
          variant="primary"
          size="full"
          onPress={handleSubmit}
          loading={loading}
          className="mb-8"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
