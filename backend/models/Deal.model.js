const mongoose = require("mongoose");

const DealSchema = new mongoose.Schema({
  storeInfo: { type: String, index: true }, // 상호명
  division: { type: String }, // 구분(수익/지출)
  description: String, // 설명(사용자가 직접 적는거임)
  category: { type: String }, // 카테고리
  price: { type: Number, required: true }, // 가격
  businessNumber: { type: String }, // 사업자 번호
  date: { type: Date }, // 날짜
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Deal", DealSchema);
