import type { Metadata } from 'next';
import { TravellerTable } from '@/components/crm/traveller-table';
import { PageHead } from '@/components/ui';
import { getStore } from '@/lib/db';

export const metadata: Metadata = { title: 'Traveller records' };

/**
 * Every person on every manifest, in one table.
 *
 * This screen exists for one workflow and it is worth naming: somebody rings
 * the desk with half a name and a rough month. The search therefore matches
 * across name, phone, email, booking reference and city at once, rather than
 * making the executive pick a field first.
 */
export default function TravellerDirectoryPage() {
  const travellers = getStore().listTravellers();

  return (
    <>
      <PageHead
        title="Traveller records"
        subtitle={`${travellers.length} people across every departure on the books`}
      />
      <TravellerTable travellers={travellers} />
    </>
  );
}
