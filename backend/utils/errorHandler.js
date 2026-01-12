/**
 * Controller 에러 응답 헬퍼 함수
 * AppError의 statusCode를 사용하고, 없으면 500 반환
 */
const handleError = (res, err) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 에러가 발생했습니다.";

  if (!err.statusCode) {
    console.error("Unexpected Error:", err);
  }

  return res.status(statusCode).json({ message });
};

module.exports = { handleError };
