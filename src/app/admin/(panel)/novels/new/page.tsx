import type { Metadata } from 'next';
import Link from 'next/link';
import { NovelForm } from '@/components/admin/novel-form';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: '새 작품' };

export default function NewNovelPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="text-sm font-semibold text-muted hover:text-fg">
        ← 작품 목록
      </Link>
      <h1 className="mt-3 mb-6 text-xl font-bold tracking-tight">새 작품</h1>
      <Card>
        <NovelForm />
      </Card>
    </div>
  );
}
