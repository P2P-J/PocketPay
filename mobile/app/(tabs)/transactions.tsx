import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, Pressable, Alert, RefreshControl } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTeamStore } from "@/store/teamStore";
import { ListItem } from "@/components/ui/ListItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import { getTeamId } from "@/types/team";
import type { Transaction } from "@/types/transaction";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

interface Section {
  title: string;
  data: Transaction[];
}

function groupByDate(transactions: Transaction[]): Section[] {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const dateKey = t.date?.split("T")[0] || "날짜 없음";
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => {
      if (date === "날짜 없음") return { title: "날짜 없음", data };
      const d = new Date(date);
      if (isNaN(d.getTime())) return { title: "날짜 없음", data };
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const title = `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
      return { title, data };
    });
}

export default function TransactionsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const contentBottomPad = tabBarHeight + insets.bottom + 16;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const currentTeam = useTeamStore((s) => s.currentTeam);
  const transactions = useTeamStore((s) => s.transactions);
  const loading = useTeamStore((s) => s.loading);
  const fetchTransactions = useTeamStore((s) => s.fetchTransactions);
  const deleteTransaction = useTeamStore((s) => s.deleteTransaction);

  const confirmDelete = (item: Transaction) => {
    const name = item.merchant || getCategoryLabel(item.category);
    Alert.alert(
      "거래 삭제",
      `"${name}"을(를) 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(item.id);
              showToast("success", "거래가 삭제되었습니다");
            } catch {
              showToast("error", "거래 삭제 실패");
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (item: Transaction) => (
    <Pressable
      onPress={() => confirmDelete(item)}
      className="bg-expense items-center justify-center px-5"
    >
      <Trash2 size={20} color="#FFFFFF" />
      <Text className="text-caption font-pretendard-medium text-white mt-1">삭제</Text>
    </Pressable>
  );

  const isFocused = useIsFocused();

  // 화면 포커스 또는 팀 변경 시 새로고침
  useEffect(() => {
    if (isFocused && currentTeam) {
      fetchTransactions(getTeamId(currentTeam), year, month);
    }
  }, [isFocused, currentTeam]);

  const sections = useMemo(() => groupByDate(transactions), [transactions]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (!currentTeam) return;
    setRefreshing(true);
    await fetchTransactions(getTeamId(currentTeam), year, month);
    setRefreshing(false);
  }, [currentTeam, year, month]);

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
    if (currentTeam) {
      fetchTransactions(getTeamId(currentTeam), newYear, newMonth);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* 월 네비게이터 */}
      <View className="flex-row items-center justify-center py-4 gap-4">
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

      {loading ? (
        <View className="gap-3 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Skeleton circle height={40} />
              <View className="flex-1 gap-2">
                <Skeleton height={16} width="60%" />
                <Skeleton height={12} width="40%" />
              </View>
              <Skeleton height={16} width={80} />
            </View>
          ))}
        </View>
      ) : sections.length === 0 ? (
        <EmptyState
          title="이번 달 거래가 없어요"
          description="거래를 추가해보세요"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: contentBottomPad }}
          renderSectionHeader={({ section }) => (
            <View className="py-2 bg-background">
              <Text className="text-sub font-pretendard-semibold text-text-secondary">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <Swipeable
              renderRightActions={() => renderRightActions(item)}
              overshootRight={false}
            >
              <View className="bg-background">
                <ListItem
                  icon={<Text className="text-[18px]">{getCategoryEmoji(item.category)}</Text>}
                  title={item.merchant || getCategoryLabel(item.category)}
                  subtitle={item.description}
                  amount={
                    item.type === "income"
                      ? item.amount
                      : -item.amount
                  }
                  showDivider={index < section.data.length - 1}
                  onPress={() => router.push(`/transaction/${item.id}`)}
                />
              </View>
            </Swipeable>
          )}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </ScreenContainer>
  );
}
