import { apiClient } from "@shared/api/client";

export const ocrApi = {
  analyze: (file) => {
    return apiClient.uploadFile("/ocr/analyze", file, "file");
  },
};
