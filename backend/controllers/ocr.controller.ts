const ocrService = require("../services/ocr/ocr.service");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");
const { uploadBuffer, isCloudinaryConfigured } = require("../config/cloudinary");

const analyzeImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      throw AppError.badRequest("이미지 파일이 필요합니다.");
    }

    const { buffer, originalname } = req.file;

    // OCR 처리 + Cloudinary 업로드 병렬 실행
    const cloudinaryPromise = isCloudinaryConfigured()
      ? uploadBuffer(buffer).catch((err) => {
          console.error("[Cloudinary upload failed]", err?.message);
          return null;
        })
      : Promise.resolve(null);

    const [ocrData, uploadResult] = await Promise.all([
      ocrService.processReceiptImage(buffer, originalname),
      cloudinaryPromise,
    ]);

    const receiptUrl = uploadResult?.secure_url || null;

    return res.status(200).json({
      message: "분석 성공",
      data: { ...ocrData, receiptUrl },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = { analyzeImage };
