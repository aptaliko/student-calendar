'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, CalendarDays, LayoutDashboard, LogOut, Plus, Settings, Users } from 'lucide-react';
import { useEditors } from './Editors';

const LINKS = [
  { href: '/', label: 'Σήμερα', icon: LayoutDashboard },
  { href: '/calendar', label: 'Ημερολόγιο', icon: CalendarDays },
  { href: '/students', label: 'Μαθητές', icon: Users },
  { href: '/reports', label: 'Αναφορές', icon: BarChart3 },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}


export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-9 rounded-xl shadow-md shadow-primary/30" />
      <span className="leading-tight font-extrabold tracking-tight">
        Ημερολόγιο <span className="brand-text">Μαθητών</span>
      </span>
    </span>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  const isActive = useIsActive();
  const { newLesson } = useEditors();
  const router = useRouter();
  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-base-300 bg-base-100 p-5 lg:flex">
      <Link href="/">
        <Logo />
      </Link>
      <button className="btn btn-primary brand-gradient border-0 shadow-lg shadow-primary/25" onClick={() => newLesson()}>
        <Plus className="size-5" /> Νέο μάθημα
      </button>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition ${
              isActive(href) ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-base-300 pt-4">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition ${
            isActive('/settings') ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
          }`}
        >
          <Settings className="size-5" />
          <span className="truncate">{userName || 'Ρυθμίσεις'}</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium text-base-content/70 transition hover:bg-base-200"
        >
          <LogOut className="size-5" /> Αποσύνδεση
        </button>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-base-300 bg-base-100/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-lg lg:hidden">
      <Link href="/">
        <Logo />
      </Link>
      <Link href="/settings" className="btn btn-ghost btn-circle" aria-label="Ρυθμίσεις">
        <Settings className="size-5" />
      </Link>
    </header>
  );
}

export function MobileTabBar() {
  const isActive = useIsActive();
  const { newLesson } = useEditors();
  const [first, second, ...rest] = LINKS;
  const tab = ({ href, label, icon: Icon }: (typeof LINKS)[number]) => (
    <Link
      key={href}
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
        isActive(href) ? 'text-primary' : 'text-base-content/60'
      }`}
    >
      <Icon className="size-6" />
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-base-300 bg-base-100/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      {tab(first)}
      {tab(second)}
      <div className="flex flex-1 justify-center">
        <button
          onClick={() => newLesson()}
          aria-label="Νέο μάθημα"
          className="brand-gradient -mt-6 mb-1 grid size-14 place-items-center rounded-full text-white shadow-xl shadow-primary/40 ring-4 ring-base-100 transition active:scale-95"
        >
          <Plus className="size-7" />
        </button>
      </div>
      {rest.map(tab)}
    </nav>
  );
}
