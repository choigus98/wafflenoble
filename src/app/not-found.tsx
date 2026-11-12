import { Logo } from '@/components/logo';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">찾는 페이지가 없어요</h1>
        <p className="text-muted">주소가 바뀌었거나, 아직 공개되지 않은 글일 수 있어요.</p>
      </div>
      <ButtonLink href="/" variant="secondary">
        작품 목록으로
      </ButtonLink>
    </main>
  );
}
