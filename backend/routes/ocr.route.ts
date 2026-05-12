const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const ocrController = require("../controllers/ocr.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

// OCR은 Naver Clova 비용 + CPU 부담 발생 — 사용자당 분당 10회 (loginUserVerify 통과 후 user 기준)
const ocrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "OCR 요청이 너무 많아요. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.userId || req.ip,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // mimetype은 1차 필터 (클라이언트가 위장 가능 — 실제 검증은 magic-byte로)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("이미지 파일만 업로드 가능합니다. (jpg, png, webp)"));
    }
    cb(null, true);
  },
});

// magic-byte로 실제 이미지 포맷 검증 (mimetype 위장 방지)
const isValidImageMagic = (buf: Buffer): boolean => {
  if (!buf || buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;
  // WEBP: 'RIFF' ???? 'WEBP'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
};

// 파일명 안전 변환 (Clova API filename 전달 + path traversal/제어문자 방지)
const sanitizeFilename = (name: string): string => {
  if (!name) return "upload.jpg";
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100) || "upload.jpg";
};

// Multer 에러 핸들링 + magic-byte 검증
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
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "파일이 없습니다." });
    }
    if (!isValidImageMagic(req.file.buffer)) {
      return res.status(400).json({ message: "유효하지 않은 이미지 파일입니다." });
    }
    req.file.originalname = sanitizeFilename(req.file.originalname);
    next();
  });
};

router.post("/analyze", loginUserVerify, ocrLimiter, handleUpload, ocrController.analyzeImage);

module.exports = router;
