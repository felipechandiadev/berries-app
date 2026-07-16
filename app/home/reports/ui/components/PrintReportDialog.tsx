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

export default function PrintReportDialog({
  open,
  onClose,
  title,
  children,
  size = 'lg',
  printLabel = 'Imprimir',
  closeLabel = 'Cerrar',
  contentClassName = '',
  printStyles,
}: PrintReportDialogProps) {
  const now = new Date();
  const formattedDate = now.toLocaleString();

  return (
    <DialogToPrint
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      printLabel={printLabel}
      closeLabel={closeLabel}
      contentClassName={contentClassName}
      printStyles={printStyles}
    >
      <div className="print-report-root">
        <header style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <div style={{ fontSize: 12, color: '#666' }}>{formattedDate}</div>
          </div>
          <hr style={{ marginTop: 8 }} />
        </header>

        <section>
          {children}
        </section>
      </div>
    </DialogToPrint>
  );
}
