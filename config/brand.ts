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
 * `main`'s brand is the fixture's own operator: a fifteen-year-old tour
 * operator in Pune. Deliberately not a placeholder called "Acme" — a realistic
 * operator forces every screen to cope with genuine Indian names, GSTINs,
 * E.164 phone numbers and long Devanagari-adjacent place names, which is where
 * layouts actually break.
 */
export const BRAND: Brand = {
  productName: 'Sharma Travels Admin',
  companyName: 'Sharma Travels Pvt. Ltd.',
  shortName: 'STPL',
  logoPath: '/brand/logo.svg',
  tagline: 'Back office — departures, manifests and collections.',
  colorScheme: 'light',

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
