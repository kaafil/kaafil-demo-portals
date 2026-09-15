import type { Metadata } from 'next';
import { TripTable } from '@/components/crm/trip-table';
import { PageHead, Stat } from '@/components/ui';
import { BRAND, titleCase } from '@/config/brand';
import { getStore } from '@/lib/db';
import { amount } from '@/lib/format';

export const metadata: Metadata = { title: 'Departures' };

/**
 * The desk's home screen: every departure the office runs.
 *
 * A server component reading the store directly, with no HTTP hop in between.
 * That is the pattern every desk screen here follows: a Next CRM renders its
 * own data on the server, and fetching your own API from a server component is
 * a round trip that buys nothing.
 *
 * It is worth being explicit, because the instinct from a client-side CRM is
 * to reach for `/api/...`. The only routes this app serves are the three that
 * hold the Kaafil API key and cannot run in a browser — plus `/api/health`.
 * Everything else reads `getStore()`.
 */
export default function TripListPage() {
  const store = getStore();
  const tours = store.listTours();

  const live = tours.filter((row) => row.tour.status === 'ON_TOUR');
  const seatsSold = tours.reduce((sum, row) => sum + row.tour.seatsSold, 0);
  const seatsTotal = tours.reduce((sum, row) => sum + row.tour.seatsTotal, 0);
  // Called-off departures still carry an outstanding figure, but it is money
  // owed BACK, not money owed. Folding it into the same total would produce a
  // number the desk cannot act on, so it is excluded and the tile says so.
  const outstanding = tours
    .filter((row) => row.tour.status !== 'CALLED_OFF')
    .reduce((sum, row) => sum + row.outstandingMinor, 0);

  return (
    <>
      <PageHead
        title={titleCase(BRAND.vocabulary.tourPlural)}
        subtitle={`${tours.length} on the books · ${live.length} out on the ground right now`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Departures" value={String(tours.length)} hint={`${live.length} on tour`} />
        <Stat
          label="Seats sold"
          value={`${seatsSold} / ${seatsTotal}`}
          hint={`${Math.round((seatsSold / seatsTotal) * 100)}% of capacity`}
        />
        <Stat
          label="Pax booked"
          value={String(tours.reduce((sum, row) => sum + row.paxBooked, 0))}
          hint={`${tours.reduce((sum, row) => sum + row.bookingCount, 0)} bookings`}
        />
        <Stat label="Outstanding" value={amount(outstanding)} hint="excludes called-off" />
      </div>

      <TripTable tours={tours} />
    </>
  );
}
