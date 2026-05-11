export type AccountSnapshot = {
  bank: string;
  number: string;
  holder: string;
};

export type DutchRequestNotification = {
  _id: string;
  teamId: string;
  teamName: string;
  teamDisplayMode: "nickname" | "realName";
  requesterId: string;
  requesterName?: string;
  requesterNickname?: string;
  requesterHandle?: string;
  requesterDisplayName: string;
  amount: number;
  totalAmount: number;
  participantCount: number;
  memo?: string;
  accountSnapshot: AccountSnapshot;
  createdAt: string;
  expiresAt: string;
};

export type CreateDutchRequestPayload = {
  teamId: string;
  recipientIds: string[];
  amount: number;
  totalAmount: number;
  participantCount: number;
  memo?: string;
};

export type CreateDutchResponse = {
  count: number;
  account: AccountSnapshot;
};
