import { useAuthStore } from "../store/authStore";

const BASE_URL = ""; // Relative path used because of Vite proxy
const REQUEST_TIMEOUT = 30000; // 30초

const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  // 401 처리: 토큰 만료/무효 시 자동 로그아웃
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || "인증이 만료되었습니다.");
    error.status = 401;

    // TOKEN_EXPIRED인 경우 자동 로그아웃
    if (errorData.message === "TOKEN_EXPIRED" || errorData.message === "INVALID_TOKEN") {
      useAuthStore.getState().logout();
    }

    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.error || errorData.message || "요청 처리 중 오류가 발생했습니다."
    );
    error.status = response.status;
    error.errors = errorData.errors; // zod 검증 에러 배열
    throw error;
  }

  // Handle 204 No Content (e.g., DELETE requests)
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

/**
 * 타임아웃이 포함된 fetch 래퍼
 */
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === "AbortError") {
        const error = new Error("요청 시간이 초과되었습니다.");
        error.status = 408;
        throw error;
      }
      throw err;
    })
    .finally(() => clearTimeout(timeout));
};

export const apiClient = {
  get: async (endpoint) => {
    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  post: async (endpoint, body) => {
    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  put: async (endpoint, body) => {
    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint) => {
    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  uploadFile: async (endpoint, file, fieldName = "file") => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const token = useAuthStore.getState().accessToken;
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(response);
  },
};
