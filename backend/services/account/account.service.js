const { User, WithdrawnOauth } = require("../../models/index");
const providers = require("../auth/providers");
const { comparePassword, hashPassword } = require("../../utils/bcrypt.util");

// 계정 정보 조회 GET /account/me
const getMyAccount = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
    }

    return user;
};

// 계정 탈퇴 DELETE /account/me
const deleteMyAccount = async (userId) => {
    const user = await User.findById(userId).select(
        "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken"
    );

    if (!user) { throw new Error("사용자를 찾을 수 없습니다."); }

    const provider = user.provider;
    const providerId = user.providerId;

    try {
        if (provider === "naver") {
            const rt = user.oauthTokens?.naver?.refreshToken;
            if (rt && providers.naver?.revokeToken) {
                await providers.naver.revokeToken(rt);
            }
        } else if (provider === "google") {
            const rt = user.oauthTokens?.google?.refreshToken;
            if (rt && providers.google?.revokeToken) {
                await providers.google.revokeToken(rt);
            }
        } else { // enum에 없는 provider가 들어온 경우
            if (provider === "local") {
                // 로컬 회원가입 사용자는 별도 처리 없음
            } else
                console.warn("UNKNOWN_PROVIDER:", user.provider);
        }
    } catch (e) {
        // revoke 실패해도 탈퇴는 진행됨
        // 외부 장애로 revoke 실패했을 때만 동의 페이지가 안 뜰 수도 있음
        console.error("OAUTH_REVOKE_FAILED:", provider, e.response?.data || e.message);
    }

    // google/oauth 탈퇴 기록 남기기
    if (provider === "google" && providerId) {
        await WithdrawnOauth.updateOne(
            { provider: "google", providerId },
            { $set: { provider: "google", providerId, withdrawnAt: new Date() } },
            { upsert: true }
        );
    }

    await User.deleteOne({ _id: userId });

    return { provider };
};

// 비밀번호 변경 PUT /account/me/password
const changeMyPassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId).select("+password");

    if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
    }
    if (user.provider !== "local") {
        throw new Error("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
    }
    
    const match = await comparePassword(currentPassword, user.password);
    if (!match) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.");
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    return;
};

module.exports = {
    getMyAccount,
    deleteMyAccount,
    changeMyPassword,
}