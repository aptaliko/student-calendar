'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { CURRENCIES, centsToInput, parseMoney } from '@/lib/money';
import { useToast } from './Toast';

type Initial = { name: string; currency: string; defaultRateCents: number; defaultDurationMinutes: number; timezone: string };

export default function SettingsForm({ initial, zones }: { initial: Initial; zones: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial.name);
  const [currency, setCurrency] = useState(initial.currency);
  const [rate, setRate] = useState(centsToInput(initial.defaultRateCents));
  const [duration, setDuration] = useState(initial.defaultDurationMinutes);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const defaultRateCents = parseMoney(rate);
    if (defaultRateCents === null) return toast('Συμπληρώστε έγκυρη χρέωση', 'error');
    setSaving(true);
    try {
      await api('/api/account', 'PATCH', { name, currency, defaultRateCents, defaultDurationMinutes: duration, timezone });
      toast('Οι ρυθμίσεις αποθηκεύτηκαν');
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card-surface space-y-4 p-5">
        <h2 className="font-bold">Προφίλ</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Το όνομά σας</span>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ζώνη ώρας</span>
          <select className="select w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {!zones.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-base-content/50">Χρησιμοποιείται για να ξέρουμε ποια μέρα είναι «σήμερα» για εσάς.</span>
        </label>
      </section>

      <section className="card-surface space-y-4 p-5">
        <h2 className="font-bold">Προεπιλογές μαθημάτων</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Νόμισμα</span>
            <select className="select w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Ωριαία χρέωση</span>
            <input className="input w-full" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Διάρκεια (λεπτά)</span>
            <input
              type="number"
              min={5}
              step={5}
              className="input w-full"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <p className="text-xs text-base-content/50">
          Οι νέοι μαθητές ξεκινούν με αυτή τη χρέωση. Η αλλαγή χρέωσης δεν αλλάζει ποτέ την τιμή μαθημάτων που έχουν ήδη προγραμματιστεί.
        </p>
      </section>

      <div className="flex items-center gap-2">
        <button type="button" onClick={logout} className="btn btn-ghost lg:hidden">
          <LogOut className="size-4" /> Αποσύνδεση
        </button>
        <button className="btn btn-primary ml-auto" disabled={saving}>
          {saving && <span className="loading loading-spinner loading-sm" />}
          Αποθήκευση αλλαγών
        </button>
      </div>
    </form>
  );
}
