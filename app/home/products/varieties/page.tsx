import ListVarieties from './ui/ListVarieties';
import { getVarieties } from '../../../actions/varieties';
import { Suspense } from 'react';
import DotProgress from '../../../baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

async function VarietiesContent({ search }: { search: string }) {
  const result = await getVarieties(search ? { name: search } : undefined);
  const varieties = Array.isArray(result.data) ? result.data : [];
  // Convert to plain objects to avoid Server->Client serialization error
  const plainVarieties = JSON.parse(JSON.stringify(varieties));
  return <ListVarieties varieties={plainVarieties} />;
}

export default async function Page(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // FIXED: Properly await searchParams to avoid race conditions in Electron production builds
  const searchParams = await props.searchParams;
  const search = (typeof searchParams?.search === 'string' ? searchParams.search : '') || '';

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96">
      <DotProgress />
    </div>}>
      <VarietiesContent search={search} />
    </Suspense>
  );
}