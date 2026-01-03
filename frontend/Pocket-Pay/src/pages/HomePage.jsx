import { Button } from "./ui/button";
import { useTeamStore } from "../store/teamStore";
import { useAuthStore } from "../store/authStore";
import {
  Plus,
  User,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react@0.487.0";
import { formatCurrency } from "../utils/format";
import { useEffect, useState } from "react";
import { localStorageUtil } from "../utils/localStorage";

export function LandingPage({ onEnterApp }) {
  const { teams, setCurrentTeam, loadLocalTeams } = useTeamStore();
  const { user, logout } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamTransactions, setSelectedTeamTransactions] = useState([]);

  useEffect(() => {
    loadLocalTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // 선택된 팀이 바뀔 때마다 해당 팀의 거래 내역 로드
  useEffect(() => {
    if (selectedTeamId) {
      const transactions =
        localStorageUtil.get(`transactions-${selectedTeamId}`) || [];
      setSelectedTeamTransactions(transactions);
    }
  }, [selectedTeamId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  // 선택된 팀의 거래 내역 계산
  const transactions = selectedTeamTransactions;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthTransactions = transactions.filter((t) => {
    const date = new Date(t.transaction_date);
    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  });

  const totalIncome = thisMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.price, 0);

  const totalExpense = thisMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.price, 0);

  const balance = totalIncome - totalExpense;

  const recentTransactions = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    )
    .slice(0, 5);

  const handleEnterTeam = () => {
    if (selectedTeam) {
      setCurrentTeam(selectedTeam.id);
    }
    onEnterApp();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              ₩
            </div>
            <h1 className="text-xl">작은모임</h1>
          </div>
        </div>

        {/* User Section */}
        {user && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </div>
                <span className="text-sm">{user.name || user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Team List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedTeamId === team.id
                    ? "bg-primary/10 border-2 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                    team.color || "bg-primary"
                  }`}
                  style={{ backgroundColor: team.color }}
                >
                  {team.name[0]}
                </div>
                <span className="text-sm">{team.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Team Button - removed as requested */}
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto">
        {teams.length === 0 ? (
          // No teams state
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Wallet className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl">팀이 없습니다</h2>
                <p className="text-sm text-muted-foreground">
                  오른쪽 상단의 "시작하기" 버튼을 눌러
                  <br />첫 번째 팀을 만들어보세요
                </p>
              </div>
              <Button onClick={onEnterApp} className="mt-4">
                시작하기
              </Button>
            </div>
          </div>
        ) : selectedTeam ? (
          <div className="max-w-4xl mx-auto p-8 space-y-6">
            {/* Team Header Banner */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-3xl mb-2">{selectedTeam.name}</h1>
                <p className="text-muted-foreground">
                  이번 달 모임 자금을 한 눈에 확인하세요
                </p>
              </div>
              {/* Decorative elements */}
              <div className="absolute right-8 bottom-0 opacity-20">
                <div className="w-32 h-32 bg-primary rounded-full blur-3xl" />
              </div>
            </div>

            {transactions.length === 0 ? (
              // No transactions state
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg">거래내역이 없습니다</h3>
                  <p className="text-sm text-muted-foreground">
                    첫 번째 거래를 추가해보세요
                  </p>
                </div>
                <Button onClick={handleEnterTeam} className="mt-4">
                  거래 추가하기
                </Button>
              </div>
            ) : (
              <>
                {/* Monthly Summary */}
                <div className="space-y-3">
                  <h2 className="text-lg">이번 달 요약</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Total Expense */}
                    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingDown className="w-4 h-4" />총 지출
                      </div>
                      <div className="text-2xl text-red-500">
                        {formatCurrency(totalExpense)}
                      </div>
                    </div>

                    {/* Total Income */}
                    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />총 수입
                      </div>
                      <div className="text-2xl text-blue-500">
                        {formatCurrency(totalIncome)}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet className="w-4 h-4" />
                        잔액
                      </div>
                      <div
                        className={`text-2xl ${
                          balance >= 0 ? "text-primary" : "text-red-500"
                        }`}
                      >
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(balance)}
                      </div>
                    </div>
                  </div>

                  {/* Month comparison */}
                  <div className="text-center text-sm text-muted-foreground py-2">
                    이번 달 · 지난 달보다{" "}
                    <span className="text-primary">+15%</span> 지출 ↗
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg">최근 내역</h2>
                    <Button variant="ghost" size="sm" onClick={handleEnterTeam}>
                      전체보기
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              transaction.type === "income"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {transaction.store_name?.[0] || "?"}
                          </div>
                          <div>
                            <div className="font-medium">
                              {transaction.store_name || "거래처 없음"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(
                                transaction.transaction_date
                              ).toLocaleDateString("ko-KR")}{" "}
                              · {transaction.category?.name || "미분류"}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-lg ${
                            transaction.type === "income"
                              ? "text-blue-500"
                              : "text-red-500"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enter App Button */}
                <div className="flex justify-center pt-4">
                  <Button onClick={handleEnterTeam} size="lg" className="px-8">
                    영수증 업로드 →
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
