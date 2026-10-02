import type { LucideIcon } from 'lucide-react';

export default function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/15 text-warning',
  };
  return (
    <div className="card-surface flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-base-content/60">{label}</span>
        <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight tabular sm:text-3xl">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-base-content/50">{hint}</div>}
      </div>
    </div>
  );
}
