import { API_BASE_URL, REQUEST_TIMEOUT } from "@/constants/config";

// authStore를 lazy import하여 순환 참조 방지
let getAuthState: (() => { accessToken: string | null; refreshToken: string | null; setAccessToken: (t: string) => void; logout: () => void }) | null = null;

export function setAuthStateGetter(getter: typeof getAuthState) {
  getAuthState = getter;
}

interface ApiError extends Error {
  status?: number;
  errors?: unknown;
}

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAuthState?.()?.accessToken;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const fetchWithTimeout = (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === "AbortError") {
        const error: ApiError = new Error("요청 시간이 초과되었습니다. 네트워크를 확인해주세요.");
        error.status = 408;
        throw error;
      }
      // 네트워크 에러 (서버 꺼짐, 인터넷 끊김 등)
      const error: ApiError = new Error(
        "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요."
      );
      error.status = 0;
      throw error;
    })
    .finally(() => clearTimeout(timeout));
};

let refreshPromise: Promise<string | null> | null = null;

const tryRefreshToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getAuthState?.()?.refreshToken;
  if (!refreshToken) return null;

  refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
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

const handleResponse = async (
  response: Response,
  retryFn: (() => Promise<unknown>) | null
): Promise<unknown> => {
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.message === "TOKEN_EXPIRED" && retryFn) {
      const newAccessToken = await tryRefreshToken();
      if (newAccessToken) {
        getAuthState?.()?.setAccessToken(newAccessToken);
        return retryFn();
      }
    }

    getAuthState?.()?.logout();
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

const request = async (
  method: string,
  endpoint: string,
  body?: unknown,
  isRetry = false
): Promise<unknown> => {
  const options: RequestInit = { method, headers: getHeaders() };
  if (body && method !== "GET") options.body = JSON.stringify(body);

  const url = `${API_BASE_URL}${endpoint}`;
  if (__DEV__) console.log(`[API] ${method} ${url}`);
  const response = await fetchWithTimeout(url, options);
  const retryFn = isRetry ? null : () => request(method, endpoint, body, true);
  return handleResponse(response, retryFn);
};

export const apiClient = {
  get: (endpoint: string) => request("GET", endpoint),
  post: (endpoint: string, body?: unknown) => request("POST", endpoint, body),
  put: (endpoint: string, body?: unknown) => request("PUT", endpoint, body),
  delete: (endpoint: string) => request("DELETE", endpoint),

  uploadFile: async (
    endpoint: string,
    fileUri: string,
    fieldName = "file",
    isRetry = false
  ): Promise<unknown> => {
    // URI 정규화 (ph:// → file:// 변환 방지, iOS 호환)
    const uri = fileUri;

    // 확장자 기반 MIME 타입 감지
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";
    const fileName = `receipt_${Date.now()}.${ext === "heic" ? "jpg" : ext}`;

    const formData = new FormData();
    formData.append(fieldName, {
      uri,
      type: mimeType,
      name: fileName,
    } as unknown as Blob);

    const headers: Record<string, string> = {};
    const token = getAuthState?.()?.accessToken;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    const retryFn = isRetry
      ? null
      : () => apiClient.uploadFile(endpoint, fileUri, fieldName, true);
    return handleResponse(response, retryFn);
  },
};
