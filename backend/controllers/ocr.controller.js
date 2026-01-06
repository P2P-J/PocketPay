const ocrService = require("../services/ocr.service");
const fs = require("fs");

const analyzeImage = async (req, res) => {
  try {
    // multer를 통해 업로드된 파일 정보 확인
    if (!req.file) {
      return res.status(400).json({ message: "이미지 파일이 필요합니다." });
    }

    const filePath = req.file.path; // 서버에 저장된 임시 경로

    // 서비스 호출
    const data = await ocrService.processReceiptImage(filePath);

    // 처리가 끝났으니 임시 파일 삭제 (서버 용량 확보)
    fs.unlink(filePath, (err) => {
      if (err) console.error("임시 파일 삭제 실패:", err);
    });

    // 성공 응답
    return res.status(200).json({
      message: "분석 성공",
      data: data,
    });
  } catch (error) {
    console.error("OCR Controller Error:", error);
    // 에러 발생 시에도 임시 파일은 삭제 시도
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});

    return res
      .status(500)
      .json({ message: "OCR 분석 중 오류가 발생했습니다." });
  }
};

module.exports = { analyzeImage };
