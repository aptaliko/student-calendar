'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatHours, formatMoney } from '@/lib/money';
import { shortMonth } from '@/lib/dates';

type Point = { month: string; earnedCents: number; attendedMinutes: number; lessons: number };

/** 12-month bar chart; one measure at a time (income or hours), never a dual axis. */
export default function MonthlyChart({
  data,
  currency,
  highlight,
}: {
  data: Point[];
  currency: string;
  highlight?: string;
}) {
  const [measure, setMeasure] = useState<'income' | 'hours'>('income');
  const [hover, setHover] = useState<number | null>(null);
  const value = (p: Point) => (measure === 'income' ? p.earnedCents : p.attendedMinutes);
  const fmt = (p: Point) => (measure === 'income' ? formatMoney(p.earnedCents, currency, { compact: true }) : formatHours(p.attendedMinutes));
  const max = Math.max(1, ...data.map(value));
  const total = data.reduce((s, p) => s + value(p), 0);
  const nonEmpty = data.filter((p) => value(p) > 0).length;

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{measure === 'income' ? 'Έσοδα ανά μήνα' : 'Ώρες διδασκαλίας ανά μήνα'}</h2>
          <p className="text-sm text-base-content/55 tabular">
            Μ.Ο. {measure === 'income' ? formatMoney(Math.round(total / Math.max(1, nonEmpty)), currency) : formatHours(Math.round(total / Math.max(1, nonEmpty)))} ανά ενεργό μήνα
          </p>
        </div>
        <div role="tablist" className="tabs tabs-box tabs-sm">
          <button role="tab" className={`tab ${measure === 'income' ? 'tab-active' : ''}`} onClick={() => setMeasure('income')}>
            Έσοδα
          </button>
          <button role="tab" className={`tab ${measure === 'hours' ? 'tab-active' : ''}`} onClick={() => setMeasure('hours')}>
            Ώρες
          </button>
        </div>
      </div>

      <div className="relative mt-6 flex h-56 items-end gap-1.5 border-b border-base-300 sm:gap-3">
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-base-300/70" style={{ bottom: `${f * 100}%` }} />
        ))}
        {data.map((p, i) => {
          const v = value(p);
          const pct = (v / max) * 100;
          const active = hover === i || (hover === null && p.month === highlight);
          return (
            <Link
              key={p.month}
              href={`/reports?period=month&date=${p.month}-01`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={`${shortMonth(`${p.month}-01`)}: ${fmt(p)}`}
            >
              <div
                className={`w-full rounded-t-[4px] transition-all ${active ? 'bg-primary' : 'bg-primary/35 group-hover:bg-primary/60'}`}
                style={{ height: v === 0 ? 2 : `${Math.max(pct, 1.5)}%` }}
              />
              {hover === i && (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-field bg-neutral px-3 py-2 text-xs whitespace-nowrap text-neutral-content shadow-lg">
                  <div className="font-semibold">{shortMonth(`${p.month}-01`)}</div>
                  <div className="tabular">{formatMoney(p.earnedCents, currency)} · {formatHours(p.attendedMinutes)}</div>
                  <div className="opacity-70">{p.lessons} μαθήματα</div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3">
        {data.map((p) => (
          <div key={p.month} className={`flex-1 text-center text-[10px] sm:text-xs ${p.month === highlight ? 'font-bold text-primary' : 'text-base-content/50'}`}>
            {shortMonth(`${p.month}-01`)}
          </div>
        ))}
      </div>
    </div>
  );
}
