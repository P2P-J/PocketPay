const mongoose = require("mongoose");

/**
 * Team 모델
 * - owner: 팀 소유자 (수정/삭제 권한 확인용)
 * - members: 팀원 목록 (owner 포함, 조회 권한 확인용)
 * - members[].role: "owner" 또는 "member" (UI 표시용)
 * 
 * 참고: owner와 members[role="owner"]가 중복되지만,
 * owner는 빠른 권한 체크용, members는 전체 멤버 관리용으로 분리됨
 */
const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Team", TeamSchema);