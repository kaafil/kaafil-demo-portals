'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyRow, MEAL_LABEL, Table, TD, TH, TourStatusChip } from '@/components/ui';
import type { TravellerRecord } from '@/config/contract';

/** Page size. 728 rows in one DOM is slow to paint and useless to read. */
const PAGE = 50;

export function TravellerTable({ travellers }: { travellers: readonly TravellerRecord[] }) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return travellers;
    return travellers.filter(({ traveller, tourTitle, partyName }) =>
      [
        traveller.fullName,
        traveller.phone,
        traveller.email,
        traveller.bookingRef,
        traveller.city,
        tourTitle,
        partyName,
      ]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [travellers, query]);

  const visible = rows.slice(0, shown);

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-faint bg-surface-alt px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(PAGE);
          }}
          placeholder="Name, phone, email, booking ref or city"
          aria-label="Search travellers"
          className="min-w-64 flex-1 rounded-control border border-border bg-surface px-2 py-1 text-base text-ink"
        />
        <span className="tabular text-sm text-ink-faint">
          {rows.length} of {travellers.length}
        </span>
      </div>

      <Table
        head={
          <tr>
            <th className={TH}>Traveller</th>
            <th className={TH}>Contact</th>
            <th className={TH}>Departure</th>
            <th className={TH}>Party</th>
            <th className={TH}>Meal</th>
            <th className={TH}>Flags</th>
          </tr>
        }
      >
        {visible.length === 0 ? (
          <EmptyRow colSpan={6}>Nobody matches that.</EmptyRow>
        ) : (
          visible.map(({ traveller, tourTitle, tourStatus, partyName }) => (
            <tr key={traveller.travellerId} className="hover:bg-hover-wash">
              <td className={TD}>
                <span className="font-semibold">{traveller.fullName}</span>
                <div className="text-xs text-ink-faint">
                  {traveller.city}, {traveller.state} · {traveller.preferredLanguage}
                </div>
              </td>
              <td className={`${TD} tabular whitespace-nowrap`}>
                {traveller.phone}
                {traveller.email !== undefined && (
                  <div className="text-xs text-ink-faint">{traveller.email}</div>
                )}
              </td>
              <td className={TD}>
                <Link href={`/admin/trips/${traveller.tourId}`} className="text-accent">
                  {tourTitle}
                </Link>
                <div className="mt-0.5">
                  <TourStatusChip status={tourStatus} />
                </div>
              </td>
              <td className={TD}>
                {partyName}
                <div className="tabular text-xs text-ink-faint">
                  {traveller.bookingRef} ·{' '}
                  {traveller.partyRole === 'LEAD' ? 'lead' : traveller.relationToLead}
                </div>
              </td>
              <td className={TD}>{MEAL_LABEL[traveller.mealPreference]}</td>
              <td className={TD}>
                <div className="flex flex-wrap gap-1 text-xs">
                  {/* A medical note is shown as a FLAG, never as its text. The
                      free text stays in the CRM and is never pushed to Kaafil
                      — see scripts/ingest.ts — so that it cannot reach a share
                      link. A directory screen is not the place to leak it
                      either. */}
                  {traveller.medicalNotes !== null && (
                    <span className="rounded-control border border-warning-border bg-warning-bg px-1.5 text-warning">
                      medical note
                    </span>
                  )}
                  {traveller.permitNumber !== undefined && (
                    <span className="rounded-control border border-info-border bg-info-bg px-1.5 text-info">
                      permit
                    </span>
                  )}
                  {traveller.fitnessCleared === true && (
                    <span className="rounded-control border border-success-border bg-success-bg px-1.5 text-success">
                      fitness cleared
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      {shown < rows.length && (
        <div className="border-t border-border-faint bg-surface-alt px-3 py-2 text-center">
          <button
            type="button"
            onClick={() => setShown((current) => current + PAGE)}
            className="rounded-control border border-border bg-surface px-3 py-1 text-base text-ink hover:bg-hover-wash"
          >
            Show {Math.min(PAGE, rows.length - shown)} more
          </button>
        </div>
      )}
    </section>
  );
}
