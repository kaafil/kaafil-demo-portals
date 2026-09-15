import { redirect } from 'next/navigation';

/**
 * The field app's sign-in moved to `/login`, which now routes by job.
 *
 * The route stays as a redirect rather than being deleted, because things
 * point at it: the manager provider's `onSessionExpired`, the gate in
 * `m/(app)/layout.tsx`, and any link a leader has already bookmarked. A 404
 * for a bookmarked sign-in page is a bad way to start a demo.
 */
export default function ManagerLoginRedirect() {
  redirect('/login');
}
