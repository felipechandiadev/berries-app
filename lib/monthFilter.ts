import { toChileTime } from '@/lib/dateTimeUtils';

export const MONTH_FILTER_ALL = 'ALL';
export const MONTH_FILTER_OLDER = 'OLDER';

/** Meses recientes ofrecidos en el filtro (mes actual + anteriores). */
export const MONTH_FILTER_RECENT_COUNT = 4;

export interface MonthFilterOption {
  id: string;
  label: string;
}

const monthLabelFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Clave `YYYY-MM` de una fecha en zona horaria de Chile. */
export function getMonthKey(date: Date | string): string {
  return toChileTime(date).format('YYYY-MM');
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const label = monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace(' de ', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Claves de los últimos `count` meses, del más reciente al más antiguo. */
export function getRecentMonthKeys(count: number = MONTH_FILTER_RECENT_COUNT): string[] {
  const now = toChileTime(new Date()).startOf('month');
  return Array.from({ length: count }, (_, index) => now.clone().subtract(index, 'months').format('YYYY-MM'));
}

export function matchesMonthFilter(createdAt: string, filter: string, recentKeys: string[]): boolean {
  if (filter === MONTH_FILTER_ALL) return true;
  const key = getMonthKey(createdAt);
  if (filter === MONTH_FILTER_OLDER) {
    return key < recentKeys[recentKeys.length - 1];
  }
  return key === filter;
}

/** Opciones del filtro con la cantidad de filas de cada mes. */
export function buildMonthFilterOptions(
  rows: Array<{ createdAt: string }>,
  recentKeys: string[] = getRecentMonthKeys(),
): MonthFilterOption[] {
  const count = (filter: string) => rows.filter((row) => matchesMonthFilter(row.createdAt, filter, recentKeys)).length;
  const oldestRecent = recentKeys[recentKeys.length - 1];

  return [
    { id: MONTH_FILTER_ALL, label: `Todos los meses (${rows.length})` },
    ...recentKeys.map((key) => ({ id: key, label: `${formatMonthLabel(key)} (${count(key)})` })),
    { id: MONTH_FILTER_OLDER, label: `Anteriores a ${formatMonthLabel(oldestRecent).toLowerCase()} (${count(MONTH_FILTER_OLDER)})` },
  ];
}
