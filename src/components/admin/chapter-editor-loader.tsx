'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui';
import type { EditorChapter } from './chapter-editor';

// 에디터는 브라우저에서만 그린다 (localStorage 복구본 확인, Tiptap 하이드레이션 문제 회피)
const ChapterEditor = dynamic(() => import('./chapter-editor').then((mod) => mod.ChapterEditor), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-16" />
      <Skeleton className="h-10" />
      <Skeleton className="h-[55vh]" />
    </div>
  ),
});

export function ChapterEditorLoader(props: { chapter: EditorChapter; novelTitle: string }) {
  return <ChapterEditor {...props} />;
}
