const express = require("express");
const router = express.Router();
const multer = require("multer");
const ocrController = require("../controllers/ocr.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

// Multer 설정: 'uploads/' 폴더에 임시 저장
const upload = multer({ dest: "uploads/" });

// POST /ocr/analyze
// 로그인한 사용자만 영수증 분석 가능하도록 미들웨어 추가
router.post(
  "/analyze",
  loginUserVerify,
  upload.single("file"),
  ocrController.analyzeImage
);

module.exports = router;
