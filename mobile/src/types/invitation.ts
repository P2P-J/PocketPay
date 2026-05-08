export type Invitation = {
  teamId: string;
  teamName: string;
  invitedBy: {
    _id: string;
    name: string;
    email?: string;
  };
  invitedAt: string; // ISO string
};
