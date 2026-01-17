const AccountService = require("../services/account/account.service");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");

const getMyAccount = async (req, res) => {
    try {
        const user = await AccountService.getMyAccount(req.user.userId);

        return res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            provider: user.provider,
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteMyAccount = async (req, res) => {
    try {
        await AccountService.deleteMyAccount(req.user.userId);

        return res.status(200).json({ message: "탈퇴 성공" });
    } catch (error) {
        return handleError(res, error);
    }
};

const changeMyPassword = async (req, res) => {
    try {
        await AccountService.changeMyPassword(
            req.user.userId,
            req.body.currentPassword,
            req.body.newPassword
        );

        return res.status(200).json({ message: "비밀번호 변경 성공" });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getMyAccount,
    deleteMyAccount,
    changeMyPassword,
};