const AccountService = require("../services/account/account.service");
const { handleError } = require("../utils/errorHandler");

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
    return handleError(res, err);
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    await AccountService.deleteMyAccount(req.user.userId);
    return res.status(204).send();
  } catch (err) {
    return handleError(res, err);
  }
};

const changeMyPassword = async (req, res) => {
  try {
    await AccountService.changeMyPassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    return res.status(200).json({ message: "비밀번호가 변경되었습니다." });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = { getMyAccount, deleteMyAccount, changeMyPassword };
