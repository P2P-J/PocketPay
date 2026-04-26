import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { Download } from "lucide-react-native";
import { transformCloudinaryUrl } from "@/utils/cloudinary";
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

  const [type, setType] = useState<"expense" | "income">("expense");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("etc");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showReceiptFull, setShowReceiptFull] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const handleSaveReceipt = async () => {
    if (!receiptUrl || savingReceipt) return;
    setSavingReceipt(true);
    try {
      // 1. 권한 요청 (iOS Photos 라이브러리 추가 권한)
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(
        true // writeOnly: 추가 전용
      );
      if (status !== "granted") {
        if (canAskAgain) {
          showToast("error", "사진 저장 권한이 필요해요");
        } else {
          Alert.alert(
            "권한 필요",
            "설정 → 작은 모임 → 사진 → '사진 추가만' 이상 허용해주세요.",
          );
        }
        return;
      }

      // 2. Cloudinary 원본 URL 다운로드 (변환 URL 아닌 원본)
      const ext = (receiptUrl.match(/\.(jpg|jpeg|png|webp|heic)(?:$|\?)/i)?.[1] || "jpg").toLowerCase();
      const localUri = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${ext}`;
      const downloaded = await FileSystem.downloadAsync(receiptUrl, localUri);
      if (downloaded.status !== 200) {
        throw new Error(`download status ${downloaded.status}`);
      }

      // 3. 사진 앨범에 저장
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      showToast("success", "영수증이 사진 앨범에 저장되었어요");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "다시 시도해주세요";
      showToast("error", "영수증 저장에 실패했어요", detail);
      if (__DEV__) console.error("[handleSaveReceipt]", err);
    } finally {
      setSavingReceipt(false);
    }
  };

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
      setReceiptUrl(t.receiptUrl || null);
      setInitialLoading(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "다시 시도해주세요";
      showToast("error", "거래 정보를 불러올 수 없어요", detail);
      if (__DEV__) console.error("[loadTransaction] id=", id, "error:", err);
      router.back();
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

        {/* 영수증 이미지 */}
        {receiptUrl && (
          <View className="mb-6">
            <Text className="text-sub font-pretendard-medium text-text-secondary mb-2">
              영수증
            </Text>
            <Pressable onPress={() => setShowReceiptFull(true)}>
              <Image
                source={{ uri: transformCloudinaryUrl(receiptUrl, 800) ?? receiptUrl }}
                className="w-full h-60 rounded-lg bg-gray-100"
                resizeMode="cover"
              />
            </Pressable>
          </View>
        )}

        {/* 더치페이 진입 버튼 (지출 거래만) */}
        {type === "expense" && amount && (
          <Button
            label="이 거래로 더치페이"
            variant="outline"
            size="full"
            onPress={() => {
              const raw = amount.replace(/,/g, "");
              router.push(`/dutch?amount=${encodeURIComponent(raw)}`);
            }}
            className="mb-3"
          />
        )}

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

      {/* 영수증 전체화면 뷰 */}
      <Modal
        visible={showReceiptFull}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceiptFull(false)}
      >
        <View className="flex-1 bg-black/95">
          {/* 이미지 영역 — 탭하면 닫힘 */}
          <Pressable
            onPress={() => setShowReceiptFull(false)}
            className="flex-1 items-center justify-center"
          >
            {receiptUrl && (
              <Image
                source={{ uri: transformCloudinaryUrl(receiptUrl, 1600) ?? receiptUrl }}
                className="w-full h-full"
                resizeMode="contain"
              />
            )}
          </Pressable>

          {/* 상단 액션 바 (저장 + 닫기) */}
          <View
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Pressable
              onPress={() => setShowReceiptFull(false)}
              hitSlop={12}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Pretendard-SemiBold" }}>
                닫기
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveReceipt}
              disabled={savingReceipt}
              hitSlop={12}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                opacity: savingReceipt ? 0.6 : 1,
              }}
            >
              {savingReceipt ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Download size={16} color="#FFFFFF" />
              )}
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Pretendard-SemiBold" }}>
                {savingReceipt ? "저장 중..." : "사진 저장"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
