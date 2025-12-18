const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
require("dotenv").config();

// env 로드
const OCR_SECRET_KEY = process.env.SECRET_KEY;
const OCR_API_URL = process.env.APIGW_URL;

// 이미지 경로
const imagePath = "static/image.png";

if (!fs.existsSync(imagePath)) {
  console.error("이미지 파일을 찾을 수 없습니다:", imagePath);
  process.exit(1);
}

// CLOVA OCR 호출
async function callClovaOCR(imagePath) {
  const formData = new FormData();

  const payload = {
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [{ format: "png", name: "receipt" }],
  };

  formData.append("message", JSON.stringify(payload));
  formData.append("file", fs.createReadStream(imagePath));

  const response = await axios.post(OCR_API_URL, formData, {
    headers: {
      ...formData.getHeaders(),
      "X-OCR-SECRET": OCR_SECRET_KEY,
    },
  });

  return response.data;
}

// 실행
(async () => {
  try {
    console.log("CLOVA OCR 요청 중...\n");

    const ocrResult = await callClovaOCR(imagePath);

    // JSON 전체 출력
    console.log("OCR FULL JSON ====================");
    console.log(JSON.stringify(ocrResult, null, 2));
    console.log("=====================================\n");

    console.log("OCR TEXT (위에서 아래 순서) =======");

    const fields = ocrResult.images[0].fields;

    fields
      .sort(
        (a, b) => a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y
      )
      .forEach((f) => {
        const y = f.boundingPoly.vertices[0].y;
        console.log(`[y=${y}] ${f.inferText}`);
      });

    console.log("=====================================");
  } catch (err) {
    console.error("OCR 오류");
    console.error(err.response?.data || err.message);
  }
})();
