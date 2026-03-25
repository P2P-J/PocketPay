const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const AppError = require("../../utils/AppError");

// API URL/키는 함수 호출 시점에 바인딩 (모듈 로드 시점에는 env가 아직 세팅 안 될 수 있음)

// 가격 관련 상수
const PRICE_MIN_THRESHOLD = 100;         // 유효한 최소 가격
const PRICE_MAX_PRIORITY = 10_000_000;   // 우선순위 패턴 최대 가격
const PRICE_MAX_FALLBACK = 1_000_000;    // 폴백 패턴 최대 가격

// 가격 추출 우선순위 패턴
const PRIORITY_PRICE_PATTERNS = [
  /(?:결제금액|승인금액|결제요금)[:\s]*([0-9,]+)\s*원?/gi,
  /합\s*계[:\s]*([0-9,]+)\s*원?/gi,
];

const SECONDARY_PRICE_PATTERNS = [
  /(?:금액|요금)[:\s]*([0-9,]+)\s*원/gi,
  /총\s*액[:\s]*([0-9,]+)/gi,
];

const FALLBACK_PRICE_PATTERN = /([0-9,]+)\s*원/g;

// 날짜 추출 패턴
const DATE_PATTERNS = [
  /(?:거\s*래\s*일\s*시|날\s*짜|일\s*시)[:\s]*([\d]{2,4}[-./][\d]{1,2}[-./][\d]{1,2})/,
  /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/,
  /(\d{2}[-./]\d{1,2}[-./]\d{1,2})/,
];

// 취소/선승인 금액 제거 패턴
const CANCEL_PATTERN = /(?:취소|요청|선승인)[^0-9]*[0-9,]+\s*원[^0-9]*/gi;

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
      timeout: 30000,
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

// 가격 파싱 헬퍼
function parsePrice(text) {
  if (!text) return 0;
  const numStr = text.toString().replace(/[^0-9]/g, "");
  return parseInt(numStr, 10) || 0;
}

// 날짜 정규화 헬퍼
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  let cleanStr = dateStr.replace(/\s/g, "");
  let match = cleanStr.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  match = cleanStr.match(/(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    return `20${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  return null;
}

// 패턴에서 가격 추출 헬퍼
function extractPriceFromPatterns(text, patterns, maxPrice, currentPrice) {
  let price = currentPrice;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const extracted = parsePrice(match[1]);
      if (extracted >= PRICE_MIN_THRESHOLD && extracted < maxPrice && extracted > price) {
        price = extracted;
      }
    }
  }
  return price;
}

// 3. 데이터 파싱 로직
function extractReceiptData(receiptResult, fullText) {
  if (!receiptResult?.images?.[0]?.receipt?.result) return null;

  const receipt = receiptResult.images[0].receipt.result;

  // 가격 1차 추출 (영수증 API 결과)
  let price = 0;
  if (receipt.totalPrice?.price?.formatted?.value) {
    price = parsePrice(receipt.totalPrice.price.formatted.value);
  } else if (receipt.totalPrice?.price?.text) {
    price = parsePrice(receipt.totalPrice.price.text);
  }

  // 가격 보정 로직 (OCR 결과에서 가격이 너무 작을 때 일반 텍스트에서 재추출)
  if (price < PRICE_MIN_THRESHOLD && fullText) {
    const flatText = fullText.replace(/\n/g, " ").replace(/\s+/g, " ");
    const cleanText = flatText.replace(CANCEL_PATTERN, " ");

    // 우선순위 패턴으로 추출
    price = extractPriceFromPatterns(cleanText, PRIORITY_PRICE_PATTERNS, PRICE_MAX_PRIORITY, price);

    // 2차 패턴으로 추출
    if (price < PRICE_MIN_THRESHOLD) {
      price = extractPriceFromPatterns(cleanText, SECONDARY_PRICE_PATTERNS, PRICE_MAX_PRIORITY, price);
    }

    // 폴백: "N원" 패턴
    if (price < PRICE_MIN_THRESHOLD) {
      price = extractPriceFromPatterns(cleanText, [FALLBACK_PRICE_PATTERN], PRICE_MAX_FALLBACK, price);
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

  // 날짜 보정 (OCR 결과에서 날짜를 못 읽었을 때 일반 텍스트에서 재추출)
  if ((!rawDate || rawDate.startsWith("-")) && fullText) {
    for (const pattern of DATE_PATTERNS) {
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

// 4. 메인 함수 (병렬 API 호출)
const processReceiptImage = async (imagePath) => {
  const RECEIPT_API_URL = process.env.DOCUMENT_APIGW_URL;
  const RECEIPT_SECRET_KEY = process.env.DOCUMENT_SECRET_KEY;
  const GENERAL_API_URL = process.env.GENERAL_APIGW_URL;
  const GENERAL_SECRET_KEY = process.env.GENERAL_SECRET_KEY;

  // 영수증 Document OCR + General OCR 병렬 호출
  const [receiptResult, generalResult] = await Promise.all([
    callClovaAPI(RECEIPT_API_URL, RECEIPT_SECRET_KEY, "receipt-", imagePath),
    callClovaAPI(GENERAL_API_URL, GENERAL_SECRET_KEY, "general-", imagePath),
  ]);

  const fullText = extractFullText(generalResult);

  if (receiptResult) {
    return extractReceiptData(receiptResult, fullText);
  }

  throw AppError.badRequest("영수증 데이터를 인식할 수 없습니다.");
};

module.exports = { processReceiptImage };
