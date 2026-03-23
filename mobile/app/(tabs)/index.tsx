import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { ChevronDown } from "lucide-react-native";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Users } from "lucide-react-native";
import { useTeamStore } from "@/store/teamStore";
import { useAuthStore } from "@/store/authStore";
import { ListItem } from "@/components/ui/ListItem";
import { Card } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { dealApi } from "@/api/deal";
import { getTeamId } from "@/types/team";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetMethods>(null);

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

  // 화면 포커스 또는 팀 변경 시 거래 + 잔액 + 통계 새로고침
  useEffect(() => {
    if (isFocused && currentTeam) {
      const teamId = getTeamId(currentTeam);
      const now = new Date();
      fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1);
      fetchSummary(teamId);
      dealApi.getMonthlyStats(teamId, now.getFullYear(), now.getMonth() + 1)
        .then((res) => setStats(res.data))
        .catch(() => setStats(null));
    }
  }, [isFocused, currentTeam]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeams();
    setRefreshing(false);
  }, [fetchTeams]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

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
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-screen-x py-4">
          <Text className="text-section font-pretendard-semibold text-text-primary">
            작은 모임
          </Text>
        </View>
        <EmptyState
          title="아직 모임이 없어요"
          description="첫 모임을 만들어보세요"
          ctaLabel="모임 만들기"
          onCtaPress={() => router.push("/team/create")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* 헤더: 팀 선택 + 팀원 관리 */}
      <View className="flex-row items-center justify-between px-screen-x py-4">
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

      <ScrollView
        className="flex-1 px-screen-x"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

        {/* 최근 거래 */}
        {recentTransactions.length > 0 ? (
          <View>
            <Text className="text-section font-pretendard-semibold text-text-primary mb-3">
              최근 거래
            </Text>
            {recentTransactions.map((t, i) => (
              <ListItem
                key={t.id}
                icon={<Text className="text-[18px]">{getCategoryEmoji(t.category)}</Text>}
                title={t.merchant || getCategoryLabel(t.category)}
                subtitle={t.description}
                amount={t.type === "income" ? t.amount : -t.amount}
                showDivider={i < recentTransactions.length - 1}
              />
            ))}
          </View>
        ) : (
          !loading && (
            <EmptyState
              title="아직 거래 내역이 없어요"
              description="첫 거래를 추가해보세요"
            />
          )
        )}
      </ScrollView>

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
    </View>
  );
}
