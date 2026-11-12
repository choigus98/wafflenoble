import type { Metadata } from 'next';
import { WaffleIcon } from '@/components/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: '관리자 로그인' };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-9 flex flex-col items-center gap-4 text-center">
        <WaffleIcon className="size-14" />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">작가 로그인</h1>
          <p className="text-[15px] text-muted">관리자 비밀번호로 들어가요</p>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
