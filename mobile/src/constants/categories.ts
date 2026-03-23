export const TRANSACTION_TYPE = {
  INCOME: "income",
  EXPENSE: "expense",
} as const;

// 지출 카테고리 (가계부 앱 + 소모임 장부 기반)
export const EXPENSE_CATEGORIES = [
  // 식비/음료
  { value: "meal", label: "식비", emoji: "🍽️" },
  { value: "cafe", label: "카페/음료", emoji: "☕" },
  { value: "snack", label: "간식", emoji: "🍰" },
  // 모임 활동
  { value: "activity", label: "활동비", emoji: "⚽" },
  { value: "rent", label: "장소대관", emoji: "🏠" },
  { value: "event", label: "행사비", emoji: "🎪" },
  { value: "gift", label: "경조사/선물", emoji: "🎁" },
  // 운영
  { value: "supplies", label: "비품/소모품", emoji: "📦" },
  { value: "print", label: "인쇄/복사", emoji: "🖨️" },
  { value: "delivery", label: "배달비", emoji: "🛵" },
  // 이동
  { value: "transport", label: "교통비", emoji: "🚌" },
  { value: "parking", label: "주차비", emoji: "🅿️" },
  // 기타
  { value: "fee", label: "수수료", emoji: "💳" },
  { value: "etc", label: "기타", emoji: "📋" },
] as const;

// 수입 카테고리 (소모임/단체 장부 기반)
export const INCOME_CATEGORIES = [
  { value: "membership", label: "회비", emoji: "💰" },
  { value: "dues", label: "월회비", emoji: "📅" },
  { value: "admission", label: "입회비", emoji: "🎟️" },
  { value: "donation", label: "후원금", emoji: "❤️" },
  { value: "eventIncome", label: "행사수입", emoji: "🎉" },
  { value: "sales", label: "판매수입", emoji: "🛒" },
  { value: "interest", label: "이자수입", emoji: "🏦" },
  { value: "refund", label: "환불", emoji: "↩️" },
  { value: "carryover", label: "이월금", emoji: "📊" },
  { value: "otherIncome", label: "기타수입", emoji: "📋" },
] as const;

// 통합 라벨 맵 (조회 시 사용)
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries([
  ...EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
  ...INCOME_CATEGORIES.map((c) => [c.value, c.label]),
  // 레거시 호환
  ["traffic", "교통비"],
  ["item", "비품/소모품"],
  ["place", "장소대관"],
  ["sponsor", "후원금"],
  ["etc-income", "기타수입"],
]);

// 통합 이모지 맵
export const CATEGORY_EMOJIS: Record<string, string> = Object.fromEntries([
  ...EXPENSE_CATEGORIES.map((c) => [c.value, c.emoji]),
  ...INCOME_CATEGORIES.map((c) => [c.value, c.emoji]),
  // 레거시 호환
  ["traffic", "🚌"],
  ["item", "📦"],
  ["place", "🏠"],
  ["sponsor", "❤️"],
  ["etc-income", "📋"],
]);

export function getCategoryLabel(value: string | null | undefined): string {
  if (!value || value === "-") return "-";
  return CATEGORY_LABELS[value] || value;
}

export function getCategoryEmoji(value: string | null | undefined): string {
  if (!value) return "📋";
  return CATEGORY_EMOJIS[value] || "📋";
}
