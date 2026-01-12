const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const AppError = require("../../utils/AppError");

const RECEIPT_API_URL = process.env.DOCUMENT_APIGW_URL;
const RECEIPT_SECRET_KEY = process.env.DOCUMENT_SECRET_KEY;
const GENERAL_API_URL = process.env.GENERAL_APIGW_URL;
const GENERAL_SECRET_KEY = process.env.GENERAL_SECRET_KEY;

// 1. 공통 API 호출 함수
async function callClovaAPI(url, secretKey, requestIdPrefix, imagePath) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const message = {
      version: "V2",
      requestId: requestIdPrefix + Date.now(),
      timestamp: Date.now(),
      images: [{ format: "jpg", name: path.basename(imagePath) }],
    };

    formData.append("message", JSON.stringify(message));

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-OCR-SECRET": secretKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`OCR API Error (${requestIdPrefix}):`, error.message);
    return null;
  }
}

// 2. 텍스트 추출
function extractFullText(generalResult) {
  if (!generalResult?.images?.[0]?.fields) return "";
  return generalResult.images[0].fields.map((f) => f.inferText).join("\n");
}

// 3. 데이터 파싱 로직
function extractReceiptData(receiptResult, fullText) {
  if (!receiptResult?.images?.[0]?.receipt?.result) return null;

  const image = receiptResult.images[0];
  const receipt = image.receipt.result;

  const parsePrice = (text) => {
    if (!text) return 0;
    const numStr = text.toString().replace(/[^0-9]/g, "");
    return parseInt(numStr, 10) || 0;
  };

  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    let cleanStr = dateStr.replace(/\s/g, "");
    let match = cleanStr.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(
        2,
        "0"
      )}`;
    }
    match = cleanStr.match(/(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      return `20${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(
        2,
        "0"
      )}`;
    }
    return null;
  };

  // 가격 1차 추출 (영수증 API 결과)
  let price = 0;
  if (receipt.totalPrice?.price?.formatted?.value) {
    price = parsePrice(receipt.totalPrice.price.formatted.value);
  } else if (receipt.totalPrice?.price?.text) {
    price = parsePrice(receipt.totalPrice.price.text);
  }

  // 가격 보정 로직
  if (price < 100 && fullText) {
    const flatText = fullText.replace(/\n/g, " ").replace(/\s+/g, " ");
    const cleanText = flatText.replace(
      /(?:취소|요청|선승인)[^0-9]*[0-9,]+\s*원[^0-9]*/gi,
      " "
    );

    const priorityPatterns = [
      /(?:결제금액|승인금액|결제요금)[:\s]*([0-9,]+)\s*원?/gi,
      /합\s*계[:\s]*([0-9,]+)\s*원?/gi,
    ];

    for (const pattern of priorityPatterns) {
      const matches = [...cleanText.matchAll(pattern)];
      for (const match of matches) {
        const extracted = parsePrice(match[1]);
        if (extracted >= 100 && extracted < 10000000 && price < 100) {
          price = extracted;
        }
      }
    }

    if (price < 100) {
      const keywordPatterns = [
        /(?:금액|요금)[:\s]*([0-9,]+)\s*원/gi,
        /총\s*액[:\s]*([0-9,]+)/gi,
      ];

      for (const pattern of keywordPatterns) {
        const matches = [...cleanText.matchAll(pattern)];
        for (const match of matches) {
          const extracted = parsePrice(match[1]);
          if (extracted >= 100 && extracted < 10000000 && extracted > price) {
            price = extracted;
          }
        }
      }
    }

    if (price < 100) {
      const amountPattern = /([0-9,]+)\s*원/g;
      const matches = [...cleanText.matchAll(amountPattern)];
      for (const match of matches) {
        const extracted = parsePrice(match[1]);
        if (extracted >= 100 && extracted < 1000000 && extracted > price) {
          price = extracted;
        }
      }
    }
  }

  // 날짜 추출
  let rawDate = "";
  if (receipt.paymentInfo?.date?.formatted?.year) {
    const { year, month, day } = receipt.paymentInfo.date.formatted;
    rawDate = `${year}-${month}-${day}`;
  } else if (receipt.paymentInfo?.date?.text) {
    rawDate = receipt.paymentInfo.date.text;
  }

  // 날짜 보정
  if ((!rawDate || rawDate.startsWith("-")) && fullText) {
    const datePatterns = [
      /(?:거\s*래\s*일\s*시|날\s*짜|일\s*시)[:\s]*([\d]{2,4}[-./][\d]{1,2}[-./][\d]{1,2})/,
      /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
      /(\d{2}[-./]\d{1,2}[-./]\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        rawDate = match[1];
        break;
      }
    }
  }

  const date = normalizeDate(rawDate);
  const rawBizNum = receipt.storeInfo?.bizNum?.text || "";
  const normalizedBizNum = rawBizNum.replace(/[^0-9]/g, "") || "N/A";

  return {
    storeInfo: receipt.storeInfo?.name?.text || "N/A",
    price: price > 0 ? price : 0,
    date: date,
    businessNumber: normalizedBizNum,
  };
}

// 4. 외부에서 호출할 메인 함수
const processReceiptImage = async (imagePath) => {
  // 영수증 Document OCR 우선 호출
  const receiptResult = await callClovaAPI(
    RECEIPT_API_URL,
    RECEIPT_SECRET_KEY,
    "receipt-",
    imagePath
  );

  // 보조용 General OCR 호출
  const generalResult = await callClovaAPI(
    GENERAL_API_URL,
    GENERAL_SECRET_KEY,
    "general-",
    imagePath
  );
  const fullText = extractFullText(generalResult);

  if (receiptResult) {
    return extractReceiptData(receiptResult, fullText);
  }

  throw AppError.badRequest("영수증 데이터를 인식할 수 없습니다.");
};

module.exports = { processReceiptImage };
