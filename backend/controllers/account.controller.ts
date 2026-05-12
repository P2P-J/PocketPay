const AccountService = require("../services/account/account.service");
const { handleError } = require("../utils/errorHandler");

// User 객체를 클라이언트 응답 형식으로 직렬화 (모든 me/profile/handle/account 응답 공통)
const serializeUser = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  handle: user.handle,
  handleChangedAt: user.handleChangedAt,
  account: user.account,
  pushTokens: user.pushTokens,
  notificationsLastViewedAt: user.notificationsLastViewedAt,
  provider: user.provider,
});

const getMyAccount = async (req, res) => {
  try {
    const user = await AccountService.getMyAccount(req.user.userId);
    res.status(200).json(serializeUser(user));
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
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateHandleController = async (req, res) => {
  try {
    const user = await AccountService.updateHandle(req.user.userId, req.body);
    res.status(200).json({ data: serializeUser(user) });
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
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const registerPushTokenController = async (req, res) => {
  try {
    const user = await AccountService.registerPushToken(
      req.user.userId,
      req.body.token
    );
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const removePushTokenController = async (req, res) => {
  try {
    const result = await AccountService.removePushToken(
      req.user.userId,
      req.body.token
    );
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const markNotificationsViewedController = async (req, res) => {
  try {
    const user = await AccountService.markNotificationsViewed(req.user.userId);
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const getUnreadCountController = async (req, res) => {
  try {
    const result = await AccountService.getUnreadCount(req.user.userId);
    res.status(200).json({ data: result });
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
  registerPushTokenController,
  removePushTokenController,
  markNotificationsViewedController,
  getUnreadCountController,
};
