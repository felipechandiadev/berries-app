# ProducerDetail Quick Reference (Cheat Sheet)

## 🚀 5-Minuto Overview

### ¿Qué es?
Componente React que muestra detalles de un productor en una interfaz con:
- **Header**: Información del productor + botones
- **Sidebar**: Navegación entre 5 secciones
- **Main**: Tabla dinámica de sección activa

### Estructura
```
ProducerDetailLayout (estado: activeSection)
│
├─ Header (muestra datos producer)
├─ Sidebar (botones para cambiar sección)
└─ Sección Activa (tabla dinámica)
   ├─ ReceptionsSection
   ├─ AdvancesSection
   ├─ SettlementsSection
   ├─ TraysSection
   └─ BankAccountsSection
```

### Carpetas
```
ProducerDetail/
├─ *.tsx (componentes: Layout, Header, Sidebar)
├─ types.ts (interfaces)
├─ index.ts (exports)
├─ hooks/ (para extensión)
└─ sections/ (tablas dinámicas)
```

---

## 📋 Props Requeridas

```typescript
<ProducerDetailLayout
  data={ProducerDetailData}        // Datos del productor
  onClose={() => {}}               // Cierra modal
  onRefresh={() => {}}             // Recarga datos (opcional)
/>
```

### ProducerDetailData
```typescript
{
  producer: { name, dni, mail, phone, address }
  receptions: { variety, formatName, amount, price, status }[]
  advances: { amount, status }[]
  settlements: { amount }[]
  trays: { balance: {}, movements: [] }
}
```

---

## ⚙️ Cómo Funciona En 3 Pasos

```
1. Usuario hace clic en botón Sidebar
   ↓
2. Ejecuta: onSelect(sectionId)
   ↓
3. setActiveSection(sectionId) → re-render → Nueva sección visible
```

---

## 🎨 Componente Principal: ProducerDetailLayout

| Aspecto | Detalles |
|---------|----------|
| **Estado** | `const [activeSection, setActiveSection] = useState('receptions')` |
| **Array** | `const sections = useMemo(() => [...], [])` |
| **Render** | Header + Sidebar + ActiveComponent |
| **Props** | data, onClose, onRefresh |
| **Exports** | Nombre: `ProducerDetailLayout` |

---

## 📄 Componentes Secundarios

### Header.tsx
- Recibe: `data.producer` + `onClose`
- Muestra: Nombre, DNI, contacto, botones
- Responsive: Mobile stack, Desktop row

### Sidebar.tsx
- Recibe: `sections[]`, `activeSection`, `onSelect()`
- Muestra: Botones de navegación
- Activo: Color secundario del tema
- Inactivo: Hover con color suave

### Sections (5 componentes)
- Reciben: `data` + `onRefresh?`
- Muestra: Tabla con datos
- Patrón: Mapear array, mostrar badge de estado

---

## 💾 Archivos Clave

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `ProducerDetailLayout.tsx` | ~50 | Orquestar componentes, gestionar estado |
| `Header.tsx` | ~40 | Mostrar info productor |
| `Sidebar.tsx` | ~25 | Navegación entre secciones |
| `ReceptionsSection.tsx` | ~90 | Tabla de recepciones |
| `types.ts` | ~30 | Definir interfaces |

---

## 🔌 Usar Desde Componente Padre

```typescript
// page.tsx
const [showDetail, setShowDetail] = useState(false);
const [data, setData] = useState(null);

const handleOpen = async (producerId) => {
  const response = await fetch(`/api/producers/${producerId}`);
  setData(await response.json());
  setShowDetail(true);
};

const handleClose = () => {
  setShowDetail(false);
  setData(null);
};

// En JSX:
{showDetail && data && (
  <ProducerDetailLayout
    data={data}
    onClose={handleClose}
    onRefresh={() => handleOpen(data.producer.id)}
  />
)}
```

---

## 🎯 Flujo de Datos

```
Padre (page.tsx)
  ↓ passes data
ProducerDetailLayout
  ↓ passes data.producer
Header
  
  ↓ passes sections array, activeSection
Sidebar
  ↓ calls onSelect(id)
setActiveSection(id)
  ↓ selects ActiveComponent
ReceptionsSection | AdvancesSection | ...
  ↓ accesses data.receptions | data.advances | ...
Renders table
```

---

## ⚡ Optimizaciones

✅ `useMemo` - No recalcular sections en cada render
✅ `flex` - Layout eficiente
✅ `overflow-auto` - Scroll en secciones largas
✅ `state` - Mínimo (solo activeSection)

---

## 🔧 Extender

### Agregar Nueva Sección

1. Crear archivo `sections/NewSection.tsx`
   ```tsx
   export const NewSection: React.FC<SectionProps> = ({ data }) => (
     <div><!-- tabla con data.newField --></div>
   );
   ```

2. Agregar a array en ProducerDetailLayout
   ```tsx
   { id: 'new', label: 'Nueva', component: NewSection }
   ```

### Agregar Hook Reutilizable

1. Crear `hooks/useLogic.ts`
2. Importar en secciones
3. Usar lógica compartida

---

## ❌ Errores Comunes

| Error | Fix |
|-------|-----|
| "Cannot read .producer" | data es null → agregar verificación |
| Botones no responden | Verificar onSelect callback |
| Componente no renderiza | Falta `'use client'` |
| Datos no cargan | Error en API → verificar endpoint |
| Tabla vacía | Datos vacíos → verificar data |

---

## 📊 Estado Mental

```
activeSection = 'receptions'
     ↓
Buscar en sections array
     ↓
Encontrar: { id: 'receptions', component: ReceptionsSection }
     ↓
ActiveComponent = ReceptionsSection
     ↓
Renderizar: <ActiveComponent data={data} />
```

---

## 🎨 Tailwind Classes Used

- `flex`, `flex-col`, `flex-1` - Layouts
- `w-64`, `border-r`, `overflow-y-auto` - Sidebar
- `px-6`, `py-4`, `border-b` - Header
- `rounded`, `shadow-sm` - Buttons
- `bg-green-100`, `text-green-800` - Badges
- `divide-y`, `divide-gray-200` - Tables

---

## 📱 Responsive

- **Desktop (lg:)**: flex-row, items-start, side-by-side
- **Mobile**: flex-col, stack vertical, fill width

---

## ✅ Checklist Para Usar

- [ ] Data tiene estructura ProducerDetailData
- [ ] onClose es función
- [ ] Componente padre renderiza ProducerDetailLayout
- [ ] No hay console errors
- [ ] Sidebar cambia de sección al click
- [ ] Tablas cargan datos
- [ ] Botón Cerrar funciona

---

## 🧪 Quick Test

```typescript
// Mock data
const mockData = {
  producer: { name: 'Test', dni: '123', mail: 'test@test.com', phone: '123', address: 'Main St' },
  receptions: [{ id: '1', variety: 'Tomate', formatName: 'Box', amount: 100, price: 1000, status: 'Liquidada', createdAt: new Date() }],
  advances: [],
  settlements: [],
  trays: { balance: {}, movements: [] }
};

<ProducerDetailLayout data={mockData} onClose={() => {}} />
```

---

## 🔗 Related Files

- Data Service: `app/actions/producers.ts`
- API: `app/api/producers/[id]/route.ts`
- Types: `app/home/productiveManagement/producers/ui/ProducerDetail/types.ts`
- Parent: `app/home/productiveManagement/producers/page.tsx`

---

## 📚 Documentation Map

```
Este archivo (Cheat Sheet) ← Estás aquí
    ↓
README.md ← Navega entre documentos
    ↓
    ├─ ARCHITECTURE.md ← Entiende la estructura
    ├─ IMPLEMENTATION_GUIDE.md ← Crea desde cero
    ├─ VISUAL_GUIDE.md ← Ve diagramas
    └─ CONSUMER_INTEGRATION_GUIDE.md ← Integra en tu proyecto
```

---

## 🚀 30-Segundo Summary

**ProducerDetail** es un componente que:
1. Muestra info de productor en Header
2. Permite elegir sección en Sidebar
3. Renderiza tabla dinámicamente en Main
4. Maneja estado mínimo (activeSection)
5. Recibe datos del padre → los distribuye a componentes hijos

**Para usarlo**: Pasa `data`, `onClose`, `onRefresh` props, el resto es automático.

---

## 💾 Quick Copy-Paste

### Importar
```tsx
import { ProducerDetailLayout } from '@/app/home/productiveManagement/producers/ui/ProducerDetail';
```

### Usar
```tsx
<ProducerDetailLayout 
  data={producerData} 
  onClose={() => setShowDetail(false)}
  onRefresh={() => reloadData()}
/>
```

### Mock Data
```tsx
const mockData = {
  producer: { id: '1', name: 'John', dni: '123', mail: 'john@test.com', phone: '123456', address: 'Main St 123' },
  receptions: [{ id: '1', createdAt: new Date(), variety: 'Tomato', formatName: 'Box', amount: 100, price: 5000, status: 'Liquidada' }],
  advances: [],
  settlements: [],
  trays: { balance: {}, movements: [] }
};
```

---

**Última actualización: Marzo 2026 | Versión: 1.0**

Para detalles completos, consulta los otros documentos en esta carpeta. 📚
