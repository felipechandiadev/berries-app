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
      ? 'text-green-600'
      : 'text-red-600'
    : 'text-gray-500';

  const trendIcon = trend !== undefined
    ? trend >= 0
      ? '↗️'
      : '↘️'
    : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <p className={`text-xs font-medium mt-2 ${trendColor}`}>
              {trendIcon} {Math.abs(trend)}% vs período anterior
            </p>
          )}
        </div>
        <div className="text-3xl ml-4">{icon}</div>
      </div>
    </div>
  );
}