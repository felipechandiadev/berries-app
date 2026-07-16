'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardChartsProps {
  byMonth: { name: string; receptions: number; dispatches: number }[];
  byVariety: { name: string; value: number }[];
}

const tooltipStyle = {
  backgroundColor: '#FFFEFB',
  border: '1px solid #E6E8E0',
  borderRadius: 8,
  fontSize: 12,
  color: '#1A1C18',
  boxShadow: 'none',
};

function formatMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'short' });
}

export default function DashboardCharts({ byMonth, byVariety }: DashboardChartsProps) {
  const maxVariety = Math.max(...byVariety.map((item) => item.value), 1);

  return (
    <div className="space-y-8">
      <div className="dash-panel">
        <div className="mb-6">
          <h2 className="font-display text-xl font-medium text-[color:var(--dash-ink)]">
            Flujo de fruta
          </h2>
          <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
            Recepción vs despacho · últimos meses
          </p>
        </div>
        <div className="h-[280px] w-full md:h-[320px]">
          {byMonth.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[color:var(--dash-muted)]">
              Sin datos de flujo todavía
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="recvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A8A00" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5A8A00" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dispFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F4A12" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#2F4A12" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E6E8E0" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatMonthLabel}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7260', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7260', fontSize: 12 }}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString('es-CL')} kg`,
                    name === 'receptions' ? 'Recepción' : 'Despacho',
                  ]}
                  labelFormatter={(label) => formatMonthLabel(String(label))}
                />
                <Area
                  type="monotone"
                  dataKey="receptions"
                  stroke="#5A8A00"
                  strokeWidth={2}
                  fill="url(#recvFill)"
                  name="receptions"
                />
                <Area
                  type="monotone"
                  dataKey="dispatches"
                  stroke="#2F4A12"
                  strokeWidth={2}
                  fill="url(#dispFill)"
                  name="dispatches"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 flex gap-5 text-xs text-[color:var(--dash-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5A8A00]" /> Recepción
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2F4A12]" /> Despacho
          </span>
        </div>
      </div>

      <div className="dash-panel">
        <div className="mb-6">
          <h2 className="font-display text-xl font-medium text-[color:var(--dash-ink)]">
            Mix por variedad
          </h2>
          <p className="mt-1 text-sm text-[color:var(--dash-muted)]">Kg netos en el rango seleccionado</p>
        </div>

        {byVariety.length === 0 ? (
          <p className="text-sm text-[color:var(--dash-muted)]">Sin recepciones por variedad</p>
        ) : (
          <ul className="space-y-4">
            {byVariety.map((item) => {
              const width = Math.max(4, (item.value / maxVariety) * 100);
              return (
                <li key={item.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-[color:var(--dash-ink)]">{item.name}</span>
                    <span className="tabular-nums text-[color:var(--dash-muted)]">
                      {item.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color:var(--dash-track)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--dash-accent)] transition-all duration-700"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Keep a compact chart for denser data views on wide screens */}
        {byVariety.length > 0 && (
          <div className="mt-8 hidden h-[160px] lg:block">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVariety} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7260', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${Number(value).toLocaleString('es-CL')} kg`, 'Kg']}
                />
                <Bar dataKey="value" fill="#5A8A00" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
