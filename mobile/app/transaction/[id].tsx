import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { showToast } from "@/components/ui/Toast";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useTeamStore } from "@/store/teamStore";
import { dealApi } from "@/api/deal";
import { dealToTransaction } from "@/types/transaction";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/constants/categories";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const updateTransaction = useTeamStore((s) => s.updateTransaction);
  const deleteTransaction = useTeamStore((s) => s.deleteTransaction);

  const [type, setType] = useState("expense");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("etc");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const categories =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (id) loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    try {
      const res = await dealApi.getDetail(id!);
      const t = dealToTransaction(res.data);
      setType(t.type);
      setMerchant(t.merchant);
      setAmount(t.amount ? Number(t.amount).toLocaleString("ko-KR") : "");
      setCategory(t.category);
      setDescription(t.description);
      setDate(t.date?.split("T")[0] || "");
    } catch {
      showToast("error", "거래 정보를 불러올 수 없습니다");
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    const rawAmount = Number(amount.replace(/,/g, ""));
    if (!amount || rawAmount <= 0) {
      showToast("error", "금액을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      await updateTransaction(id!, {
        storeInfo: merchant,
        division: type === "income" ? "수입" : "지출",
        price: rawAmount,
        category,
        description,
        date,
      });
      showToast("success", "거래가 수정되었습니다");
      router.back();
    } catch {
      showToast("error", "거래 수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("거래 삭제", "이 거래를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(id!);
            showToast("success", "거래가 삭제되었습니다");
            router.back();
          } catch {
            showToast("error", "거래 삭제 실패");
          }
        },
      },
    ]);
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View style={{ paddingTop: insets.top }}>
        <Header title="거래 수정" showBack />
      </View>

      <ScrollView
        className="flex-1 px-screen-x"
        keyboardShouldPersistTaps="handled"
      >
        {/* 수입/지출 토글 */}
        <View className="flex-row gap-2 my-4">
          <Chip
            label="지출"
            selected={type === "expense"}
            onPress={() => {
              setType("expense");
              setCategory("etc");
            }}
          />
          <Chip
            label="수입"
            selected={type === "income"}
            onPress={() => {
              setType("income");
              setCategory("membership");
            }}
          />
        </View>

        {/* 입력 폼 */}
        <View className="gap-3">
          <Input
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

        {/* 저장/삭제 버튼 */}
        <Button
          label="저장"
          variant="primary"
          size="full"
          onPress={handleSave}
          loading={loading}
          className="mb-3"
        />
        <Button
          label="거래 삭제"
          variant="danger"
          size="full"
          onPress={handleDelete}
          className="mb-8"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
