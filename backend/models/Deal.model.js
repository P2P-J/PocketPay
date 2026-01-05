const mongoose = require("mongoose");

const DealSchema = new mongoose.Schema({
  storeInfo: { type: String, index: true }, // 상호명
  division: { type: String }, // 구분(수익/지출)
  description: String, // 설명(사용자가 직접 적는거임)
  category: { type: String }, // 카테고리
  price: { type: Number }, // 가격
  businessNumber: { type: String }, // 사업자 번호
  date: { type: Date }, // 날짜
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, // 나중에 수익화(영수증 다시 꺼내오는 기능) 같은 거 고려했을 때 teamId가 있긴 해야되지 않을까?
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Deal", DealSchema);
