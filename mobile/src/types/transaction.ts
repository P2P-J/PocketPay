export interface Deal {
  _id: string;
  storeInfo: string;
  division: string;
  description: string;
  category: string;
  price: number;
  date: string;
  businessNumber?: string;
  receiptUrl?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  date: string;
  receiptUrl?: string;
}

export interface DealPayload {
  storeInfo: string;
  division: string;
  description: string;
  category: string;
  price: number;
  date: string;
  teamId?: string;
  businessNumber?: string;
  receiptUrl?: string;
}

// 백엔드 division: "수입" | "지출" ↔ 프론트 type: "income" | "expense"
function divisionToType(division: string): "income" | "expense" {
  if (division === "수입" || division === "income") return "income";
  return "expense";
}

function typeToDivision(type: string): "수입" | "지출" {
  if (type === "income" || type === "수입") return "수입";
  return "지출";
}

export function dealToTransaction(deal: Deal): Transaction {
  return {
    id: deal._id,
    merchant: deal.storeInfo || "",
    type: divisionToType(deal.division),
    description: deal.description || "",
    category: deal.category || "",
    amount: deal.price || 0,
    date: deal.date || "",
    receiptUrl: deal.receiptUrl,
  };
}

export function transactionToDealPayload(
  transaction: Partial<Transaction> & { teamId?: string; businessNumber?: string }
): DealPayload {
  return {
    storeInfo: transaction.merchant || "",
    division: typeToDivision(transaction.type || "expense"),
    description: transaction.description || "",
    category: transaction.category || "기타",
    price: Number(transaction.amount) || 0,
    date: transaction.date || new Date().toISOString().split("T")[0],
    teamId: transaction.teamId,
    businessNumber: transaction.businessNumber,
    receiptUrl: transaction.receiptUrl,
  };
}
