import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuildPasswordForm } from '@/components/admin/guild-password-form';
import { Badge, Card, Skeleton, buttonClass } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { adminGetGuildSettings } from '@/lib/queries/admin';

export const metadata: Metadata = { title: '설정' };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold tracking-tight">설정</h1>

      <section className="space-y-3">
        <h2 className="font-bold">길드 열람 비밀번호</h2>
        <Card>
          <Suspense fallback={<Skeleton className="h-52" />}>
            <GuildPasswordSection />
          </Suspense>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">원고 백업</h2>
        <Card className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            모든 작품과 회차를 JSON 파일 하나로 내려받아요. 무료 DB는 되돌릴 수 있는 기간이 짧아서, 가끔 받아 두면
            안심이에요.
          </p>
          {/* 파일 다운로드라서 Link가 아니라 a 태그 */}
          <a href="/admin/export" download className={buttonClass('secondary')}>
            백업 파일 내려받기
          </a>
        </Card>
      </section>
    </div>
  );
}

async function GuildPasswordSection() {
  const guild = await adminGetGuildSettings();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {guild.hasPassword ? (
          <>
            <Badge tone="accent">설정됨</Badge>
            {guild.updatedAt ? <span className="text-muted">{formatDateTime(guild.updatedAt)}에 마지막으로 바꿨어요</span> : null}
          </>
        ) : (
          <>
            <Badge tone="danger">아직 없음</Badge>
            <span className="text-muted">정해야 길드원이 들어올 수 있어요</span>
          </>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted">
        길드원끼리 공유하는 비밀번호예요. 바꾸면 들어와 있던 길드원 모두 새 비밀번호로 다시 입장해야 해요 (이름은 그대로
        이어져요).
      </p>
      <GuildPasswordForm hasPassword={guild.hasPassword} />
    </div>
  );
}
