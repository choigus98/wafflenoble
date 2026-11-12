import type { Metadata, Viewport } from 'next';
import { Noto_Serif_KR } from 'next/font/google';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

// 본문 '명조' 옵션용. 한글 글꼴은 커서 미리 불러오지 않는다
const serif = Noto_Serif_KR({
  weight: ['400', '700'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-serif-kr',
});

// 링크 미리보기에는 항상 '와플노블'만 보이도록 설명·OG 이미지는 넣지 않는다
export const metadata: Metadata = {
  title: { default: '와플노블', template: '%s · 와플노블' },
  openGraph: { title: '와플노블', siteName: '와플노블', type: 'website' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#15120f' },
  ],
};

// 저장된 읽기 설정을 그리기 전에 반영해서 글자 크기·테마가 깜빡이지 않게 한다
const readerSettingsScript = `(function(){try{var s=JSON.parse(localStorage.getItem('wn:reader-settings')||'{}'),d=document.documentElement;['theme','size','leading','font'].forEach(function(k){if(s[k]!=null)d.dataset[k]=String(s[k]);});}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={serif.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: readerSettingsScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
