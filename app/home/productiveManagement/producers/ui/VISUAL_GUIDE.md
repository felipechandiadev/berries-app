# Visual Architecture & Integration Guide

## 🗺️ Mapa Visual del Componente

### Vista de Carpetas

```
ProducerDetail/
├─ PropTypes & Exports
│  ├─ types.ts ..................... Todas las interfaces definidas
│  └─ index.ts ..................... Exports públicos
│
├─ Contenedor Principal
│  └─ ProducerDetailLayout.tsx
│     ├─ Imports: Header, Sidebar, Sections
│     ├─ State: activeSection
│     ├─ Logic: sections array, ActiveComponent selection
│     └─ Layout: 3-section grid (Header, Sidebar, Main)
│
├─ Layout Components
│  ├─ Header.tsx
│  │  ├─ Shows: producer.name, dni, mail, phone, address
│  │  ├─ Features: PrintButton, CloseButton
│  │  └─ Responsive: Mobile stack, Desktop row
│  │
│  └─ Sidebar.tsx
│     ├─ Shows: Navigation buttons for sections
│     ├─ Behavior: Click → setActiveSection(id)
│     ├─ Styling: Active vs Inactive states
│     └─ Props: sections[], activeSection, onSelect()
│
├─ Dynamic Sections
│  └─ sections/
│     ├─ ReceptionsSection.tsx ... Table of producto receptions
│     ├─ AdvancesSection.tsx ..... Table of monetary advances
│     ├─ SettlementsSection.tsx .. Table of settlements
│     ├─ TraysSection.tsx ........ Table of tray movements
│     └─ BankAccountsSection.tsx . Table de bank accounts
│
├─ Utilities
│  ├─ PrintProducerDetailButton.tsx
│  └─ hooks/ ....................... (Folder for custom hooks - empty now)
```

---

## 🔌 Component Connection Diagram

```
┌─┐ ┌────────────────────────────────────────────────────┐
│P│ │ PARENT COMPONENT (e.g., ProducerListPage)         │
│A│ │ Props: ProducerDetailData, callbacks              │
│R│ └──────────────────────┬─────────────────────────────┘
│E│                        │ data: {
│N│                        │   producer: Producer,
│T│                        │   receptions: [...],
│  │                        │   advances: [...],
│  │                        │   settlements: [...],
│  │                        │   trays: {...}
│  │                        │ }
│  │                        │
│  │    ┌──────────────────▼───────────────────────┐
│  │    │ ProducerDetailLayout                     │
│  │    │ - useState(activeSection)                │
│  │    │ - useMemo(sections)                      │
│  │    │ - getActiveComponent()                   │
│  │    └──────────────────┬───────────────────────┘
│  │                       │
│  │  ┌────────────────────┼───────────────────────┐
│  │  │                    │                       │
│  │  ▼                    ▼                       ▼
│  │ ┌──────────────┐  ┌──────────────┐  ┌────────────────┐
│  │ │ Header       │  │ Sidebar      │  │ Main Content   │
│  │ ├──────────────┤  ├──────────────┤  ├────────────────┤
│  │ │- Name        │  │- Section     │  │ ActiveSection  │
│  │ │- DNI         │  │  buttons     │  │ (Dynamic)      │
│  │ │- Contact     │  │- onSelect()  │  ├────────────────┤
│  │ │  info        │  │  handler     │  │ - Reception    │
│  │ │- Buttons     │  │              │  │ - Advances     │
│  │ └──────────────┘  └──────────────┘  │ - Settlements  │
│  │                           ▲          │ - Trays        │
│  │                           │ onClick  │ - BankAccounts │
│  │                    setActiveSection()│                │
│  │                           │          └────────────────┘
│  │                    ┌──────┴──────┐
│  │                    │ useMemo     │
│  │                    │ sections[]  │
│  │                    └─────────────┘
│  │                       ▼
│  │            ┌──────────────────────┐
│  │            │ Section Component    │
│  │            │ (Receives data)      │
│  │            │ Renders Table        │
│  │            └──────────────────────┘
└─┘
```

---

## 🎬 User Interaction Flow

```
START: User opens Producer Detail

  │
  └─► ProducerDetailLayout mounts
        ├─► activeSection = 'receptions'
        ├─► sections array created (useMemo)
        └─► Render phase starts

          │
          └─► Header rendered
                ├─ Display producer information
                └─ Buttons ready

          │
          └─► Sidebar rendered
                ├─ 5 navigation buttons
                └─ Listeners attached

          │
          └─► ReceptionsSection rendered (default)
                └─ Table with data displayed

                    │
                    USER ACTION: Click on "Anticipos" button in Sidebar
                    │
                    └─► onClick handler fires
                        │
                        └─► onSelect('advances')
                            │
                            └─► setActiveSection('advances')
                                │
                                └─► State update
                                    │
                                    └─► ProducerDetailLayout re-renders
                                        │
                                        └─► activeSection = 'advances'
                                            │
                                            └─► ActiveComponent = AdvancesSection
                                                │
                                                └─► AdvancesSection rendered
                                                    │
                                                    └─► Old ReceptionsSection removed
                                                    └─► New table displayed

                    │
                    USER ACTION: Click "Cerrar" button
                    │
                    └─► onClick handler fires
                        │
                        └─► onClose()
                            │
                            └─► Callback to parent
                                │
                                └─► Modal/Detail view closes

END
```

---

## 📊 Data Flow Example

### Initial Data Structure

```typescript
// Passed from parent
const producerDetailData: ProducerDetailData = {
  producer: {
    id: 'PROD-001',
    name: 'José García',
    dni: '12.345.678-9',
    mail: 'jose.garcia@email.com',
    phone: '+56 9 1234 5678',
    address: 'Camino Rural 123, La Serena'
  },
  
  receptions: [
    {
      id: 'REC-001',
      createdAt: '2026-03-01',
      variety: 'Tomate Cherry',
      formatName: 'Bandeja 500g',
      amount: 1250,           // kg
      price: 2500,            // CLP per kg
      status: 'Liquidada'
    },
    {
      id: 'REC-002',
      createdAt: '2026-02-25',
      variety: 'Tomate Cocktail',
      formatName: 'Caja 5kg',
      amount: 5000,
      price: 1800,
      status: 'Pendiente'
    }
  ],
  
  advances: [
    {
      id: 'ADV-001',
      createdAt: '2026-02-20',
      amount: 500000,         // CLP anticipado
      status: 'Pagado'
    }
  ],
  
  settlements: [
    {
      id: 'SETTLE-001',
      createdAt: '2026-02-28',
      amount: 2250000         // CLP final
    }
  ],
  
  trays: {
    balance: {
      'L-001': 50,            // 50 bandejas en línea 001
      'L-002': 30
    },
    movements: [
      {
        id: 'TRAY-001',
        createdAt: '2026-02-28',
        amount: -20             // -20 bandejas entregadas
      }
    ]
  }
};
```

### Data Routing in Components

```
ProducerDetailLayout receives: { data, onClose, onRefresh }
│
├─► Header receives:
│   ├─ data.producer.name
│   ├─ data.producer.dni
│   ├─ data.producer.mail
│   ├─ data.producer.phone
│   ├─ data.producer.address
│   └─ onClose callback
│
├─► Sidebar receives:
│   ├─ sections array (labels only)
│   ├─ activeSection
│   └─ onSelect callback
│
└─► ActiveSection receives:
    ├─ data (full object)
    └─ onRefresh callback (optional)
        │
        ├─ ReceptionsSection accesses:
        │  └─ data.receptions[]
        │
        ├─ AdvancesSection accesses:
        │  └─ data.advances[]
        │
        ├─ SettlementsSection accesses:
        │  └─ data.settlements[]
        │
        ├─ TraysSection accesses:
        │  ├─ data.trays.balance
        │  └─ data.trays.movements
        │
        └─ BankAccountsSection accesses:
           └─ data (bankAccounts needed)
```

---

## 🚀 Integration in Another Project

### Step 1: Copy Folder Structure

```bash
# In your new project:
mkdir -p app/features/products/ui/ProductDetail/sections
mkdir -p app/features/products/ui/ProductDetail/hooks
```

### Step 2: Copy Files

Copy these files from ElectNextStart:

```bash
cp ProducerDetail/types.ts → ProductDetail/types.ts
cp ProducerDetail/index.ts → ProductDetail/index.ts
cp ProducerDetail/ProducerDetailLayout.tsx → ProductDetail/ProductDetailLayout.tsx
cp ProducerDetail/Header.tsx → ProductDetail/Header.tsx
cp ProducerDetail/Sidebar.tsx → ProductDetail/Sidebar.tsx
cp ProducerDetail/sections/* → ProductDetail/sections/
```

### Step 3: Update Imports

**In ProductDetailLayout.tsx:**

```typescript
// OLD (ElectNextStart paths)
import { ProducerDetailData } from './types';
import { Button } from '@/app/baseComponents/Button/Button';

// NEW (Your project paths)
import { ProductDetailData } from './types';
import { Button } from '@/components/Button/Button';  // or your path
```

### Step 4: Update Types

**In types.ts:**

```typescript
// OLD
import { Producer } from '@/data/entities/Producer';
import { Transaction } from '@/data/entities/Transaction';

export interface ProducerDetailData {
  producer: Producer;
  // ...
}

// NEW
import { Product } from '@/models/Product';
import { Movement } from '@/models/Movement';

export interface ProductDetailData {
  product: Product;
  movements: Movement[];
  // ... adapt to your entities
}
```

### Step 5: Update Section Components

**Example: ReceptionsSection.tsx → MovementsSection.tsx**

```typescript
// OLD
import { SectionProps } from '../types';

export const ReceptionsSection: React.FC<SectionProps> = ({ data }) => {
  // Uses data.receptions

// NEW
import { SectionProps } from '../types';

export const MovementsSection: React.FC<SectionProps> = ({ data }) => {
  // Uses data.movements
  // Same table structure, different data accessor
```

### Step 6: Create Parent Component

```typescript
// products/page.tsx or wherever you use it

'use client';

import React, { useState } from 'react';
import { ProductDetailLayout } from '@/app/features/products/ui/ProductDetail';

export default function ProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailData, setDetailData] = useState(null);

  const handleProductSelect = async (productId: string) => {
    // Fetch product details
    const data = await fetchProductDetails(productId);
    setDetailData(data);
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setDetailData(null);
  };

  return (
    <div>
      {/* Your list view */}
      {/* ... */}

      {/* Detail modal */}
      {detailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute inset-4 bg-white rounded-lg">
            <ProductDetailLayout
              data={detailData}
              onClose={handleClose}
              onRefresh={() => handleProductSelect(selectedProduct)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Customization Examples

### Change Colors

```typescript
// Sidebar.tsx - Modify active button color
className={`
  w-full text-left px-4 py-2 text-sm transition-colors duration-150
  ${activeSection === section.id
    ? 'bg-blue-500 text-white font-medium border border-blue-500'  // NEW COLOR
    : 'text-gray-700 border border-transparent...'
  }
`}
```

### Add Icons

```typescript
// Sidebar.tsx - Add icons from react-icons or similar
import { FiBox, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

const iconMap = {
  'receptions': <FiBox />,
  'advances': <FiDollarSign />,
  'settlements': <FiTrendingUp />,
};

<button>
  <span className="mr-2">{iconMap[section.id]}</span>
  {section.label}
</button>
```

### Add Search/Filter

```typescript
// ReceptionsSection.tsx - Add search
const [searchTerm, setSearchTerm] = useState('');

const filteredReceptions = data.receptions.filter(r =>
  r.variety.toLowerCase().includes(searchTerm.toLowerCase())
);

<input
  placeholder="Buscar variedad..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="mb-4 px-3 py-2 border border-gray-300 rounded"
/>
// Then use filteredReceptions instead of data.receptions
```

### Add Export Button

```typescript
// Header.tsx - Add Excel export
import { Button } from '@/components/Button';

<Button 
  onClick={() => exportToExcel(data)}
  variant="outlined"
>
  Exportar
</Button>

function exportToExcel(data: ProductDetailData) {
  // Use xlsx library
  const worksheet = XLSX.utils.json_to_sheet(data.receptions);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recepciones');
  XLSX.writeFile(workbook, `${data.product.name}.xlsx`);
}
```

---

## 🧪 Testing Structure

### Unit Test Example: Sidebar

```typescript
// Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders all sections', () => {
    const sections = [
      { id: 'a', label: 'Section A' },
      { id: 'b', label: 'Section B' }
    ];
    render(
      <Sidebar 
        sections={sections}
        activeSection="a"
        onSelect={jest.fn()}
      />
    );
    
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByText('Section B')).toBeInTheDocument();
  });

  it('calls onSelect when button clicked', () => {
    const onSelect = jest.fn();
    const sections = [{ id: 'section1', label: 'Test' }];
    
    render(
      <Sidebar 
        sections={sections}
        activeSection="other"
        onSelect={onSelect}
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    expect(onSelect).toHaveBeenCalledWith('section1');
  });
});
```

### Integration Test Example: Detail Layout

```typescript
// ProducerDetailLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProducerDetailLayout } from './ProducerDetailLayout';

describe('ProducerDetailLayout', () => {
  const mockData = {
    producer: { name: 'John', dni: '123', mail: '', phone: '', address: '' },
    receptions: [],
    advances: [],
    settlements: [],
    trays: { balance: {}, movements: [] }
  };

  it('switches sections on button click', () => {
    render(
      <ProducerDetailLayout 
        data={mockData}
        onClose={jest.fn()}
      />
    );
    
    // Initially shows Receptions
    expect(screen.getByText('Recepciones')).toBeInTheDocument();
    
    // Click on Advances
    fireEvent.click(screen.getByText('Anticipos'));
    
    // Now shows Advances
    expect(screen.getByText('Anticipos')).toBeInTheDocument();
  });
});
```

---

## 📈 Performance Optimization Tips

1. **Memoize Section Components**
   ```tsx
   export const ReceptionsSection = React.memo(({ data, onRefresh }) => {
     // Component code
   });
   ```

2. **Virtualize Long Tables**
   ```tsx
   import { FixedSizeList } from 'react-window';
   
   <FixedSizeList
     height={600}
     itemCount={data.receptions.length}
     itemSize={50}
   >
     {({ index, style }) => (
       <div style={style}>
         {/* Row content */}
       </div>
     )}
   </FixedSizeList>
   ```

3. **Lazy Load Heavy Sections**
   ```tsx
   const BankAccountsSection = lazy(() => 
     import('./sections/BankAccountsSection')
   );
   ```

---

## 🔐 Security Considerations

- ✅ No sensitive data in URL params
- ✅ Sanitize user input in search filters
- ✅ Validate data structure on client
- ✅ Use HTTPS for API calls
- ✅ Implement error boundaries
- ✅ Log component errors

```tsx
// Error Boundary
class DetailErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Detail component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Error loading details</div>;
    }
    return this.props.children;
  }
}
```

---

## 📚 Key Takeaways

| Aspect | Key Point |
|--------|-----------|
| **Architecture** | Layout + Sidebar + Dynamic Sections |
| **State Management** | Minimal (only activeSection) |
| **Data Flow** | Unidirectional (parent → children) |
| **Scalability** | Add new sections to array |
| **Reusability** | Sections follow same interface |
| **Performance** | useMemo prevents recalculations |
| **Responsive** | Tailwind mobile-first |
| **Type Safety** | Full TypeScript coverage |

---

**Esta guía visual permite entender y reproducir completamente la arquitectura del componente ProducerDetail en cualquier otro proyecto.**
