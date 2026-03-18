const mongoose = require("mongoose");

const DealSchema = new mongoose.Schema({
  storeInfo: { type: String, index: true }, // 상호명
  division: { type: String, enum: ["수입", "지출"] }, // 구분(수익/지출)
  description: String, // 설명(사용자가 직접 적는거임)
  category: { type: String }, // 카테고리
  price: { type: Number, required: true, min: 0 }, // 가격
  businessNumber: { type: String }, // 사업자 번호
  date: { type: Date }, // 날짜
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, {
  timestamps: true, // createdAt + updatedAt 자동 관리
});

// 월별 조회 성능을 위한 복합 인덱스
DealSchema.index({ teamId: 1, date: -1 });

module.exports = mongoose.model("Deal", DealSchema);
