import 'server-only';

import { cookies } from 'next/headers';
import type { CrmStaff, StaffRole } from '@/fixtures/types';
import { getStore } from '@/lib/db';

/**
 * The CRM's own sign-in. There is no password store here and there never will
 * be — it is a picker over the seeded roster, so that signing in never gets in
 * the way of the thing this repo is actually demonstrating.
 *
 * ── TWO COOKIES, NOT ONE ───────────────────────────────────────────────────
 *
 * The desk portal and the manager app keep SEPARATE session cookies, on
 * separate paths. That is not tidiness. The two portals mint different Kaafil
 * personas from different endpoints, and a shared session would let a browser
 * that signed in at the desk walk into `/m` and be handed a manager token.
 * Keeping the sessions disjoint means the persona a browser can obtain is
 * decided by which portal it actually authenticated to.
 *
 * ── WHAT A REAL CRM WOULD DO HERE ──────────────────────────────────────────
 *
 * Replace the picker with your real login and keep everything downstream. The
 * one thing you must add is the check this file cannot make: that the signed-in
 * user is allowed to act as the ref they are asking for. Without it, the three
 * mint routes will happily issue a session for anybody's `staffId`.
 */

export const DESK_COOKIE = 'demo.desk.staff';
export const MANAGER_COOKIE = 'demo.manager.staff';

export type Portal = 'desk' | 'manager';

const COOKIE: Record<Portal, string> = {
  desk: DESK_COOKIE,
  manager: MANAGER_COOKIE,
};

/** Which staff role each portal admits. This is the gate, expressed once. */
export const PORTAL_ROLE: Record<Portal, StaffRole> = {
  desk: 'DESK_EXECUTIVE',
  manager: 'TOUR_LEADER',
};

export async function readStaff(portal: Portal): Promise<CrmStaff | null> {
  const staffId = (await cookies()).get(COOKIE[portal])?.value;
  if (staffId === undefined) return null;

  const record = getStore()
    .listStaff()
    .find((row) => row.staff.staffId === staffId);
  if (record === undefined) return null;

  // A cookie naming somebody who is not admitted to this portal is treated as
  // no session at all, not as an error. Re-seeding the database changes who
  // exists, and a stale cookie should send you to sign-in, not to a crash.
  if (record.staff.role !== PORTAL_ROLE[portal]) return null;

  return record.staff;
}

/**
 * Which portal a person belongs to, from their job.
 *
 * This is the whole basis of the single sign-in screen: the demo asks who you
 * are, and where you land follows from what you do. A tour leader has no use
 * for the desk and a desk executive has no use for the field app, so making
 * the visitor choose a portal as well as a person would be asking them to
 * answer a question the roster already answers.
 */
export function portalForStaff(staff: CrmStaff): Portal {
  return staff.role === 'TOUR_LEADER' ? 'manager' : 'desk';
}

/** Everyone who can sign in, leaders first — they are the more interesting demo. */
export function rosterAll(): CrmStaff[] {
  return getStore()
    .listStaff()
    .map((row) => row.staff)
    .filter((staff) => staff.active)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'TOUR_LEADER' ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });
}

export function cookieName(portal: Portal): string {
  return COOKIE[portal];
}

/**
 * The most interesting person to be, for a visitor who has not asked to choose.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * The roster screen is the right front door for a partner reading this repo:
 * picking one person and landing in a phone app, then another and landing at a
 * desk console, makes the product's central claim before anyone explains it.
 *
 * It is the wrong front door for a stranger who followed a link. They do not
 * know any of these names, none of the twenty means anything to them, and the
 * screen asks a question they have no basis to answer. `config/brand.ts`'s
 * `landingEntry` lets a deployment aimed at strangers skip it, and this decides
 * who they become.
 *
 * ── "MOST INTERESTING" IS NOT ARBITRARY ────────────────────────────────────
 *
 * For the field app it is the lead leader of a departure that is ON THE GROUND
 * RIGHT NOW — the one person in the roster with live work, a manifest to check
 * and money to account for. Anyone else lands in a correct but empty app, which
 * is the worst possible first impression of an offline-first field tool.
 * Departures are already ordered ON_TOUR-first, so the first hit is the live
 * one.
 *
 * For the desk it is simply the senior desk executive by staff code, because
 * every desk executive sees the same agency-wide screens — there is no
 * equivalent of "the one with live work", so the only honest tiebreak is a
 * stable one.
 *
 * Returns `null` rather than throwing when the roster cannot supply anybody, so
 * the caller can fall back to the picker instead of failing.
 */
export function suggestedStaff(portal: Portal): CrmStaff | null {
  const roster = rosterAll().filter((staff) => staff.role === PORTAL_ROLE[portal]);
  if (roster.length === 0) return null;

  if (portal === 'desk') {
    return [...roster].sort((a, b) => a.staffCode.localeCompare(b.staffCode))[0] ?? null;
  }

  const live = getStore()
    .listTours()
    .find((row) => row.tour.status === 'ON_TOUR' && row.leadLeader !== null);

  const leading = roster.find((staff) => staff.staffId === live?.leadLeader?.staffId);
  return leading ?? roster[0] ?? null;
}
