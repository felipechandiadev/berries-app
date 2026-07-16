# Arquitectura del Componente Producer Detail

## 📋 Resumen Ejecutivo

El componente `ProducerDetail` es un sistema modular para visualizar información detallada de productores. Utiliza una arquitectura de **layout principal + sidebar + secciones dinámicas** que permite un flujo de información lipio y escalable.

---

## 🗂️ Estructura de Carpetas

```
app/home/productiveManagement/producers/ui/ProducerDetail/
├── ProducerDetailLayout.tsx      # Componente principal / contenedor
├── Header.tsx                     # Barra superior con información del productor
├── Sidebar.tsx                    # Navegación lateral entre secciones
├── PrintProducerDetailButton.tsx  # Botón para imprimir detalles
├── types.ts                       # Tipos TypeScript compartidos
├── index.ts                       # Exports públicos
├── hooks/                         # (vacío, disponible para extensión)
└── sections/                      # Secciones temáticas dinámicas
    ├── ReceptionsSection.tsx      # Tabla de recepciones
    ├── AdvancesSection.tsx        # Tabla de anticipos
    ├── SettlementsSection.tsx     # Tabla de liquidaciones
    ├── TraysSection.tsx           # Tabla de bandejas
    └── BankAccountsSection.tsx    # Tabla de cuentas bancarias
```

---

## 🎯 Flujo de Arquitectura

```
┌─────────────────────────────────────────────┐
│  ProducerDetailLayout (Componente Principal) │
│  - Maneja estado de sección activa           │
│  - Renderiza Header, Sidebar, Sección       │
└────────┬────────────────────────────────────┘
         │
         ├─────────────────────┬────────────────────────┐
         │                     │                        │
    ┌────▼─────┐         ┌─────▼────┐        ┌────────▼───────┐
    │  Header  │         │ Sidebar  │        │ ActiveSection  │
    │ (Estático)│        │(Navegación)       │   (Dinámica)   │
    │          │         │          │        │                │
    │ - Nombre │         │ - Lista  │        │ - Receptions   │
    │ - DNI    │         │   botones│        │ - Advances     │
    │ - Datos  │         │ - Click  │        │ - Settlements  │
    │ - Mail   │         │   event  │        │ - Trays        │
    │ - Botones│         │          │        │ - BankAccounts │
    └──────────┘         └──────────┘        └────────────────┘
```

---

## 📦 Componente Principal: ProducerDetailLayout

### Propósito
Contenedor raíz que orquesta toda la experiencia del usuario. Coordina:
- **Gestión de estado**: Qué sección está activa
- **Renderización**: Layout en 3 secciones (Header, Sidebar, Contenido)
- **Comunicación**: Pasa datos a componentes hijos

### Props
```typescript
interface ProducerDetailLayoutProps {
  data: ProducerDetailData;      // Datos completos del productor
  onClose: () => void;            // Callback para cerrar el modal/vista
  onRefresh?: () => void;         // Callback opcional para refrescar datos
}
```

### Estado Interno
```typescript
const [activeSection, setActiveSection] = useState('receptions');
```
- **Tipo**: string
- **Valor inicial**: `'receptions'`
- **Actualizaciones**: Al hacer clic en botones del Sidebar

### Estructura JSX

```
<div> (contenedor flex column)
  │
  ├─ <Header />          (flex: 0, altura fija)
  │
  └─ <div> (flex fila)
      │
      ├─ <aside> (Sidebar)       (width: 16rem/w-64, flex-shrink-0)
      │   └─ <Sidebar />
      │
      └─ <main> (contenido)      (flex-1, overflow auto)
          └─ <ActiveComponent />  (renderizada dinámicamente)
```

### Configuración de Secciones

Las secciones se definen en un array con `useMemo`:

```typescript
const sections = [
  { 
    id: 'receptions', 
    label: 'Recepciones', 
    component: ReceptionsSection 
  },
  { 
    id: 'advances', 
    label: 'Anticipos', 
    component: AdvancesSection 
  },
  // ... más secciones
];
```

**¿Por qué `useMemo`?** Evita recrear el array en cada render, mejorando performance.

### Lógica de Selección Dinámica

```typescript
const ActiveComponent = sections
  .find(s => s.id === activeSection)
  ?.component || ReceptionsSection;

// Resultado: Componente activo o ReceptionsSection como fallback
```

---

## 🎨 Header: Barra Superior

### Propósito
Mostrar información de identidad del productor y botones de acción.

### Props
```typescript
interface HeaderProps {
  data: ProducerDetailData;
  onClose: () => void;
}
```

### Contenido

**Sección Izquierda:**
- Nombre del productor (h2, font-semibold)
- DNI, Email, Teléfono (línea gris con separadores)
- Dirección (si existe)

**Sección Derecha:**
- Botón "Cerrar" (outlined)
- Botón de impresión (`PrintProducerDetailButton`)

### Responsividad

```css
/* Desktop (lg:) */
- flex-row: Nombre a la izquierda, botones a la derecha
- items-start: Alineación horizontal

/* Mobile */
- flex-col: Stack vertical
- gap-4: Espaciado entre elementos
```

---

## 🗂️ Sidebar: Navegación Lateral

### Propósito
Permitir cambiar entre diferentes secciones de información.

### Props
```typescript
interface SidebarProps {
  sections: Section[];           // Array de secciones disponibles
  activeSection: string;         // ID de sección activa
  onSelect: (id: string) => void; // Callback al seleccionar
}
```

### Comportamiento

**Cada botón:**
- Ancho 100% (w-full)
- Padding: px-4 py-2
- Transición de colores suave (duration-150)

**Estados:**
1. **Activo** (`activeSection === section.id`):
   - Fondo: `bg-secondary` (color secundario del tema)
   - Texto: `text-background` (contraste)
   - Borde: `border-secondary` con sombra

2. **Inactivo (hover)**:
   - Fondo: Transparente + hover con tono secundario
   - Borde: `border-secondary`
   - Transición suave

### Interacción
```tsx
<button onClick={() => onSelect(section.id)}>
  {section.label}
</button>
```

---

## 📊 Secciones: Componentes Dinámicos

### Patrón Compartido

Todas las secciones siguen la misma interfaz:

```typescript
interface SectionProps {
  data: ProducerDetailData;
  onRefresh?: () => void;
}
```

### Secciones Disponibles

#### 1. **ReceptionsSection**
- **Propósito**: Mostrar todas las recepciones de producto
- **Tabla con columnas**:
  - Folio, Fecha, Variedad, Formato
  - Neto KG, Precio, Monto, Estado
- **Estado**: Badge de color (Green=Liquidada, Yellow=Pendiente)
- **Dato vacío**: Mensaje "No hay recepciones registradas"

#### 2. **AdvancesSection**
- **Propósito**: Mostrar anticipos de pago
- **Estructura**: Similar a ReceptionsSection

#### 3. **SettlementsSection**
- **Propósito**: Mostrar liquidaciones finales
- **Estructura**: Similar a ReceptionsSection

#### 4. **TraysSection**
- **Propósito**: Mostrar movimiento de bandejas y saldo
- **Datos especiales**:
  - `trays.balance`: Saldo actual por trayecto
  - `trays.movements`: Historial de movimientos

#### 5. **BankAccountsSection**
- **Propósito**: Mostrar cuentas bancarias del productor
- **Datos**: Información de transferencias

### Patrón de Sección (Ejemplo: ReceptionsSection)

```tsx
export const ReceptionsSection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      {/* Título */}
      <h3 className="text-lg font-medium mb-4">Recepciones</h3>
      
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Columna1</th>
              <th>Columna2</th>
              {/* ... */}
            </tr>
          </thead>
          <tbody>
            {data.receptions.length > 0 ? (
              // Mapear filas
              data.receptions.map(item => (
                <tr key={item.id}>
                  {/* Celdas */}
                </tr>
              ))
            ) : (
              // Estado vacío
              <tr>
                <td colSpan={8}>No hay datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 📝 Sistema de Tipos

### Archivo: `types.ts`

```typescript
// Extensión de Transaction para recepciones especializadas
interface ExtendedReception extends Transaction {
  variety: string;
  formatName: string;
  price: number;
  netWeight: number;
  status?: string;
}

// Extensión de Transaction para anticipos
interface ExtendedAdvance extends Transaction {
  status?: string;
}

// Datos principales compartidos
interface ProducerDetailData {
  producer: Producer;                    // Entidad base
  receptions: ExtendedReception[];       // Historial de recepciones
  advances: ExtendedAdvance[];           // Historial de anticipos
  settlements: Transaction[];            // Historial de liquidaciones
  trays: {
    balance: Record<string, number>;     // Saldo por trayecto
    movements: Transaction[];            // Movimientos
  };
}

// Props compartidas para secciones
interface SectionProps {
  data: ProducerDetailData;
  onRefresh?: () => void;
}
```

### Importaciones de Entidades

```typescript
import { Producer } from '@/data/entities/Producer';
import { Transaction } from '@/data/entities/Transaction';
```

---

## 🔌 Conexiones del Sistema de Archivos

### Flujo de Datos

```
ProducerDetailLayout
  │
  ├─ data: ProducerDetailData
  │  ├─ producer.name → Header
  │  │  ├─ producer.dni → Header
  │  │  ├─ producer.mail → Header
  │  │  ├─ producer.phone → Header
  │  │  └─ producer.address → Header
  │  │
  │  ├─ receptions[] → ReceptionsSection
  │  ├─ advances[] → AdvancesSection
  │  ├─ settlements[] → SettlementsSection
  │  ├─ trays → TraysSection
  │  └─ (bankAccounts) → BankAccountsSection
  │
  ├─ onClose → Header (botón Cerrar)
  └─ onRefresh → ActiveSection (botón refrescar)
```

### Relación Secciones y Sidebar

```
ProducerDetailLayout mantiene array sections[]
  │
  ├─ Pasa sections[] → Sidebar
  │  └─ Sidebar renderiza botones
  │
  ├─ onSelect (callback) ← Sidebar
  │  └─ Actualiza activeSection
  │
  └─ activeSection → Determina qué renderizar
     └─ ReceptionsSection | AdvancesSection | ...
```

---

## 🎛️ Modelo de Estado

### Estado Local del Layout

```typescript
// ProducerDetailLayout.tsx
const [activeSection, setActiveSection] = useState('receptions');

// Flujo:
// 1. Usuario hace clic en botón del Sidebar
// 2. setActiveSection(nuevoId)
// 3. Re-render con nuevo activeSection
// 4. Se renderiza la sección correspondiente
```

### Props vs Estado

| Fuente | Quién posee | Mutabilidad | Propósito |
|--------|-----------|-------------|----------|
| `data` | Padre | Readonly | Información del productor |
| `onClose` | Padre | Función | Cerrar modal |
| `onRefresh` | Padre | Función | Refrescar datos |
| `activeSection` | Layout | Mutable | Qué sección ver |

---

## 🚀 Ciclo de Vida

### Montaje del Componente

1. **ProducerDetailLayout monta**
   - Inicializa `activeSection = 'receptions'`
   - Calcula array sections con useMemo
   
2. **Header renderiza**
   - Muestra datos del productor
   - Botones de acción listos
   
3. **Sidebar renderiza**
   - Lista botones de secciones
   - Configura listeners de clic

4. **ReceptionsSection renderiza**
   - Primera sección por defecto

### Interacción del Usuario

```
Usuario hace clic en botón Sidebar
         ↓
onClick handler dispara
         ↓
setActiveSection(nuevoId)
         ↓
State actualiza
         ↓
ProducerDetailLayout re-renderiza
         ↓
Nueva sección renderiza en <main>
```

---

## 🎨 Estilos y Tailwind

### Clases Reutilizadas

| Elemento | Clases Tailwind |
|----------|-----------------|
| Header | `px-6 py-4 border-b border-gray-200 bg-white` |
| Sidebar Container | `w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4` |
| Botón Sidebar | `w-full text-left px-4 py-2 text-sm transition-colors duration-150` |
| Tabla (Sección) | `min-w-full divide-y divide-gray-200` |
| Status Badge | `px-2 inline-flex text-xs leading-5 font-semibold rounded-full` |

### Respuesta Responsiva

```
Header:
- Desktop (lg:): flex-row, items-start, justify-between
- Mobile: flex-col, stack vertical

Sidebar:
- Desktop: w-64 (ancho fijo)
- Mobile: Podría colapsarse (no está implementado aún)

Tablas:
- overflow-x-auto: Scroll horizontal en móvil
- min-w-full: Ancho mínimo 100%
```

---

## 🔧 Exportes Públicos

### Archivo `index.ts`

```typescript
export * from './ProducerDetailLayout';
export * from './types';
```

**Uso externo:**
```typescript
import { ProducerDetailLayout, ProducerDetailData } from '@/app/home/productiveManagement/producers/ui/ProducerDetail';
```

---

## 📈 Escalabilidad y Extensión

### Agregar Nueva Sección

**Paso 1**: Crear archivo en `sections/`
```tsx
// NewSection.tsx
export const NewSection: React.FC<SectionProps> = ({ data, onRefresh }) => {
  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Nueva Sección</h3>
      {/* Contenido */}
    </div>
  );
};
```

**Paso 2**: Agregar a array `sections` en ProducerDetailLayout
```typescript
const sections = [
  // ... secciones existentes
  { 
    id: 'newSection', 
    label: 'Nueva', 
    component: NewSection 
  },
];
```

### Agregar Hook Reutilizable

**Paso 1**: Crear en carpeta `hooks/`
```typescript
// useProducerData.ts
export const useProducerData = (data: ProducerDetailData) => {
  // Lógica compartida
  return { /* ... */ };
};
```

**Paso 2**: Importar en secciones
```typescript
import { useProducerData } from '../hooks/useProducerData';
```

---

## 🧪 Pruebas - Puntos de Prueba

### Unit Tests
- [ ] Sidebar cambia activeSection al hacer clic
- [ ] Header renderiza correctamente datos del productor
- [ ] Secciones reciben props correctas
- [ ] Array sections calcula correctamente con useMemo

### Integration Tests
- [ ] Flujo completo: Clic en botón → Cambio de sección
- [ ] Datos fluyen correctamente del padre a hijos
- [ ] Callbacks (onClose, onRefresh) se disparan

### E2E Tests
- [ ] Modal abre con datos de productor
- [ ] Navegación entre secciones funciona
- [ ] Botón imprimir abre diálogo
- [ ] Botón cerrar cierra la ventana

---

## 📚 Referencias Externas

### Entidades
- `Producer`: `/data/entities/Producer`
- `Transaction`: `/data/entities/Transaction`

### Componentes Base
- `Button`: `/app/baseComponents/Button/Button`

### Botones Especializados
- `PrintProducerDetailButton`: `./PrintProducerDetailButton.tsx`

---

## 🎯 Resumen de Conexiones

```
┌─────────────────────────────────────┐
│      Padre (ProducerListPage)       │
│   Pasa ProducerDetailData           │
└────────────┬────────────────────────┘
             │
   ┌─────────▼────────────────────┐
   │ ProducerDetailLayout         │
   │ - Orquesta componentes       │
   │ - Maneja activeSection       │
   └─────────┬─────────────────────┘
             │
   ┌─────────┼─────────┬──────────────┐
   │         │         │              │
┌──▼──┐  ┌──▼──┐  ┌───▼────┐  ┌─────▼──┐
│Head │  │Side │  │Recep   │  │Advances│
│ er  │  │ bar │  │ tions  │  │Section │
├─────┤  ├─────┤  ├────────┤  ├────────┤
│- Prod│  │- Nav│  │- Table │  ├ Table │
│ Info│  │ Items│  │        │  │        │
│- Botones  │- Click│  ├ Mapear│  └────────┘
│     │  │ Link │  │ rows   │
└─────┘  └─────┘  └────────┘

(Más secciones: SettlementsSection, TraysSection, BankAccountsSection)
```

---

## 💡 Notas de Desarrollo

1. **Rendimiento**: useMemo previene recalcular sections[] innecesariamente
2. **Escalabilidad**: Agregar secciones es simple: solo agregar al array
3. **Tipado**: Sistema fuerte con TypeScript para evitar errores
4. **Responsive**: Mobile-first con clases Tailwind
5. **Estado**: Mínimo (solo activeSection), datos vienen del prop
6. **Flexibilidad**: Secciones son componentes independientes y reutilizables

---

**Última actualización**: Marzo 2026  
**Versión**: 1.0
