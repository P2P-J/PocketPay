const BASE_URL = "";
const REQUEST_TIMEOUT = 30000;

// 토큰 프로바이더 - features 레이어에서 주입 (FSD 역방향 의존성 해결)
let tokenProvider = {
  getToken: () => null,
  onUnauthorized: () => {},
};

export function setTokenProvider(provider) {
  tokenProvider = { ...tokenProvider, ...provider };
}

const getHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = tokenProvider.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || "인증이 만료되었습니다.");
    error.status = 401;

    if (errorData.message === "TOKEN_EXPIRED" || errorData.message === "INVALID_TOKEN") {
      tokenProvider.onUnauthorized();
    }
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.error || errorData.message || "요청 처리 중 오류가 발생했습니다."
    );
    error.status = response.status;
    error.errors = errorData.errors;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

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

    const headers = {};
    const token = tokenProvider.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(response);
  },
};
