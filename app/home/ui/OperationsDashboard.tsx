'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { DashboardRange, DashboardStats } from '@/app/actions/dashboard';
import DashboardCharts from './DashboardCharts';

const RANGE_OPTIONS: { id: DashboardRange; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: 'season', label: 'Temporada' },
];

function formatKg(value: number): string {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg`;
}

function formatClp(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `hace ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-medium tracking-tight ${
        positive ? 'text-[color:var(--dash-accent)]' : 'text-[color:var(--dash-warn)]'
      }`}
    >
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

function PulseMetric({
  label,
  value,
  delta,
  href,
  delay,
}: {
  label: string;
  value: string;
  delta?: number | null;
  href: string;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className="dash-pulse-item group relative flex min-w-0 flex-col gap-2 px-1 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--dash-muted)]">
        {label}
      </span>
      <span className="dash-metric-value font-display text-3xl font-medium tracking-tight text-[color:var(--dash-ink)] md:text-4xl">
        {value}
      </span>
      <div className="flex items-center gap-2">
        <DeltaBadge value={delta ?? null} />
        <span className="text-xs text-[color:var(--dash-muted)] opacity-0 transition-opacity group-hover:opacity-100">
          Ver detalle →
        </span>
      </div>
    </Link>
  );
}

export default function OperationsDashboard({ data }: { data: DashboardStats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeRange = data.range;

  const setRange = (range: DashboardRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    startTransition(() => {
      router.push(`/home?${params.toString()}`);
    });
  };

  const warehouseFill =
    data.warehouse.totalCapacity > 0
      ? Math.round((data.warehouse.totalTraysOnPallets / data.warehouse.totalCapacity) * 100)
      : 0;

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const statusCopy =
    data.nearFullPallets.length > 0
      ? `${data.nearFullPallets.length} pallet${data.nearFullPallets.length > 1 ? 's' : ''} cerca de capacidad`
      : 'Bodega operativa';

  return (
    <div className="dash-root" data-test-id="home-dashboard">
      <header className="dash-header mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--dash-muted)]">
            Operations Pulse
          </p>
          <h1 className="font-display text-4xl font-medium tracking-tight text-[color:var(--dash-ink)] md:text-5xl">
            {data.season.name}
          </h1>
          <p className="text-sm capitalize text-[color:var(--dash-muted)] md:text-base">
            {todayLabel}
            <span className="mx-2 text-[color:var(--dash-line)]">·</span>
            <span className="inline-flex items-center gap-2 normal-case">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--dash-accent)]" aria-hidden />
              {statusCopy}
            </span>
          </p>
        </div>

        <div
          className={`dash-range inline-flex self-start rounded-lg border border-[color:var(--dash-line)] bg-[color:var(--dash-surface)] p-1 ${
            isPending ? 'opacity-70' : ''
          }`}
          role="group"
          aria-label="Rango de tiempo"
        >
          {RANGE_OPTIONS.map((option) => {
            const active = option.id === activeRange;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setRange(option.id)}
                className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[color:var(--dash-ink)] text-[color:var(--dash-surface)]'
                    : 'text-[color:var(--dash-muted)] hover:text-[color:var(--dash-ink)]'
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <section
        aria-label="Indicadores operativos"
        className="dash-pulse mb-10 grid grid-cols-1 gap-6 border-y border-[color:var(--dash-line)] py-7 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0"
      >
        <div className="xl:border-r xl:border-[color:var(--dash-line)] xl:pr-8">
          <PulseMetric
            label="Kg netos recepcionados"
            value={formatKg(data.receptions.totalWeight)}
            delta={data.receptions.deltaPercent}
            href="/home/receptions/receptions"
            delay={0}
          />
        </div>
        <div className="xl:border-r xl:border-[color:var(--dash-line)] xl:px-8">
          <PulseMetric
            label="Bandejas en bodega"
            value={`${data.warehouse.totalTraysOnPallets.toLocaleString('es-CL')}`}
            href="/home/storage/pallets"
            delay={80}
          />
          <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
            {warehouseFill}% de {data.warehouse.totalCapacity} capacidad · {data.producersCount} productores
          </p>
        </div>
        <div className="xl:border-r xl:border-[color:var(--dash-line)] xl:px-8">
          <PulseMetric
            label="Kg despachados"
            value={formatKg(data.dispatches.totalWeight)}
            delta={data.dispatches.deltaPercent}
            href="/home/dispatch/dispatchs"
            delay={160}
          />
        </div>
        <div className="xl:pl-8">
          <PulseMetric
            label="Por liquidar"
            value={formatClp(data.pendingSettlementClp)}
            href="/home/economicManagement/settlements"
            delay={240}
          />
        </div>
      </section>

      <div className="mb-10 grid grid-cols-1 gap-8 xl:grid-cols-12">
        <section className="space-y-8 xl:col-span-7" aria-label="Flujo de fruta">
          <DashboardCharts
            byMonth={data.receptions.byMonth}
            byVariety={data.receptions.byVariety}
          />
        </section>

        <aside className="space-y-8 xl:col-span-5" aria-label="Bodega viva">
          <div className="dash-panel">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-medium text-[color:var(--dash-ink)]">Capacidad de pallets</h2>
              <Link
                href="/home/storage/pallets"
                className="text-xs font-medium text-[color:var(--dash-accent)] hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <ul className="space-y-3">
              {data.warehouse.pallets.map((pallet) => (
                <li key={pallet.id} className="group">
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[color:var(--dash-ink)]">
                      #{pallet.id}
                      <span className="text-[color:var(--dash-muted)]"> · {pallet.storageName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--dash-muted)]">
                      {pallet.traysQuantity}/{pallet.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--dash-track)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pallet.fillPercent >= 80
                          ? 'bg-[color:var(--dash-warn)]'
                          : 'bg-[color:var(--dash-accent)]'
                      }`}
                      style={{ width: `${Math.min(100, pallet.fillPercent)}%` }}
                    />
                  </div>
                </li>
              ))}
              {data.warehouse.pallets.length === 0 && (
                <li className="text-sm text-[color:var(--dash-muted)]">Sin pallets registrados</li>
              )}
            </ul>
          </div>

          <div className="dash-panel">
            <h2 className="mb-4 font-display text-xl font-medium text-[color:var(--dash-ink)]">Stock de bandejas</h2>
            <ul className="divide-y divide-[color:var(--dash-line)]">
              {data.warehouse.trays.map((tray) => (
                <li key={tray.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-[color:var(--dash-ink)]">{tray.name}</span>
                  <span className="tabular-nums font-medium text-[color:var(--dash-ink)]">{tray.stock}</span>
                </li>
              ))}
              {data.warehouse.trays.length === 0 && (
                <li className="py-3 text-sm text-[color:var(--dash-muted)]">Sin bandejas</li>
              )}
            </ul>
          </div>

          <div className="dash-panel">
            <h2 className="mb-4 font-display text-xl font-medium text-[color:var(--dash-ink)]">Cola operativa</h2>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--dash-muted)]">
                  Recepciones recientes
                </p>
                <ul className="space-y-3">
                  {data.recentReceptions.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/home/receptions/receptions`}
                        className="block rounded-md outline-none transition-colors hover:bg-[color:var(--dash-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent)]"
                      >
                        <div className="flex items-start justify-between gap-3 px-1 py-1">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[color:var(--dash-ink)]">
                              #{item.id} · {item.producerName}
                            </p>
                            <p className="text-xs text-[color:var(--dash-muted)]">
                              {formatKg(item.netWeightKg)} · {formatClp(item.totalClp)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[color:var(--dash-muted)]">
                            {formatRelative(item.createdAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {data.recentReceptions.length === 0 && (
                    <li className="text-sm text-[color:var(--dash-muted)]">Sin recepciones aún</li>
                  )}
                </ul>
              </div>

              {data.nearFullPallets.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--dash-muted)]">
                    Atención bodega
                  </p>
                  <ul className="space-y-2">
                    {data.nearFullPallets.map((pallet) => (
                      <li
                        key={pallet.id}
                        className="flex items-center justify-between text-sm text-[color:var(--dash-ink)]"
                      >
                        <span>
                          Pallet #{pallet.id}
                          <span className="text-[color:var(--dash-muted)]"> · {pallet.storageName}</span>
                        </span>
                        <span className="tabular-nums text-[color:var(--dash-warn)]">{pallet.fillPercent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section
        aria-label="Acciones rápidas"
        className="dash-actions flex flex-col gap-4 border-t border-[color:var(--dash-line)] pt-8 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <p className="mr-auto text-sm text-[color:var(--dash-muted)]">Continuar el flujo operativo</p>
        <Link href="/home/receptions/simple" className="dash-action-primary">
          Nueva recepción
        </Link>
        <Link href="/home/storage/pallets" className="dash-action-ghost">
          Ver pallets
        </Link>
        <Link href="/home/dispatch/dispatchs" className="dash-action-ghost">
          Despachos
        </Link>
        <Link href="/home/economicManagement/settlements" className="dash-action-ghost">
          Liquidaciones
        </Link>
      </section>
    </div>
  );
}
