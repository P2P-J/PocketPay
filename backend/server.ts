require("dotenv").config();

// 필수 환경변수 검증
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ 필수 환경변수 ${key}가 설정되지 않았습니다.`);
    process.exit(1);
  }
}

const Sentry = require("@sentry/node");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");
const cors = require("cors");
const AppError = require("./utils/AppError");

// Sentry 초기화 (SENTRY_DSN이 있을 때만)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
}

const app = express();

// ngrok/프록시 뒤에서 실행 시 필요 (X-Forwarded-For 허용)
app.set("trust proxy", 1);

// 보안 헤더
app.use(helmet());

// gzip 응답 압축 — JSON 응답을 평균 70~80% 줄임 (팀 목록/거래 리스트 등 큰 페이로드에 효과적)
app.use(compression());

// CORS 설정 — dev에서도 명시적 allowlist + credentials true 조합의 origin:true는 보안 위험
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:8081"];

// dev: localhost/127.0.0.1 패턴 + LAN IP는 허용. 모바일 앱(origin 없는 fetch)도 통과.
const devOriginCheck = (origin, callback) => {
  if (!origin) return callback(null, true); // 모바일 앱 fetch는 origin 헤더 없음
  if (allowedOrigins.includes(origin)) return callback(null, true);
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  callback(new Error("CORS 거절"));
};

app.use(
  cors({
    origin: isDev ? devOriginCheck : allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());

// Rate Limiting
// 모바일 SPA + NAT 공유(가족/회사/캐리어) 환경 고려해 한도를 크게 잡음.
// 화면 1회 진입에 5~10개 요청이 발생하므로 분당 ~150 수준으로 설정.
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});
app.use(limiter);

// 인증 엔드포인트 별도 rate limit (브루트포스 방지) - 짧은 창 + 적은 횟수 유지
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
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

// JWT_SECRET 강도 체크 — undefined인 채로 서버 켜지면 jwt.sign이 런타임 500으로 새므로 항상 fail-fast
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET 환경변수가 없습니다. 서버를 시작할 수 없습니다.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET이 너무 짧습니다. 최소 32자 이상 필요합니다.");
  process.exit(1);
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
