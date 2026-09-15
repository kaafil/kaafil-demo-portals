/**
 * Everything about this deployment that is a NAME rather than a behaviour.
 *
 * ── THIS IS THE SECOND FILE A CLIENT BRANCH EDITS ──────────────────────────
 *
 * `styles/tokens.css` owns how the product looks. This file owns what it is
 * called. Between the two, a branch should be able to make the app read as a
 * prospect's own system without touching a component.
 *
 * ── WHY VOCABULARY IS A FIRST-CLASS CONCERN ────────────────────────────────
 *
 * The fixture is built on the premise that the CRM and Kaafil do not share
 * words: Sharma Travels says *tour*, *tour leader*, `ON_TOUR`, `CALLED_OFF`;
 * Kaafil says *trip*, *manager*, `IN_PROGRESS`, `CANCELLED`. That is not a
 * quirk of the fixture — it is what every real integration looks like, and
 * `lib/ingest.ts` is where the two are reconciled on the data side.
 *
 * On the UI side it is reconciled here. Every prospect has their own words:
 * some run *departures*, some run *batches*, some run *groups*. A branch that
 * adopts the client's vocabulary in one object is a branch that stops feeling
 * like somebody else's software on the first screen, which is most of the
 * battle in a demo.
 */

export interface BrandVocabulary {
  /** A dated departure of a package. Kaafil calls this a trip. */
  tour: string;
  tourPlural: string;
  /** The person who travels with the group. Kaafil calls this a manager. */
  leader: string;
  leaderPlural: string;
  /** The person at the office who sells and collects. */
  desk: string;
  deskPlural: string;
  /** A person on a manifest. */
  traveller: string;
  travellerPlural: string;
  /** What a party bought. */
  booking: string;
  bookingPlural: string;
}

export interface Brand {
  /** Shown in the masthead, the document title and the manifest. */
  productName: string;
  /** The operating company, for the sign-in screen and the footer. */
  companyName: string;
  /** Short form for a tab title and the PWA manifest's `short_name`. */
  shortName: string;
  /**
   * Path under `public/`. Swap the file, keep the path.
   *
   * `null` means this brand has no mark and its name should simply be set in
   * its own typeface — which is the honest answer for a good many operators.
   */
  logoPath: string | null;
  /** One line under the sign-in heading. */
  tagline: string;
  /**
   * Which colour scheme this CRM is built in. Passed straight to the Kaafil
   * provider as `theme`.
   *
   * NOT SAFE TO OMIT. The provider's own default is `'system'`, which follows
   * the VIEWER'S operating system. That is right for a product that is the
   * whole page and implements both schemes; it is wrong for an embedded
   * surface, because the host decides what the page looks like — and most CRMs,
   * this one included, are built in one scheme only.
   *
   * Leave it unset and a reviewer whose laptop is in dark mode sees a light CRM
   * with dark Kaafil panels inside it. That is the exact seam the token bridge
   * exists to prevent, arriving through a door the bridge does not cover: the
   * tokens map correctly, and then the kit re-points them at its dark set.
   *
   * `styles/tokens.css` declares light values and no dark block, so the honest
   * answer here is `'light'`. A branch whose CRM is genuinely dark says
   * `'dark'`; one that implements both says `'system'` and means it.
   */
  colorScheme: 'light' | 'dark' | 'system';
  vocabulary: BrandVocabulary;
}

/**
 * This branch is the awkward one, and it is worth saying why before anyone
 * "fixes" it.
 *
 * The host brand here is Kaafil's own, and Kaafil is also the product embedded
 * inside it. So the CRM is a fictional operations desk that Kaafil runs, and
 * `styles/tokens.css` carries the same palette as the developer portal — which
 * makes this branch the one that answers "what does a Kaafil-branded surface
 * actually look like" rather than "what does a prospect's surface look like".
 *
 * ── WHY THE VOCABULARY IS NOT KAAFIL'S ─────────────────────────────────────
 *
 * Every OTHER branch changes these words. This one deliberately does not, and
 * the temptation to make them agree is exactly the thing to resist.
 *
 * The fixture is built on the premise that the CRM and Kaafil do not share
 * words: this desk says *departure*, *tour leader*, `ON_TOUR`; Kaafil says
 * *trip*, *manager*, `IN_PROGRESS`. `lib/ingest.ts` exists to reconcile the
 * two, and that reconciliation is the hardest and most instructive part of the
 * whole integration. If the host said "trip" there would be nothing left to
 * reconcile and the demo would quietly stop demonstrating it.
 *
 * So a reviewer who notices that the embedded panel says "Trip" where the nav
 * says "Departures" is watching the translation layer work, not finding a bug.
 */
export const BRAND: Brand = {
  productName: 'Kaafil Travel Desk',
  companyName: 'Kaafil',
  shortName: 'Kaafil',
  logoPath: '/brand/logo.svg',
  tagline: 'Every departure, manifest and collection — on one desk.',
  colorScheme: 'light',

  // Unchanged from `main`, on purpose. See the block above.
  vocabulary: {
    tour: 'departure',
    tourPlural: 'departures',
    leader: 'tour leader',
    leaderPlural: 'tour leaders',
    desk: 'desk executive',
    deskPlural: 'desk executives',
    traveller: 'traveller',
    travellerPlural: 'travellers',
    booking: 'booking',
    bookingPlural: 'bookings',
  },
};

/** `departure` -> `Departure`. For headings, where the vocabulary is mid-sentence elsewhere. */
export function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
