import mongoose, { Document, Types } from "mongoose";

interface ITeamMember {
  user: Types.ObjectId;
  role: "owner" | "member";
  joinedAt: Date;
}

interface ITeamPendingInvite {
  user: Types.ObjectId;
  invitedBy: Types.ObjectId;
  invitedAt: Date;
}

interface ITeamAccount {
  bank: string;
  number: string;
  holder: string;
}

/**
 * Team 모델
 * - owner: 팀 소유자 (수정/삭제 권한 확인용)
 * - members: 팀원 목록 (owner 포함, 조회 권한 확인용)
 * - members[].role: "owner" 또는 "member" (UI 표시용)
 *
 * 참고: owner와 members[role="owner"]가 중복되지만,
 * owner는 빠른 권한 체크용, members는 전체 멤버 관리용으로 분리됨
 */
interface ITeam extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: ITeamMember[];
  pendingInvites: ITeamPendingInvite[];
  inviteToken?: string;
  inviteTokenExpiry?: Date;
  category: "friend" | "club";
  displayMode: "nickname" | "realName";
  accountMode: "personal" | "team";
  feeEnabled: boolean;
  account?: ITeamAccount;
  feeAmount: number;
  feeDueDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new mongoose.Schema<ITeam>({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
    }],
    pendingInvites: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        invitedAt: { type: Date, default: Date.now },
    }],
    inviteToken: { type: String, index: true, sparse: true },
    inviteTokenExpiry: { type: Date },
    category: { type: String, enum: ["friend", "club"], default: "friend" },
    displayMode: { type: String, enum: ["nickname", "realName"], default: "nickname" },
    accountMode: { type: String, enum: ["personal", "team"], default: "personal" },
    feeEnabled: { type: Boolean, default: false },
    account: {
        bank: { type: String, trim: true },
        number: { type: String, trim: true },
        holder: { type: String, trim: true },
    },
    feeAmount: { type: Number, default: 0 },
    feeDueDay: { type: Number, default: 1, min: 1, max: 31 },
}, {
    timestamps: true
});

// getMyTeams / getTeam / fee / push 등 다수 쿼리가 "내가 속한 팀" 검색을 위해
// { "members.user": userId } 로 조회 → multi-key index 필수
TeamSchema.index({ "members.user": 1 });
// pendingInvites도 invitation 라우트에서 자주 조회됨
TeamSchema.index({ "pendingInvites.user": 1 });

module.exports = mongoose.model<ITeam>("Team", TeamSchema);
