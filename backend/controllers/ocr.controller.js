const ocrService = require("../services/ocr/ocr.service");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");
const fs = require("fs/promises");

const cleanupFile = async (filePath) => {
  try {
    if (filePath) await fs.unlink(filePath);
  } catch {
    // 파일이 이미 없는 경우 무시
  }
};

const analyzeImage = async (req, res) => {
  try {
    if (!req.file) {
      throw AppError.badRequest("이미지 파일이 필요합니다.");
    }

    const data = await ocrService.processReceiptImage(req.file.path);
    await cleanupFile(req.file.path);

    return res.status(200).json({ message: "분석 성공", data });
  } catch (error) {
    await cleanupFile(req.file?.path);
    return handleError(res, error);
  }
};

module.exports = { analyzeImage };
