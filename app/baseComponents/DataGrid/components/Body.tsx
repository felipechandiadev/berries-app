'use client'
import React, { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
// Import dinámico para evitar error si no existe el componente en todos los contextos
let DetailReceptionCard: any = null;
try {
  // Ajusta la ruta según tu estructura real
  DetailReceptionCard = require('@/app/home/receptions/simple/ui/DetailReceptionCard').default;
} catch {}
import { calculateColumnStyles } from '../utils/columnStyles';
import type { DataGridColumn } from '../DataGrid';

interface BodyProps {
  columns?: DataGridColumn[];
  rows?: any[];
  filterMode?: boolean;
  screenWidth?: number;
  expandable?: boolean;
  expandedRowIds?: Set<string | number>;
  onToggleExpand?: (rowId: string | number) => void;
  expandableRowContent?: (row: any) => React.ReactNode;
  expandedRowId?: string | number | null; // For backward compatibility with multiPack
}

const Body: React.FC<BodyProps> = ({ columns = [], rows = [], filterMode = false, screenWidth = 1024, expandable = false, expandedRowIds = new Set(), onToggleExpand, expandableRowContent, expandedRowId }) => {
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null);
  const visibleColumns = columns.filter((c) => !c.hide);

  // Usar utilidad centralizada para calcular estilos
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  return (
    <div className="flex-1" data-test-id="data-grid-body">
      {/* Renderizar por filas para sincronizar alturas */}
      {rows.map((row, rowIndex) => (
        <React.Fragment key={row.id || rowIndex}>
          <div
            className="flex w-full items-stretch data-grid-row"
            data-test-id="data-grid-row"
          >
            {/* Expand button column */}
            {expandable && (
              <div className="w-10 min-w-[40px] px-3 py-2 border-b border-gray-200 text-xs flex items-center justify-center">
                {expandableRowContent && expandableRowContent(row) && (
                  <IconButton
                    onClick={() => onToggleExpand?.(row.id || rowIndex)}
                    icon={expandedRowIds.has(row.id || rowIndex) ? 'expand_less' : 'expand_more'}
                    size="sm"
                    variant="basic"
                    color="secondary"
                  />
                )}
              </div>
            )}
            {visibleColumns.map((column, colIndex) => {
              const value = row[column.field];
              const style = computedStyles[colIndex];
              const align = column.align || 'left';
              // Renderizar actionComponent si existe
              if (column.actionComponent) {
                const ActionComponent = column.actionComponent;
                return (
                  <div
                    key={`${column.field}-${row.id || rowIndex}`}
                    className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                    style={{
                      ...style,
                      backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <ActionComponent row={row} column={column} />
                  </div>
                );
              }
              // Usar renderCell personalizado si existe
              if (column.renderCell) {
                return (
                  <div
                    key={`${column.field}-${row.id || rowIndex}`}
                    className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                    style={{
                      ...style,
                      backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    {column.renderCell({ row, value: row[column.field], column })}
                  </div>
                );
              }
              return (
                <div
                  key={`${column.field}-${row.id || rowIndex}`}
                  className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    ...style,
                    backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <span className="truncate">{value !== null && value !== undefined ? String(value) : '-'}</span>
                </div>
              );
            })}
          </div>
          {/* Expandable row content */}
          {expandable && expandedRowIds.has(row.id || rowIndex) && expandableRowContent && (
            <div className="w-full bg-gray-50 border-b border-gray-200 px-4 py-2">
              {expandableRowContent(row)}
            </div>
          )}
          {/* Expansión para multi-pack (backward compatibility) */}
          {row.multiPack && expandedRowId === row.id && Array.isArray(row.packs) && (
            <div className="w-full bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {DetailReceptionCard && row.packs.map((pack: any) => (
                  <DetailReceptionCard key={pack.id || pack.packNumber} {...pack} />
                ))}
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Body;