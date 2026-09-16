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
  /**
   * What the landing page's two calls to action do.
   *
   * `'roster'` — take the visitor to `/login` to pick a person. Right for a
   * partner reading this repo: choosing one name and landing in a phone app,
   * then another and landing at a desk console, makes the product's central
   * claim before anybody explains it. That screen IS the demonstration.
   *
   * `'direct'` — sign them straight in as whoever has the most to show
   * (`lib/session.ts#suggestedStaff`), skipping the roster entirely. Right for
   * a deployment aimed at people who followed a link: twenty Indian names mean
   * nothing to them, so the picker is asking a question they have no basis to
   * answer, and every extra screen between a stranger and the product costs
   * some of them.
   *
   * `/login` still exists and still works either way — this only decides where
   * the landing page points. A visitor who wants to be somebody else can
   * always sign out and choose.
   */
  landingEntry: 'roster' | 'direct';
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
  productName: 'Travyan',
  companyName: 'Travyan',
  shortName: 'Travyan',
  logoPath: '/brand/logo.png',
  tagline: 'Travel CRM — queries, bookings and trips in one place.',
  colorScheme: 'light',
  // `main` is the reference a partner reads, so it keeps the roster: that
  // screen is where the persona model is easiest to see.
  landingEntry: 'roster',

  /**
   * Travyan's own words, taken from their console's nav and screens.
   *
   * Two of these matter more than they look. They say **trip**, which happens
   * to be Kaafil's word too — so the embedded surface and the host agree
   * without translation, which is a small piece of luck worth noticing.
   *
   * And they say **customer** where this fixture says traveller: their manifest
   * is headed "Customer Manifest" while its column is "Traveller Name". Both
   * are in their product, so both are here — `traveller` for a person on a
   * manifest, which is the sense this CRM uses it in.
   */
  vocabulary: {
    tour: 'trip',
    tourPlural: 'trips',
    leader: 'trip manager',
    leaderPlural: 'trip managers',
    desk: 'agent',
    deskPlural: 'agents',
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
