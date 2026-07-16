import ListFormats from './ui/ListFormats';
import { getFormats } from '../../../actions/formats';
import { Suspense } from 'react';
import DotProgress from '../../../baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

async function FormatsContent({ search }: { search: string }) {
  const result = await getFormats(search ? { name: search } : undefined);
  // Convert the entire result to plain objects to avoid Server->Client serialization error
  const plainResult = JSON.parse(JSON.stringify(result));
  const formats = Array.isArray(plainResult.data) ? plainResult.data : [];
  return <ListFormats formats={formats} />;
}

export default async function Page(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // FIXED: Properly await searchParams to avoid race conditions in Electron production builds
  const searchParams = await props.searchParams;
  const search = (typeof searchParams?.search === 'string' ? searchParams.search : '') || '';

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96">
      <DotProgress />
    </div>}>
      <FormatsContent search={search} />
    </Suspense>
  );
}
