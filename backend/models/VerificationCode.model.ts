const mongoose = require("mongoose");

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, required: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

// 복합 인덱스: (email, purpose) 쌍으로 빠른 조회
verificationCodeSchema.index({ email: 1, purpose: 1 });
// TTL 인덱스: expiresAt 지나면 MongoDB가 자동 삭제
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VerificationCode", verificationCodeSchema);
