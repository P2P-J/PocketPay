import type { Response } from "express";
const Sentry = require("@sentry/node");

interface AppErrorLike extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

const handleError = (res: Response, err: AppErrorLike): Response => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 에러가 발생했습니다.";

  // 예상치 못한 에러 (AppError가 아닌 것)만 Sentry에 전송
  if (!err.isOperational) {
    Sentry.captureException(err);
    console.error("Unexpected Error:", err);
  }

  return res.status(statusCode).json({ message });
};

module.exports = { handleError };
