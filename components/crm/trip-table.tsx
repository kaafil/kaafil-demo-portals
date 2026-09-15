'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyRow, Table, TD, TH, TourStatusChip, TourStyleChip } from '@/components/ui';
import { Pagination } from '@/components/ui/pagination';
import { BRAND } from '@/config/brand';
import type { TourSummary } from '@/config/contract';
import type { TourStatus } from '@/fixtures/types';
import { amount, dateRange, daysUntil } from '@/lib/format';
import { usePaginated } from '@/lib/use-paginated';

/**
 * The departures table, with the three filters a desk actually uses.
 *
 * Client-side filtering over the full list, which is the right call at this
 * size: 56 rows is nothing, and a round trip per keystroke would make the
 * search feel worse for no benefit. If this list ever ran to thousands the
 * filters would move into the query — and that is a real decision a partner
 * has to make, not something to hide behind a library.
 */
export function TripTable({ tours }: { tours: readonly TourSummary[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TourStatus | 'ALL'>('ALL');
  const [region, setRegion] = useState('ALL');

  const regions = useMemo(() => [...new Set(tours.map((row) => row.tour.region))].sort(), [tours]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tours.filter(({ tour, leadLeader }) => {
      if (status !== 'ALL' && tour.status !== status) return false;
      if (region !== 'ALL' && tour.region !== region) return false;
      if (needle === '') return true;
      // Everything the desk might have in hand when somebody rings: the
      // brochure title, the departure code, the package, the destination, or
      // the name of the leader running it.
      return [tour.title, tour.tourId, tour.packageCode, tour.destination, leadLeader?.fullName]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [tours, query, status, region]);

  // Filter first, then paginate. The other order would page through the whole
  // list and then filter one page of it, which is how a search that "finds
  // nothing" on page 3 happens.
  const paged = usePaginated(filtered);
  const rows = paged.rows;

  const selectClass =
    'rounded-control border border-border bg-surface px-2 py-1 text-base text-ink';

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-faint bg-surface-alt px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, code, package, destination or leader"
          aria-label="Search departures"
          className={`${selectClass} min-w-64 flex-1`}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TourStatus | 'ALL')}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="ALL">Any status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="ON_TOUR">On tour</option>
          <option value="RETURNED">Returned</option>
          <option value="CLOSED">Closed</option>
          <option value="CALLED_OFF">Called off</option>
        </select>
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          aria-label="Filter by region"
          className={selectClass}
        >
          <option value="ALL">Any region</option>
          {regions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="tabular text-sm text-ink-faint">
          {filtered.length === tours.length
            ? `${tours.length} ${BRAND.vocabulary.tourPlural}`
            : `${filtered.length} of ${tours.length}`}
        </span>
      </div>

      <Table
        head={
          <tr>
            <th className={TH}>Departure</th>
            <th className={TH}>Dates</th>
            <th className={TH}>Status</th>
            <th className={TH}>Seats</th>
            <th className={TH}>Lead leader</th>
            <th className={`${TH} text-right`}>Outstanding</th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={6}>No departure matches those filters.</EmptyRow>
        ) : (
          rows.map(({ tour, leadLeader, outstandingMinor, paxBooked }) => {
            const days = daysUntil(tour.startDate);
            return (
              <tr key={tour.tourId} className="hover:bg-hover-wash">
                <td className={TD}>
                  <Link href={`/admin/trips/${tour.tourId}`} className="font-semibold text-accent">
                    {tour.title}
                  </Link>
                  <div className="tabular mt-0.5 text-xs text-ink-faint">
                    {tour.tourId} · {tour.destination}
                  </div>
                </td>
                <td className={TD}>
                  <div className="whitespace-nowrap">{dateRange(tour.startDate, tour.endDate)}</div>
                  {tour.status === 'CONFIRMED' && days >= 0 && (
                    <div className="mt-0.5 text-xs text-ink-faint">
                      {days === 0 ? 'departs today' : `in ${days} day${days === 1 ? '' : 's'}`}
                    </div>
                  )}
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    <TourStatusChip status={tour.status} />
                    <TourStyleChip style={tour.style} />
                  </div>
                </td>
                <td className={`${TD} tabular whitespace-nowrap`}>
                  {tour.seatsSold} / {tour.seatsTotal}
                  <div className="text-xs text-ink-faint">{paxBooked} pax</div>
                </td>
                <td className={TD}>
                  {leadLeader === null ? (
                    <span className="text-ink-faint italic">not yet rostered</span>
                  ) : (
                    <>
                      {leadLeader.fullName}
                      <div className="tabular mt-0.5 text-xs text-ink-faint">
                        {leadLeader.phone}
                      </div>
                    </>
                  )}
                </td>
                <td className={`${TD} tabular text-right whitespace-nowrap`}>
                  {outstandingMinor === 0 ? (
                    <span className="text-ink-faint">—</span>
                  ) : (
                    <span className={tour.status === 'CALLED_OFF' ? 'text-danger' : 'text-ink'}>
                      {amount(outstandingMinor)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>

      <Pagination {...paged} noun={BRAND.vocabulary.tourPlural} />
    </section>
  );
}
