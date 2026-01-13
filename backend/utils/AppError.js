/**
 * 커스텀 에러 클래스
 * Service에서 적절한 HTTP 상태 코드와 함께 에러를 던질 수 있음!!
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 예상된 에러인지 구분

    Error.captureStackTrace(this, this.constructor);
  }

  // 자주 쓰는 에러 타입들을 static 하게 메서드로써 제공
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
