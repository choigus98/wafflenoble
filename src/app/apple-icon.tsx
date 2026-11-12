import { ImageResponse } from 'next/og';
import { WaffleArt } from '@/lib/waffle-art';

// 아이폰 '홈 화면에 추가' 아이콘. iOS가 모서리를 직접 둥글게 깎으므로 배경을 꽉 채운다
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<WaffleArt size={180} fullBleed safeInset={0.08} />, size);
}
