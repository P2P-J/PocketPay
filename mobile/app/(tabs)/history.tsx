import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useTeamStore } from "@/store/teamStore";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareCard } from "@/components/ShareCard";
import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import { getTeamId } from "@/types/team";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sharing, setSharing] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const cardRef = useRef<View>(null);

  const currentTeam = useTeamStore((s) => s.currentTeam);
  const transactions = useTeamStore((s) => s.transactions);
  const fetchTransactions = useTeamStore((s) => s.fetchTransactions);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && currentTeam) {
      fetchTransactions(getTeamId(currentTeam), year, month);
    }
  }, [isFocused, currentTeam]);

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    else if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    if (currentTeam) fetchTransactions(getTeamId(currentTeam), y, m);
  };

  const { income, expense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const t of transactions) {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return { income: inc, expense: exp };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "income") continue;
      const cat = t.category || "etc";
      map[cat] = (map[cat] || 0) + t.amount;
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        category: cat,
        total,
        percent: expense > 0 ? Math.round((total / expense) * 100) : 0,
      }));
  }, [transactions, expense]);

  const handleShare = async () => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
      return;
    }
    setShowSharePreview(true);
  };

  const captureAndShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
      });
      setShowSharePreview(false);
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `${currentTeam?.name} ${year}년 ${month}월 정산 카드`,
      });
    } catch {
      Alert.alert("오류", "카드를 공유하는 중 문제가 발생했습니다.");
    } finally {
      setSharing(false);
    }
  };

  const fmt = (n: number) => `₩${n.toLocaleString()}`;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* 월 네비게이터 */}
      <View className="flex-row items-center justify-between px-screen-x py-4">
        <Pressable onPress={() => changeMonth(-1)} className="p-2">
          <ChevronLeft size={24} color="#191F28" />
        </Pressable>
        <Text className="text-section font-pretendard-semibold text-text-primary">
          {year}년 {month}월
        </Text>
        <Pressable onPress={() => changeMonth(1)} className="p-2">
          <ChevronRight size={24} color="#191F28" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-screen-x">
        {/* 수입/지출 총계 */}
        <View className="flex-row gap-2 mb-section-gap">
          <Card variant="default" className="flex-1">
            <Text className="text-caption text-text-secondary mb-1">수입</Text>
            <Text className="text-title font-pretendard-bold text-income">+₩{income.toLocaleString()}</Text>
          </Card>
          <Card variant="default" className="flex-1">
            <Text className="text-caption text-text-secondary mb-1">지출</Text>
            <Text className="text-title font-pretendard-bold text-expense">-₩{expense.toLocaleString()}</Text>
          </Card>
        </View>

        {/* 공유 버튼 */}
        {(income > 0 || expense > 0) && (
          <Pressable
            onPress={handleShare}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#3DD598",
              marginBottom: 20,
            }}
          >
            <Share2 size={18} color="#3DD598" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Pretendard-SemiBold",
                color: "#3DD598",
              }}
            >
              이번 달 정산 카드 공유하기
            </Text>
          </Pressable>
        )}

        {/* 카테고리별 지출 */}
        {categoryBreakdown.length > 0 ? (
          <View>
            <Text className="text-section font-pretendard-semibold text-text-primary mb-3">
              카테고리별 지출
            </Text>
            {categoryBreakdown.map((item, i) => (
              <ListItem
                key={item.category}
                icon={<Text className="text-[18px]">{getCategoryEmoji(item.category)}</Text>}
                title={getCategoryLabel(item.category)}
                subtitle={`${item.percent}%`}
                amountLabel={fmt(item.total)}
                showDivider={i < categoryBreakdown.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="이번 달 내역이 없어요"
            description="거래를 추가하면 분석을 볼 수 있어요"
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 공유 카드 미리보기 모달 */}
      <Modal
        visible={showSharePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSharePreview(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {/* captureRef로 캡처할 ShareCard */}
          <ShareCard
            ref={cardRef}
            teamName={currentTeam?.name || "모임"}
            year={year}
            month={month}
            income={income}
            expense={expense}
            categoryBreakdown={categoryBreakdown}
          />

          {/* 액션 버튼 */}
          <View style={{ flexDirection: "row", gap: 12, width: 320, marginTop: 24 }}>
            <Pressable
              onPress={() => setShowSharePreview(false)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: "Pretendard-SemiBold", fontSize: 15 }}>
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={captureAndShare}
              disabled={sharing}
              style={{
                flex: 2,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: "#3DD598",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              {sharing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Share2 size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontFamily: "Pretendard-SemiBold", fontSize: 15 }}>
                    공유하기
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
