import { cn } from '@/lib/utils';

export function WaffleIcon({ className }: { className?: string }) {
  const cells = [7, 13.5, 20];
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#d9952f" />
      <g fill="#a8661a">
        {cells.flatMap((y) =>
          cells.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1.4" />),
        )}
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <WaffleIcon className="size-7 shrink-0" />
      <span className="text-[17px] font-bold tracking-tight">와플노블</span>
    </span>
  );
}
