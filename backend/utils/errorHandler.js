const handleError = (res, err) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 에러가 발생했습니다.";

  if (!err.statusCode) {
    console.error("Unexpected Error:", err);
  }

  return res.status(statusCode).json({ message });
};

module.exports = { handleError };
