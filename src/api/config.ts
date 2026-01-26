// API 설정 및 기본 fetch 함수
// 나중에 실제 백엔드 URL로 변경하면 됨

// 환경 변수 또는 설정에서 가져오기
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

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
  const url = `${API_BASE_URL}${endpoint}`;
  
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
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== "false";
