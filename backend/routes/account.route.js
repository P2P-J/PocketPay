const express = require("express");
const router = express.Router();
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const AccountController = require("../controllers/account.controller");

router.use(loginUserVerify);

// 계정 정보 조회 GET /account/me
router.get("/me", AccountController.getMyAccount);

// 계정 탈퇴 DELETE /account/me
router.delete("/me", AccountController.deleteMyAccount);

// 비밀번호 변경 PUT /account/me/changePassword (Local 전용)
router.put("/me/changePassword", AccountController.changeMyPassword);

module.exports = router;