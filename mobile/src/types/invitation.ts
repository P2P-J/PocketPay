export type Invitation = {
  teamId: string;
  teamName: string;
  invitedBy: {
    _id: string;
    name: string;
    nickname?: string;
    handle?: string;
    email?: string;
  };
  invitedAt: string; // ISO string
};
