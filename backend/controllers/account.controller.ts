const AccountService = require("../services/account/account.service");
const { handleError } = require("../utils/errorHandler");

const getMyAccount = async (req, res) => {
  try {
    const user = await AccountService.getMyAccount(req.user.userId);
    res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      handle: user.handle,
      handleChangedAt: user.handleChangedAt,
      account: user.account,
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

const checkHandle = async (req, res) => {
  try {
    const result = await AccountService.checkHandleAvailable(req.query.handle);
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateProfileController = async (req, res) => {
  try {
    const user = await AccountService.updateProfile(req.user.userId, req.body);
    res.status(200).json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        handle: user.handle,
        handleChangedAt: user.handleChangedAt,
        account: user.account,
        provider: user.provider,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateHandleController = async (req, res) => {
  try {
    const user = await AccountService.updateHandle(req.user.userId, req.body);
    res.status(200).json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        handle: user.handle,
        handleChangedAt: user.handleChangedAt,
        account: user.account,
        provider: user.provider,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateMyAccountController = async (req, res) => {
  try {
    const user = await AccountService.updateMyAccount(
      req.user.userId,
      req.body.account
    );
    res.status(200).json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        handle: user.handle,
        handleChangedAt: user.handleChangedAt,
        account: user.account,
        provider: user.provider,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  getMyAccount,
  deleteMyAccount,
  changeMyPassword,
  checkHandle,
  updateProfileController,
  updateHandleController,
  updateMyAccountController,
};
