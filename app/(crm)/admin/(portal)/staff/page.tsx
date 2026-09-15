import type { Metadata } from 'next';
import Link from 'next/link';
import { DUTY_LABEL, PageHead, Panel, Table, TD, TH } from '@/components/ui';
import { getStore } from '@/lib/db';
import { date } from '@/lib/format';

export const metadata: Metadata = { title: 'Staff' };

/**
 * Two tables, not one filtered table.
 *
 * A tour leader and a desk executive do different jobs and the columns that
 * matter are different: where a leader is based and which languages they speak
 * decides whether they can run a departure; a desk executive's languages are
 * nobody's operational concern. Merging them into one grid means half the
 * cells are blank in every row, which is how a roster stops being scannable.
 *
 * This split is also the seam the integration runs along. Leaders become
 * Kaafil MANAGERS and sign in at `/m`; desk executives become Kaafil AGENCY
 * ADMINS and stay here. Mapping a CRM staff row to the right Kaafil session
 * endpoint is the first real design decision in any integration, and this
 * screen is where a partner can see the two populations they have to map.
 */
export default function StaffPage() {
  const roster = getStore().listStaff();
  const leaders = roster.filter((row) => row.staff.role === 'TOUR_LEADER');
  const desk = roster.filter((row) => row.staff.role === 'DESK_EXECUTIVE');

  return (
    <>
      <PageHead
        title="Staff"
        subtitle={`${leaders.length} tour leaders on the ground · ${desk.length} desk executives in Pune`}
      />

      <Panel title={`Tour leaders — they sign in at /m, not here`}>
        <Table
          head={
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Based in</th>
              <th className={TH}>Languages</th>
              <th className={TH}>Joined</th>
              <th className={TH}>Currently rostered onto</th>
            </tr>
          }
        >
          {leaders.map(({ staff, assignments }) => (
            <tr key={staff.staffId} className="hover:bg-hover-wash">
              <td className={TD}>
                <span className="font-semibold">{staff.fullName}</span>
                <div className="tabular text-xs text-ink-faint">
                  {staff.staffCode} · {staff.phone}
                </div>
              </td>
              <td className={TD}>{staff.basedIn}</td>
              <td className={TD}>{staff.languages.join(', ')}</td>
              <td className={`${TD} whitespace-nowrap`}>{date(staff.joinedOn)}</td>
              <td className={TD}>
                {assignments.length === 0 ? (
                  <span className="text-ink-faint italic">nothing upcoming</span>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {assignments.slice(0, 3).map((row) => (
                      <li key={`${row.tourId}-${row.dutyRole}`}>
                        <Link href={`/admin/trips/${row.tourId}`} className="text-accent">
                          {row.tourTitle}
                        </Link>
                        <span className="text-xs text-ink-faint">
                          {' '}
                          · {DUTY_LABEL[row.dutyRole]}
                        </span>
                      </li>
                    ))}
                    {assignments.length > 3 && (
                      <li className="text-xs text-ink-faint">and {assignments.length - 3} more</li>
                    )}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Desk executives — this portal">
        <Table
          head={
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Sign-in</th>
              <th className={TH}>Phone</th>
              <th className={TH}>Joined</th>
              <th className={TH}>Departures owned</th>
            </tr>
          }
        >
          {desk.map(({ staff, assignments }) => (
            <tr key={staff.staffId} className="hover:bg-hover-wash">
              <td className={TD}>
                <span className="font-semibold">{staff.fullName}</span>
                <div className="tabular text-xs text-ink-faint">{staff.staffCode}</div>
              </td>
              <td className={`${TD} tabular`}>{staff.loginEmail}</td>
              <td className={`${TD} tabular whitespace-nowrap`}>{staff.phone}</td>
              <td className={`${TD} whitespace-nowrap`}>{date(staff.joinedOn)}</td>
              <td className={`${TD} tabular`}>{assignments.length}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
