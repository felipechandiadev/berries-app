'use client';

import React, { useState, useMemo } from 'react';

/**
 * =============================================================================
 * COMPONENTE TEMPLATE: DetailLayout Similar al ProducerDetail
 * =============================================================================
 * 
 * Este archivo es un ejemplo completo de cómo crear un componente similar
 * a ProducerDetail. Cópialo y adáptalo a tu caso de uso.
 * 
 * Estructura:
 * 1. TIPOS
 * 2. COMPONENTE PRINCIPAL (Layout)
 * 3. SUBCOMPONENTES (Header, Sidebar, Sections)
 * 
 * Modificar:
 * - Los nombres: "Producer" → "YourEntity"
 * - Los datos: "producer: Producer" → tu tipo
 * - Las secciones: Agregar/quitar según necesites
 * =============================================================================
 */

// ============================================================================
// 1. TIPOS (Adaptar a tu entidad)
// ============================================================================

/** Extender tipos base según necesites */
interface ExtendedItem {
  id: string;
  createdAt: Date;
  name: string;
  value: number;
  status?: string;
}

/** Interface principal de datos */
interface DetailData {
  // Tu entidad principal
  entity: {
    id: string;
    name: string;
    description?: string;
    email?: string;
  };
  // Diferentes vistas de datos
  items: ExtendedItem[];
  history: ExtendedItem[];
  summary: {
    total: number;
    count: number;
  };
}

/** Props para cada sección */
interface SectionProps {
  data: DetailData;
  onRefresh?: () => void;
}

// ============================================================================
// 2. COMPONENTE PRINCIPAL (LAYOUT)
// ============================================================================

interface DetailLayoutProps {
  data: DetailData;
  onClose: () => void;
  onRefresh?: () => void;
}

const DetailLayout: React.FC<DetailLayoutProps> = ({ data, onClose, onRefresh }) => {
  // PASO 1: Mantener estado de sección activa
  const [activeSection, setActiveSection] = useState('items');

  // PASO 2: Definir todas las secciones disponibles
  // (Cada sección es un componente con props: data, onRefresh)
  const sections = useMemo(() => [
    { id: 'items', label: 'Items', component: ItemsSection },
    { id: 'history', label: 'Historial', component: HistorySection },
    { id: 'summary', label: 'Resumen', component: SummarySection },
  ], []);

  // PASO 3: Seleccionar componente activo
  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || ItemsSection;

  // PASO 4: Renderizar layout en 3 secciones (Header + Sidebar + Main)
  return (
    <div className="flex flex-col h-full">
      {/* HEADER: Información de la entidad */}
      <Header data={data} onClose={onClose} />
      
      {/* BODY: Sidebar + Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: Navegación */}
        <aside className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <Sidebar
            sections={sections.map(s => ({ id: s.id, label: s.label }))}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </aside>

        {/* MAIN: Sección activa (dinámica) */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            <ActiveComponent data={data} onRefresh={onRefresh} />
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SUBCOMPONENTES
// ============================================================================

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEADER: Información y botones de acción
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface HeaderProps {
  data: DetailData;
  onClose: () => void;
}

const Header: React.FC<HeaderProps> = ({ data, onClose }) => {
  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      {/* Fila 1: Información principal + Botones */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Información de la entidad */}
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900">
            {data.entity.name}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span>ID: {data.entity.id}</span>
            {data.entity.email && (
              <>
                <span>•</span>
                <span>{data.entity.email}</span>
              </>
            )}
          </div>
          {data.entity.description && (
            <p className="text-sm text-gray-500 mt-2">{data.entity.description}</p>
          )}
        </div>

        {/* Botones de acción */}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium self-start lg:self-auto"
        >
          Cerrar
        </button>
      </div>
    </header>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIDEBAR: Navegación entre secciones
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Section {
  id: string;
  label: string;
}

interface SidebarProps {
  sections: Section[];
  activeSection: string;
  onSelect: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sections, activeSection, onSelect }) => {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`
            w-full text-left px-4 py-2 text-sm transition-colors duration-150 rounded
            ${activeSection === section.id
              ? 'bg-blue-500 text-white font-medium'
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECCIONES: Componentes dinámicos (Adaptar según necesites)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Sección 1: Items (tabla simple)
const ItemsSection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Items</h3>
      
      {data.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">${item.value}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No hay items registrados</p>
      )}
    </div>
  );
};

// Sección 2: Historial
const HistorySection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Historial</h3>
      
      {data.history.length > 0 ? (
        <ul className="space-y-3">
          {data.history.map((entry) => (
            <li key={entry.id} className="p-3 border border-gray-200 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{entry.name}</p>
                  <p className="text-sm text-gray-500">{entry.createdAt.toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-medium text-gray-600">${entry.value}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No hay historial</p>
      )}
    </div>
  );
};

// Sección 3: Resumen (datos agregados)
const SummarySection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-6">Resumen</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-4 border border-gray-200 rounded">
          <p className="text-sm text-gray-500 mb-1">Total Items</p>
          <p className="text-2xl font-semibold text-gray-900">{data.summary.count}</p>
        </div>

        {/* Card 2 */}
        <div className="p-4 border border-gray-200 rounded">
          <p className="text-sm text-gray-500 mb-1">Valor Total</p>
          <p className="text-2xl font-semibold text-gray-900">${data.summary.total}</p>
        </div>

        {/* Card 3 */}
        <div className="p-4 border border-gray-200 rounded">
          <p className="text-sm text-gray-500 mb-1">Promedio</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${Math.round(data.summary.total / (data.summary.count || 1))}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTAR
// ============================================================================

export { DetailLayout };
export type { DetailData, DetailLayoutProps, SectionProps };

/**
 * =============================================================================
 * CÓMO USAR ESTE TEMPLATE
 * =============================================================================
 * 
 * 1. COPIAR: Copia este archivo a tu carpeta
 * 
 * 2. CAMBIAR NOMBRES:
 *    - "DetailLayout" → "ProductLayout", "OrderLayout", etc.
 *    - "DetailData" → "ProductData", "OrderData", etc.
 *    - "entity" → "product", "order", etc.
 * 
 * 3. ADAPTAR TIPOS:
 *    interface DetailData {
 *      entity: YourEntityType;  // ← Tu tipo
 *      items: YourItems[];      // ← Tus datos
 *      // ... agregar/remover según necesites
 *    }
 * 
 * 4. RENOMBRAR SECCIONES:
 *    const sections = [
 *      { id: 'section1', label: 'Mi Sección 1', component: MySection1 },
 *      { id: 'section2', label: 'Mi Sección 2', component: MySection2 },
 *      // ... agregar más
 *    ];
 * 
 * 5. CREAR NUEVAS SECCIONES:
 *    const MySection: React.FC<SectionProps> = ({ data, onRefresh }) => {
 *      return (
 *        <div className="h-full overflow-auto">
 *          <h3 className="text-lg font-medium mb-4">Mi Sección</h3>
 *          { /* Tu contenido aquí * / }
 *        </div>
 *      );
 *    };
 * 
 * 6. USAR EN COMPONENTE PADRE:
 *    import { DetailLayout } from './DetailLayout';
 *    
 *    const [showDetail, setShowDetail] = useState(false);
 *    const [data, setData] = useState<DetailData | null>(null);
 *    
 *    const handleOpen = async (id: string) => {
 *      const response = await fetch(`/api/item/${id}`);
 *      setData(await response.json());
 *      setShowDetail(true);
 *    };
 *    
 *    {showDetail && data && (
 *      <DetailLayout
 *        data={data}
 *        onClose={() => setShowDetail(false)}
 *        onRefresh={() => handleOpen(data.entity.id)}
 *      />
 *    )}
 * 
 * =============================================================================
 * ESTRUCTURA DEL CÓDIGO
 * =============================================================================
 * 
 * ┌─ DetailLayout (contenedor principal)
 * │  ├─ useState(activeSection)
 * │  ├─ useMemo(sections)
 * │  └─ Renderiza:
 * │     ├─ Header (información)
 * │     ├─ Sidebar (navegación)
 * │     └─ ActiveSection (dinámica)
 * │
 * ├─ Header (mostrar datos)
 * │
 * ├─ Sidebar (cambiar sección)
 * │
 * └─ Sections (ItemsSection, HistorySection, SummarySection)
 *    ├─ Reciben: data, onRefresh
 *    └─ Renderan: Tabla, Lista, Cards
 * 
 * =============================================================================
 * PUNTOS CLAVE
 * =============================================================================
 * 
 * ✅ Estado mínimo: solo activeSection
 * ✅ Datos vienen del padre
 * ✅ Secciones son independientes
 * ✅ useMemo evita recálculos
 * ✅ Fácil de extender: agregar sección al array
 * ✅ Responsive: flex-col mobile, flex-row desktop
 * ✅ Tipos TypeScript en todo
 * 
 * =============================================================================
 */
