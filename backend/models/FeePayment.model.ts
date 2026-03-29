import mongoose, { Document, Types } from "mongoose";

interface IFeePayment extends Document {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  year: number;
  month: number;
  amount: number;
  paidAt: Date;
  confirmedBy: Types.ObjectId;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema = new mongoose.Schema<IFeePayment>({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  amount: { type: Number, required: true, min: 0 },
  paidAt: { type: Date, default: Date.now },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  note: { type: String, default: "" },
}, {
  timestamps: true,
});

// 팀+유저+연월 조합 유니크 (한 달에 한 건만)
FeePaymentSchema.index({ teamId: 1, userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model<IFeePayment>("FeePayment", FeePaymentSchema);
