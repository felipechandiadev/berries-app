'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import PrintReportDialog from '@/app/home/reports/ui/components/PrintReportDialog';

interface ExportButtonsProps {
  data: any;
  filename: string;
  title: string;
  onRefresh?: () => void;
}

export default function ExportButtons({ data, filename, title, onRefresh }: ExportButtonsProps) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const renderPrintableContent = () => {
    const flattenData = (obj: any, prefix = ''): any => {
      const flattened: any = {};

      for (const key in obj) {
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenData(obj[key], prefix + key + ' '));
        } else if (Array.isArray(obj[key])) {
          // Arrays will be handled separately
        } else {
          flattened[prefix + key] = obj[key];
        }
      }

      return flattened;
    };

    const flattened = flattenData(data);

    return (
      <div className="print-content">
        <h1>{title}</h1>
        <table>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(flattened).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {Object.entries(data).map(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            return (
              <div key={key} style={{ marginBottom: '20px' }}>
                <h2>{key}</h2>
                <table>
                  <thead>
                    <tr>
                      {Object.keys(value[0]).map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {value.map((item, index) => (
                      <tr key={index}>
                        {Object.values(item).map((val, i) => (
                          <td key={i}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };
  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Create main sheet with summary data
      const flattenData = (obj: any, prefix = ''): any => {
        const flattened: any = {};

        for (const key in obj) {
          if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            Object.assign(flattened, flattenData(obj[key], prefix + key + ' '));
          } else if (Array.isArray(obj[key])) {
            // Arrays will be handled separately
          } else {
            flattened[prefix + key] = obj[key];
          }
        }

        return flattened;
      };

      const summaryData = flattenData(data);
      const summarySheet = XLSX.utils.json_to_sheet([summaryData]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Create separate sheets for arrays
      const createArraySheet = (arrayData: any[], sheetName: string) => {
        if (arrayData.length > 0) {
          const sheet = XLSX.utils.json_to_sheet(arrayData);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        }
      };

      // Handle different data structures based on report type
      if (data.charts) {
        Object.keys(data.charts).forEach(key => {
          if (Array.isArray(data.charts[key])) {
            createArraySheet(data.charts[key], `Gráfico ${key}`);
          }
        });
      }

      if (data.producers) createArraySheet(data.producers, 'Productores');
      if (data.byClient) createArraySheet(data.byClient, 'Por Cliente');
      if (data.byVariety) createArraySheet(data.byVariety, 'Por Variedad');
      if (data.operations) createArraySheet(data.operations, 'Operaciones');
      if (data.transactions) createArraySheet(data.transactions, 'Transacciones');
      if (data.clientSegments) {
        if (data.clientSegments.premium) createArraySheet(data.clientSegments.premium, 'Clientes Premium');
        if (data.clientSegments.regular) createArraySheet(data.clientSegments.regular, 'Clientes Regulares');
        if (data.clientSegments.occasional) createArraySheet(data.clientSegments.occasional, 'Clientes Ocasionales');
      }
      if (data.topClients) createArraySheet(data.topClients, 'Top Clientes');
      if (data.byStorage) createArraySheet(data.byStorage, 'Por Almacén');
      if (data.alerts) createArraySheet(data.alerts, 'Alertas');
      if (data.inspections) createArraySheet(data.inspections, 'Inspecciones');
      if (data.monthlyVolume) createArraySheet(data.monthlyVolume, 'Volumen Mensual');
      if (data.productGrowth) createArraySheet(data.productGrowth, 'Crecimiento Productos');
      if (data.producerGrowth) createArraySheet(data.producerGrowth, 'Crecimiento Productores');
      if (data.forecasts) createArraySheet(data.forecasts, 'Pronósticos');
      if (data.revenueBreakdown) createArraySheet(data.revenueBreakdown, 'Desglose Ingresos');
      if (data.costAnalysis) createArraySheet(data.costAnalysis, 'Análisis Costos');
      if (data.productProfitability) createArraySheet(data.productProfitability, 'Rentabilidad Productos');
      if (data.producerProfitability) createArraySheet(data.producerProfitability, 'Rentabilidad Productores');

      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar Excel. Verifica la consola para más detalles.');
    }
  };

  const exportToCSV = () => {
    try {
      // For CSV, we'll export the main data as flattened object
      const flattenData = (obj: any, prefix = ''): any => {
        const flattened: any = {};

        for (const key in obj) {
          if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            Object.assign(flattened, flattenData(obj[key], prefix + key + '.'));
          } else if (Array.isArray(obj[key])) {
            flattened[prefix + key] = JSON.stringify(obj[key]);
          } else {
            flattened[prefix + key] = obj[key];
          }
        }

        return flattened;
      };

      const flattenedData = flattenData(data);
      const headers = Object.keys(flattenedData).join(',');
      const values = Object.values(flattenedData).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',');

      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${values}`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
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
      const encodedUri = encodeURI(jsonContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${filename}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Error al exportar JSON');
    }
  };

  const printReport = async () => {
    if (onRefresh) {
      onRefresh();
      // Wait a bit for data to refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setPrintDialogOpen(true);
  };

  return (
    <>
      <button
        onClick={printReport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Imprimir reporte"
      >
        🖨️ Imprimir
      </button>
      <PrintReportDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        title={title}
        size="lg"
        printLabel="Imprimir"
        closeLabel="Cerrar"
      >
        {renderPrintableContent()}
      </PrintReportDialog>
    </>
  );
}