import React, { useEffect, useState } from 'react';
import DetailReceptionCard from './simple/ui/DetailReceptionCard';
import { getVarieties } from '@/app/actions/varieties';
import { getFormats } from '@/app/actions/formats';
import { getTrays } from '@/app/actions/trays';

// Este componente será el DataGrid común para recepciones simples y multi-pack.
// Aquí se agregará la columna "Multi-Pack" y la lógica de expansión de fila.

const DataGrid: React.FC = () => {

  // Estado para controlar la expansión de filas
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Opciones para los DetailReceptionCard
  const [varietyOptions, setVarietyOptions] = useState<any[]>([]);
  const [formatOptions, setFormatOptions] = useState<any[]>([]);
  const [trayOptions, setTrayOptions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const v = await getVarieties();
      setVarietyOptions(Array.isArray(v.data) ? v.data.map((item: any) => ({ id: item.id, label: item.name })) : []);
      const f = await getFormats();
      setFormatOptions(Array.isArray(f.data) ? f.data.map((item: any) => ({ id: item.id, label: item.name, priceCLP: item.priceCLP, priceUSD: item.priceUSD })) : []);
      const t = await getTrays();
      setTrayOptions(Array.isArray(t.data) ? t.data.map((item: any) => ({ id: item.id, label: item.name, weight: item.weight })) : []);
    })();
  }, []);

  // Ejemplo de datos mock:
  const rows = [
    { id: 1, multiPack: false },
    { id: 2, multiPack: true, packs: [
      { id: 'p1' },
      { id: 'p2' },
    ] },
  ];

  return (
    <div>
      {/* DataGrid de recepciones */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Multi-Pack</th>
            {/* ...otras columnas... */}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <React.Fragment key={row.id}>
              <tr onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                <td>{row.id}</td>
                <td>{row.multiPack ? '✔️' : '❌'}</td>
                {/* ...otras celdas... */}
              </tr>
              {/* Expansión de fila para multi-pack */}
              {row.multiPack && expandedRow === row.id && (
                <tr>
                  <td colSpan={3}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      {(row.packs ?? []).map((pack: any) => (
                        <DetailReceptionCard 
                          key={pack.id} 
                          varietyOptions={varietyOptions} 
                          formatOptions={formatOptions} 
                          trayOptions={trayOptions} 
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;
