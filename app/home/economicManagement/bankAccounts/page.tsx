import ListBankAccounts from './ui/ListBankAccounts';
import { getAdminBankAccounts } from '../../../actions/adminBankAccounts';
import { Suspense } from 'react';
import DotProgress from '../../../baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

async function BankAccountsContent({ search }: { search: string }) {
  const result = await getAdminBankAccounts(search ? { search } : undefined);
  const bankAccounts = Array.isArray(result.data) ? result.data : [];
  // Convert to plain objects to avoid Server->Client serialization error
  const plainBankAccounts = JSON.parse(JSON.stringify(bankAccounts));
  return <ListBankAccounts bankAccounts={plainBankAccounts} />;
}

export default async function Page(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // FIXED: Properly await searchParams to avoid race conditions in Electron production builds
  const searchParams = await props.searchParams;
  const search = (typeof searchParams?.search === 'string' ? searchParams.search : '') || '';

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96">
      <DotProgress />
    </div>}>
      <BankAccountsContent search={search} />
    </Suspense>
  );
}
