// src/pages/teamMain.jsx
import React, { useMemo, useState, useEffect } from "react";
import "./teamMain.css";
import { CreateTransactionModal } from "../components/modals/createTransactionModal";
import { CreateTeamModal } from "../components/modals/createTeamModal";
import { useTeamStore } from "../store/teamStore";
// import { localStorageUtil } from "../utils/localStorage"; // Removed
import { TeamSidebar } from "../components/TeamSidebar";
import { NavigationBar } from "../components/NavigationBar";
import { AddTransactionScreen } from "../components/AddTransactionScreen";
import { MonthlyContent } from "../components/MonthlyContent";
import { ReportContent } from "../components/ReportContent";
import { SettingsContent } from "../components/SettingsContent";
import { AuthScreen } from "../components/AuthScreen";
import {
  TRANSACTION_TYPE,
  CATEGORY_LABELS,
  getCategoryLabel,
} from "../utils/constants";

const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayString = () => formatDateLocal(new Date());

const normalizeDateString = (raw) => {
  if (!raw) return todayString();

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return todayString();

  return formatDateLocal(d);
};

const toDateObject = (raw) => {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
};

const INITIAL_FORM = {
  merchant: "",
  type: TRANSACTION_TYPE.EXPENSE,
  description: "",
  category: "",
  amount: "",
  date: "",
};

export default function TeamMain({ onBack }) {
  const {
    currentTeam,
    setCurrentTeam,
    teams,
    transactions,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTeamStore();
  // const [transactions, setTransactions] = useState([]); // Removed local state
  const [showModal, setShowModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  // 팀 선택 핸들러
  const handleTeamSelect = (teamId) => {
    setCurrentTeam(teamId);
  };

  // =====================
  // 거래 내역 로드
  // =====================
  // =====================
  // 거래 내역 로드 (API)
  // =====================
  useEffect(() => {
    if (!currentTeam) return;
    fetchTransactions(currentTeam._id || currentTeam.id);
  }, [currentTeam]);

  // Removed local storage effects

  const hasTransactions = transactions.length > 0;

  // 현재 잔액 = 수입 합 - 지출 합
  const currentBalance = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        if (t.type === TRANSACTION_TYPE.INCOME) return acc + t.amount;
        if (t.type === TRANSACTION_TYPE.EXPENSE) return acc - t.amount;
        return acc;
      }, 0),
    [transactions]
  );

  // 이번달 수입 합계
  const monthlyIncome = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return transactions
      .filter((t) => {
        if (t.type !== TRANSACTION_TYPE.INCOME) return false;
        if (!t.date) return false;

        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return false;

        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  // 이번주 지출 (지금은 전체 지출 합계)
  const weeklyExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === TRANSACTION_TYPE.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  // =====================
  // 모달 열기/닫기 + 폼 변경
  // =====================

  // 새 거래 추가
  const handleOpenCreateModal = () => {
    setForm({
      ...INITIAL_FORM,
      // ✅ 모달 쪽에서 Date 객체를 쓰는 경우 대비
      date: new Date(),
    });
    setEditingId(null);
    setShowModal(true);
  };

  // 기존 거래 수정
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

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleChangeField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 추가 + 수정 공통 처리
  const handleSubmit = (e) => {
    e.preventDefault();

    const amountNum = Number(form.amount);
    if (!form.merchant.trim() || !amountNum) {
      alert("거래처와 금액을 입력해 주세요.");
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

    if (editingId) {
      // 수정 모드
      updateTransaction(editingId, baseTx)
        .then(() => {
          setShowModal(false);
          setEditingId(null);
          setForm(INITIAL_FORM);
        })
        .catch(alert);
    } else {
      // 추가 모드
      createTransaction(baseTx)
        .then(() => {
          setShowModal(false);
          setEditingId(null);
          setForm(INITIAL_FORM);
        })
        .catch(alert);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("이 거래를 삭제할까요?")) return;
    deleteTransaction(id).catch(alert);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <TeamSidebar
        selectedTeamId={currentTeam?._id || currentTeam?.id}
        onTeamSelect={handleTeamSelect}
        onCreateTeam={() => setShowCreateTeamModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Bar */}
        <NavigationBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAuthClick={() => setShowAuthModal(true)}
          onBack={onBack}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Render content based on active tab */}
          {activeTab === "transactions" ? (
            <div className="tm-inner">
              {/* 상단 요약 카드 영역 */}
              <section className="tm-summary-row">
                <div className="tm-summary-cards">
                  {/* 현재 잔액 카드 */}
                  <div className="tm-summary-card">
                    <div className="tm-summary-texts">
                      <div className="tm-summary-label">현재 잔액</div>
                      <div
                        className="tm-summary-amount"
                        style={{ color: "#3b82f6" }}
                      >
                        {currentBalance >= 0 ? "" : "-"}
                        {Math.abs(currentBalance).toLocaleString()}원
                      </div>
                    </div>
                    <div className="tm-summary-icon tm-summary-icon--income">
                      📊
                    </div>
                  </div>

                  {/* 이번달 수입 카드 */}
                  <div className="tm-summary-card">
                    <div className="tm-summary-texts">
                      <div className="tm-summary-label">이번달 수입</div>
                      <div
                        className="tm-summary-amount"
                        style={{ color: "#22c55e" }}
                      >
                        {monthlyIncome.toLocaleString()}원
                      </div>
                    </div>
                    <div className="tm-summary-icon tm-summary-icon--income">
                      📈
                    </div>
                  </div>

                  {/* 이번주 지출 카드 */}
                  <div className="tm-summary-card">
                    <div className="tm-summary-texts">
                      <div className="tm-summary-label">이번주 지출</div>
                      <div
                        className="tm-summary-amount tm-summary-amount-expense"
                        style={{ color: "#ef4444" }}
                      >
                        {weeklyExpense.toLocaleString()}원
                      </div>
                    </div>
                    <div className="tm-summary-icon tm-summary-icon--expense">
                      📉
                    </div>
                  </div>
                </div>
              </section>

              {/* 거래 내역 + 상단 거래 추가 버튼 */}
              <section className="tm-list-section">
                <div className="tm-list-header">
                  <h2 className="tm-list-title">거래 내역</h2>
                  <button
                    type="button"
                    className="tm-add-btn"
                    onClick={handleOpenCreateModal}
                  >
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
                  <EmptyState onAddClick={handleOpenCreateModal} />
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

      {showModal && (
        <CreateTransactionModal
          form={form}
          mode={editingId ? "edit" : "create"}
          onChange={handleChangeField}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CreateTeamModal onClose={() => setShowCreateTeamModal(false)} />
        </div>
      )}

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

/* =========================
   거래 1개 이상일 때 테이블
   ========================= */

function TransactionTable({ transactions, onDelete, onEdit }) {
  return (
    <div className="tm-table-wrapper">
      <table className="tm-table">
        <thead>
          <tr>
            <th>거래처(상품)</th>
            <th className="tm-th-center">구분</th>
            <th>설명</th>
            <th>카테고리</th>
            <th className="tm-th-right">금액</th>
            <th>날짜</th>
            <th className="tm-th-center">작업</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.merchant}</td>
              <td className="tm-td-center">
                <span
                  className={
                    "tm-chip " +
                    (t.type === TRANSACTION_TYPE.EXPENSE
                      ? "tm-chip--expense"
                      : "tm-chip--income")
                  }
                >
                  {t.type === TRANSACTION_TYPE.EXPENSE ? "지출" : "수입"}
                </span>
              </td>
              <td>{t.description || "-"}</td>
              <td>{getCategoryLabel(t.category)}</td>
              <td
                className={
                  "tm-td-right " +
                  (t.type === TRANSACTION_TYPE.EXPENSE
                    ? "tm-amount-expense"
                    : "tm-amount-income")
                }
              >
                {t.type === TRANSACTION_TYPE.EXPENSE ? "-" : "+"}
                {t.amount.toLocaleString()}원
              </td>
              <td>{formatDateLocal(new Date(t.date))}</td>
              <td className="tm-td-center">
                <button
                  type="button"
                  className="tm-delete-btn"
                  onClick={() => onEdit(t)}
                  style={{ marginRight: 4 }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="tm-delete-btn"
                  onClick={() => onDelete(t.id)}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   거래 0개일 때 빈 상태 카드
   ========================= */

function EmptyState({ onAddClick }) {
  return (
    <div className="tm-empty-card">
      <div className="tm-empty-icon">👛</div>
      <p className="tm-empty-title">거래 내역이 없습니다</p>
      <p className="tm-empty-desc">
        거래 추가 버튼을 눌러 첫 거래를 등록해보세요.
      </p>
      <button type="button" className="tm-empty-btn" onClick={onAddClick}>
        <span className="tm-add-btn-plus">＋</span>
        거래 추가하기
      </button>
    </div>
  );
}
