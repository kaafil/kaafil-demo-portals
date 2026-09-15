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
 * The donor fixture's central conceit is that the CRM and Kaafil do not share
 * words: Sharma Travels says *tour*, *tour leader*, `ON_TOUR`, `CALLED_OFF`;
 * Kaafil says *trip*, *manager*, `IN_PROGRESS`, `CANCELLED`. That is not a
 * quirk of the fixture — it is what every real integration looks like, and
 * `scripts/ingest.ts` is where the two are reconciled on the data side.
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
  vocabulary: BrandVocabulary;
}

/**
 * `main`'s brand is the donor fixture's own operator. It is a real-feeling
 * fifteen-year-old tour operator in Pune, which makes it a far better control
 * than a placeholder called "Acme" — every screen has to cope with genuine
 * Indian names, GSTINs, E.164 phones and Devanagari-adjacent place names.
 */
export const BRAND: Brand = {
  productName: 'Sharma Travels Admin',
  companyName: 'Sharma Travels Pvt. Ltd.',
  shortName: 'STPL',
  logoPath: '/brand/logo.svg',
  tagline: 'Back office — departures, manifests and collections.',

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
