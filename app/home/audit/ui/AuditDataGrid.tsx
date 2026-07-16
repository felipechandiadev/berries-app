'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { getAuditExportData } from '@/app/actions/audits';
import type { AuditGridFilters } from '@/app/actions/audits';
import { formatAuditDate, formatAuditDateWithSeconds } from '@/lib/dateTimeUtils';
import {
  translateEntityName,
  translateAction,
  translateDescription,
  formatTranslatedChanges,
} from '@/lib/auditTranslations';
import * as XLSX from 'xlsx';
import DataGrid from '@/app/baseComponents/DataGrid/DataGrid';
import AuditMoreButton from './AuditMoreButton';

interface AuditData {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  description?: string;
  userId?: string;
  user?: {
    userName: string;
  };
  createdAt: Date;
  changes?: Record<string, any>;
}

interface AuditDataGridProps {
  data: AuditData[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  filters?: Record<string, string | number | undefined>;
}

export function AuditDataGrid({
  data,
  total,
  pages,
  currentPage,
  limit,
  filters = {},
}: AuditDataGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();
  const [isExporting, setIsExporting] = useState(false);

  const sortBy = (filters?.sortBy as string) || 'createdAt';
  const sortOrder = (filters?.sortOrder as 'asc' | 'desc') || 'desc';

  // Mapear datos para DataGrid con formato de fecha y traducciones
  const rows = data.map((audit) => ({
    ...audit,
    // Traducir nombre de entidad
    entityName: translateEntityName(audit.entityName),
    // Traducir acción
    action: translateAction(audit.action),
    // Traducir descripción
    description: translateDescription(audit.description),
    // Formatear fecha en zona horaria de Chile (America/Santiago)
    createdAt: formatAuditDate(audit.createdAt),
    // Obtener nombre de usuario de la relación
    userName: audit.user?.userName || audit.userId || '-',
  }));

  const columns = [
    { field: 'entityName', headerName: 'Entidad', flex: 1, sortable: true },
    { field: 'action', headerName: 'Acción', flex: 1, sortable: true },
    { field: 'description', headerName: 'Descripción', flex: 2, sortable: false },
    { field: 'userName', headerName: 'Usuario', flex: 1.5, sortable: false },
    { field: 'createdAt', headerName: 'Fecha', flex: 1.5, sortable: true },
    {
      field: 'actions',
      headerName: '',
      flex: 0.8,
      sortable: false,
      actionComponent: ({ row }: { row: typeof rows[0] }) => {
        const originalAudit = data.find(d => d.id === row.id);
        return originalAudit ? <AuditMoreButton audit={originalAudit} /> : null;
      },
    },
  ];

  /**
   * Manejador para exportar auditoría a Excel
   * Recopila filtros actuales y llama a la server action
   */
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      showAlert({ message: 'Preparando exportación...', type: 'info', duration: 3000 });

      // Recopilar parámetros de filtros desde URL
      const search = searchParams.get('search') || undefined;
      const action = searchParams.get('action') || undefined;
      const entityName = searchParams.get('entityName') || undefined;
      const filters_param = searchParams.get('filters') || undefined;
      const sortField = searchParams.get('sortField') || 'createdAt';
      const sort = searchParams.get('sort') || 'desc';

      // Preparar objeto de filtros
      const exportFilters: AuditGridFilters = {
        search,
        action,
        entityName,
        filters: filters_param,
        sortBy: sortField,
        sortOrder: (sort.toLowerCase() as 'asc' | 'desc') || 'desc',
      };

      // Llamar server action para obtener datos
      const result = await getAuditExportData(exportFilters);

      if (!result.success) {
        showAlert({ 
          message: result.error || 'Error al exportar', 
          type: 'error', 
          duration: 5000 
        });
        return;
      }

      if (!result.data || result.data.length === 0) {
        showAlert({ 
          message: 'No hay datos para exportar', 
          type: 'warning', 
          duration: 5000 
        });
        return;
      }

      // Formatear datos para Excel con traducciones
      const excelData = result.data.map((audit) => ({
        'ID': audit.id,
        'Entidad': translateEntityName(audit.entityName),
        'Acción': translateAction(audit.action),
        'Descripción': audit.description || '-',
        'Usuario': (audit as any).user?.userName || audit.userId || '-',
        'Fecha y Hora': formatAuditDate(audit.createdAt),
        'Valores Anteriores': formatTranslatedChanges(audit.oldValues),
        'Valores Nuevos': formatTranslatedChanges(audit.newValues),
      }));

      // Crear workbook
      const workbook = XLSX.utils.book_new();

      // Hoja de datos principal
      const dataSheet = XLSX.utils.json_to_sheet(excelData);

      // Aplicar estilos a encabezados
      const headerStyle = {
        fill: { fgColor: { rgb: 'FF1F4E78' } },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };

      // Aplicar estilos a todas las celdas de encabezado
      const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!dataSheet[address]) continue;
        dataSheet[address].s = headerStyle;
      }

      // Establecer anchos de columna
      const colWidths = [
        { wch: 36 }, // ID
        { wch: 15 }, // Entidad
        { wch: 12 }, // Acción
        { wch: 30 }, // Descripción
        { wch: 20 }, // Usuario
        { wch: 18 }, // Fecha y Hora
        { wch: 25 }, // Valores Anteriores
        { wch: 25 }, // Valores Nuevos
      ];
      dataSheet['!cols'] = colWidths;

      // Agregar filtros automáticos
      dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

      // Agregar hoja de datos
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Auditorías');

      // Hoja de resumen con traducciones
      const summaryData = [
        { Métrica: 'Total de Registros', Valor: excelData.length },
        { Métrica: 'Crear', Valor: excelData.filter((d) => d['Acción'] === 'Crear').length },
        { Métrica: 'Actualizar', Valor: excelData.filter((d) => d['Acción'] === 'Actualizar').length },
        { Métrica: 'Eliminar', Valor: excelData.filter((d) => d['Acción'] === 'Eliminar').length },
        { Métrica: 'Fecha de Exportación', Valor: formatAuditDateWithSeconds(new Date()) },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Generar archivo y descargar
      const fileName = `auditorias_${formatAuditDateWithSeconds(new Date()).replace(/[:/\s]/g, '')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showAlert({ 
        message: `Descargado: ${fileName} (${result.recordCount} registros)`, 
        type: 'success', 
        duration: 5000 
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showAlert({ 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        type: 'error', 
        duration: 5000 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div data-test-id="audit-data-grid">
      <DataGrid
        rows={rows}
        columns={columns}
        limit={limit}
        totalRows={total}
        sort={sortOrder || 'desc'}
        sortField={sortBy}
        onExportExcel={handleExportExcel}
        height={'85vh'}
        data-test-id="audit-data-grid-component"
      />
    </div>
  );
}
