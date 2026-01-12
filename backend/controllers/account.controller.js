const AccountService = require("../services/account/account.service");

// 계정 정보 조회 GET /account/me
const getMyAccount = async (req, res) => {
    try {
        const user = await AccountService.getMyAccount(req.user.userId);

        res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            provider: user.provider,
        });
    } catch (err) {
        res.status(404).json({
            message: err.message,
        });
    }
};

// 계정 탈퇴 DELETE /account/me
const deleteMyAccount = async (req, res) => {
    try {
        await AccountService.deleteMyAccount(req.user.userId);

        return res.status(200).json({ ok: true });
    } catch (err) {
        res.status(404).json({
            message: err.message,
        });
    }
};

// 비밀번호 변경 PUT /account/me/changePassword (Local 전용)
const changeMyPassword = async (req, res) => {
    try {
        await AccountService.changeMyPassword(
            req.user.userId,
            req.body.currentPassword,
            req.body.newPassword
        );

        return res.status(200).json({ message: "비밀번호가 변경되었습니다." });
    } catch (err) {
        return res.status(400).json({
            message: err.message,
        });
    }
};

module.exports = {
    getMyAccount,
    deleteMyAccount,
    changeMyPassword,
};