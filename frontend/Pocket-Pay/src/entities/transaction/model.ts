/**
 * Transaction Entity - Deal(백엔드) ↔ Transaction(프론트엔드) 변환
 */

export interface Deal {
  _id: string;
  storeInfo: string;
  division: string;
  description: string;
  category: string;
  price: number;
  date: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  type: string;
  description: string;
  category: string;
  amount: number;
  date: string;
}

export interface DealPayload {
  storeInfo: string;
  division: string;
  description: string;
  category: string;
  price: number;
  date: string;
  teamId?: string;
}

/** 백엔드 Deal → 프론트엔드 Transaction */
export function dealToTransaction(deal: Deal): Transaction {
  return {
    id: deal._id,
    merchant: deal.storeInfo,
    type: deal.division,
    description: deal.description,
    category: deal.category,
    amount: deal.price,
    date: deal.date,
  };
}

/** 프론트엔드 Transaction → 백엔드 Deal payload */
export function transactionToDealPayload(transaction: Transaction, teamId?: string): DealPayload {
  const payload: DealPayload = {
    storeInfo: transaction.merchant,
    division: transaction.type,
    description: transaction.description,
    category: transaction.category,
    price: Number(transaction.amount),
    date: transaction.date,
  };

  if (teamId) {
    payload.teamId = teamId;
  }

  return payload;
}
