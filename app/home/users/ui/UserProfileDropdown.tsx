'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import UpdateUserPasswordDialog from '@/app/home/users/ui/UpdateUserPasswordDialog';
import ViewUserPermissionsDialog from '@/app/home/users/ui/ViewUserPermissionsDialog';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render until mounted on client
  if (!isMounted) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  const handleChangePassword = () => {
    setOpen(false);
    setPasswordDialogOpen(true);
  };

  const handleViewPermissions = () => {
    setOpen(false);
    setPermissionsDialogOpen(true);
  };

  const user = session?.user as any;
  const userName = user?.name || 'Usuario';
  const userEmail = user?.email || '';
  const userId = user?.id || '';

  // Normalize potential role formats from session data
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    ADMINISTRATOR: 'Administrador',
    ADMINISTRADOR: 'Administrador',
    OPERATOR: 'Operador',
    OPERADOR: 'Operador',
    ROLE_ADMIN: 'Administrador',
    ROLE_OPERATOR: 'Operador',
  };

  const resolveUserRole = (rawRole: unknown): string => {
    if (typeof rawRole === 'string') {
      return rawRole;
    }

    if (Array.isArray(rawRole) && rawRole.length > 0) {
      const first = rawRole[0];
      if (typeof first === 'string') {
        return first;
      }
      if (first && typeof first === 'object') {
        const firstObj = first as Record<string, unknown>;
        return (
          (typeof firstObj.value === 'string' && firstObj.value) ||
          (typeof firstObj.name === 'string' && firstObj.name) ||
          (typeof firstObj.id === 'string' && firstObj.id) ||
          ''
        );
      }
    }

    if (rawRole && typeof rawRole === 'object') {
      const roleObj = rawRole as Record<string, unknown>;
      return (
        (typeof roleObj.value === 'string' && roleObj.value) ||
        (typeof roleObj.name === 'string' && roleObj.name) ||
        (typeof roleObj.id === 'string' && roleObj.id) ||
        ''
      );
    }

    return '';
  };

  const rawRoleCandidate = user?.role ?? user?.rol ?? user?.roles ?? '';
  const resolvedRole = resolveUserRole(rawRoleCandidate).trim();
  const userRoleValue = resolvedRole.toUpperCase();

  const formatFallbackRole = (role: string) => {
    if (!role) {
      return '';
    }

    return role
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const userRole = (roleLabels[userRoleValue] ?? formatFallbackRole(resolvedRole)) || 'Usuario';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-colors duration-200"
        title={`${userName} (${userEmail})`}
        data-test-id="user-profile-button"
      >
        <span className="material-symbols-outlined text-foreground text-2xl transition-colors duration-200 group-hover:text-secondary">
          person
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate" data-testid="current-username">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail}
                </p>
                <p className="text-xs text-gray-400 capitalize mt-1">
                  Rol: {userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleViewPermissions}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
              data-test-id="view-permissions-menu-item"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Permisos
            </button>

            <button
              onClick={handleChangePassword}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
              data-test-id="change-password-menu-item"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Cambiar Contraseña
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center gap-2 border-t border-gray-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      <UpdateUserPasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        userId={userId}
        userName={userName}
        onSuccess={() => {
          // Opcional: hacer algo después de cambiar contraseña
        }}
      />

      {/* View Permissions Dialog */}
      <ViewUserPermissionsDialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        userName={userName}
      />
    </div>
  );
};

export default UserProfileDropdown;
