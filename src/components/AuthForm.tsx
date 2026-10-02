'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api(isRegister ? '/api/register' : '/api/login', 'POST', { name, email, password, timezone });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="mb-8 size-12 rounded-2xl shadow-lg shadow-primary/30 lg:hidden" />
      <h2 className="text-3xl font-extrabold tracking-tight">{isRegister ? 'Δημιουργία λογαριασμού' : 'Καλώς ήρθατε'}</h2>
      <p className="mt-2 text-base-content/60">
        {isRegister ? 'Ξεκινήστε να καταγράφετε τα μαθήματά σας σε λιγότερο από ένα λεπτό.' : 'Συνδεθείτε για να δείτε τα σημερινά μαθήματα.'}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {isRegister && (
          <label className="floating-label block">
            <span>Το όνομά σας</span>
            <input className="input input-lg w-full" placeholder="Το όνομά σας" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="floating-label block">
          <span>Email</span>
          <input
            type="email"
            className="input input-lg w-full"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="floating-label block">
          <span>Κωδικός</span>
          <input
            type="password"
            className="input input-lg w-full"
            placeholder={isRegister ? 'Κωδικός (τουλάχιστον 8 χαρακτήρες)' : 'Κωδικός'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </label>
        {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}
        <button className="btn btn-primary btn-lg brand-gradient w-full border-0 shadow-lg shadow-primary/30" disabled={busy}>
          {busy ? <span className="loading loading-spinner" /> : null}
          {isRegister ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'}
          {!busy && <ArrowRight className="size-5" />}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-base-content/60">
        {isRegister ? 'Έχετε ήδη λογαριασμό; ' : 'Πρώτη φορά εδώ; '}
        <Link href={isRegister ? '/login' : '/register'} className="link link-primary font-semibold no-underline">
          {isRegister ? 'Σύνδεση' : 'Δημιουργήστε λογαριασμό'}
        </Link>
      </p>
    </>
  );
}
