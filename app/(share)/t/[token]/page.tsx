import { ShareView } from '@/components/kaafil/share-view';

/**
 * The traveller's page. The token in the URL is the entire credential.
 *
 * Deliberately the thinnest route in the repo: no gate, no store read, no
 * session. Somebody's family opens this from a WhatsApp message and it has to
 * work for a person who has never heard of Sharma Travels, let alone Kaafil.
 *
 * Which sections they can see is the SERVER's answer, fixed when the link was
 * created and returned as a flag per section. A host can narrow that set and
 * can never widen it — so a section missing from this page is a question about
 * the token, not about this component.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareView token={token} />;
}
