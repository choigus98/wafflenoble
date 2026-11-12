import { COVER_COLORS, resolveCoverColor } from '@/lib/cover';
import { cn } from '@/lib/utils';

// 표지 이미지 없이 제목 + 색으로 만드는 텍스트 표지. 와플 격자 무늬를 은은하게 깐다.
// 색은 관리자가 고른 색, 안 골랐으면 작품 번호로 정해진 색 (lib/cover.ts)

const TITLE_SIZE = {
  sm: 'text-[13px] leading-snug',
  md: 'text-[17px] leading-snug sm:text-lg',
  lg: 'text-xl leading-snug',
};

export function NovelCover({
  id,
  title,
  color,
  size = 'md',
  className,
}: {
  id: number;
  title: string;
  color?: string | null;
  size?: keyof typeof TITLE_SIZE;
  className?: string;
}) {
  const { background, foreground } = COVER_COLORS[resolveCoverColor(id, color)];
  return (
    <div
      className={cn('relative aspect-[3/4] overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5', className)}
      style={{ background, color: foreground }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1.5px, transparent 1.5px), linear-gradient(90deg, currentColor 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          backgroundPosition: '-1px -1px',
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      <p className={cn('relative line-clamp-5 p-[9%] font-serif font-bold break-keep', TITLE_SIZE[size])}>{title}</p>
      <p className="absolute bottom-[7%] left-[9%] text-[9px] font-semibold tracking-[0.25em] opacity-75">
        WAFFLE NOVEL
      </p>
    </div>
  );
}
