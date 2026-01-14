import { apiClient } from "./client";

export const ocrApi = {
  analyze: (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post("/ocr/analyze", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
