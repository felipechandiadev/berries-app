'use client';
import { use, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import UserCard from "./userCard";
import CreateUserDialog from "./CreateUserDialog";
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR'
}

export interface UserType {
  id: string;
  userName: string;
  mail: string;
  phone?: string;
  rol: string;
  person?: {
    name?: string;
    dni?: string;
  };
}

export interface UserListProps {
  users: UserType[];
}

const defaultEmptyMessage = 'No hay usuarios para mostrar.';

const getDisplayName = (user: UserType): string => {
  const name = user.person?.name?.trim() ?? '';
  if (name) return name;
  if (user.userName) return user.userName;
  return user.mail;
};

const UserList: React.FC<UserListProps> = ({ users }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearch(value);
    // Use the current window location search so we always write the latest
    // params to the URL when the input changes (no useEffect required).
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    // Replace the full URL (including pathname) so Next recognizes the route change
    // and then refresh the server components so `page.tsx` receives the new search param
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/users';
    router.replace(`${pathname}?${params.toString()}`);
    // trigger a fetch of server components that depend on searchParams
    router.refresh();
  };

  // Server already returns filtered users based on the `search` param.
  // Use the provided `users` array directly.
  const displayedUsers = users;

  return (
    <div className="w-full" data-test-id="users-list-container">
      {/* Primera fila: búsqueda */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="users-list-header">
        <IconButton 
          icon="add" 
          variant='outlined'
          aria-label="Agregar usuario"
          onClick={() => setOpenCreateDialog(true)}
          data-test-id="users-add-button"
        />
        <div className="w-full max-w-sm" data-test-id="users-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar usuario..."
            data-test-id="users-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="users-grid">
        {displayedUsers && displayedUsers.length > 0 ? (
          displayedUsers.map(user => (
            <UserCard 
              key={user.id} 
              user={user}
              data-test-id={`user-card-${user.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="users-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateUserDialog */}
      <CreateUserDialog 
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="users-create-dialog"
      />
    </div>
  );
};

export default UserList;

