# Guía de Implementación: Producer Detail Component

## 🎯 Objetivo

Esta guía permite a otro desarrollador replicar la estructura del componente `ProducerDetail` en otro proyecto, manteniendo los mismos patrones arquitectónicos.

---

## 📋 Checklist de Implementación

### Fase 1: Estructura de Carpetas
- [ ] Crear carpeta `ProducerDetail/`
- [ ] Crear subcarpeta `sections/`
- [ ] Crear subcarpeta `hooks/` (opcional, para futuro)

### Fase 2: Definir Tipos
- [ ] Crear `types.ts` con interfaces
- [ ] Importar entidades (Producer, Transaction)

### Fase 3: Componente Principal
- [ ] Crear `ProducerDetailLayout.tsx`
- [ ] Implementar gestión de estado
- [ ] Configurar array de secciones

### Fase 4: Componentes Secundarios
- [ ] Crear `Header.tsx`
- [ ] Crear `Sidebar.tsx`
- [ ] Crear `PrintProducerDetailButton.tsx`

### Fase 5: Secciones
- [ ] Crear `ReceptionsSection.tsx`
- [ ] Crear `AdvancesSection.tsx`
- [ ] Crear `SettlementsSection.tsx`
- [ ] Crear `TraysSection.tsx`
- [ ] Crear `BankAccountsSection.tsx`

### Fase 6: Exportes
- [ ] Crear `index.ts` con exports públicos

---

## 📐 Paso a Paso: Implementar Desde Cero

### Paso 1: Crear Archivo de Tipos

**Archivo**: `ProducerDetail/types.ts`

```typescript
import { Producer } from '@/data/entities/Producer';
import { Transaction } from '@/data/entities/Transaction';

// Extender tipos base para casos de uso específicos
export interface ExtendedReception extends Transaction {
  variety: string;
  formatName: string;
  price: number;
  netWeight: number;
  status?: string;
}

export interface ExtendedAdvance extends Transaction {
  status?: string;
}

export interface ProducerDetailData {
  producer: Producer;
  receptions: ExtendedReception[];
  advances: ExtendedAdvance[];
  settlements: Transaction[];
  trays: {
    balance: Record<string, number>;
    movements: Transaction[];
  };
}

export interface SectionProps {
  data: ProducerDetailData;
  onRefresh?: () => void;
}
```

**Decisiones de diseño**:
- ✅ Usar `extends` para heredar de entidades base
- ✅ Crear tipos separados para cada entidad extendida
- ✅ Centralizar tipos para evitar duplicación
- ✅ Usar `Record<string, number>` para mapeos dinámicos

---

### Paso 2: Crear Componente Principal

**Archivo**: `ProducerDetail/ProducerDetailLayout.tsx`

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { ProducerDetailData } from './types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ReceptionsSection } from './sections/ReceptionsSection';
import { AdvancesSection } from './sections/AdvancesSection';
import { SettlementsSection } from './sections/SettlementsSection';
import { TraysSection } from './sections/TraysSection';
import { BankAccountsSection } from './sections/BankAccountsSection';

interface ProducerDetailLayoutProps {
  data: ProducerDetailData;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ProducerDetailLayout: React.FC<ProducerDetailLayoutProps> = ({ 
  data, 
  onClose, 
  onRefresh 
}) => {
  // Estado: qué sección está activa
  const [activeSection, setActiveSection] = useState('receptions');

  // Definir secciones disponibles
  const sections = useMemo(() => [
    { id: 'receptions', label: 'Recepciones', component: ReceptionsSection },
    { id: 'advances', label: 'Anticipos', component: AdvancesSection },
    { id: 'settlements', label: 'Liquidaciones', component: SettlementsSection },
    { id: 'trays', label: 'Bandejas', component: TraysSection },
    { id: 'bankAccounts', label: 'Cuentas Bancarias', component: BankAccountsSection },
  ], []);

  // Obtener componente activo (con fallback)
  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || ReceptionsSection;

  return (
    <div className="flex flex-col h-full">
      {/* HEADER: Barra superior */}
      <Header data={data} onClose={onClose} />
      
      {/* BODY: Contenedor Sidebar + Contenido */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR: Navegación */}
        <aside className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <Sidebar
            sections={sections.map(s => ({ id: s.id, label: s.label }))}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </aside>

        {/* MAIN: Contenido dinámico */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            <ActiveComponent data={data} onRefresh={onRefresh} />
          </div>
        </main>
      </div>
    </div>
  );
};
```

**Puntos clave**:
- ✅ `useState('receptions')`: Sección inicial por defecto
- ✅ `useMemo`: Evitar recalcular secciones en cada render
- ✅ `find() || fallback`: Seguridad si activeSection no existe
- ✅ `sections.map()`: Pasar solo id y label al Sidebar

---

### Paso 3: Crear Header

**Archivo**: `ProducerDetail/Header.tsx`

```typescript
'use client';

import React from 'react';
import { ProducerDetailData } from './types';
import { Button } from '@/app/baseComponents/Button/Button';
import { PrintProducerDetailButton } from './PrintProducerDetailButton';

interface HeaderProps {
  data: ProducerDetailData;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, onClose }) => {
  const { producer } = data;
  
  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      
      {/* Fila 1: Información + Botones */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        
        {/* Información del Productor */}
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900">
            {producer.name}
          </h2>
          
          {/* Línea de contacto */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <span>{producer.dni}</span>
            {producer.mail && (
              <>
                <span>•</span>
                <span>{producer.mail}</span>
              </>
            )}
            {producer.phone && (
              <>
                <span>•</span>
                <span>{producer.phone}</span>
              </>
            )}
          </div>
          
          {/* Dirección */}
          {producer.address && (
            <div className="text-sm text-gray-500 mt-2">
              <span className="font-medium">Dirección:</span> {producer.address}
            </div>
          )}
        </div>

        {/* Botón Cerrar */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {/* Fila 2: Botón de impresión */}
      <div className="flex items-center justify-end border-t border-gray-100 pt-3">
        <PrintProducerDetailButton data={data} />
      </div>
    </header>
  );
};
```

**Responsive design**:
- Mobile: Stack vertical (flex-col)
- Desktop (lg:): Fila horizontal (flex-row)

---

### Paso 4: Crear Sidebar

**Archivo**: `ProducerDetail/Sidebar.tsx`

```typescript
'use client';

import React from 'react';

interface Section {
  id: string;
  label: string;
}

interface SidebarProps {
  sections: Section[];
  activeSection: string;
  onSelect: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sections, 
  activeSection, 
  onSelect 
}) => {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`
            w-full text-left px-4 py-2 text-sm transition-colors duration-150
            ${activeSection === section.id
              ? 'bg-secondary text-background font-medium border border-secondary shadow-sm rounded'
              : 'text-gray-700 border border-transparent hover:border-secondary hover:bg-[#a2b94580] hover:text-gray-900 rounded'
            }
          `}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
};
```

**Estilos condicionales**:
- Activo: color secundario del tema
- Inactivo: hover con color secundario suave

---

### Paso 5: Crear una Sección (Ejemplo: ReceptionsSection)

**Archivo**: `ProducerDetail/sections/ReceptionsSection.tsx`

```typescript
'use client';

import React from 'react';
import { SectionProps } from '../types';

export const ReceptionsSection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Recepciones</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* ENCABEZADO */}
          <thead>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Folio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variedad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Formato
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Neto KG
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>

          {/* CUERPO */}
          <tbody className="divide-y divide-gray-200">
            {data.receptions.length > 0 ? (
              data.receptions.map((reception) => (
                <tr key={reception.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {reception.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(reception.createdAt).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reception.variety}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reception.formatName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(reception.amount || 0)} KG
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('es-CL', { 
                      style: 'currency', 
                      currency: 'CLP', 
                      maximumFractionDigits: 0 
                    }).format(reception.price || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('es-CL', { 
                      style: 'currency', 
                      currency: 'CLP' 
                    }).format((reception.amount || 0) * (reception.price || 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      reception.status === 'Liquidada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reception.status || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay recepciones registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

**Patrones clave**:
- ✅ Componente stateless (solo recibe props)
- ✅ Manejo de estado vacío con `data.receptions.length > 0`
- ✅ Formateo de números con `Intl.NumberFormat`
- ✅ Badge de estado con colores
- ✅ Overflow-x-auto para responsividad en móvil

---

### Paso 6: Crear Exports Públicos

**Archivo**: `ProducerDetail/index.ts`

```typescript
export * from './ProducerDetailLayout';
export * from './types';
```

**Cómo usarlos**:
```typescript
// En otro archivo
import { 
  ProducerDetailLayout, 
  ProducerDetailData 
} from '@/app/home/productiveManagement/producers/ui/ProducerDetail';

// Usar el componente
<ProducerDetailLayout 
  data={producerData} 
  onClose={handleClose} 
  onRefresh={handleRefresh}
/>
```

---

## 🔄 Flujo de Datos Completo

```
┌─────────────────────┐
│  Componente Padre   │
│  (ProducerListPage) │
└──────────┬──────────┘
           │ Pasa props
           ▼
┌──────────────────────────────────┐
│ ProducerDetailLayout             │
│ state: activeSection = 'receptions'
└──────┬────────────────────┬──────┘
       │                    │
       │ Pasa data          │ Pasa sections
       │                    │
       ▼                    ▼
   ┌────────┐           ┌─────────┐
   │ Header │           │ Sidebar │
   ├────────┤           ├─────────┤
   │Renderiza│           │Renderiza│
   │productor │          │ botones │
   │data    │           │        │
   └────────┘           └────────┘
                        │ onClick
                        │ setActiveSection(id)
                        ▼
        ┌─────────────────────────────┐
        │ Re-render ProducerDetailLayout
        │ activeSection = nuevoId
        └─────────────────────────────┘
                        │
                        │ Obtener component
                        ▼
        ┌──────────────────────────┐
        │ ReceptionsSection        │
        │ (o la que sea activa)    │
        ├──────────────────────────┤
        │ Renderiza tabla          │
        │ data.receptions.map()    │
        └──────────────────────────┘
```

---

## 🎨 Variaciones de Diseño

### Sidebar a la Derecha

```tsx
// En ProducerDetailLayout, cambiar orden:
<div className="flex flex-row-reverse flex-1 overflow-hidden">
  <aside className="w-64 border-l border-r-0">
    {/* Sidebar */}
  </aside>
  <main>{/* Main */}</main>
</div>
```

### Sidebar Como Tabs Horizontales

```tsx
// Cambiar Sidebar a tabs horizontales
<div className="flex flex-col">
  <div className="flex border-b border-gray-200 gap-1 px-4">
    {sections.map(s => (
      <button
        key={s.id}
        className={`px-4 py-2 border-b-2 ${
          activeSection === s.id 
            ? 'border-secondary' 
            : 'border-transparent'
        }`}
        onClick={() => onSelect(s.id)}
      >
        {s.label}
      </button>
    ))}
  </div>
  <main>{/* Main */}</main>
</div>
```

### Tema Oscuro

```tsx
// Agregar clase dark:
<div className="dark:bg-gray-900 dark:text-white">
  {/* Contenido */}
</div>
```

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Sección no cambia al hacer clic | Verificar que `onSelect` dispara `setActiveSection` |
| Datos no aparecen en tabla | Validar que `data.receptions` tiene elementos |
| Estilos no se aplican | Verificar que Tailwind está configurado correctamente |
| Componente no monta | Verificar `'use client'` en componentes con estado |
| activeSection undefined | Usar fallback en `find()` con `\|\| ReceptionsSection` |

---

## 📦 Dependencias Requeridas

```json
{
  "dependencies": {
    "react": "18.2.0",
    "next": "14.0.0",
    "tailwindcss": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

---

## ✅ Checklist Final

- [ ] Carpeta `ProducerDetail/` creada
- [ ] `types.ts` con interfaces correctas
- [ ] `ProducerDetailLayout.tsx` renderiza 3 secciones
- [ ] `Header.tsx` muestra datos del productor
- [ ] `Sidebar.tsx` permite cambiar de sección
- [ ] Todas las 5 secciones creadas
- [ ] `index.ts` exporta público
- [ ] Componentes importados en parent
- [ ] Props correctas en ProducerDetailLayoutProps
- [ ] Estado de sección activa funciona
- [ ] Tablas cargan datos
- [ ] Responsividad en móvil
- [ ] Sin errores TypeScript

---

**Este documento permite reproducir exactamente la arquitectura del ProducerDetail en otro proyecto.**
