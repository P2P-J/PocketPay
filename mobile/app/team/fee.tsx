import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, Modal, TextInput,
  ActivityIndicator, Alert, Share, RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Settings, Send, Trash2 } from "lucide-react-native";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { showToast } from "@/components/ui/Toast";
import { feeApi, type FeeStatus, type FeeMember } from "@/api/fee";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { getTeamId } from "@/types/team";

export default function FeeScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currentTeam = useTeamStore((s) => s.currentTeam);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<FeeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 납부 기록 모달
  const [payModal, setPayModal] = useState<{ visible: boolean; member: FeeMember | null }>({ visible: false, member: null });
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // 회비 규칙 설정 모달
  const [ruleModal, setRuleModal] = useState(false);
  const [ruleAmount, setRuleAmount] = useState("");
  const [ruleDueDay, setRuleDueDay] = useState("");
  const [ruleLoading, setRuleLoading] = useState(false);

  const isOwner = currentTeam?.members?.some((m: any) => {
    const memberId = typeof m.user === "string" ? m.user : m.user?._id;
    return memberId === (user?.id || user?._id) && m.role === "owner";
  });

  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await feeApi.getStatus(teamId, year, month);
      setData(res.data);
    } catch {
      showToast("error", "회비 현황을 불러올 수 없습니다");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId, year, month]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [year, month]);

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    else if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  // 납부 기록
  const handleRecordPayment = async () => {
    if (!payModal.member || !teamId) return;
    const amount = payAmount.trim() ? parseInt(payAmount.replace(/,/g, "")) : (data?.feeAmount ?? 0);
    if (isNaN(amount) || amount < 0) {
      showToast("error", "올바른 금액을 입력해주세요");
      return;
    }
    setPayLoading(true);
    try {
      await feeApi.recordPayment(teamId, {
        userId: payModal.member.userId,
        year,
        month,
        amount,
        note: payNote.trim(),
      });
      showToast("success", "납부 기록 완료", `${payModal.member.name}님 ₩${amount.toLocaleString()}`);
      setPayModal({ visible: false, member: null });
      setPayAmount("");
      setPayNote("");
      loadData();
    } catch {
      showToast("error", "납부 기록 실패");
    } finally {
      setPayLoading(false);
    }
  };

  // 납부 취소
  const handleDeletePayment = (member: FeeMember) => {
    if (!member.payment) return;
    Alert.alert("납부 취소", `${member.name}님의 납부 기록을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await feeApi.deletePayment(teamId!, member.payment!.id);
            showToast("success", "납부 기록 삭제됨");
            loadData();
          } catch {
            showToast("error", "삭제 실패");
          }
        },
      },
    ]);
  };

  // 개별 독촉
  const handleRemind = async (member: FeeMember) => {
    const feeAmount = data?.feeAmount ?? 0;
    const msg = `[작은 모임] ${member.name}님, ${year}년 ${month}월 회비(₩${feeAmount.toLocaleString()})를 아직 납부하지 않으셨어요!\n\n앱에서 납부 현황을 확인해주세요 🙏`;
    try {
      await Share.share({ message: msg });
    } catch { }
  };

  // 전체 미납자 독촉
  const handleRemindAll = async () => {
    if (!data) return;
    const unpaid = data.members.filter((m) => !m.payment);
    if (unpaid.length === 0) {
      showToast("info", "모두 납부 완료했어요 🎉");
      return;
    }
    const names = unpaid.map((m) => m.name).join(", ");
    const feeAmount = data.feeAmount;
    const msg = `[작은 모임] ${year}년 ${month}월 회비 납부 안내\n\n아직 납부하지 않은 멤버: ${names}\n납부 금액: ₩${feeAmount.toLocaleString()}\n\n앱에서 납부 현황을 확인해주세요 🙏`;
    try {
      await Share.share({ message: msg });
    } catch { }
  };

  // 회비 규칙 저장
  const handleSaveRule = async () => {
    if (!teamId) return;
    const amount = parseInt(ruleAmount.replace(/,/g, ""));
    const dueDay = parseInt(ruleDueDay);
    if (isNaN(amount) || amount < 0) {
      showToast("error", "올바른 금액을 입력해주세요");
      return;
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      showToast("error", "납부일은 1~31 사이로 입력해주세요");
      return;
    }
    setRuleLoading(true);
    try {
      await feeApi.updateFeeRule(teamId, { feeAmount: amount, feeDueDay: dueDay });
      showToast("success", "회비 규칙이 저장되었습니다");
      setRuleModal(false);
      loadData();
    } catch {
      showToast("error", "저장 실패");
    } finally {
      setRuleLoading(false);
    }
  };

  const openPayModal = (member: FeeMember) => {
    setPayAmount(data?.feeAmount ? String(data.feeAmount) : "");
    setPayNote("");
    setPayModal({ visible: true, member });
  };

  const openRuleModal = () => {
    setRuleAmount(String(data?.feeAmount ?? 0));
    setRuleDueDay(String(data?.feeDueDay ?? 1));
    setRuleModal(true);
  };

  const paidRate = data ? Math.round((data.paidCount / Math.max(data.totalCount, 1)) * 100) : 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Header
        title="회비 현황"
        showBack
        rightAction={
          isOwner ? (
            <Pressable onPress={openRuleModal} className="p-2">
              <Settings size={20} color="#8B95A1" />
            </Pressable>
          ) : undefined
        }
      />

      {/* 월 네비게이터 */}
      <View className="flex-row items-center justify-center px-screen-x py-3 gap-4">
        <Pressable onPress={() => changeMonth(-1)} className="p-2">
          <ChevronLeft size={22} color="#191F28" />
        </Pressable>
        <Text className="text-section font-pretendard-semibold text-text-primary">
          {year}년 {month}월
        </Text>
        <Pressable onPress={() => changeMonth(1)} className="p-2">
          <ChevronRight size={22} color="#191F28" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3DD598" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-screen-x"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {/* 요약 카드 */}
          <Card variant="elevated" className="mb-4">
            {/* 회비 규칙 */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sub text-text-secondary">
                월 회비{" "}
                <Text className="font-pretendard-bold text-text-primary">
                  {data?.feeAmount ? `₩${data.feeAmount.toLocaleString()}` : "미설정"}
                </Text>
                {data?.feeDueDay ? ` · 매월 ${data.feeDueDay}일` : ""}
              </Text>
              {isOwner && !data?.feeAmount && (
                <Pressable onPress={openRuleModal}>
                  <Text className="text-sub text-brand font-pretendard-semibold">설정하기</Text>
                </Pressable>
              )}
            </View>

            {/* 납부율 바 */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption text-text-secondary">
                납부 현황
              </Text>
              <Text className="text-caption font-pretendard-semibold text-text-primary">
                {data?.paidCount}/{data?.totalCount}명 ({paidRate}%)
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#F2F4F6", borderRadius: 4, overflow: "hidden" }}>
              <View
                style={{
                  height: 8,
                  width: `${paidRate}%`,
                  backgroundColor: paidRate === 100 ? "#3DD598" : paidRate >= 50 ? "#3182F6" : "#FF8C42",
                  borderRadius: 4,
                }}
              />
            </View>
          </Card>

          {/* 멤버 납부 목록 */}
          <Text className="text-section font-pretendard-semibold text-text-primary mb-3">
            멤버별 납부 현황
          </Text>

          {data?.members.map((member, i) => (
            <View
              key={member.userId}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                marginBottom: 8,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* 아바타 */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: member.payment ? "#E8FAF2" : "#F2F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Pretendard-Bold",
                    color: member.payment ? "#3DD598" : "#8B95A1",
                  }}
                >
                  {member.name.charAt(0)}
                </Text>
              </View>

              {/* 이름 + 상태 */}
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center gap-1">
                  <Text className="text-body font-pretendard-semibold text-text-primary">
                    {member.name}
                  </Text>
                  {member.role === "owner" && (
                    <Text className="text-caption text-brand">(팀장)</Text>
                  )}
                </View>
                {member.payment ? (
                  <Text className="text-sub text-text-secondary mt-0.5">
                    ₩{member.payment.amount.toLocaleString()} ·{" "}
                    {new Date(member.payment.paidAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 납부
                    {member.payment.note ? ` · ${member.payment.note}` : ""}
                  </Text>
                ) : (
                  <Text className="text-sub text-expense mt-0.5">미납</Text>
                )}
              </View>

              {/* 오른쪽 액션 */}
              <View className="flex-row items-center gap-2">
                {member.payment ? (
                  <>
                    <CheckCircle2 size={22} color="#3DD598" />
                    {isOwner && (
                      <Pressable onPress={() => handleDeletePayment(member)} className="p-1">
                        <Trash2 size={16} color="#B0B8C1" />
                      </Pressable>
                    )}
                  </>
                ) : (
                  <>
                    <Circle size={22} color="#E5E8EB" />
                    {isOwner && (
                      <>
                        <Pressable
                          onPress={() => handleRemind(member)}
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            backgroundColor: "#F2F4F6",
                          }}
                        >
                          <Send size={14} color="#8B95A1" />
                        </Pressable>
                        <Pressable
                          onPress={() => openPayModal(member)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: "#3DD598",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontFamily: "Pretendard-SemiBold", color: "#FFFFFF" }}>
                            납부
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          ))}

          {/* 전체 독촉 버튼 */}
          {isOwner && (data?.members.some((m) => !m.payment) ?? false) && (
            <Pressable
              onPress={handleRemindAll}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 13,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E8EB",
                marginTop: 4,
                marginBottom: 32,
              }}
            >
              <Send size={16} color="#8B95A1" />
              <Text style={{ fontSize: 14, fontFamily: "Pretendard-SemiBold", color: "#8B95A1" }}>
                미납자 전체 독촉하기
              </Text>
            </Pressable>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* 납부 기록 모달 */}
      <Modal visible={payModal.visible} transparent animationType="slide" onRequestClose={() => setPayModal({ visible: false, member: null })}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setPayModal({ visible: false, member: null })}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: "Pretendard-Bold", color: "#191F28", marginBottom: 4 }}>
              납부 기록
            </Text>
            <Text style={{ fontSize: 13, color: "#8B95A1", marginBottom: 20 }}>
              {payModal.member?.name}님 · {year}년 {month}월
            </Text>

            {/* 금액 */}
            <Text style={{ fontSize: 12, fontFamily: "Pretendard-SemiBold", color: "#8B95A1", marginBottom: 6 }}>
              납부 금액
            </Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder={`₩${(data?.feeAmount ?? 0).toLocaleString()}`}
              style={{
                borderWidth: 1,
                borderColor: "#E5E8EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: "Pretendard",
                color: "#191F28",
                marginBottom: 14,
              }}
            />

            {/* 메모 */}
            <Text style={{ fontSize: 12, fontFamily: "Pretendard-SemiBold", color: "#8B95A1", marginBottom: 6 }}>
              메모 (선택)
            </Text>
            <TextInput
              value={payNote}
              onChangeText={setPayNote}
              placeholder="예: 현금 납부"
              style={{
                borderWidth: 1,
                borderColor: "#E5E8EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                fontFamily: "Pretendard",
                color: "#191F28",
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleRecordPayment}
              disabled={payLoading}
              style={{
                backgroundColor: "#3DD598",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {payLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 15, fontFamily: "Pretendard-SemiBold", color: "#FFFFFF" }}>
                  납부 완료로 기록하기
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 회비 규칙 설정 모달 */}
      <Modal visible={ruleModal} transparent animationType="slide" onRequestClose={() => setRuleModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setRuleModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: "Pretendard-Bold", color: "#191F28", marginBottom: 20 }}>
              회비 규칙 설정
            </Text>

            <Text style={{ fontSize: 12, fontFamily: "Pretendard-SemiBold", color: "#8B95A1", marginBottom: 6 }}>
              월 회비 금액
            </Text>
            <TextInput
              value={ruleAmount}
              onChangeText={setRuleAmount}
              keyboardType="numeric"
              placeholder="30000"
              style={{
                borderWidth: 1,
                borderColor: "#E5E8EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: "Pretendard",
                color: "#191F28",
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 12, fontFamily: "Pretendard-SemiBold", color: "#8B95A1", marginBottom: 6 }}>
              납부일 (매월 N일)
            </Text>
            <TextInput
              value={ruleDueDay}
              onChangeText={setRuleDueDay}
              keyboardType="numeric"
              placeholder="1"
              style={{
                borderWidth: 1,
                borderColor: "#E5E8EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: "Pretendard",
                color: "#191F28",
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleSaveRule}
              disabled={ruleLoading}
              style={{
                backgroundColor: "#3DD598",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {ruleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 15, fontFamily: "Pretendard-SemiBold", color: "#FFFFFF" }}>
                  저장하기
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
