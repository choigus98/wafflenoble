import type { MetadataRoute } from 'next';

// 길드 전용이라 검색엔진 수집을 전부 막는다
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
