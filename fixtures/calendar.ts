/**
 * Integer date arithmetic on ISO strings. No `Date` object escapes this file
 * and no function here reads a clock — except `todayInDeskZone()`, which is
 * the ONE clock read in the fixture layer and says so.
 *
 * ── WHY THESE LIVE HERE RATHER THAN IN `bulk.ts` ───────────────────────────
 *
 * They started as private helpers inside the bulk generator, which was right
 * while it was the only caller. `fixtures/live.ts` now needs the same
 * arithmetic to place a departure on the calendar, and two copies of "what does
 * adding seven days mean" is exactly the kind of duplication that stays
 * identical right up until somebody fixes a leap-year edge in one of them.
 *
 * ── WHY UTC, FOR DATES THAT ARE NOT UTC ────────────────────────────────────
 *
 * A calendar date has no timezone: a departure leaves on the 2nd of October
 * everywhere. Parsing with an explicit `T00:00:00Z` and formatting back through
 * `getUTC*` makes the arithmetic total and reversible — `addDays(d, 0) === d`
 * for every d — which is not true if the host's zone is west of Greenwich and
 * the round trip goes through local time. `lib/format.ts` makes the same choice
 * for the same reason and its comment explains what a reader would otherwise
 * see: a departure date that changes depending on who is looking at it.
 */

import type { IsoDate } from './types';

const DAY_MS = 86_400_000;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDayNumber(date: IsoDate): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

export function fromDayNumber(day: number): IsoDate {
  const d = new Date(day * DAY_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(date) + days);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** ISO dates sort lexicographically, which is the whole reason for the format. */
export function earliest(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function latest(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

/**
 * The zone the operator's day actually turns over in.
 *
 * Hardcoded rather than read from the environment, and that is the point: this
 * is a Pune desk's book of business, so "what day is it" is a question about
 * Asia/Kolkata and not about wherever the container happens to be scheduled. A
 * job whose idea of today came from `TZ` would roll a departure over a few
 * hours early or late depending on the host, which is a difference nobody would
 * ever manage to reproduce.
 */
export const DESK_TIMEZONE = 'Asia/Kolkata';

/**
 * Today, as the desk would write it. **The only clock read in `fixtures/`.**
 *
 * `en-CA` is not a joke — it is the locale whose short date format is exactly
 * `YYYY-MM-DD`, which is the format every other function here consumes. The
 * alternative is `toISOString().slice(0, 10)`, which silently answers in UTC
 * and is therefore wrong for five and a half hours out of every twenty-four.
 */
export function todayInDeskZone(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DESK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
