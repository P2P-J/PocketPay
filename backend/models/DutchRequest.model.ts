import mongoose, { Document, Types } from "mongoose";

interface IAccountSnapshot {
  bank: string;
  number: string;
  holder: string;
}

interface IDutchRequest extends Document {
  requester: Types.ObjectId;
  team: Types.ObjectId;
  recipient: Types.ObjectId;
  amount: number;
  memo?: string;
  totalAmount: number;
  participantCount: number;
  accountSnapshot: IAccountSnapshot;
  status: "pending" | "dismissed";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DutchRequestSchema = new mongoose.Schema<IDutchRequest>({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    memo: { type: String, trim: true, maxlength: 50 },
    totalAmount: { type: Number, required: true, min: 0 },
    participantCount: { type: Number, required: true, min: 1 },
    accountSnapshot: {
        bank: { type: String, required: true },
        number: { type: String, required: true },
        holder: { type: String, required: true },
    },
    status: { type: String, enum: ["pending", "dismissed"], default: "pending" },
    expiresAt: { type: Date, required: true, index: true },
}, {
    timestamps: true,
});

// 받는 사람의 pending + 미만료 빠른 조회용 복합 인덱스
DutchRequestSchema.index({ recipient: 1, status: 1, expiresAt: 1 });

module.exports = mongoose.model<IDutchRequest>("DutchRequest", DutchRequestSchema);
