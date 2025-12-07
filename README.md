# 🎨 AI Kiosk - Frontend

React + TypeScript + Vite 기반 프론트엔드 애플리케이션입니다. 음성 인식 키오스크 UI를 제공합니다.

---

## 📋 목차
- [기술 스택](#-기술-스택)
- [폴더 구조](#-폴더-구조)
- [사전 준비](#-사전-준비)
- [설치 및 실행](#-설치-및-실행)
- [주요 기능](#-주요-기능)
- [환경 설정](#-환경-설정)

---

## 🛠️ 기술 스택

| 구분 | 기술 | 버전 |
|------|-----|------|
| **언어** | TypeScript | 5.8.3 |
| **런타임** | Node.js | 22.x |
| **프레임워크** | React | 19.1.1 |
| **빌드 도구** | Vite | 7.1.2 |
| **스타일링** | TailwindCSS | 4.1.13 |
| **AI 라이브러리** | MediaPipe (Pose, Face) | 0.5.x |

---

## 📁 폴더 구조

```
Frontend/
├── src/
│   ├── App.tsx              # 메인 앱 컴포넌트
│   ├── App.css              # 앱 스타일
│   ├── main.tsx             # React 진입점
│   ├── index.css            # 전역 스타일
│   ├── VoiceKiosk.tsx       # 음성 키오스크 메인 컴포넌트
│   ├── vite-env.d.ts        # Vite 타입 정의
│   ├── hook/                # 커스텀 React 훅
│   └── assets/              # 정적 에셋 (이미지 등)
├── public/                  # 정적 파일 (favicon 등)
├── server/                  # Express 백엔드 서버
│   └── index.ts             # 서버 진입점
├── index.html               # HTML 템플릿
├── package.json             # npm 패키지 설정
├── package-lock.json        # 의존성 잠금 파일
├── vite.config.ts           # Vite 설정
├── tailwind.config.js       # TailwindCSS 설정
├── postcss.config.cjs       # PostCSS 설정
├── tsconfig.json            # TypeScript 기본 설정
├── tsconfig.app.json        # 앱 TypeScript 설정
├── tsconfig.node.json       # Node TypeScript 설정
├── tsconfig.server.json     # 서버 TypeScript 설정
├── eslint.config.js         # ESLint 설정
├── Dockerfile               # Docker 이미지 빌드
└── .env                     # 환경 변수 (직접 생성 필요)
```

---

## ✅ 사전 준비

### 필수 설치
- **Node.js 20** 이상 (권장: 22.x)
  ```bash
  # 버전 확인
  node -v
  # 출력 예시: v22.13.0
  ```

- **npm** (Node.js 설치 시 함께 설치됨)
  ```bash
  npm -v
  ```

---

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
# .env 파일이 없다면 생성
touch .env
```

`.env` 파일 내용:
```env
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. 개발 모드 실행 (프론트엔드)
```bash
npm run dev
```
→ 브라우저에서 `http://localhost:5173` 접속

### 4. 백엔드 서버 실행 (별도 터미널)
```bash
npm run server
```

### 5. 프로덕션 빌드
```bash
npm run build
```

### 6. 빌드 결과물 미리보기
```bash
npm run preview
```

### 7. 타입 체크
```bash
npm run typecheck
```

---

## 📜 npm 스크립트 정리

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Vite) |
| `npm run server` | Express 백엔드 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과물 미리보기 |
| `npm run typecheck` | TypeScript 타입 체크 |

---

## 🎯 주요 기능

### VoiceKiosk 컴포넌트
- **음성 인식**: 사용자 음성을 텍스트로 변환
- **얼굴/포즈 감지**: MediaPipe를 활용한 실시간 감지
- **AI 추천**: OpenAI API를 통한 맞춤 추천

---

## ⚙️ 환경 설정

### 환경 변수 (.env)
```env
# OpenAI API 키
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **주의**: `.env` 파일은 `.gitignore`에 포함되어 있습니다. 각 개발자가 직접 생성해야 합니다.

### Vite 개발 서버 포트 변경
`vite.config.ts`에서 수정:
```typescript
export default defineConfig({
  server: {
    port: 3000  // 원하는 포트
  }
})
```

---

## 🐛 문제 해결

### "node_modules not found" 에러
```bash
# 의존성 재설치
rm -rf node_modules
npm install
```

### 포트 충돌
```bash
# 다른 포트로 실행
npm run dev -- --port 3000
```

### TypeScript 에러
```bash
# 타입 체크 실행
npm run typecheck
```

### MediaPipe 관련 에러
- 브라우저에서 **카메라 권한**을 허용했는지 확인
- **HTTPS** 또는 **localhost**에서만 카메라 접근 가능

---

## 🐳 Docker 실행

```bash
# 이미지 빌드
docker build -t aikiosk-frontend .

# 컨테이너 실행
docker run -p 3000:3000 aikiosk-frontend
```

---

## 👥 팀 정보

**FusionCrew** © 2025~2026
