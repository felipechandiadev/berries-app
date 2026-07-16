'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TopBar from '@/app/baseComponents/TopBar/TopBar';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import type { AbilityValue } from '@/lib/permissions';

const routeTitles = [
  { route: '/home', title: 'Dashboard' },
  { route: '/home/users', title: 'Usuarios' },
  { route: '/home/audit', title: 'Auditoría' },
  { route: '/home/storage/storages', title: 'Almacenes' },
  { route: '/home/productiveManagement/seasons', title: 'Temporadas' },
  { route: '/home/productiveManagement/productiveUnits', title: 'Unidades Productivas' },
  { route: '/home/storage/trays', title: 'Bandejas' },
  { route: '/home/storage/pallets', title: 'Pallets' },
  { route: '/home/products/varieties', title: 'Variedades' },
  { route: '/home/products/formats', title: 'Formatos' },
  { route: '/home/economicManagement/advances', title: 'Anticipos' },
  { route: '/home/economicManagement/settlements', title: 'Liquidaciones' },
  { route: '/home/economicManagement/bankAccounts', title: 'Cuentas Bancarias' },
  { route: '/home/receptions/simple', title: 'Nueva Recepción Simple' },
  { route: '/home/receptions/receptions', title: 'Recepciones' },
  { route: '/home/productiveManagement/producers', title: 'Productores' },
  { route: '/home/dispatch/customers', title: 'Clientes' },
  { route: '/home/dispatch/dispatchs', title: 'Despacho' },
  { route: '/home/reports', title: 'Reportes' },
];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { has, hasAny } = usePermissions();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', url: '/home', permission: 'DASHBOARD_MENU' as AbilityValue },
    {
      id: 'recepcion',
      label: 'Recepción',
      permission: 'RECEPTIONS_MENU' as AbilityValue,
      children: [
        { id: 'Nueva Recepción Simple', label: 'Nueva Recepción Simple', url: '/home/receptions/simple', permission: 'RECEPTIONS_CREATE_MENU' as AbilityValue },
        { id: 'Nueva Recepción Multi-Pack', label: 'Nueva Recepción Multi-Pack', url: '/home/receptions/multipack', permission: 'RECEPTIONS_CREATE_MENU' as AbilityValue },
        { id: 'recepciones', label: 'Recepciones', url: '/home/receptions/receptions', permission: 'RECEPTIONS_MENU' as AbilityValue },
      ]
    },
    {
      id: 'gestion-productiva',
      label: 'Gestión Productiva',
      children: [
        { id: 'productores', label: 'Productores', url: '/home/productiveManagement/producers', permission: 'PRODUCERS_MENU' as AbilityValue },
        { id: 'unidades-productivas', label: 'Unidades Productivas', url: '/home/productiveManagement/productiveUnits', permission: 'PRODUCTIVE_UNITS_MENU' as AbilityValue },
        { id: 'temporadas', label: 'Temporadas', url: '/home/productiveManagement/seasons', permission: 'SEASONS_MENU' as AbilityValue },
      ]
    },
    {
      id: 'gestion-economica',
      label: 'Gestión Económica',
      children: [
        { id: 'anticipos', label: 'Anticipos', url: '/home/economicManagement/advances', permission: 'ADVANCES_MENU' as AbilityValue },
        { id: 'liquidaciones', label: 'Liquidaciones', url: '/home/economicManagement/settlements', permission: 'SETTLEMENTS_MENU' as AbilityValue },
        { id: 'cuentas-bancarias', label: 'Cuentas Bancarias', url: '/home/economicManagement/bankAccounts', permission: 'ADMIN_BANK_ACCOUNTS_MENU' as AbilityValue },
      ]
    },
    {
      id: 'despacho',
      label: 'Despacho',
      children: [
       { id: 'clientes', label: 'Clientes', url: '/home/dispatch/customers', permission: 'CUSTOMERS_MENU' as AbilityValue },
       { id: 'despachos', label: 'Despachos', url: '/home/dispatch/dispatchs', permission: 'DISPATCHES_MENU' as AbilityValue },
      ]
    },
    {
      id: 'productos',
      label: 'Productos',
      children: [
        { id: 'variedades', label: 'Variedades', url: '/home/products/varieties', permission: 'VARIETIES_MENU' as AbilityValue },
        { id: 'formatos', label: 'Formatos', url: '/home/products/formats', permission: 'FORMATS_MENU' as AbilityValue },
      ]
    },
    {
      id: 'almacenamiento',
      label: 'Almacenamiento',
      children: [
        { id: 'almacenamientos', label: 'Almacenes', url: '/home/storage/storages', permission: 'STORAGES_MENU' as AbilityValue },
        { id: 'pallets', label: 'Pallets', url: '/home/storage/pallets', permission: 'PALLETS_MENU' as AbilityValue },
        { id: 'bandejas', label: 'Bandejas', url: '/home/storage/trays', permission: 'TRAYS_MENU' as AbilityValue },
      ]
    },
    { id: 'reportes', label: 'Reportes', url: '/home/reports', permission: 'REPORTS_MENU' as AbilityValue },
    { id: 'usuarios', label: 'Usuarios', url: '/home/users', permission: 'USERS_MENU' as AbilityValue },
    { id: 'auditoria', label: 'Auditoría', url: '/home/audit', permission: 'AUDIT_MENU' as AbilityValue },
  ];

  // Filter menu items based on permissions - MUST be called before any conditional return
  const menuItems = useMemo(() => {
    return allMenuItems
      .filter(item => {
        // If item has permission requirement, check it
        if (item.permission) {
          return has(item.permission);
        }
        // If item has children, check if any child is accessible
        if (item.children) {
          return item.children.some(child => !child.permission || has(child.permission));
        }
        return true;
      })
      .map(item => {
        // Filter children based on permissions
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => !child.permission || has(child.permission))
          };
        }
        return item;
      })
      .filter(item => {
        // Remove parent items with no remaining children
        if (item.children && item.children.length === 0) {
          return false;
        }
        return true;
      });
  }, [has]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="fixed top-0 z-30 w-full h-20 bg-background border-b-[2px] border-primary" />
        <main className="flex-1 w-full container mx-auto px-4 py-6 mt-20 mb-10">
          <Suspense>
            {children}
          </Suspense>
        </main>
      </div>
    );
  }

  const logoSrc = '/logo.svg';

  // Determinar el título basado en la ruta actual
  const currentTitle = routeTitles.find(item => pathname === item.route)?.title || 'Home';

  // Obtener nombre del usuario de la sesión
  const user = session?.user as any;
  const userName = user?.name || '';

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title={currentTitle} menuItems={menuItems} logoSrc={logoSrc} showUserButton={true} userName={userName} />
      <main className="flex-1 w-full  mt-20 px-8 mb-10">
        <Suspense>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutContent>{children}</LayoutContent>;
}
