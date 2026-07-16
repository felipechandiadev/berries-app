'use client';

import React from 'react';
import Dialog from '../../../../baseComponents/Dialog/Dialog';
import { Button } from '../../../../baseComponents/Button/Button';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export default function PrintDialog({ open, onClose, title, data }: PrintDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const renderPrintableContent = () => {
    // Flatten the data for printing
    const flattenData = (obj: any, prefix = ''): any => {
      const flattened: any = {};

      for (const key in obj) {
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenData(obj[key], prefix + key + ' '));
        } else if (Array.isArray(obj[key])) {
          // For arrays, we'll show them as lists
        } else {
          flattened[prefix + key] = obj[key];
        }
      }

      return flattened;
    };

    const flattened = flattenData(data);

    return (
      <div className="print-content">
        <style jsx>{`
          .print-content {
            font-family: Arial, sans-serif;
            color: black;
            background: white;
            padding: 20px;
          }
          .print-content h1 {
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
          .print-content table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .print-content th, .print-content td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
          }
          .print-content th {
            background: #f0f0f0;
          }
          @media print {
            .print-content {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        `}</style>
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

        {/* Handle arrays separately */}
        {Object.entries(data).map(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            return (
              <div key={key} style={{ marginBottom: '20px' }}>
                <h2>{key}</h2>
                <table>
                  <thead>
                    <tr>
                      {Object.keys(value[0]).map(header => (
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Vista de Impresión - ${title}`}
      size="xl"
      actions={
        <>
          <Button onClick={onClose} variant="secondary">
            Cerrar
          </Button>
          <Button onClick={handlePrint} variant="primary">
            Imprimir
          </Button>
        </>
      }
    >
      {renderPrintableContent()}
    </Dialog>
  );
}