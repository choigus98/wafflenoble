import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components: 정적 뼈대는 미리 렌더링하고, 세션·DB를 읽는 부분만 Suspense 안에서 스트리밍
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
};

export default nextConfig;
