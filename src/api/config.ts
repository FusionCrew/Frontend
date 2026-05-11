// API 설정 및 기본 fetch 함수
// 나중에 실제 백엔드 URL로 변경하면 됨

// 환경 변수 또는 설정에서 가져오기
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
export const AI_BASE_URL = import.meta.env.VITE_AI_URL || "http://localhost:8000/api/v1";
export const AI_V2_BASE_URL =
  import.meta.env.VITE_AI_V2_URL ||
  AI_BASE_URL.replace(/\/api\/v1\/?$/i, "/api/v2");
export const AI_V2_CHAT_URL = `${AI_V2_BASE_URL.replace(/\/+$/, "")}/llm/chat`;
export const AI_V2_REALTIME_SESSION_URL =
  import.meta.env.VITE_AI_REALTIME_SESSION_URL ||
  `${AI_V2_BASE_URL.replace(/\/+$/, "")}/realtime/session`;
export const AI_V2_REALTIME_CONFIG_URL =
  import.meta.env.VITE_AI_REALTIME_CONFIG_URL ||
  `${AI_V2_BASE_URL.replace(/\/+$/, "")}/realtime/config`;
export const AI_V2_REALTIME_WS_URL =
  import.meta.env.VITE_AI_REALTIME_WS_URL ||
  `${AI_V2_BASE_URL.replace(/^http/i, "ws").replace(/\/+$/, "")}/realtime/ws`;

// API 요청 기본 설정
export const apiConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
};

// 기본 fetch 래퍼
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // 슬래시 중복 또는 누락 방지 로직
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  console.log(`[API Request] ${options?.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...apiConfig.headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 개발 모드 확인 (mock 데이터 사용 여부)
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === "true";
