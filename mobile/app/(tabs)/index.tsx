import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { View, Text, SectionList, RefreshControl, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, Users, Sparkles } from "lucide-react-native";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useTeamStore } from "@/store/teamStore";
import { useAuthStore } from "@/store/authStore";
import { ListItem } from "@/components/ui/ListItem";
import { Card } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { dealApi } from "@/api/deal";
import { getTeamId } from "@/types/team";
import type { Transaction } from "@/types/transaction";
import { dealToTransaction } from "@/types/transaction";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

/**
 * 신규 사용자(팀 없음) 첫 화면용 부드러운 배경 모션.
 * 두 개의 큰 원이 호흡하듯 위아래로 천천히 움직임.
 */
function AnimatedBlobBackground() {
  const blob1Y = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob3Y = useSharedValue(0);

  useEffect(() => {
    blob1Y.value = withRepeat(
      withTiming(40, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    blob2Y.value = withRepeat(
      withTiming(-35, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    blob3Y.value = withRepeat(
      withTiming(25, { duration: 6500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [blob1Y, blob2Y, blob3Y]);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob1Y.value }],
  }));
  const blob2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob2Y.value }],
  }));
  const blob3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob3Y.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 60,
            left: -70,
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "#3DD598",
            opacity: 0.18,
          },
          blob1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 220,
            right: -80,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "#3182F6",
            opacity: 0.13,
          },
          blob2Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 120,
            left: 40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "#FF8C42",
            opacity: 0.1,
          },
          blob3Style,
        ]}
      />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const contentBottomPad = tabBarHeight + insets.bottom + 16;

  const user = useAuthStore((s) => s.user);
  const teams = useTeamStore((s) => s.teams);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const transactions = useTeamStore((s) => s.transactions);
  const loading = useTeamStore((s) => s.loading);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const setCurrentTeam = useTeamStore((s) => s.setCurrentTeam);
  const fetchTransactions = useTeamStore((s) => s.fetchTransactions);
  const fetchSummary = useTeamStore((s) => s.fetchSummary);
  const summary = useTeamStore((s) => s.summary);
  const isFocused = useIsFocused();

  interface MonthlyStats {
    incomeChange: number;
    expenseChange: number;
    topCategory: { category: string; total: number } | null;
    categoryBreakdown: { category: string; total: number }[];
  }
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  // 전체 거래 (무한 스크롤)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAllTransactions = async (teamId: string, pageNum = 1, reset = false) => {
    try {
      const res = await dealApi.getAll(teamId, pageNum, 30);
      const txs = res.data.deals.map(dealToTransaction);
      setAllTransactions((prev) => reset ? txs : [...prev, ...txs]);
      hasMoreRef.current = res.data.hasMore;
      pageRef.current = pageNum;
    } catch {
      // 실패 시 무시
    }
  };

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current || !currentTeam) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await loadAllTransactions(getTeamId(currentTeam), pageRef.current + 1);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [currentTeam]);

  // 화면 포커스 시 팀 목록 새로고침 (초대받은 팀 즉시 반영)
  useEffect(() => {
    if (isFocused) {
      fetchTeams();
    }
  }, [isFocused]);

  // currentTeam이 정해지거나 변경될 때, 또는 화면 포커스 시 거래/잔액/통계 새로고침
  useEffect(() => {
    if (isFocused && currentTeam) {
      const teamId = getTeamId(currentTeam);
      const now = new Date();
      fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1);
      fetchSummary(teamId);
      loadAllTransactions(teamId, 1, true);
      dealApi.getMonthlyStats(teamId, now.getFullYear(), now.getMonth() + 1)
        .then((res) => setStats(res.data))
        .catch(() => setStats(null));
    }
  }, [isFocused, currentTeam]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeams();
    // 팀이 있으면 현재 팀 데이터도 새로고침
    const team = useTeamStore.getState().currentTeam;
    if (team) {
      const teamId = getTeamId(team);
      const now = new Date();
      await fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1);
      await fetchSummary(teamId);
      await loadAllTransactions(teamId, 1, true);
      dealApi.getMonthlyStats(teamId, now.getFullYear(), now.getMonth() + 1)
        .then((res) => setStats(res.data))
        .catch(() => setStats(null));
    }
    setRefreshing(false);
  }, []);

  // 전체 거래 날짜별 그루핑 (토스 스타일)
  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of allTransactions) {
      const dateKey = t.date?.split("T")[0] || "날짜 없음";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    }
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return Object.entries(groups).map(([date, data]) => {
      if (date === "날짜 없음") return { title: "날짜 없음", data };
      const d = new Date(date);
      if (isNaN(d.getTime())) return { title: "날짜 없음", data };
      const title = `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
      return { title, data };
    });
  }, [allTransactions]);

  // 이번 달 수입/지출 (거래 탭 데이터 기반)
  const { monthIncome, monthExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return { monthIncome: inc, monthExpense: exp };
  }, [transactions]);

  // 전체 기간 잔액 (summary API)
  const { balance } = summary;

  const balanceColor =
    balance > 0 ? "text-brand" : balance < 0 ? "text-expense" : "text-text-primary";

  const formatBalance = (amount: number) =>
    amount < 0
      ? `-₩${Math.abs(amount).toLocaleString()}`
      : `₩${amount.toLocaleString()}`;

  if (teams.length === 0 && !loading) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="py-4">
          <Text className="text-section font-pretendard-semibold text-text-primary">
            작은 모임
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <AnimatedBlobBackground />

          {/* 본문 (모션 위에 떠 있음) */}
          <View className="items-center px-4" style={{ zIndex: 1 }}>
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-6"
              style={{
                shadowColor: "#3DD598",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Sparkles size={36} color="#3DD598" />
            </View>

            <Text className="text-title font-pretendard-bold text-text-primary text-center mb-2">
              아직 모임이 없어요
            </Text>
            <Text className="text-body text-text-secondary text-center mb-8">
              첫 모임을 만들거나{"\n"}초대 코드로 참가해보세요
            </Text>

            <View className="w-full" style={{ maxWidth: 320 }}>
              <Button
                label="모임 만들기"
                variant="primary"
                size="full"
                onPress={() => router.push("/team/create")}
              />
              <View className="h-3" />
              <Button
                label="초대 코드로 참가"
                variant="secondary"
                size="full"
                onPress={() => router.push("/team/join")}
              />
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false}>
      {/* 헤더: 팀 선택 + 팀원 관리 */}
      <View className="flex-row items-center justify-between py-4">
        <Pressable
          onPress={() => sheetRef.current?.snapToIndex(0)}
          className="flex-row items-center gap-1"
        >
          <Text className="text-section font-pretendard-semibold text-text-primary">
            {currentTeam?.name || "팀 선택"}
          </Text>
          <ChevronDown size={20} color="#191F28" />
        </Pressable>

        {currentTeam && (
          <Pressable
            onPress={() => router.push(`/team/${getTeamId(currentTeam)}`)}
            className="w-10 h-10 rounded-full bg-card items-center justify-center"
          >
            <Users size={20} color="#8B95A1" />
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: contentBottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={allTransactions.length > 0 ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            {/* 잔액 카드 */}
            <Card variant="elevated" className="mb-card-gap">
              <Text className="text-sub text-text-secondary mb-1">전체 잔액</Text>
              <Text className={`text-display font-pretendard-bold ${balanceColor}`}>
                {formatBalance(balance)}
              </Text>
            </Card>

            {/* 이번 달 수입/지출 + 전월 비교 */}
            <View className="flex-row gap-2 mb-card-gap">
              <Card variant="default" className="flex-1">
                <Text className="text-caption text-text-secondary mb-1">이번 달 수입</Text>
                <Text className="text-body font-pretendard-bold text-income">
                  +₩{monthIncome.toLocaleString()}
            </Text>
            {stats && stats.incomeChange !== 0 && (
              <View className="flex-row items-center mt-1">
                {stats.incomeChange > 0
                  ? <TrendingUp size={12} color="#3182F6" />
                  : <TrendingDown size={12} color="#F04452" />}
                <Text className={`text-caption ml-1 ${stats.incomeChange > 0 ? "text-income" : "text-expense"}`}>
                  전월 대비 {Math.abs(stats.incomeChange)}%
                </Text>
              </View>
            )}
          </Card>
          <Card variant="default" className="flex-1">
            <Text className="text-caption text-text-secondary mb-1">이번 달 지출</Text>
            <Text className="text-body font-pretendard-bold text-expense">
              -₩{monthExpense.toLocaleString()}
            </Text>
            {stats && stats.expenseChange !== 0 && (
              <View className="flex-row items-center mt-1">
                {stats.expenseChange > 0
                  ? <TrendingUp size={12} color="#F04452" />
                  : <TrendingDown size={12} color="#3DD598" />}
                <Text className={`text-caption ml-1 ${stats.expenseChange > 0 ? "text-expense" : "text-brand"}`}>
                  전월 대비 {Math.abs(stats.expenseChange)}%
                </Text>
              </View>
            )}
          </Card>
        </View>

            {/* 이번 달 최다 지출 카테고리 */}
            {stats?.topCategory && (
              <Card variant="default" className="mb-section-gap">
                <Text className="text-caption text-text-secondary mb-1">이번 달 최다 지출</Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-[20px] mr-2">{getCategoryEmoji(stats.topCategory.category)}</Text>
                    <Text className="text-body font-pretendard-semibold text-text-primary">
                      {getCategoryLabel(stats.topCategory.category)}
                    </Text>
                  </View>
                  <Text className="text-body font-pretendard-bold text-expense">
                    -₩{stats.topCategory.total.toLocaleString()}
                  </Text>
                </View>
              </Card>
            )}

            {/* 거래 내역 헤더 */}
            {allTransactions.length > 0 && (
              <Text className="text-section font-pretendard-semibold text-text-primary mb-1">
                거래 내역
              </Text>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="py-2 bg-background">
            <Text className="text-sub font-pretendard-semibold text-text-secondary">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <ListItem
            icon={<Text className="text-[18px]">{getCategoryEmoji(item.category)}</Text>}
            title={item.merchant || getCategoryLabel(item.category)}
            subtitle={item.description}
            amount={item.type === "income" ? item.amount : -item.amount}
            showDivider={index < section.data.length - 1}
            onPress={() => {
              if (__DEV__) console.log("[home] tap transaction id=", item.id);
              if (!item.id) return;
              router.push(`/transaction/${item.id}`);
            }}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#3DD598" />
            </View>
          ) : !loading && allTransactions.length === 0 ? (
            <EmptyState
              title="아직 거래 내역이 없어요"
              description="첫 거래를 추가해보세요"
            />
          ) : null
        }
        ListEmptyComponent={null}
      />

      {/* 팀 선택 바텀시트 */}
      <BottomSheet ref={sheetRef} title="모임 선택">
        {teams.map((team) => (
          <Pressable
            key={getTeamId(team)}
            onPress={() => {
              setCurrentTeam(getTeamId(team));
              sheetRef.current?.close();
            }}
            className="flex-row items-center py-3 px-1"
          >
            <View className="w-10 h-10 rounded-full bg-brand-light items-center justify-center mr-3">
              <Text className="text-body font-pretendard-bold text-brand">
                {(team.name ?? "?").charAt(0)}
              </Text>
            </View>
            <Text className="text-body font-pretendard text-text-primary flex-1">
              {team.name ?? "이름 없음"}
            </Text>
            {currentTeam && getTeamId(currentTeam) === getTeamId(team) && (
              <Text className="text-brand font-pretendard-semibold text-sub">선택됨</Text>
            )}
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            sheetRef.current?.close();
            router.push("/team/create");
          }}
          className="flex-row items-center py-3 px-1 mt-2 border-t border-divider"
        >
          <Text className="text-body text-brand font-pretendard-semibold">
            + 새 모임 만들기
          </Text>
        </Pressable>
      </BottomSheet>
    </ScreenContainer>
  );
}
