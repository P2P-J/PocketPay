import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./TeamPage.css";
import { CreateTransactionModal } from "@features/transaction/ui/CreateTransactionModal";
import { TransactionTable } from "@features/transaction/ui/TransactionTable";
import { EmptyTransactionState } from "@features/transaction/ui/EmptyTransactionState";
import { CreateTeamModal } from "@features/team/ui/CreateTeamModal";
import { useTeamStore } from "@features/team/model/teamStore";
import { TeamSidebar } from "@widgets/team-sidebar";
import { MemberSidebar } from "@widgets/member-sidebar";
import { NavigationBar } from "@widgets/navigation-bar";
import { MonthlyContent } from "@features/transaction/ui/MonthlyContent";
import { ReportContent } from "@features/report/ui/ReportContent";
import { SettingsContent } from "@features/settings/ui/SettingsContent";
import { AuthScreen } from "@features/auth/ui/AuthScreen";
import { TRANSACTION_TYPE } from "@shared/config/constants";
import { getTeamId } from "@entities/team";
import { normalizeDateString, toDateObject } from "@shared/utils/date";

const INITIAL_FORM = {
  merchant: "",
  type: TRANSACTION_TYPE.EXPENSE,
  description: "",
  category: "",
  amount: "",
  date: "",
};

export default function TeamMain() {
  const navigate = useNavigate();
  const {
    currentTeam,
    setCurrentTeam,
    transactions,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTeam,
  } = useTeamStore();

  const [showModal, setShowModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!currentTeam) return;
    const teamId = getTeamId(currentTeam);
    if (teamId) fetchTransactions(teamId);
  }, [currentTeam]);

  const hasTransactions = transactions.length > 0;

  const currentBalance = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        if (t.type === TRANSACTION_TYPE.INCOME) return acc + t.amount;
        if (t.type === TRANSACTION_TYPE.EXPENSE) return acc - t.amount;
        return acc;
      }, 0),
    [transactions]
  );

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        if (t.type !== TRANSACTION_TYPE.INCOME || !t.date) return false;
        const d = new Date(t.date);
        return !Number.isNaN(d.getTime()) &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth();
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const weeklyExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === TRANSACTION_TYPE.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  // 모달 핸들러
  const handleOpenCreateModal = () => {
    setForm({ ...INITIAL_FORM, date: new Date() });
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (tx) => {
    setForm({
      merchant: tx.merchant,
      type: tx.type,
      description: tx.description === "-" ? "" : tx.description,
      category: tx.category === "-" ? "" : tx.category,
      amount: String(tx.amount),
      date: toDateObject(tx.date),
    });
    setEditingId(tx.id);
    setShowModal(true);
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (!form.merchant.trim() || !amountNum) {
      toast.error("거래처와 금액을 입력해 주세요.");
      return;
    }

    const baseTx = {
      merchant: form.merchant.trim(),
      type: form.type,
      description: form.description.trim() || "-",
      category: form.category.trim() || "-",
      amount: amountNum,
      date: normalizeDateString(form.date),
    };

    const action = editingId
      ? updateTransaction(editingId, baseTx)
      : createTransaction(baseTx);

    action.then(resetModal).catch((e) => toast.error(e.message || "오류가 발생했습니다."));
  };

  const handleDelete = (id) => {
    if (!window.confirm("이 거래를 삭제할까요?")) return;
    deleteTransaction(id).catch((e) => toast.error(e.message || "오류가 발생했습니다."));
  };

  const handleDeleteTeam = async () => {
    try {
      const teamId = getTeamId(currentTeam);
      if (!teamId) return;
      await deleteTeam(teamId);
      navigate("/home");
    } catch (error) {
      toast.error(error.message || "팀 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <TeamSidebar
        selectedTeamId={getTeamId(currentTeam)}
        onTeamSelect={setCurrentTeam}
        onCreateTeam={() => setShowCreateTeamModal(true)}
      />

      <div className="flex-1 flex flex-col">
        <NavigationBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAuthClick={() => setShowAuthModal(true)}
          onBack={() => navigate("/home")}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <main className="pt-4">
              {activeTab === "transactions" ? (
                <div className="tm-inner px-6 pt-4">
                  <section className="tm-summary-row">
                    <div className="tm-summary-cards">
                      <div className="tm-summary-card">
                        <div className="tm-summary-texts">
                          <div className="tm-summary-label">현재 잔액</div>
                          <div className="tm-summary-amount text-blue-500">
                            {currentBalance >= 0 ? "" : "-"}
                            {Math.abs(currentBalance).toLocaleString()}원
                          </div>
                        </div>
                        <div className="tm-summary-icon tm-summary-icon--income">📊</div>
                      </div>
                      <div className="tm-summary-card">
                        <div className="tm-summary-texts">
                          <div className="tm-summary-label">이번달 수입</div>
                          <div className="tm-summary-amount text-emerald-400">
                            {monthlyIncome.toLocaleString()}원
                          </div>
                        </div>
                        <div className="tm-summary-icon tm-summary-icon--income">📈</div>
                      </div>
                      <div className="tm-summary-card">
                        <div className="tm-summary-texts">
                          <div className="tm-summary-label">이번주 지출</div>
                          <div className="tm-summary-amount text-red-400">
                            {weeklyExpense.toLocaleString()}원
                          </div>
                        </div>
                        <div className="tm-summary-icon tm-summary-icon--expense">📉</div>
                      </div>
                    </div>
                  </section>

                  <section className="tm-list-section">
                    <div className="tm-list-header">
                      <h2 className="tm-list-title">거래 내역</h2>
                      <button type="button" className="tm-add-btn" onClick={handleOpenCreateModal}>
                        <span className="tm-add-btn-plus">＋</span>
                        거래 추가
                      </button>
                    </div>
                    {hasTransactions ? (
                      <TransactionTable
                        transactions={transactions}
                        onDelete={handleDelete}
                        onEdit={handleOpenEditModal}
                      />
                    ) : (
                      <EmptyTransactionState onAddClick={handleOpenCreateModal} />
                    )}
                  </section>
                </div>
              ) : activeTab === "monthly" ? (
                <MonthlyContent />
              ) : activeTab === "report" ? (
                <ReportContent />
              ) : activeTab === "settings" ? (
                <SettingsContent />
              ) : null}
            </main>
          </div>

          <MemberSidebar currentTeam={currentTeam} onDeleteTeam={handleDeleteTeam} />
        </div>
      </div>

      {showModal && (
        <CreateTransactionModal
          form={form}
          mode={editingId ? "edit" : "create"}
          onChange={(name, value) => setForm((prev) => ({ ...prev, [name]: value }))}
          onClose={resetModal}
          onSubmit={handleSubmit}
        />
      )}

      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CreateTeamModal onClose={() => setShowCreateTeamModal(false)} />
        </div>
      )}

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
