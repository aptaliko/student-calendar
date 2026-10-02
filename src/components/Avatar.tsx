import { colorOf, initials } from '@/lib/lessons';

export default function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const c = colorOf(color);
  const dims = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-14 text-lg' }[size];
  return (
    <span
      aria-hidden
      className={`${dims} ${c.bg} inline-grid shrink-0 place-items-center rounded-full font-bold text-white shadow-sm ring-2 ring-base-100`}
    >
      {initials(name)}
    </span>
  );
}
