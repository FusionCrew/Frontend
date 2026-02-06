// 공통 스타일 상수
export const colors = {
  primary: "#C32911",
  primaryLight: "#F3D4CF",
  primaryBg: "#FDEAEA",
  primaryBgLight: "#F8E8E6",
  brown: "#4A3728",
  background: "#F5EDE4",
  white: "#FFFFFF",
  gray: "#888888",
  grayLight: "#CCCCCC",
  grayBorder: "#E0E0E0",
};

export const fonts = {
  family: "'Noto Sans KR', sans-serif",
  sizes: {
    xs: "28px",
    sm: "32px",
    md: "40px",
    lg: "48px",
    xl: "56px",
    xxl: "72px",
  },
};

// 공통 인라인 스타일
export const commonStyles = {
  // 기본 텍스트
  text: (size: keyof typeof fonts.sizes = "md", weight: number = 500, color: string = colors.brown) => ({
    fontFamily: fonts.family,
    fontSize: fonts.sizes[size],
    fontWeight: weight,
    color,
  }),

  // 중앙 정렬
  centerAbsolute: {
    position: "absolute" as const,
    left: "50%",
    transform: "translateX(-50%)",
  },

  // 플렉스 센터
  flexCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // 기본 버튼
  button: (bg: string = colors.primary, color: string = colors.white) => ({
    backgroundColor: bg,
    color,
    fontFamily: fonts.family,
    border: "none",
    cursor: "pointer",
  }),

  // 둥근 버튼
  roundButton: (width: string, height: string, bg: string = colors.primary) => ({
    width,
    height,
    backgroundColor: bg,
    color: colors.white,
    fontFamily: fonts.family,
    fontWeight: 600,
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
  }),
};

// 키오스크 프레임 스타일
export const kioskFrame = {
  width: "1080px",
  height: "1920px",
  backgroundColor: colors.background,
};
