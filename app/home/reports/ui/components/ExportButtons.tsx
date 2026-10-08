'use client';

import React, { useState, type RefObject } from 'react';
import * as XLSX from 'xlsx';
import PrintReportDialog from '@/app/home/reports/ui/components/PrintReportDialog';

interface ExportButtonsProps {
  data: any;
  filename: string;
  title: string;
  /** Ref to the on-screen report body (KPIs, charts, tables). Printed as-is via browser dialog. */
  printContentRef?: RefObject<HTMLElement | null>;
  onRefresh?: () => void;
}

function flattenScalars(obj: any, prefix = ''): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  if (!obj || typeof obj !== 'object') return flattened;

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[path] = value;
      continue;
    }
    if (value instanceof Date || typeof value !== 'object') {
      flattened[path] = value;
      continue;
    }
    if (Array.isArray(value)) continue;
    Object.assign(flattened, flattenScalars(value, path));
  }

  return flattened;
}

export default function ExportButtons({
  data,
  filename,
  title,
  printContentRef,
}: ExportButtonsProps) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState('');

  const printReport = () => {
    const node = printContentRef?.current;
    if (!node) {
      alert('No hay contenido del reporte para imprimir.');
      return;
    }
    // Snapshot the visible UI (charts/KPIs/tables) for the browser print dialog.
    setPrintHtml(node.innerHTML);
    setPrintDialogOpen(true);
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const summaryData = flattenScalars(data);
      const summarySheet = XLSX.utils.json_to_sheet([summaryData]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      const createArraySheet = (arrayData: any[], sheetName: string) => {
        if (arrayData.length > 0) {
          const sheet = XLSX.utils.json_to_sheet(arrayData);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
        }
      };

      if (data.charts) {
        Object.keys(data.charts).forEach((key) => {
          if (Array.isArray(data.charts[key])) {
            createArraySheet(data.charts[key], `Gráfico ${key}`);
          }
        });
      }

      if (data.producers) createArraySheet(data.producers, 'Productores');
      if (data.byClient) createArraySheet(data.byClient, 'Por Cliente');
      if (data.byVariety) createArraySheet(data.byVariety, 'Por Variedad');
      if (data.byMonth) createArraySheet(data.byMonth, 'Por Mes');
      if (data.byStorage) createArraySheet(data.byStorage, 'Por Almacén');
      if (data.byProducer) createArraySheet(data.byProducer, 'Por Productor');
      if (data.pallets) createArraySheet(data.pallets, 'Pallets');
      if (data.trays) createArraySheet(data.trays, 'Bandejas');
      if (data.monthlyRevenue) createArraySheet(data.monthlyRevenue, 'Ingresos Mensuales');
      if (data.operations) createArraySheet(data.operations, 'Operaciones');
      if (data.transactions) createArraySheet(data.transactions, 'Transacciones');
      if (data.topClients) createArraySheet(data.topClients, 'Top Clientes');

      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar Excel.');
    }
  };

  const exportToCSV = () => {
    try {
      const flattenedData = flattenScalars(data);
      const headers = Object.keys(flattenedData).join(',');
      const values = Object.values(flattenedData)
        .map((val) => {
          const text = String(val ?? '');
          return text.includes(',') ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',');

      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${values}`;
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Error al exportar CSV');
    }
  };

  const exportToJSON = () => {
    try {
      const jsonContent = `data:text/json;charset=utf-8,${JSON.stringify(data, null, 2)}`;
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(jsonContent));
      link.setAttribute('download', `${filename}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Error al exportar JSON');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={printReport}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          title="Imprimir reporte (vista UI)"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={exportToExcel}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          title="Exportar Excel"
        >
          Excel
        </button>
        <button
          type="button"
          onClick={exportToCSV}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          title="Exportar CSV"
        >
          CSV
        </button>
        <button
          type="button"
          onClick={exportToJSON}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          title="Exportar JSON"
        >
          JSON
        </button>
      </div>

      <PrintReportDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        title={title}
        size="xl"
        printLabel="Imprimir"
        closeLabel="Cerrar"
      >
        <div
          className="report-print-snapshot"
          dangerouslySetInnerHTML={{ __html: printHtml }}
        />
      </PrintReportDialog>
    </>
  );
}
