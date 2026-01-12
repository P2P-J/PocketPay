const express = require("express");
const router = express.Router();
const multer = require("multer");
const ocrController = require("../controllers/ocr.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 제한 일단 5MB로 걸어뒀습니다
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("이미지 파일만 업로드 가능합니다. (jpg, png, webp)"));
    }
    cb(null, true);
  },
});

// Multer 에러 핸들링 미들웨어
const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "파일 크기는 5MB를 초과할 수 없습니다." });
      }
      return res.status(400).json({ message: `파일 업로드 오류: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.post("/analyze", loginUserVerify, handleUpload, ocrController.analyzeImage);

module.exports = router;
