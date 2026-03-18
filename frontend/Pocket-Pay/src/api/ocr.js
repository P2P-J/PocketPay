import { apiClient } from "./client";

export const ocrApi = {
  analyze: (file) => {
    return apiClient.uploadFile("/ocr/analyze", file, "file");
  },
};
