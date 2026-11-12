// Tailwind는 PostCSS 플러그인으로 연결한다.
// (create-next-app 기본값인 @tailwindcss/turbopack 로더는 개발 서버에서 CSS 수정이 반영되지 않는 경우가 있어서 교체)
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
