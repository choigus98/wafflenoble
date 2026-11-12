import type { MetadataRoute } from 'next';

// 휴대폰 '홈 화면에 추가'용. 브라우저는 이 파일을 쿠키 없이 가져가므로 proxy 입장 게이트에서 빼 두었다
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '와플노블',
    short_name: '와플노블',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf7f1',
    theme_color: '#fbf7f1',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
