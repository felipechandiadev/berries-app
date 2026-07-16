'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  trend?: number;
  subtitle?: string;
}

export default function KPICard({ title, value, icon, trend, subtitle }: KPICardProps) {
  const trendColor = trend !== undefined
    ? trend >= 0
      ? 'text-[color:var(--color-accent)]'
      : 'text-red-600'
    : 'text-gray-500';

  return (
    <div className="rounded-xl border border-[color:var(--dash-line,#E6E8E0)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          {trend !== undefined && (
            <p className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <span className="material-symbols-outlined text-sm">
                {trend >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(trend)}% vs período anterior
            </p>
          )}
        </div>
        <span
          className="material-symbols-outlined rounded-lg bg-[color:var(--dash-soft,#F0F2EA)] p-2 text-[color:var(--dash-accent,#5A8A00)]"
          aria-hidden
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
