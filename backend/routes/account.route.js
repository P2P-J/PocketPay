const express = require("express");
const router = express.Router();
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const AccountController = require("../controllers/account.controller");

router.use(loginUserVerify);

router.get("/me", AccountController.getMyAccount);
router.delete("/me", AccountController.deleteMyAccount);
router.patch("/me/password", AccountController.changeMyPassword);

module.exports = router;