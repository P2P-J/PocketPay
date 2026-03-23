import { apiClient } from "./client";

interface OcrResult {
  storeInfo?: string;
  price?: number;
  date?: string;
  businessNumber?: string;
}

export const ocrApi = {
  analyze: (imageUri: string) =>
    apiClient.uploadFile("/ocr/analyze", imageUri, "file") as Promise<{
      message: string;
      data: OcrResult;
    }>,
};
