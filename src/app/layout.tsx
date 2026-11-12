import type { Metadata, Viewport } from 'next';
import { Nanum_Pen_Script, Noto_Serif_KR } from 'next/font/google';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

// 본문 '명조' 옵션용. 한글 글꼴은 커서 미리 불러오지 않는다
const serif = Noto_Serif_KR({
  weight: ['400', '700'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-serif-kr',
});

// '쪽지·메모' 템플릿의 손글씨 글꼴. 쓰는 화면에서만 필요한 글자 조각을 받는다
const pen = Nanum_Pen_Script({
  weight: '400',
  preload: false,
  display: 'swap',
  variable: '--font-nanum-pen',
});

// 링크 미리보기에는 항상 '와플노블'만 보이도록 설명·OG 이미지는 넣지 않는다
export const metadata: Metadata = {
  title: { default: '와플노블', template: '%s · 와플노블' },
  openGraph: { title: '와플노블', siteName: '와플노블', type: 'website' },
  robots: { index: false, follow: false },
  // 아이폰에서 홈 화면 아이콘으로 열면 주소창 없이 앱처럼
  appleWebApp: { capable: true, title: '와플노블', statusBarStyle: 'default' },
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
// (에디터 집중 모드도 같이: CSS가 에디터가 있는 화면에서만 적용한다)
const readerSettingsScript = `(function(){try{var s=JSON.parse(localStorage.getItem('wn:reader-settings')||'{}'),d=document.documentElement;['theme','size','leading','font'].forEach(function(k){if(s[k]!=null)d.dataset[k]=String(s[k]);});if(localStorage.getItem('wn:focus-mode')==='1')d.dataset.focus='on';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${serif.variable} ${pen.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: readerSettingsScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        {/* 키보드로 쓰는 사람이 머리 메뉴를 건너뛰고 바로 본문으로 */}
        <a
          href="#main"
          className="sr-only rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
