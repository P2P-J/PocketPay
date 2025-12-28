// src/pages/teamMain.jsx
import React, { useMemo, useState } from "react";
import "./teamMain.css";

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

export default function TeamMain() {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null); // ✅ 수정 중인지 구분하는 상태

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
        <AddTransactionModal
          form={form}
          mode={editingId ? "edit" : "create"} // ✅ 모드 구분
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

/* =========================
   임시 모달 컴포넌트
   ========================= */

function AddTransactionModal({ form, onChange, onClose, onSubmit, mode }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const handleTypeChange = (type) => {
    onChange("type", type);
  };

  const isEdit = mode === "edit";

  return (
    <div className="tm-modal-backdrop">
      <div className="tm-modal">
        <h3 className="tm-modal-title">
          {isEdit ? "거래 수정" : "거래 추가 (임시 모달)"}
        </h3>
        <form onSubmit={onSubmit}>
          <div className="tm-modal-body">
            <div className="tm-field">
              <label className="tm-field-label">거래처(상품)</label>
              <input
                className="tm-input"
                name="merchant"
                value={form.merchant}
                onChange={handleChange}
                placeholder="예: 회식, 스타벅스 강남점"
              />
            </div>

            <div className="tm-field tm-field-row">
              <div className="tm-field-half">
                <span className="tm-field-label">구분</span>
                <div className="tm-type-toggle">
                  <button
                    type="button"
                    className={
                      "tm-type-btn " +
                      (form.type === TRANSACTION_TYPE.EXPENSE
                        ? "tm-type-btn--active-expense"
                        : "")
                    }
                    onClick={() => handleTypeChange(TRANSACTION_TYPE.EXPENSE)}
                  >
                    지출
                  </button>
                  <button
                    type="button"
                    className={
                      "tm-type-btn " +
                      (form.type === TRANSACTION_TYPE.INCOME
                        ? "tm-type-btn--active-income"
                        : "")
                    }
                    onClick={() => handleTypeChange(TRANSACTION_TYPE.INCOME)}
                  >
                    수입
                  </button>
                </div>
              </div>

              <div className="tm-field-half">
                <label className="tm-field-label">금액</label>
                <input
                  className="tm-input"
                  name="amount"
                  type="number"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="예: 150000"
                />
              </div>
            </div>

            <div className="tm-field">
              <label className="tm-field-label">설명</label>
              <input
                className="tm-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="예: 동아리 회식"
              />
            </div>

            <div className="tm-field tm-field-row">
              <div className="tm-field-half">
                <label className="tm-field-label">카테고리</label>
                <input
                  className="tm-input"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="예: 식비, 회식 등"
                />
              </div>

              <div className="tm-field-half">
                <label className="tm-field-label">날짜</label>
                <input
                  className="tm-input"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="tm-modal-footer">
            <button
              type="button"
              className="tm-modal-btn tm-modal-btn--secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="tm-modal-btn tm-modal-btn--primary"
            >
              {isEdit ? "수정하기" : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}