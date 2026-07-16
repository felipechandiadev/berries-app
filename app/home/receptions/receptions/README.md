# Receptions Management Module

## Overview
The Receptions Management module provides a comprehensive interface for viewing, managing, and analyzing fruit/product reception records. It displays receptions in a data grid with advanced filtering, sorting, and export capabilities, along with detailed views and administrative actions.

## Structure
```
app/home/receptions/receptions/
├── page.tsx                           # Main page with server-side data fetching
├── RECEPTION_DETAIL_IMPLEMENTATION_GUIDE.md  # Implementation documentation
├── RECEPTION_TRANSACTION.md           # Transaction flow documentation
└── ui/
    ├── ReceptionsGrid.tsx             # Main data grid component
    ├── DetailReceptionButton.tsx      # Detail view trigger button
    ├── DeleteReceptionButton.tsx      # Delete action button
    ├── MainWidthManager.tsx           # Layout width management
    ├── ReceptionDetail/               # Detail view components
    │   ├── ReceptionDetailLayout.tsx  # Main detail layout
    │   ├── Header.tsx                 # Detail header
    │   ├── Sidebar.tsx                # Navigation sidebar
    │   ├── PrintReceptionDetailButton.tsx # Print functionality
    │   ├── hooks/                     # Custom hooks
    │   ├── sections/                  # Detail sections
    │   └── types.ts                   # TypeScript types
    └── components/                    # Shared components
```

## Key Components

### ReceptionsGrid
- **Purpose**: Main data grid displaying reception records with advanced features
- **Features**:
  - Paginated data display with customizable page sizes (default 25)
  - Multi-column sorting (ID, producer, date, trays, weights, payment)
  - Global search functionality
  - Advanced filtering capabilities
  - Excel export functionality
  - Print receipt generation for individual receptions
  - Action buttons for detail view and deletion
  - Status indicators (Settled/Pending)

### DetailReceptionButton
- **Purpose**: Opens detailed view modal for individual receptions
- **Features**:
  - Modal dialog with full reception details
  - Loading states and error handling
  - Refresh capability
  - Accessible button with descriptive tooltips

### DeleteReceptionButton
- **Purpose**: Handles reception deletion with confirmation
- **Features**:
  - Conditional enabling (disabled for settled receptions)
  - Confirmation dialog with DeleteBaseForm
  - Success/error feedback via alerts
  - Automatic grid refresh after deletion

### ReceptionDetailLayout
- **Purpose**: Comprehensive detail view with multiple sections
- **Features**:
  - Tabbed interface with sidebar navigation
  - Multiple sections: General Info, Summary, Packs, Tray Returns, History
  - Responsive layout with header and sidebar
  - Print functionality integration

## Functionalities

### Data Display & Navigation
- **Grid View**: Tabular display of reception data with sortable columns
- **Pagination**: Server-side pagination with configurable limits
- **Search**: Global search across multiple fields
- **Filtering**: Advanced filtering options via URL parameters
- **Sorting**: Multi-column sorting with ASC/DESC options

### Administrative Actions
- **View Details**: Modal detail view with comprehensive reception information
- **Print Receipts**: Generate thermal printer receipts for receptions
- **Delete Receptions**: Remove receptions (with restrictions for settled ones)
- **Export Data**: Excel export of filtered reception data

### Data Management
- **Real-time Updates**: Grid refresh after actions
- **URL State Management**: Search, filter, sort, and pagination state in URL
- **Error Handling**: Comprehensive error handling with user feedback
- **Loading States**: Visual feedback during data operations

## Data Flow

1. **Server-Side Rendering**: Page fetches initial data via `getReceptionsGridData`
2. **URL Parameter Processing**: Handles search, sort, filter, pagination parameters
3. **Grid Rendering**: DataGrid component displays data with custom column renderers
4. **Action Handling**: Buttons trigger modals, exports, or API calls
5. **State Synchronization**: URL parameters kept in sync with component state

## Columns Displayed

| Column | Field | Description | Sortable | Format |
|--------|-------|-------------|----------|--------|
| Folio | id | Reception ID | ✓ | Monospace font |
| Productor | producerName | Producer name | ✓ | Text |
| Fecha/Hora | createdAt | Creation timestamp | ✓ | Formatted date/time |
| Variedad | varieties | Product varieties | ✗ | Comma-separated list |
| Bandejas | totalTrays | Total tray count | ✓ | Number formatted |
| Peso bruto (kg) | grossWeightKg | Gross weight | ✓ | Decimal formatted |
| Peso neto (kg) | netWeightKg | Net weight | ✓ | Decimal formatted |
| A PAGAR | totalCLP | Total payment in CLP | ✓ | Currency formatted |
| Estado | isSettled | Settlement status | ✗ | Badge (Liquidada/Pendiente) |
| Actions | - | Action buttons | ✗ | Icons (Detail/Print/Delete) |

## Dependencies

### Server Actions
- `getReceptionsGridData` - Fetch paginated grid data
- `getReceptionsExportData` - Fetch data for Excel export
- `getReceptionPrintData` - Fetch data for receipt printing
- `deleteReception` - Delete reception record

### Base Components
- `DataGrid` - Main grid component with sorting/filtering/export
- `Dialog` - Modal dialogs for details and confirmations
- `IconButton` - Action buttons
- `Badge` - Status indicators
- `DeleteBaseForm` - Standardized delete confirmation

### Utilities
- `exportReceptionsToExcel` - Excel export functionality
- `formatAuditDate` - Date/time formatting
- Currency and number formatters (Intl.NumberFormat)

## UI/UX Features

### Responsive Design
- **Mobile-Friendly**: Responsive grid with horizontal scrolling
- **Flexible Layout**: Adaptive column widths and content wrapping
- **Custom Width Management**: MainWidthManager for consistent page widths

### Accessibility
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support for actions
- **Focus Management**: Proper focus handling in modals

### Performance
- **Server-Side Pagination**: Efficient handling of large datasets
- **Lazy Loading**: Detail views loaded on demand
- **Memoized Components**: Optimized re-rendering with React.memo

### User Feedback
- **Loading Indicators**: Progress feedback for async operations
- **Toast Notifications**: Success/error messages via AlertContext
- **Confirmation Dialogs**: Safe deletion with user confirmation

## Business Logic

### Reception States
- **Pending**: Receptions not yet settled (can be deleted)
- **Settled**: Receptions that have been processed for payment (protected from deletion)

### Data Validation
- **Deletion Restrictions**: Only unsettled receptions can be deleted
- **Print Data Validation**: Ensures complete data before printing receipts

### Export Capabilities
- **Filtered Export**: Exports only currently filtered data
- **Excel Format**: Structured spreadsheet with proper formatting
- **Progress Feedback**: User notification during export process

## Maintenance Notes

### URL Parameter Management
- Complex parameter handling for search, sort, filter, pagination
- Automatic redirects for missing required parameters
- State synchronization between URL and component state

### Error Handling
- Comprehensive try-catch blocks for all async operations
- User-friendly error messages with specific context
- Graceful degradation when services are unavailable

### Data Formatting
- Consistent number formatting for weights and currencies
- Localized formatting using Intl APIs
- Special handling for Chilean locale (es-CL)

### Component Architecture
- Separation of concerns between data fetching, display, and actions
- Reusable components with proper prop interfaces
- Custom hooks for complex state management

## Future Enhancements

- Bulk operations (delete multiple receptions)
- Advanced filtering UI (date ranges, producer selection)
- Reception editing capabilities
- Integration with settlement workflows
- Real-time updates via WebSocket
- Advanced reporting and analytics
- Mobile app integration</content>
<parameter name="filePath">/Users/felipe/dev/ElectNextStart/app/home/receptions/receptions/README.md