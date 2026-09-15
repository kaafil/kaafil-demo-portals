import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BookingStatusChip,
  Chip,
  DUTY_LABEL,
  MEAL_LABEL,
  Panel,
  Stat,
  Table,
  TD,
  TH,
  TourStatusChip,
  TourStyleChip,
} from '@/components/ui';
import { getStore } from '@/lib/db';
import { amount, date, dateRange, money } from '@/lib/format';

const TABS = ['overview', 'travellers', 'payments', 'staff'] as const;
type Tab = (typeof TABS)[number];

/**
 * One departure, four tabs, tab held in the QUERY STRING.
 *
 * `?tab=` rather than a nested route, and that is a deliberate call worth
 * stating: these four views are one record seen four ways, not four
 * destinations. A query param keeps them shareable and back-button-correct
 * without inventing four URLs for one thing — and it keeps `/admin/trips/:id`
 * as the single canonical link to a departure, which matters because Kaafil's
 * own surface will be handed that URL to navigate to.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tourId: string }>;
}): Promise<Metadata> {
  const { tourId } = await params;
  return { title: getStore().getTour(tourId)?.tour.title ?? 'Departure' };
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tourId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tourId } = await params;
  const { tab: rawTab } = await searchParams;

  const detail = getStore().getTour(tourId);
  if (detail === null) notFound();

  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'overview';
  const { tour, crew, bookings, travellers } = detail;

  return (
    <>
      <header className="mb-4 border-b border-border-faint pb-3">
        <Link href="/admin/trips" className="text-sm text-accent">
          ← All departures
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">{tour.title}</h1>
          <TourStatusChip status={tour.status} />
          <TourStyleChip style={tour.style} />
          {tour.sellingMode === 'CUSTOMISED' && <Chip tone="neutral" label="Customised" />}
        </div>
        <p className="tabular mt-1 mb-0 text-sm text-ink-faint">
          {tour.tourId} · {tour.packageCode} · {dateRange(tour.startDate, tour.endDate)} ·{' '}
          {tour.destination}
        </p>
      </header>

      {tour.status === 'CALLED_OFF' && (
        <div className="mb-4 rounded-card border border-danger-border bg-danger-bg px-3 py-2 text-base text-danger">
          <strong>
            Called off{tour.calledOffOn !== undefined && ` on ${date(tour.calledOffOn)}`}.
          </strong>{' '}
          {tour.calledOffReason}
        </div>
      )}

      <nav className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((name) => (
          <Link
            key={name}
            href={`/admin/trips/${tour.tourId}?tab=${name}`}
            aria-current={name === tab ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-1.5 text-md capitalize no-underline ${
              name === tab
                ? 'border-b-accent font-semibold text-ink'
                : 'border-b-transparent text-ink-soft hover:bg-hover-wash'
            }`}
          >
            {name}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Seats"
              value={`${tour.seatsSold} / ${tour.seatsTotal}`}
              hint="sold / capacity"
            />
            <Stat
              label="Pax booked"
              value={String(detail.paxBooked)}
              hint={`${detail.bookingCount} bookings`}
            />
            <Stat label="Billed" value={amount(detail.billedMinor)} />
            <Stat
              label="Outstanding"
              value={amount(detail.outstandingMinor)}
              hint={detail.outstandingMinor === 0 ? 'settled' : 'still to collect'}
            />
          </div>

          <Panel title="The departure">
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 p-3 text-base md:grid-cols-2">
              <Field label="Boarding city" value={tour.boardingCity} />
              <Field label="Meeting point" value={tour.meetingPoint} />
              <Field label="Region" value={tour.region} />
              <Field label="Timezone" value={tour.timezone} />
              <Field
                label="Price per seat"
                value={`${money(tour.pricePerSeatMinor)} (twin sharing)`}
              />
              <Field
                label="Settlement due"
                value={tour.settlementDueOn === undefined ? '—' : date(tour.settlementDueOn)}
              />
            </dl>
            {tour.notes !== undefined && (
              <p className="m-0 border-t border-border-faint bg-surface-alt px-3 py-2 text-base text-ink-soft">
                <strong className="text-ink">Desk notes. </strong>
                {tour.notes}
              </p>
            )}
          </Panel>

          <Panel title={`Itinerary — ${tour.itinerary.length} days as sold`}>
            <Table
              head={
                <tr>
                  <th className={TH}>Day</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>Title</th>
                  <th className={TH}>Night halt</th>
                </tr>
              }
            >
              {tour.itinerary.map((day) => (
                <tr key={day.dayNumber} className="hover:bg-hover-wash">
                  <td className={`${TD} tabular`}>{day.dayNumber}</td>
                  <td className={`${TD} whitespace-nowrap`}>{date(day.date)}</td>
                  <td className={TD}>{day.title}</td>
                  <td className={TD}>
                    {day.nightHalt ?? (
                      <span className="text-ink-faint italic">overnight transit</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <p className="m-0 border-t border-border-faint bg-surface-alt px-3 py-2 text-sm text-ink-faint">
              This is the brochure itinerary. What actually happened on the ground — and what the
              leader changed — lives in Kaafil, under{' '}
              <Link href="/admin/operations" className="text-accent">
                On the ground
              </Link>
              .
            </p>
          </Panel>
        </>
      )}

      {tab === 'travellers' && (
        <Panel title={`Manifest — ${travellers.length} people, grouped by booking`}>
          <Table
            head={
              <tr>
                <th className={TH}>Traveller</th>
                <th className={TH}>Party</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Meal</th>
                <th className={TH}>Notes the leader must read</th>
              </tr>
            }
          >
            {travellers.map((person) => (
              <tr key={person.travellerId} className="hover:bg-hover-wash">
                <td className={TD}>
                  <span className="font-semibold">{person.fullName}</span>
                  <div className="text-xs text-ink-faint">
                    {person.city} · {person.preferredLanguage}
                  </div>
                </td>
                <td className={`${TD} tabular`}>
                  {person.bookingRef}
                  <div className="text-xs text-ink-faint">
                    {person.partyRole === 'LEAD' ? 'lead' : person.relationToLead}
                  </div>
                </td>
                <td className={`${TD} tabular whitespace-nowrap`}>{person.phone}</td>
                <td className={TD}>{MEAL_LABEL[person.mealPreference]}</td>
                <td className={TD}>
                  {/* `null` is not "nothing to declare" — it means the form came
                      back blank, and the desk treats those differently. Saying
                      so is the whole reason this column is not a tick. */}
                  {person.medicalNotes === null ? (
                    <span className="text-ink-faint italic">form came back blank</span>
                  ) : (
                    <span className="text-warning">{person.medicalNotes}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {tab === 'payments' && (
        <Panel title={`Bookings and receipts — ${bookings.length} parties`}>
          <Table
            head={
              <tr>
                <th className={TH}>Booking</th>
                <th className={TH}>Status</th>
                <th className={TH}>Pax</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-right`}>Received</th>
                <th className={TH}>Receipts</th>
              </tr>
            }
          >
            {bookings.map(({ booking, payments }) => (
              <tr key={booking.bookingRef} className="hover:bg-hover-wash">
                <td className={TD}>
                  <span className="font-semibold">{booking.partyName}</span>
                  <div className="tabular text-xs text-ink-faint">
                    {booking.bookingRef} · booked {date(booking.bookedOn)}
                  </div>
                  {booking.remarks !== undefined && (
                    <div className="mt-0.5 text-xs text-ink-soft">{booking.remarks}</div>
                  )}
                </td>
                <td className={TD}>
                  <BookingStatusChip status={booking.status} />
                </td>
                <td className={`${TD} tabular`}>{booking.paxCount}</td>
                <td className={`${TD} tabular text-right whitespace-nowrap`}>
                  {amount(booking.totalMinor)}
                  {booking.discountMinor > 0 && (
                    <div className="text-xs text-ink-faint">
                      less {amount(booking.discountMinor)}
                    </div>
                  )}
                </td>
                <td className={`${TD} tabular text-right whitespace-nowrap`}>
                  {amount(booking.receivedMinor)}
                  {booking.totalMinor - booking.receivedMinor > 0 && (
                    <div className="text-xs text-danger">
                      {amount(booking.totalMinor - booking.receivedMinor)} due
                    </div>
                  )}
                </td>
                <td className={TD}>
                  <ul className="m-0 list-none p-0 text-xs">
                    {payments.map((payment) => (
                      <li key={payment.paymentId} className="tabular whitespace-nowrap">
                        <span className={payment.direction === 'OUT' ? 'text-danger' : 'text-ink'}>
                          {payment.direction === 'OUT' ? '−' : '+'}
                          {amount(payment.amountMinor)}
                        </span>{' '}
                        <span className="text-ink-faint">
                          {payment.mode} · {date(payment.paidOn)} · {payment.reference}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {tab === 'staff' && (
        <Panel title="On the ground">
          <Table
            head={
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Duty</th>
                <th className={TH}>Based in</th>
                <th className={TH}>Languages</th>
                <th className={TH}>Assigned</th>
              </tr>
            }
          >
            {crew.map(({ assignment, staff }) => (
              <tr
                key={`${assignment.staffId}-${assignment.dutyRole}`}
                className="hover:bg-hover-wash"
              >
                <td className={TD}>
                  <span className="font-semibold">{staff.fullName}</span>
                  <div className="tabular text-xs text-ink-faint">
                    {staff.staffCode} · {staff.phone}
                  </div>
                </td>
                <td className={TD}>{DUTY_LABEL[assignment.dutyRole]}</td>
                <td className={TD}>{staff.basedIn}</td>
                <td className={TD}>{staff.languages.join(', ')}</td>
                <td className={`${TD} whitespace-nowrap`}>{date(assignment.assignedOn)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-faint pb-1">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="m-0 text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
