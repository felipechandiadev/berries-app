
import UserList from './ui/userList';
import { getUsers } from '../../actions/users';
import { Suspense } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

async function UsersContent({ search }: { search: string }) {
  const users = await getUsers(search);
  return <UserList users={users} />;
}

export default async function Page(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // FIXED: Properly await searchParams to avoid race conditions in Electron production builds
  const searchParams = await props.searchParams;
  const search = (typeof searchParams?.search === 'string' ? searchParams.search : '') || '';

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96">
      <DotProgress />
    </div>}>
      <UsersContent search={search} />
    </Suspense>
  );

}
