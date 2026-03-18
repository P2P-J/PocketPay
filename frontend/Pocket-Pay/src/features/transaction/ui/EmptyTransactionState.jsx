export function EmptyTransactionState({ onAddClick }) {
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
