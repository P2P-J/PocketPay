import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Minus, Plus } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useTeamStore } from "@/store/teamStore";

type SplitMode = "equal" | "custom";

type Participant = {
  userId: string;
  name: string;
  role: string;
  selected: boolean;
  customAmount: string;
};

// 균등 분할 계산: 나머지 원은 첫 번째 사람에게 배정
function calcEqualSplit(total: number, participants: Participant[]) {
  const selected = participants.filter((p) => p.selected);
  const n = selected.length;
  if (n === 0 || total <= 0) return selected.map((p) => ({ ...p, result: 0 }));
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return selected.map((p, i) => ({
    ...p,
    result: i === 0 ? base + remainder : base,
  }));
}

export default function DutchScreen() {
  const insets = useSafeAreaInsets();
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const { amount: prefillAmount } = useLocalSearchParams<{ amount?: string }>();

  // 거래 상세에서 진입 시 ?amount=15000 형태로 받아 초기값 설정
  const initialTotal = useMemo(() => {
    if (!prefillAmount) return "";
    const n = Number(prefillAmount);
    return Number.isFinite(n) && n > 0 ? n.toLocaleString("ko-KR") : "";
  }, [prefillAmount]);

  const [totalInput, setTotalInput] = useState(initialTotal);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [participants, setParticipants] = useState<Participant[]>([]);
  // 팀 없을 때 수동 인원 수
  const [manualCount, setManualCount] = useState(2);

  // 팀 멤버 초기 로드 — 이미 로드된 경우 재초기화 방지 (체크박스 선택 유지)
  useEffect(() => {
    if (participants.length > 0) return;
    if (currentTeam?.members && currentTeam.members.length > 0) {
      const loaded: Participant[] = currentTeam.members.map((m) => {
        const u = typeof m.user === "string" ? null : m.user;
        return {
          userId: u?._id || (m.user as string),
          name: u?.name || "알 수 없음",
          role: m.role,
          selected: true,
          customAmount: "",
        };
      });
      setParticipants(loaded);
    }
  }, [currentTeam]);

  const total = parseInt(totalInput.replace(/,/g, ""), 10) || 0;
  const hasTeam = participants.length > 0;
  const selectedParticipants = participants.filter((p) => p.selected);
  const selectedCount = hasTeam ? selectedParticipants.length : manualCount;

  // 균등 분할 결과
  const equalResults = useMemo(
    () => calcEqualSplit(total, participants),
    [total, participants]
  );

  // 직접 입력 합계 — selectedParticipants는 매 렌더 새 배열이므로 participants를 의존성으로
  const customTotal = useMemo(
    () =>
      participants
        .filter((p) => p.selected)
        .reduce(
          (sum, p) => sum + (parseInt(p.customAmount.replace(/,/g, ""), 10) || 0),
          0
        ),
    [participants]
  );
  const customDiff = customTotal - total;

  // 균등 금액 (팀 없을 때)
  const equalPerPerson =
    total > 0 && selectedCount > 0 ? Math.floor(total / selectedCount) : 0;
  const equalRemainder =
    total > 0 && selectedCount > 0 ? total - equalPerPerson * selectedCount : 0;

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === userId ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const toggleAll = () => {
    const allSelected = participants.every((p) => p.selected);
    setParticipants((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
  };

  const setCustomAmount = (userId: string, value: string) => {
    const numeric = value.replace(/[^0-9]/g, "");
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, customAmount: numeric } : p))
    );
  };

  const formatAmount = (n: number) =>
    n > 0 ? `₩${n.toLocaleString("ko-KR")}` : "₩0";

  const isValid =
    total > 0 &&
    selectedCount > 0 &&
    (splitMode === "equal" || customDiff === 0);

  // 공유 텍스트 생성
  const buildShareText = () => {
    const lines: string[] = [
      `[작은 모임] 더치페이 계산 결과`,
      `총액 ${formatAmount(total)} / ${selectedCount}명`,
      "",
    ];

    if (hasTeam) {
      if (splitMode === "equal") {
        equalResults.forEach((p) => {
          lines.push(`• ${p.name}  ${formatAmount(p.result)}`);
        });
      } else {
        selectedParticipants.forEach((p) => {
          const amt = parseInt(p.customAmount.replace(/,/g, ""), 10) || 0;
          lines.push(`• ${p.name}  ${formatAmount(amt)}`);
        });
      }
    } else {
      const base = equalPerPerson;
      const rem = equalRemainder;
      for (let i = 0; i < manualCount; i++) {
        lines.push(`• ${i + 1}번  ${formatAmount(i === 0 ? base + rem : base)}`);
      }
    }

    lines.push("", "작은 모임으로 계산했어요 🧮");
    return lines.join("\n");
  };

  const handleShare = async () => {
    if (!isValid) {
      if (total <= 0) return showToast("error", "금액을 입력해주세요");
      if (selectedCount === 0) return showToast("error", "참여자를 선택해주세요");
      if (splitMode === "custom" && customDiff !== 0)
        return showToast("error", `합계가 ${customDiff > 0 ? "초과" : "부족"}합니다`);
      return;
    }
    try {
      await Share.share({ message: buildShareText() });
    } catch {}
  };

  const handleCopy = async () => {
    if (!isValid) {
      if (total <= 0) return showToast("error", "금액을 입력해주세요");
      if (selectedCount === 0) return showToast("error", "참여자를 선택해주세요");
      return;
    }
    try {
      await Share.share({ message: buildShareText() });
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <Header title="더치페이 계산기" showBack />

        <ScrollView
          className="flex-1 px-screen-x"
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 총 금액 ── */}
          <View className="mt-4 mb-3">
            <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
              총 금액
            </Text>
            <Card variant="elevated">
              <View className="flex-row items-center">
                <Text className="text-section font-pretendard-semibold text-text-secondary mr-2">
                  ₩
                </Text>
                <TextInput
                  value={totalInput}
                  onChangeText={(v) => {
                    const numeric = v.replace(/[^0-9]/g, "");
                    const formatted =
                      numeric ? parseInt(numeric, 10).toLocaleString("ko-KR") : "";
                    setTotalInput(formatted);
                  }}
                  placeholder="0"
                  placeholderTextColor="#B0B8C1"
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    fontSize: 24,
                    fontFamily: "Pretendard-Bold",
                    color: "#191F28",
                  }}
                />
                {totalInput.length > 0 && (
                  <Pressable onPress={() => setTotalInput("")} className="p-2">
                    <Text className="text-sub text-text-secondary">✕</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          </View>

          {/* ── 참여자 ── */}
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sub font-pretendard-semibold text-text-secondary">
                참여자
              </Text>
              {hasTeam && (
                <Pressable onPress={toggleAll}>
                  <Text className="text-sub text-brand font-pretendard-semibold">
                    {participants.every((p) => p.selected) ? "전체 해제" : "전체 선택"}
                  </Text>
                </Pressable>
              )}
            </View>

            {hasTeam ? (
              <Card variant="elevated">
                {participants.map((p, i) => (
                  <Pressable
                    key={p.userId}
                    onPress={() => {
                      // 직접 입력 모드에서 선택된 항목은 탭해도 해제 안 됨 (TextInput 포커스 보호)
                      if (splitMode === "custom" && p.selected) return;
                      toggleParticipant(p.userId);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: i < participants.length - 1 ? 1 : 0,
                      borderBottomColor: "#F2F4F6",
                    }}
                  >
                    {/* 체크박스 */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: p.selected ? 0 : 1.5,
                        borderColor: "#D1D6DB",
                        backgroundColor: p.selected ? "#3DD598" : "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {p.selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>

                    {/* 아바타 */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: p.selected ? "#E8FAF2" : "#F2F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: "Pretendard-Bold",
                          color: p.selected ? "#3DD598" : "#B0B8C1",
                        }}
                      >
                        {p.name.charAt(0)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: "Pretendard-SemiBold",
                          color: p.selected ? "#191F28" : "#B0B8C1",
                        }}
                      >
                        {p.name}
                        {p.role === "owner" && (
                          <Text
                            style={{ fontSize: 12, color: "#3DD598", fontFamily: "Pretendard-Regular" }}
                          >
                            {" "}팀장
                          </Text>
                        )}
                      </Text>
                    </View>

                    {/* 직접 입력 모드: 금액 입력 칸 */}
                    {splitMode === "custom" && p.selected && (
                      <TextInput
                        value={p.customAmount}
                        onChangeText={(v) => setCustomAmount(p.userId, v)}
                        placeholder="0"
                        placeholderTextColor="#B0B8C1"
                        keyboardType="number-pad"
                        style={{
                          width: 90,
                          textAlign: "right",
                          fontSize: 15,
                          fontFamily: "Pretendard-SemiBold",
                          color: "#191F28",
                          borderBottomWidth: 1,
                          borderBottomColor: "#E5E8EB",
                          paddingBottom: 2,
                        }}
                      />
                    )}
                  </Pressable>
                ))}
              </Card>
            ) : (
              /* 팀 없을 때: 인원 수 조절 */
              <Card variant="elevated">
                <View className="flex-row items-center justify-between">
                  <Text className="text-body text-text-secondary">인원 수</Text>
                  <View className="flex-row items-center gap-4">
                    <Pressable
                      onPress={() => setManualCount((n) => Math.max(1, n - 1))}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#F2F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={18} color="#8B95A1" />
                    </Pressable>
                    <Text className="text-section font-pretendard-bold text-text-primary w-8 text-center">
                      {manualCount}
                    </Text>
                    <Pressable
                      onPress={() => setManualCount((n) => Math.min(30, n + 1))}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#E8FAF2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={18} color="#3DD598" />
                    </Pressable>
                  </View>
                </View>
                <Text className="text-caption text-text-secondary mt-2">
                  모임을 선택하면 멤버가 자동으로 불러와집니다
                </Text>
              </Card>
            )}
          </View>

          {/* ── 분배 방식 ── */}
          <View className="mb-4">
            <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
              분배 방식
            </Text>
            <Card variant="elevated">
              {/* 토글 칩 */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F2F4F6",
                  borderRadius: 10,
                  padding: 3,
                  marginBottom: 16,
                }}
              >
                {(["equal", "custom"] as SplitMode[]).map((mode) => {
                  const disabled = mode === "custom" && !hasTeam;
                  const isActive = splitMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => { if (!disabled) setSplitMode(mode); }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        opacity: disabled ? 0.4 : 1,
                        backgroundColor: isActive ? "#FFFFFF" : "transparent",
                        shadowColor: isActive ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isActive ? 0.08 : 0,
                        shadowRadius: 2,
                        elevation: isActive ? 2 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Pretendard-SemiBold",
                          color: isActive ? "#191F28" : "#8B95A1",
                        }}
                      >
                        {mode === "equal" ? "균등 분할" : "직접 입력"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 결과 */}
              {total <= 0 ? (
                <View className="items-center py-4">
                  <Text className="text-sub text-text-secondary">
                    금액을 입력하면 결과가 표시됩니다
                  </Text>
                </View>
              ) : selectedCount === 0 ? (
                <View className="items-center py-4">
                  <Text className="text-sub text-text-secondary">
                    참여자를 선택해주세요
                  </Text>
                </View>
              ) : splitMode === "equal" ? (
                /* 균등 분할 결과 */
                <View>
                  <View
                    style={{
                      backgroundColor: "#F8FDF9",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text className="text-caption text-text-secondary mb-1">
                      1인당 금액
                    </Text>
                    <Text
                      style={{
                        fontSize: 28,
                        fontFamily: "Pretendard-Bold",
                        color: "#3DD598",
                      }}
                    >
                      {formatAmount(equalPerPerson)}
                    </Text>
                    {equalRemainder > 0 && (
                      <Text className="text-caption text-text-secondary mt-1">
                        첫 번째 참여자 +{equalRemainder}원
                      </Text>
                    )}
                  </View>

                  {hasTeam
                    ? equalResults.map((p, i) => (
                        <View
                          key={p.userId}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 8,
                            borderBottomWidth: i < equalResults.length - 1 ? 1 : 0,
                            borderBottomColor: "#F2F4F6",
                          }}
                        >
                          <View className="flex-row items-center gap-2">
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: "#E8FAF2",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontFamily: "Pretendard-Bold",
                                  color: "#3DD598",
                                }}
                              >
                                {p.name.charAt(0)}
                              </Text>
                            </View>
                            <Text className="text-body text-text-primary">
                              {p.name}
                            </Text>
                          </View>
                          <Text className="text-body font-pretendard-semibold text-text-primary">
                            {formatAmount(p.result)}
                          </Text>
                        </View>
                      ))
                    : Array.from({ length: manualCount }, (_, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 8,
                            borderBottomWidth: i < manualCount - 1 ? 1 : 0,
                            borderBottomColor: "#F2F4F6",
                          }}
                        >
                          <Text className="text-body text-text-primary">
                            {i + 1}번째
                          </Text>
                          <Text className="text-body font-pretendard-semibold text-text-primary">
                            {formatAmount(i === 0 ? equalPerPerson + equalRemainder : equalPerPerson)}
                          </Text>
                        </View>
                      ))}
                </View>
              ) : (
                /* 직접 입력 결과 */
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: customDiff === 0 ? "#F8FDF9" : "#FFF5F5",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text className="text-sub text-text-secondary">입력 합계</Text>
                    <View className="items-end">
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: "Pretendard-Bold",
                          color: customDiff === 0 ? "#3DD598" : "#F04452",
                        }}
                      >
                        {formatAmount(customTotal)}
                      </Text>
                      {customDiff !== 0 && (
                        <Text className="text-caption" style={{ color: "#F04452" }}>
                          {customDiff > 0 ? `+${customDiff.toLocaleString()}원 초과` : `${Math.abs(customDiff).toLocaleString()}원 부족`}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-caption text-text-secondary">
                    위 참여자 목록에서 각자 금액을 입력하세요
                  </Text>
                </View>
              )}
            </Card>
          </View>

          {/* 하단 여백 */}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── 하단 버튼 ── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 12,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F2F4F6",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Button
            label="결과 복사"
            variant="outline"
            size="md"
            onPress={handleCopy}
            disabled={!isValid}
            className="flex-1"
          />
          <Button
            label="공유하기"
            variant="primary"
            size="md"
            onPress={handleShare}
            disabled={!isValid}
            className="flex-1"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
