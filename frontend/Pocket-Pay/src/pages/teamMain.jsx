// src/pages/teamMain.jsx
import React, { useMemo, useState, useEffect } from "react";
import "./teamMain.css";
import { CreateTransactionModal } from "../components/modals/createTransactionModal";
import { useTeamStore } from "../store/teamStore";
import { localStorageUtil } from "../utils/localStorage";

const TRANSACTION_TYPE = {
  INCOME: "income",
  EXPENSE: "expense",
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
  const { currentTeam } = useTeamStore();
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  // 컴포넌트 마운트 시 localStorage에서 거래 내역 로드
  useEffect(() => {
    if (currentTeam) {
      const savedTransactions =
        localStorageUtil.get(`transactions-${currentTeam.id}`) || [];
      // HomePage 형식을 teamMain 형식으로 변환
      const convertedTransactions = savedTransactions.map((tx) => ({
        id: tx.id || Date.now(),
        merchant: tx.store_name || "",
        type: tx.type,
        description: tx.description || "-",
        category: tx.category_id || "-",
        amount: tx.price || 0,
        date: tx.transaction_date || new Date().toISOString().slice(0, 10),
      }));
      setTransactions(convertedTransactions);
    }
  }, [currentTeam]);

  // transactions가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (currentTeam && transactions.length >= 0) {
      // teamMain 형식을 HomePage 형식으로 변환하여 저장
      const convertedTransactions = transactions.map((tx) => ({
        id: tx.id,
        store_name: tx.merchant,
        type: tx.type,
        description: tx.description === "-" ? "" : tx.description,
        category_id: tx.category === "-" ? "" : tx.category,
        price: tx.amount,
        transaction_date: tx.date,
        team_id: currentTeam.id,
        created_at: new Date().toISOString(),
      }));
      localStorageUtil.set(
        `transactions-${currentTeam.id}`,
        convertedTransactions
      );
    }
  }, [transactions, currentTeam]);

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

  // 이번주 지출 (임시: 모든 지출 합계)
  const weeklyExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === TRANSACTION_TYPE.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  // ✅ 새 거래 추가용 모달 열기
  const handleOpenCreateModal = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  // ✅ 기존 거래 수정용 모달 열기
  const handleOpenEditModal = (tx) => {
    setForm({
      merchant: tx.merchant,
      type: tx.type,
      description: tx.description === "-" ? "" : tx.description,
      category: tx.category === "-" ? "" : tx.category,
      amount: String(tx.amount),
      date: tx.date, // 여기서는 그냥 저장된 문자열 그대로 사용
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

  // ✅ 추가 + 수정 둘 다 이 함수에서 처리
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
      date: form.date || new Date().toISOString().slice(0, 10),
    };

    if (editingId) {
      // ✏️ 수정 모드
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...baseTx,
              }
            : t
        )
      );
    } else {
      // ➕ 추가 모드
      const newTx = {
        id: Date.now(),
        ...baseTx,
      };
      setTransactions((prev) => [...prev, newTx]);
    }

    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id) => {
    if (!window.confirm("이 거래를 삭제할까요?")) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="tm-page">
      <main className="tm-main">
        <div className="tm-inner">
          {/* 뒤로가기 버튼 */}
          {onBack && (
            <div style={{ marginBottom: "1rem" }}>
              <button
                type="button"
                onClick={onBack}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                ← 홈으로 돌아가기
              </button>
            </div>
          )}

          {/* 상단 요약 카드 영역 */}
          <section className="tm-summary-row">
            <div className="tm-summary-cards">
              {/* 현재 잔액 카드 */}
              <div className="tm-summary-card">
                <div className="tm-summary-texts">
                  <div className="tm-summary-label">현재 잔액</div>
                  <div className="tm-summary-amount">
                    {currentBalance >= 0 ? "" : "-"}
                    {Math.abs(currentBalance).toLocaleString()}원
                  </div>
                </div>
                <div className="tm-summary-icon tm-summary-icon--income">
                  💰
                </div>
              </div>

              {/* 이번주 지출 카드 */}
              <div className="tm-summary-card">
                <div className="tm-summary-texts">
                  <div className="tm-summary-label">이번주 지출</div>
                  <div className="tm-summary-amount tm-summary-amount-expense">
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
              {/* ✅ 여기 버튼이 “거래 내역”과 같은 줄 */}
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
                onEdit={handleOpenEditModal} // ✏️ 수정 콜백 넘기기
              />
            ) : (
              <EmptyState onAddClick={handleOpenCreateModal} />
            )}
          </section>
        </div>
      </main>

      {showModal && (
        <CreateTransactionModal
          form={form}
          mode={editingId ? "edit" : "create"}
          onChange={handleChangeField}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
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
              <td>{t.category}</td>
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
              <td>{t.date}</td>
              <td className="tm-td-center">
                {/* ✏️ 수정 버튼 */}
                <button
                  type="button"
                  className="tm-delete-btn"
                  onClick={() => onEdit(t)}
                  style={{ marginRight: 4 }}
                >
                  ✏️
                </button>
                {/* 🗑 삭제 버튼 */}
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
