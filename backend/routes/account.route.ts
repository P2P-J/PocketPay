const express = require("express");
const router = express.Router();
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  changePasswordSchema,
  updateProfileSchema,
  updateHandleSchema,
  updateMyAccountSchema,
} = require("../validators/auth.validator");
const AccountController = require("../controllers/account.controller");

router.use(loginUserVerify);

// 계정 정보 조회 GET /account/me
router.get("/me", AccountController.getMyAccount);

// 계정 탈퇴 DELETE /account/me
router.delete("/me", AccountController.deleteMyAccount);

// 비밀번호 변경 PUT /account/me/changePassword (Local 전용)
router.put("/me/changePassword", validate(changePasswordSchema), AccountController.changeMyPassword);

// handle 사용 가능 여부 GET /account/check-handle?handle=xxx
router.get("/check-handle", AccountController.checkHandle);

// 프로필 수정 PATCH /account/profile
router.patch("/profile", validate(updateProfileSchema), AccountController.updateProfileController);

// handle 변경 PATCH /account/handle (30일 제한)
router.patch("/handle", validate(updateHandleSchema), AccountController.updateHandleController);

// 개인 계좌 등록/수정/삭제 PATCH /account/account
router.patch(
  "/account",
  validate(updateMyAccountSchema),
  AccountController.updateMyAccountController
);

module.exports = router;
