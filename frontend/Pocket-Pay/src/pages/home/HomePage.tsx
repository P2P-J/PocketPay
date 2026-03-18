import { useMemo } from "react";
import { Button } from "@shared/ui/button";
import { useTeamStore } from "@features/team/model/teamStore";
import { useAuthStore } from "@features/auth/model/authStore";
import {
  Plus,
  User,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@shared/utils/format";
import { getCategoryLabel } from "@shared/config/constants";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeamId, isMatchingTeam } from "@entities/team";
import { CreateTeamModal } from "@features/team/ui/CreateTeamModal";
import { TeamSidebar } from "@widgets/team-sidebar";
import { NavigationBar } from "@widgets/navigation-bar";
import { AuthScreen } from "@features/auth/ui/AuthScreen";

export function LandingPage() {
  const navigate = useNavigate();
  const {
    teams,
    setCurrentTeam,
    fetchTransactions,
    transactions: storeTransactions,
  } = useTeamStore();
  const { user, logout } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(getTeamId(teams[0]));
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTransactions(selectedTeamId);
    }
  }, [selectedTeamId]);

  const selectedTeam = teams.find((t) => isMatchingTeam(t, selectedTeamId));

  // 선택된 팀의 거래 내역 계산
  const transactions = storeTransactions;

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
    [transactions]
  );

  const handleCreateTeam = () => {
    if (!user) {
      // 로그아웃 상태일 땐 로그인/회원가입 모달 띄우기
      setShowAuthModal(true);
    } else {
      // 로그인 되어있는 상태일 땐 팀 생성 모달 띄우기
      setShowCreateTeamModal(true);
    }
  };

  const handleEnterTeam = () => {
    if (selectedTeam) {
      setCurrentTeam(getTeamId(selectedTeam));
    }
    navigate("/team");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CreateTeamModal onClose={() => setShowCreateTeamModal(false)} />
        </div>
      )}

      {/* Left Sidebar */}
      <TeamSidebar
        selectedTeamId={selectedTeamId}
        onTeamSelect={setSelectedTeamId}
        onCreateTeam={handleCreateTeam}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Bar */}
        <NavigationBar
          showTabs={false}
          onAuthClick={() => setShowAuthModal(true)}
        />

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
                <Button onClick={handleCreateTeam} className="mt-4">
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
                      {/* Balance */}
                      <div className="bg-card border border-border rounded-2xl p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Wallet className="w-4 h-4" />
                            잔액
                          </div>
                          <div className="text-2xl font-bold text-blue-500">
                            {balance >= 0 ? "+" : ""}
                            {formatCurrency(balance)}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl">
                          📊
                        </div>
                      </div>

                      {/* Total Income */}
                      <div className="bg-card border border-border rounded-2xl p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="w-4 h-4" />총 수입
                          </div>
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(totalIncome)}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          📈
                        </div>
                      </div>

                      {/* Total Expense */}
                      <div className="bg-card border border-border rounded-2xl p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingDown className="w-4 h-4" />총 지출
                          </div>
                          <div className="text-2xl font-bold text-red-400">
                            {formatCurrency(totalExpense)}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-2xl">
                          📉
                        </div>
                      </div>
                    </div>

                    {/* TODO: 지난 달 대비 비교 기능 구현 시 활성화 */}
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-lg">최근 내역</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEnterTeam}
                      >
                        전체보기
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="bg-card border border-border rounded-2xl p-5 px-6 flex items-center justify-between hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                                transaction.type === "income"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {transaction.merchant?.[0] || "?"}
                            </div>
                            <div>
                              <div className="font-medium">
                                {transaction.merchant || "거래처 없음"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString(
                                  "ko-KR"
                                )}{" "}
                                · {getCategoryLabel(transaction.category)}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`text-lg font-semibold ${
                              transaction.type === "income"
                                ? "text-primary"
                                : "text-destructive"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Enter App Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleEnterTeam}
                      size="lg"
                      className="p-4 border-t border-border"
                    >
                      영수증 업로드 →
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <AuthScreen onClose={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
