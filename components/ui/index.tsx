/**
 * The handful of presentational pieces every desk screen repeats.
 *
 * Every className here is a token utility (`bg-surface`, `border-border-faint`,
 * `text-ink-soft`) and never a literal. That is not style preference: it is the
 * contract that makes a client branch a one-file change. If you find yourself
 * reaching for `bg-[#f5f5f5]`, the token you want is missing from
 * `styles/tokens.css` — add it there.
 */

import type { ReactNode } from 'react';
import type {
  BookingStatus,
  DutyRole,
  MealPreference,
  StaffRole,
  TourStatus,
  TourStyle,
} from '@/fixtures/types';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-bg text-success border-success-border',
  warning: 'bg-warning-bg text-warning border-warning-border',
  danger: 'bg-danger-bg text-danger border-danger-border',
  neutral: 'bg-neutral-bg text-neutral border-neutral-border',
  info: 'bg-info-bg text-info border-info-border',
  accent: 'bg-accent-soft text-accent border-border',
};

export function Chip({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={`inline-block rounded-control border px-1.5 py-0.5 text-xs whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

/**
 * The colour a departure gets in the list.
 *
 * ON_TOUR is the only status the desk actively watches — it means there are
 * people out there right now — so it is the only one given a hue nothing else
 * uses. Everything else is deliberately quiet.
 */
const TOUR_STATUS: Record<TourStatus, { tone: Tone; label: string }> = {
  CONFIRMED: { tone: 'accent', label: 'Confirmed' },
  ON_TOUR: { tone: 'info', label: 'On tour' },
  RETURNED: { tone: 'warning', label: 'Returned' },
  CLOSED: { tone: 'neutral', label: 'Closed' },
  CALLED_OFF: { tone: 'danger', label: 'Called off' },
};

export function TourStatusChip({ status }: { status: TourStatus }) {
  const { tone, label } = TOUR_STATUS[status];
  return <Chip tone={tone} label={label} />;
}

const BOOKING_STATUS: Record<BookingStatus, { tone: Tone; label: string }> = {
  PAID_IN_FULL: { tone: 'success', label: 'Paid in full' },
  PART_PAID: { tone: 'warning', label: 'Part paid' },
  REFUND_DUE: { tone: 'danger', label: 'Refund due' },
  REFUNDED: { tone: 'neutral', label: 'Refunded' },
};

export function BookingStatusChip({ status }: { status: BookingStatus }) {
  const { tone, label } = BOOKING_STATUS[status];
  return <Chip tone={tone} label={label} />;
}

const STYLE_LABEL: Record<TourStyle, string> = { GROUP_TOUR: 'Group tour', TREK: 'Trek' };

export function TourStyleChip({ style }: { style: TourStyle }) {
  return <Chip tone={style === 'TREK' ? 'info' : 'neutral'} label={STYLE_LABEL[style]} />;
}

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  TOUR_LEADER: 'Tour leader',
  DESK_EXECUTIVE: 'Desk executive',
};

export const DUTY_LABEL: Record<DutyRole, string> = {
  LEAD_LEADER: 'Lead leader',
  ASSISTANT_LEADER: 'Assistant leader',
  DESK_OWNER: 'Desk owner',
};

export const MEAL_LABEL: Record<MealPreference, string> = {
  VEG: 'Veg',
  JAIN: 'Jain',
  NON_VEG: 'Non-veg',
  VEGAN: 'Vegan',
};

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4 border-b border-border-faint pb-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle !== undefined && <p className="mt-1 mb-0 text-sm text-ink-faint">{subtitle}</p>}
      </div>
      {actions !== undefined && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  children,
  aside,
}: {
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {title !== undefined && (
        <div className="flex items-center justify-between gap-3 border-b border-border-faint bg-surface-alt px-3 py-2">
          <h2 className="m-0 text-sm font-semibold tracking-wide text-ink-soft uppercase">
            {title}
          </h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A headline figure. `hint` is for the qualifier a number needs to be honest —
 * "across 12 departures", "excludes called-off" — because a total with no
 * stated scope is a total somebody will quote back at you wrongly.
 */
export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 shadow-card">
      <div className="text-xs tracking-wide text-ink-faint uppercase">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold text-ink">{value}</div>
      {hint !== undefined && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-ink-faint">
        {children}
      </td>
    </tr>
  );
}

/** The shared table chrome, so every desk screen's table is the same table. */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full border-collapse text-base">
        <thead className="bg-surface-alt">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const TH =
  'border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft font-semibold whitespace-nowrap';
export const TD = 'border-b border-border-faint align-top';
