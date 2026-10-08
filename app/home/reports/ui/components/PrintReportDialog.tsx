"use client";
import React from 'react';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';

interface PrintReportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  printLabel?: string;
  closeLabel?: string;
  contentClassName?: string;
  printStyles?: string;
}

const DEFAULT_REPORT_PRINT_STYLES = `
@page {
  size: A4;
  margin: 10mm;
}
body {
  background: #fff !important;
  color: #111 !important;
}
.report-print-snapshot {
  width: 100%;
}
.report-print-snapshot .grid {
  break-inside: avoid;
}
.report-print-snapshot table {
  width: 100%;
  border-collapse: collapse;
}
.report-print-snapshot th,
.report-print-snapshot td {
  border-bottom: 1px solid #e5e7eb;
  padding: 6px 8px;
  text-align: left;
}
@media print {
  body {
    margin: 0;
    padding: 0;
  }
  .report-print-snapshot * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .report-print-snapshot .lg\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .report-print-snapshot .xl\\:grid-cols-4,
  .report-print-snapshot .sm\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
`;

export default function PrintReportDialog({
  open,
  onClose,
  title,
  children,
  size = 'xl',
  printLabel = 'Imprimir',
  closeLabel = 'Cerrar',
  contentClassName = 'bg-white',
  printStyles,
}: PrintReportDialogProps) {
  const formattedDate = new Date().toLocaleString('es-CL');

  return (
    <DialogToPrint
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      printLabel={printLabel}
      closeLabel={closeLabel}
      contentClassName={contentClassName}
      preferBrowserPrint
      printStyles={`${DEFAULT_REPORT_PRINT_STYLES}\n${printStyles ?? ''}`}
    >
      <div className="print-report-root bg-white">
        <header className="mb-4 border-b border-gray-200 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="m-0 text-xl font-semibold text-gray-900">{title}</h2>
            <div className="text-xs text-gray-500">{formattedDate}</div>
          </div>
        </header>
        <section>{children}</section>
      </div>
    </DialogToPrint>
  );
}
