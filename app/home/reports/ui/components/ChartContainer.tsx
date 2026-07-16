'use client';

import React from 'react';

interface ChartData {
  name: string;
  value: number;
}

interface ChartContainerProps {
  title: string;
  data: ChartData[];
  type: 'bar' | 'line';
  dataKey: string;
  nameKey: string;
  height?: number;
}

export default function ChartContainer({
  title,
  data,
  type,
  dataKey,
  nameKey,
  height = 300
}: ChartContainerProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));
  const chartHeight = height - 100; // Subtract space for labels and title

  const renderBarChart = () => {
    return (
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm text-gray-600 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6">
                <div
                  className="bg-blue-500 h-6 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-16 text-sm text-gray-900 text-right">
                {item.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative">
        <svg width="100%" height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10%" height="20" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            points={points}
          />

          {/* Points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={`${y}%`}
                r="4"
                fill="#3b82f6"
                className="hover:r-6 transition-all"
              />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <div key={index} className="text-xs text-gray-600 text-center" style={{ width: `${100 / data.length}%` }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div style={{ height: chartHeight }}>
        {type === 'bar' ? renderBarChart() : renderLineChart()}
      </div>
    </div>
  );
}