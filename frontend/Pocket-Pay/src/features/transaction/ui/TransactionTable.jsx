import { TRANSACTION_TYPE, getCategoryLabel } from "@shared/config/constants";
import { formatDateLocal } from "@shared/utils/date";

export function TransactionTable({ transactions, onDelete, onEdit }) {
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
