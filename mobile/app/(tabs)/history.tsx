import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTeamStore } from "@/store/teamStore";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import { getTeamId } from "@/types/team";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const currentTeam = useTeamStore((s) => s.currentTeam);
  const transactions = useTeamStore((s) => s.transactions);
  const fetchTransactions = useTeamStore((s) => s.fetchTransactions);
  const isFocused = useIsFocused();

  // 화면 포커스 시 현재 월 데이터 로드
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

  const fmt = (n: number) => `₩${n.toLocaleString()}`;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* 월 네비게이터 */}
      <View className="flex-row items-center justify-center px-screen-x py-4 gap-4">
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
      </ScrollView>
    </View>
  );
}
