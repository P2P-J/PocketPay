export interface TokenProvider {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRefreshed: (token: string) => void;
  onUnauthorized: () => void;
}

interface ApiError extends Error {
  status?: number;
  errors?: unknown;
}

const BASE_URL = "";
const REQUEST_TIMEOUT = 30000;

let tokenProvider: TokenProvider = {
  getToken: () => null,
  getRefreshToken: () => null,
  onTokenRefreshed: () => {},
  onUnauthorized: () => {},
};

export function setTokenProvider(provider: Partial<TokenProvider>): void {
  tokenProvider = { ...tokenProvider, ...provider };
}

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = tokenProvider.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const fetchWithTimeout = (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === "AbortError") {
        const error: ApiError = new Error("요청 시간이 초과되었습니다.");
        error.status = 408;
        throw error;
      }
      throw err;
    })
    .finally(() => clearTimeout(timeout));
};

// refresh 진행 중 중복 방지
let refreshPromise: Promise<string | null> | null = null;

const tryRefreshToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = tokenProvider.getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      return data.accessToken || null;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const handleResponse = async (response: Response, retryFn: (() => Promise<unknown>) | null): Promise<unknown> => {
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));

    // TOKEN_EXPIRED일 때만 refresh 시도
    if (errorData.message === "TOKEN_EXPIRED" && retryFn) {
      const newAccessToken = await tryRefreshToken();
      if (newAccessToken) {
        tokenProvider.onTokenRefreshed(newAccessToken);
        return retryFn(); // 원래 요청 재시도
      }
    }

    // refresh 실패 또는 INVALID_TOKEN → 로그아웃
    tokenProvider.onUnauthorized();
    const error: ApiError = new Error(errorData.message || "인증이 만료되었습니다.");
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = new Error(
      errorData.error || errorData.message || "요청 처리 중 오류가 발생했습니다."
    );
    error.status = response.status;
    error.errors = errorData.errors;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

const request = async (method: string, endpoint: string, body?: unknown, isRetry = false): Promise<unknown> => {
  const options: RequestInit = { method, headers: getHeaders() };
  if (body && method !== "GET") options.body = JSON.stringify(body);

  const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, options);

  const retryFn = isRetry
    ? null
    : () => request(method, endpoint, body, true);

  return handleResponse(response, retryFn);
};

export const apiClient = {
  get: (endpoint: string) => request("GET", endpoint),
  post: (endpoint: string, body?: unknown) => request("POST", endpoint, body),
  put: (endpoint: string, body?: unknown) => request("PUT", endpoint, body),
  delete: (endpoint: string) => request("DELETE", endpoint),

  uploadFile: async (endpoint: string, file: File, fieldName = "file", isRetry = false): Promise<unknown> => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = {};
    const token = tokenProvider.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    const retryFn = isRetry
      ? null
      : () => apiClient.uploadFile(endpoint, file, fieldName, true);

    return handleResponse(response, retryFn);
  },
};
