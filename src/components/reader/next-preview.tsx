import Link from 'next/link';

/**
 * 회차 끝 '다음 화' 단추 위 미리 보기: 다음 화 제목과 첫 문장 한 줄 (첫 문장은 읽기 설정 글꼴로).
 * 누르면 다음 화로. 길드원에게 공개된 다음 화일 때만 그린다 (lib/queries/reader.ts)
 */
export function NextPreview({ href, position, title, opening }: { href: string; position: number; title: string; opening: string }) {
  return (
    <Link
      href={href}
      // 포커스 테두리는 아래 이전·다음 단추와 같게
      className="group flex items-center gap-3 rounded-2xl border border-line bg-surface py-3 pr-3 pl-4 transition hover:border-accent/60 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-accent">다음 화</span>
        <span className="mt-0.5 block truncate font-bold">
          {position}화{title ? ` ${title}` : ''}
        </span>
        {opening ? <span className="mt-1 block truncate font-(family-name:--reader-font) text-[15px] text-muted">{opening}</span> : null}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
