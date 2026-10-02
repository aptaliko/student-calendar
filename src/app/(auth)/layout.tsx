import { CalendarCheck2, ChartNoAxesColumn, Wallet } from 'lucide-react';

const FEATURES = [
  { icon: CalendarCheck2, title: 'One-tap attendance', text: 'Mark present, no-show or excused straight from today’s list.' },
  { icon: Wallet, title: 'Know who owes what', text: 'Every lesson is priced automatically. Track paid and outstanding.' },
  { icon: ChartNoAxesColumn, title: 'Monthly & yearly reports', text: 'Hours taught and income per student, exportable to CSV.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-10 rounded-xl ring-2 ring-white/40" />
          <span className="text-xl font-extrabold tracking-tight">Student Calendar</span>
        </div>
        <div className="relative my-auto max-w-md">
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight">
            Your lessons, beautifully organised.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Schedule students, track attendance and see exactly what you earn — every month, every year.
          </p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center bg-base-100 p-6 sm:p-12">
        <div className="animate-rise w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
