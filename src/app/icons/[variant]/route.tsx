import { ImageResponse } from 'next/og';
import { WaffleArt } from '@/lib/waffle-art';

// 안드로이드 설치용 PNG 아이콘 (manifest.ts에서 가리킴)
// - 192 / 512: 둥근 판 그대로
// - maskable-512: 런처가 원·둥근 사각형으로 잘라도 무늬가 남도록 안전 영역 안에 그린다
const VARIANTS = {
  '192': { size: 192, fullBleed: false, safeInset: 0 },
  '512': { size: 512, fullBleed: false, safeInset: 0 },
  'maskable-512': { size: 512, fullBleed: true, safeInset: 0.1 },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: RouteContext<'/icons/[variant]'>) {
  const { variant } = await params;
  const spec = VARIANTS[variant as Variant];
  if (!spec) return new Response('Not found', { status: 404 });
  return new ImageResponse(<WaffleArt size={spec.size} fullBleed={spec.fullBleed} safeInset={spec.safeInset} />, {
    width: spec.size,
    height: spec.size,
    headers: { 'cache-control': 'public, max-age=86400' },
  });
}
