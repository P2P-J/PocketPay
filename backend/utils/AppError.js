class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "잘못된 요청입니다.") {
    return new AppError(message, 400);
  }

  static unauthorized(message = "인증이 필요합니다.") {
    return new AppError(message, 401);
  }

  static forbidden(message = "접근 권한이 없습니다.") {
    return new AppError(message, 403);
  }

  static notFound(message = "리소스를 찾을 수 없습니다.") {
    return new AppError(message, 404);
  }

  static internal(message = "서버 에러가 발생했습니다.") {
    return new AppError(message, 500);
  }
}

module.exports = AppError;
