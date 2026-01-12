const ocrService = require("../services/ocr/ocr.service");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");
const fs = require("fs");

const analyzeImage = async (req, res) => {
  try {
    if (!req.file) {
      throw AppError.badRequest("이미지 파일이 필요합니다.");
    }

    const filePath = req.file.path;
    const data = await ocrService.processReceiptImage(filePath);

    // 임시 파일 삭제
    fs.unlink(filePath, (err) => {
      if (err) 
        console.error("임시 파일 삭제 실패:", err);
    });

    return res.status(200).json({ message: "분석 성공", data });
  } catch (error) {
    if (req.file?.path) 
      fs.unlink(req.file.path, () => {});
    return handleError(res, error);
  }
};

module.exports = { analyzeImage };
