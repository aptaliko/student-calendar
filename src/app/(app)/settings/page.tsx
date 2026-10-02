import { PageHeader } from '@/components/Card';
import SettingsForm from '@/components/SettingsForm';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Ρυθμίσεις' };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="animate-rise mx-auto max-w-2xl">
      <PageHeader title="Ρυθμίσεις" subtitle={user.email} />
      <SettingsForm
        zones={Intl.supportedValuesOf('timeZone')}
        initial={{
          name: user.name,
          currency: user.currency,
          defaultRateCents: user.defaultRateCents,
          defaultDurationMinutes: user.defaultDurationMinutes,
          timezone: user.timezone,
        }}
      />
    </div>
  );
}
