import { listStudents } from '@/db/queries/students';
import { EditorsProvider } from '@/components/Editors';
import { MobileHeader, MobileTabBar, Sidebar } from '@/components/Nav';
import { ToastProvider } from '@/components/Toast';
import { todayIn } from '@/lib/dates';
import { requireUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const students = await listStudents(user.id);
  const prefs = {
    currency: user.currency,
    defaultRateCents: user.defaultRateCents,
    defaultDurationMinutes: user.defaultDurationMinutes,
    today: todayIn(user.timezone),
  };

  return (
    <ToastProvider>
      <EditorsProvider prefs={prefs} students={students}>
        <div className="flex min-h-dvh">
          <Sidebar userName={user.name || user.email} />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
              {children}
            </main>
          </div>
        </div>
        <MobileTabBar />
      </EditorsProvider>
    </ToastProvider>
  );
}
