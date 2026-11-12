import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 서버·클라이언트 어디서나 쓰는 공통 UI. 상태가 없어서 'use client'가 필요 없다

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-[0.94] active:brightness-90',
  secondary: 'border border-line bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

type ButtonOptions = { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = 'submit', ...props }: ComponentProps<'button'> & ButtonOptions) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & ButtonOptions) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// iOS는 16px보다 작은 입력창에 포커스하면 화면을 확대하므로 text-base 유지
const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-base text-fg placeholder:text-muted/70 ' +
  'transition focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 disabled:opacity-60';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(FIELD, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(FIELD, 'py-2.5 leading-relaxed', className)} {...props} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'muted' | 'danger';
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-surface-2 text-fg',
    accent: 'bg-accent-soft text-accent',
    muted: 'border border-line text-muted',
    danger: 'bg-danger/10 text-danger',
  };
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-2xl border border-line bg-surface p-5 sm:p-6', className)}>{children}</section>;
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (state.status === 'error') {
    return (
      <p role="alert" className="text-sm font-medium text-danger">
        {state.message}
      </p>
    );
  }
  if (state.status === 'success' && state.message) {
    return (
      <p role="status" className="text-sm font-medium text-accent">
        {state.message}
      </p>
    );
  }
  return null;
}
