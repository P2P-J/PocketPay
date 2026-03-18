require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db.js");
const cors = require("cors");
const AppError = require("./utils/AppError.js");

const app = express();

// 보안 헤더
app.use(helmet());

// CORS 설정 (환경변수 기반)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});
app.use(limiter);

// 인증 엔드포인트 별도 rate limit (브루트포스 방지)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요." },
});
app.use("/auth/login", authLimiter);
app.use("/auth/signup", authLimiter);

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 라우터
app.use(require("./routes"));

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ message: "요청한 경로를 찾을 수 없습니다." });
});

// 글로벌 에러 핸들러
app.use((err, req, res, _next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error("Unhandled Error:", err);
  res.status(500).json({ message: "서버 내부 오류가 발생했습니다." });
});

// JWT_SECRET 강도 체크
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    "⚠️  경고: JWT_SECRET이 설정되지 않았거나 너무 짧습니다. (최소 32자 이상 권장)"
  );
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

// DB 연결 후 서버 시작
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      const mongoose = require("mongoose");
      mongoose.connection.close(false).then(() => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });

    // 10초 후 강제 종료
    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
});

// Unhandled rejection / exception 핸들링
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
