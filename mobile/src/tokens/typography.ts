export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: "Pretendard-Bold" },
  title: { fontSize: 22, lineHeight: 30, fontFamily: "Pretendard-Bold" },
  section: { fontSize: 18, lineHeight: 26, fontFamily: "Pretendard-SemiBold" },
  body: { fontSize: 16, lineHeight: 24, fontFamily: "Pretendard" },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: "Pretendard" },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: "Pretendard" },
  tab: { fontSize: 10, lineHeight: 14, fontFamily: "Pretendard-Medium" },
} as const;

export type TypographyKey = keyof typeof typography;
