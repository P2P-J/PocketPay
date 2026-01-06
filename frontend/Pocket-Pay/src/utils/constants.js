export const TRANSACTION_TYPE = {
  INCOME: "income",
  EXPENSE: "expense",
};

export const CATEGORY_LABELS = {
  meal: "식비",
  transport: "교통비",
  traffic: "교통비", // Alias just in case
  supplies: "비품",
  item: "비품", // Alias
  rent: "장소대관",
  place: "장소대관", // Alias
  etc: "기타",

  membership: "회비",
  donation: "후원금",
  sponsor: "후원금", // Alias
  event: "행사수입",

  "etc-income": "기타수입",
  otherIncome: "기타수입", // Alias
};

export const getCategoryLabel = (value) => {
  if (!value || value === "-") return "-";
  return CATEGORY_LABELS[value] || value;
};
