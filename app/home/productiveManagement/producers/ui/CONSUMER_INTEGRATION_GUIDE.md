# Consumer Integration Guide

## 🎯 Cómo Usar ProducerDetail Desde el Componente Padre

Este documento explica cómo integrar `ProducerDetailLayout` en un componente padre que muestre una lista de productores.

---

## 📍 Ubicación del Componente Padre

En ElectNextStart, el padre típico sería:

```
app/home/productiveManagement/producers/
├─ page.tsx (main page)
├─ ui/
│  ├─ ProducerDetail/      ← El componente detallado
│  ├─ ProducersGrid.tsx    ← Componente que lista productores
│  └─ ... otros
```

---

## 🔄 Patrón de Integración Básico

### Opción 1: Detail Modal (Más Común)

```typescript
// app/home/productiveManagement/producers/page.tsx

'use client';

import React, { useState } from 'react';
import { ProducerDetailLayout } from './ui/ProducerDetail';
import { ProducersGrid } from './ui/ProducersGrid';
import { ProducerDetailData } from './ui/ProducerDetail/types';

export default function ProducersPage() {
  // Estados
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<ProducerDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleProducerClick = async (producerId: string) => {
    try {
      setLoading(true);
      
      // Traer datos del servidor
      const response = await fetch(`/api/producers/${producerId}`);
      const data = await response.json();
      
      setDetailData(data);
      setShowDetail(true);
    } catch (error) {
      console.error('Error loading producer detail:', error);
      // Mostrar toast de error
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setDetailData(null);
  };

  const handleRefreshDetail = async () => {
    if (detailData?.producer.id) {
      await handleProducerClick(detailData.producer.id);
    }
  };

  return (
    <div className="p-6">
      {/* LISTA DE PRODUCTORES */}
      <ProducersGrid 
        onProducerClick={handleProducerClick}
        isLoading={loading}
      />

      {/* MODAL CON DETALLE */}
      {showDetail && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full h-5/6 max-w-6xl bg-white rounded-lg shadow-xl">
            <ProducerDetailLayout
              data={detailData}
              onClose={handleCloseDetail}
              onRefresh={handleRefreshDetail}
            />
          </div>
        </div>
      )}

      {/* OVERLAY BACKDROP */}
      {showDetail && (
        <div 
          className="fixed inset-0 z-40"
          onClick={handleCloseDetail}
        />
      )}
    </div>
  );
}
```

**Puntos clave:**
- ✅ `useState(showDetail)` - Controla visibilidad del modal
- ✅ `useState(detailData)` - Almacena datos del productor
- ✅ `handleProducerClick()` - Carga datos y abre modal
- ✅ `handleCloseDetail()` - Cierra modal y limpia estado
- ✅ `handleRefreshDetail()` - Recarga datos del mismo productor

---

## 🔌 Conexión con Grid/Lista

### ProducersGrid → Dispara Detail

```typescript
// ui/ProducersGrid.tsx

interface ProducersGridProps {
  onProducerClick: (producerId: string) => void;
  isLoading?: boolean;
}

export const ProducersGrid: React.FC<ProducersGridProps> = ({ 
  onProducerClick,
  isLoading 
}) => {
  const [producers, setProducers] = useState([]);

  useEffect(() => {
    // Cargar lista de productores
    fetchProducers().then(setProducers);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {producers.map(producer => (
        <div
          key={producer.id}
          onClick={() => onProducerClick(producer.id)}
          className="p-4 border rounded cursor-pointer hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold">{producer.name}</h3>
          <p className="text-gray-500">{producer.dni}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 📊 Estructura de Datos Requerida

### ¿De dónde vienen los datos?

```typescript
// Ejemplo: API endpoint en Next.js
// app/api/producers/[id]/route.ts

import { getProducerWithDetails } from '@/data/services/producerService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const producerData = await getProducerWithDetails(params.id);
  
  return Response.json({
    producer: producerData.producer,
    receptions: producerData.receptions,
    advances: producerData.advances,
    settlements: producerData.settlements,
    trays: producerData.trays
  });
}
```

### Servicio de Backend

```typescript
// data/services/producerService.ts

export async function getProducerWithDetails(producerId: string) {
  const producer = await db.producer.findById(producerId);
  
  const receptions = await db.transaction.find({
    where: { 
      producerId,
      type: 'RECEPTION' 
    }
  });

  const advances = await db.advance.find({
    where: { producerId }
  });

  const settlements = await db.settlement.find({
    where: { producerId }
  });

  const trays = await db.tray.getBalanceAndMovements(producerId);

  return {
    producer,
    receptions: receptions.map(r => ({
      ...r,
      variety: r.product.variety,
      formatName: r.format.name,
      price: r.pricePerUnit,
      netWeight: r.netWeight,
      status: calculateReceptionStatus(r)
    })),
    advances,
    settlements,
    trays
  };
}
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Abrir al Lado de la Lista

```typescript
// Layout con detail panel al lado

<div className="grid grid-cols-3 gap-4 h-screen">
  {/* Columna 1: Lista */}
  <div className="col-span-1">
    <ProducersGrid onProducerClick={handleProducerClick} />
  </div>

  {/* Columna 2-3: Detalle */}
  <div className="col-span-2">
    {detailData && (
      <ProducerDetailLayout
        data={detailData}
        onClose={handleCloseDetail}
        onRefresh={handleRefreshDetail}
      />
    )}
  </div>
</div>
```

### Caso 2: Detalle en Pestaña Nueva

```typescript
// Abrir en nueva pestaña del navegador

const handleProducerClick = (producerId: string) => {
  window.open(`/producers/${producerId}`, '_blank');
};

// app/producers/[id]/page.tsx
export default function ProducerDetailPage({ params }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/producers/${params.id}`)
      .then(r => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <div>Cargando...</div>;

  return (
    <ProducerDetailLayout
      data={data}
      onClose={() => window.close()}
    />
  );
}
```

### Caso 3: Detail en Dialog Modal

```typescript
// Usando componente Dialog personalizado

import { Dialog } from '@/app/baseComponents/Dialog';

<Dialog isOpen={showDetail} onClose={handleCloseDetail}>
  <Dialog.Content className="max-w-6xl max-h-screen">
    {detailData && (
      <ProducerDetailLayout
        data={detailData}
        onClose={handleCloseDetail}
        onRefresh={handleRefreshDetail}
      />
    )}
  </Dialog.Content>
</Dialog>
```

---

## ⚡ Flujo Completo de Integración

```
Usuario accede a página de productores
        │
        ├─→ ProducersPage carga
        │   ├─→ useState(showDetail) = false
        │   ├─→ useState(detailData) = null
        │   └─→ ProducersGrid renderiza
        │       └─→ Lista de productores visible
        │
        └─→ Usuario hace click en productor
            │
            ├─→ handleProducerClick(producerId)
            │
            ├─→ fetch(`/api/producers/${producerId}`)
            │
            ├─→ Backend responde con ProducerDetailData
            │
            ├─→ setDetailData(data)
            ├─→ setShowDetail(true)
            │
            ├─→ Modal abre con ProducerDetailLayout
            │
            └─→ Usuario navega entre secciones
                │
                ├─→ Click "Anticipos" → Sidebar
                ├─→ setActiveSection('advances')
                ├─→ AdvancesSection renderiza
                │
                └─→ Usuario hace click "Cerrar"
                    │
                    ├─→ handleCloseDetail()
                    ├─→ setShowDetail(false)
                    └─→ Modal cierra
```

---

## 🔑 Props Requeridas

### ProducerDetailLayoutProps

```typescript
interface ProducerDetailLayoutProps {
  // REQUERIDO: Datos del productor
  data: ProducerDetailData;
  
  // REQUERIDO: Función para cerrar detail
  onClose: () => void;
  
  // OPCIONAL: Función para refrescar datos
  onRefresh?: () => void;
}
```

### ProducerDetailData

```typescript
interface ProducerDetailData {
  // Información base del productor
  producer: {
    id: string;
    name: string;
    dni: string;
    mail?: string;
    phone?: string;
    address?: string;
  };
  
  // Historial de recepciones
  receptions: Array<{
    id: string;
    createdAt: Date;
    variety: string;
    formatName: string;
    amount: number;        // kg
    price: number;         // CLP por kg
    status?: string;
  }>;
  
  // Historial de anticipos
  advances: Array<{
    id: string;
    createdAt: Date;
    amount: number;        // monto
    status?: string;
  }>;
  
  // Historial de liquidaciones
  settlements: Array<{
    id: string;
    createdAt: Date;
    amount: number;        // monto total
  }>;
  
  // Información de bandejas
  trays: {
    balance: Record<string, number>;  // { 'L001': 50, 'L002': 30 }
    movements: Array<{
      id: string;
      createdAt: Date;
      amount: number;
    }>;
  };
}
```

---

## ❌ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Cannot read property 'producer' of null" | `data` es null | Verificar que `detailData` no sea null antes de renderizar |
| Componente no renderiza | Falta 'use client' | Agregar `'use client'` al inicio del archivo |
| Botones no responden | Props no pasados | Verificar que `onClose` y `onRefresh` sean funciones |
| Modal queda detrás | z-index insuficiente | Usar `z-50` en modal y `z-40` en backdrop |
| Datos no cargan | Error en API | Agregar try-catch y logging |
| Tabla vacía | Datos no llegan | Verificar estructura en DevTools |

---

## 🧹 Limpieza y Memoria

### Evitar Memory Leaks

```typescript
const [detailData, setDetailData] = useState<ProducerDetailData | null>(null);
const [loading, setLoading] = useState(false);

// Limpiar al desmontar
useEffect(() => {
  return () => {
    setDetailData(null);
    setLoading(false);
  };
}, []);

// Cancelar requests pendientes
const abortController = useRef(new AbortController());

const handleProducerClick = async (producerId: string) => {
  try {
    const response = await fetch(`/api/producers/${producerId}`, {
      signal: abortController.current.signal
    });
    // ...
  } catch (error) {
    if (error.name !== 'AbortError') {
      // Log other errors
    }
  }
};

useEffect(() => {
  return () => {
    abortController.current.abort();
  };
}, []);
```

---

## 🎨 Estilos Personalizados

### Modal Styles

```typescript
// Variante 1: Full-screen modal
<div className="fixed inset-0 z-50 bg-white">
  <ProducerDetailLayout {...props} />
</div>

// Variante 2: Centered modal
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
  <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-screen">
    <ProducerDetailLayout {...props} />
  </div>
</div>

// Variante 3: Slide-over (drawer)
<div className="fixed right-0 top-0 bottom-0 h-screen w-2/3 z-50 bg-white shadow-lg">
  <ProducerDetailLayout {...props} />
</div>
```

---

## 📱 Responsive Handling

### Mobile-Optimized Integration

```typescript
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// En el render:
{showDetail && detailData && (
  isMobile ? (
    // Full-screen modal on mobile
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      <ProducerDetailLayout {...props} />
    </div>
  ) : (
    // Centered modal on desktop
    <div className="fixed inset-0 z-50 flex items-center bg-black bg-opacity-50">
      <div className="max-w-6xl w-full mx-auto bg-white rounded-lg">
        <ProducerDetailLayout {...props} />
      </div>
    </div>
  )
)}
```

---

## 🧪 Testing the Integration

### Test Padre-Hijo

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProducersPage from './page';

jest.mock('./ui/ProducerDetail', () => ({
  ProducerDetailLayout: ({ onClose }: any) => (
    <div>
      <button onClick={onClose}>Cerrar</button>
      <div>Detail Content</div>
    </div>
  )
}));

describe('ProducersPage Integration', () => {
  it('opens detail when producer clicked', async () => {
    render(<ProducersPage />);
    
    const producerItem = screen.getByText('José García');
    fireEvent.click(producerItem);
    
    await waitFor(() => {
      expect(screen.getByText('Detail Content')).toBeInTheDocument();
    });
  });

  it('closes detail when close button clicked', async () => {
    render(<ProducersPage />);
    
    fireEvent.click(screen.getByText('José García'));
    
    await waitFor(() => {
      expect(screen.getByText('Detail Content')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Cerrar'));
    
    await waitFor(() => {
      expect(screen.queryByText('Detail Content')).not.toBeInTheDocument();
    });
  });
});
```

---

## 📈 Performance Tips para Padre

1. **Lazy Load Detail Component**
   ```tsx
   const ProducerDetailLayout = lazy(() =>
     import('./ui/ProducerDetail').then(mod => ({
       default: mod.ProducerDetailLayout
     }))
   );
   ```

2. **Memoize Grid**
   ```tsx
   const ProducersGrid = memo(({ onProducerClick, isLoading }) => {
     // Component
   });
   ```

3. **Cache API Results**
   ```tsx
   const cacheRef = useRef(new Map());
   
   const handleProducerClick = async (producerId: string) => {
     if (cacheRef.current.has(producerId)) {
       setDetailData(cacheRef.current.get(producerId));
      } else {
        const data = await fetch(`/api/producers/${producerId}`);
        cacheRef.current.set(producerId, data);
        setDetailData(data);
      }
    };
   ```

---

## 🚀 Deployment Checklist

- [ ] Componente importa correctamente
- [ ] Tipos TypeScript validan
- [ ] API endpoint existe y funciona
- [ ] Modal abre y cierra correctamente
- [ ] Datos cargan sin errores
- [ ] Responsividad en móvil funciona
- [ ] Error handling implementado
- [ ] Memory leaks prevenidos
- [ ] Performance aceptable
- [ ] Sin console errors

---

**Esta guía permite a otro desarrollador integrar ProducerDetail Smoothly en su proyecto.**
