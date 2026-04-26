// Cloudinary URL에 변환 파라미터를 삽입해 자동 최적화된 URL 반환
// 예: https://res.cloudinary.com/x/image/upload/v123/path/file.jpg
//   → https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_800/v123/path/file.jpg
//
// f_auto: 디바이스 지원 포맷 자동 (WebP/AVIF 등)
// q_auto: 품질 자동 (시각 품질 유지하며 용량 ↓)
// w_<n>: 너비 픽셀 제한 (메모리 절감)
export function transformCloudinaryUrl(url: string | null | undefined, width = 800): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com")) return url;
  // 이미 변환 파라미터가 들어간 URL은 그대로
  if (/\/upload\/[^/]*[wfq]_[a-z0-9]/i.test(url)) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
