const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const RECEIPT_API_URL = process.env.DOCUMENT_APIGW_URL;
const RECEIPT_SECRET_KEY = process.env.DOCUMENT_SECRET_KEY;
const GENERAL_API_URL = process.env.GENERAL_APIGW_URL;
const GENERAL_SECRET_KEY = process.env.GENERAL_SECRET_KEY;

async function processReceipt(imagePath) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const message = {
      version: "V2",
      requestId: "receipt-" + Date.now(),
      timestamp: Date.now(),
      images: [
        {
          format: "jpg",
          name: path.basename(imagePath),
        },
      ],
    };

    formData.append("message", JSON.stringify(message));

    const response = await axios.post(RECEIPT_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-OCR-SECRET": RECEIPT_SECRET_KEY,
      },
    });

    return response.data;
  } catch (error) {
    return null;
  }
}

async function processGeneralOCR(imagePath) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const message = {
      version: "V2",
      requestId: "general-" + Date.now(),
      timestamp: Date.now(),
      images: [
        {
          format: "jpg",
          name: path.basename(imagePath),
        },
      ],
    };

    formData.append("message", JSON.stringify(message));

    const response = await axios.post(GENERAL_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-OCR-SECRET": GENERAL_SECRET_KEY,
      },
    });

    return response.data;
  } catch (error) {
    return null;
  }
}

function extractFullText(generalResult) {
  if (
    !generalResult ||
    !generalResult.images ||
    generalResult.images.length === 0
  ) {
    return "";
  }

  const image = generalResult.images[0];
  if (!image.fields) return "";

  return image.fields.map((field) => field.inferText).join("\n");
}

function extractReceiptData(receiptResult, fullText) {
  if (
    !receiptResult ||
    !receiptResult.images ||
    receiptResult.images.length === 0
  ) {
    return null;
  }

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
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `${match[1]}-${month}-${day}`;
    }
    match = cleanStr.match(/(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `20${match[1]}-${month}-${day}`;
    }
    return null;
  };

  let price = 0;

  if (receipt.totalPrice?.price?.formatted?.value) {
    price = parsePrice(receipt.totalPrice.price.formatted.value);
  } else if (receipt.totalPrice?.price?.text) {
    price = parsePrice(receipt.totalPrice.price.text);
  }

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

  let date = "N/A";
  let rawDate = "";

  if (receipt.paymentInfo?.date?.formatted) {
    const { year, month, day } = receipt.paymentInfo.date.formatted;
    if (year && year.length >= 2) {
      rawDate = `${year}-${month}-${day}`;
    }
  } else if (receipt.paymentInfo?.date?.text) {
    rawDate = receipt.paymentInfo.date.text;
  }

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

  const standardizedDate = normalizeDate(rawDate);
  if (standardizedDate) date = standardizedDate;

  // 사업자번호 정규화 (숫자만)
  const rawBizNum = receipt.storeInfo?.bizNum?.text || "";
  const normalizedBizNum = rawBizNum.replace(/[^0-9]/g, "") || "N/A";

  return {
    상호명: receipt.storeInfo?.name?.text || "N/A",
    구분: "지출",
    사업자번호: normalizedBizNum,
    상품가격: price > 0 ? price : "N/A",
    날짜: date,
  };
}

async function main() {
  const staticFolder = path.join(__dirname, "static");
  const results = [];

  const testFiles = [1, 20];
  for (let idx = 0; idx < testFiles.length; idx++) {
    const i = testFiles[idx];
    const imagePath = path.join(staticFolder, `${i}.jpg`);

    if (!fs.existsSync(imagePath)) {
      continue;
    }

    const receiptResult = await processReceipt(imagePath);
    const generalResult = await processGeneralOCR(imagePath);
    const fullText = extractFullText(generalResult);

    if (receiptResult) {
      const extractedData = extractReceiptData(receiptResult, fullText);
      results.push({
        번호: results.length + 1,
        ...extractedData,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.table(results, [
    "번호",
    "상호명",
    "구분",
    "사업자번호",
    "상품가격",
    "날짜",
  ]);
}

main().catch(console.error);
