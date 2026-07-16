# New Reception Module

## Overview
The New Reception module provides a comprehensive interface for creating and processing fruit/product receptions from producers. It handles the complete workflow from data entry to processing and receipt generation.

## Structure
```
app/home/receptions/newRecepcion/
├── page.jsx                    # Main page component
└── ui/
    ├── TransactionData.tsx     # Main form component
    ├── DetailReceptionCard.tsx # Individual pack details
    ├── ProcessedReceptionDialog.tsx # Confirmation and save dialog
    ├── PrintReceptionDialog.tsx     # Print receipt dialog
    ├── TrayDevolutionContainer.tsx  # Tray return management
    ├── DetailsContainer.tsx         # Additional details container
    ├── PalletPicker.tsx             # Pallet assignment (temporarily hidden)
    └── detailCardComponents/       # Sub-components for pack details
        ├── VarietySelector.tsx
        ├── TraySelector.tsx
        ├── FormatSelector.tsx
        ├── TraysQuantityStepper.tsx
        ├── GrossWeightInput.tsx
        ├── ImpurityPercent.tsx
        └── TrayDevolutionCard.tsx
```

## Key Components

### TransactionData
- **Purpose**: Main form component managing the reception data entry
- **Features**:
  - Producer selection via AutoComplete
  - Guide number input
  - Driver name input
  - Dynamic pack management (add/remove packs)
  - Tray devolution handling
  - Real-time totals calculation
  - URL parameter synchronization

### DetailReceptionCard
- **Purpose**: Individual pack configuration component
- **Features**:
  - Variety selection with price and currency
  - Tray type selection with weight calculation
  - Quantity stepper for trays
  - Gross weight input
  - Impurity percentage handling
  - Automatic net weight and payment calculation
  - Real-time display of net weight and total to pay

### ProcessedReceptionDialog
- **Purpose**: Confirmation dialog showing reception summary before saving
- **Features**:
  - Comprehensive reception overview (producer, guide, varieties, weights, payments)
  - Tray devolution summary
  - Validation and error handling
  - Save functionality calling `processReception` action

### PrintReceptionDialog
- **Purpose**: Receipt printing interface
- **Features**:
  - Formatted receipt layout optimized for 70mm thermal printers
  - Producer information display
  - Reception summary with all relevant data
  - Tray devolution details
  - Timestamp and transaction ID

### TrayDevolutionContainer
- **Purpose**: Management of trays returned to producers
- **Features**:
  - Dynamic addition/removal of tray devolution items
  - Tray type selection
  - Quantity input
  - Real-time total calculation

## Functionalities

### Data Entry
- **Producer Selection**: Dropdown with producer list fetched from `getProducersSimpleListWithLabel`
- **Guide & Driver**: Text inputs with URL parameter synchronization
- **Pack Management**: Add multiple packs with detailed specifications
- **Weight Calculations**: Automatic calculation of net weight considering tray weights and impurities
- **Payment Calculation**: Based on variety price, currency, and net weight

### Processing
- **Validation**: Ensures producer selected, at least one pack, and all packs have net weight > 0
- **Data Aggregation**: Combines all pack data, tray devolutions, and totals
- **Save Operation**: Calls `processReception` server action to persist the reception

### Receipt Generation
- **Print Formatting**: Optimized for thermal receipt printers
- **Comprehensive Summary**: All reception details in compact format
- **Producer Receipt**: Serves as official documentation for producers

## Dependencies

### Server Actions
- `getProducersSimpleListWithLabel` - Producer list for selection
- `getVarietiesWithPriceAndCurrency` - Variety data with pricing
- `getFormatsSimpleList` - Format options (currently commented out)
- `getTraysSimpleList` - Tray types for selection
- `processReception` - Save reception data

### Base Components
- `AutoComplete` - Producer selection
- `TextField` - Guide and driver inputs
- `Button` - Process and print actions
- `Dialog` - Confirmation dialogs
- `DialogToPrint` - Print receipt dialog

### Utilities
- Currency enum from `@/data/entities/Variety`
- Date/time formatting utilities

## Data Flow

1. **Initialization**: Load producers, varieties, formats, and trays
2. **Data Entry**: User fills producer, guide, driver, and pack details
3. **Real-time Calculation**: Net weights and payments calculated as data changes
4. **Validation**: Check requirements before processing
5. **Confirmation**: Show summary in ProcessedReceptionDialog
6. **Save**: Persist reception via server action
7. **Print**: Generate and display receipt for printing

## UI/UX Features

- **Responsive Design**: Adapts to different screen sizes
- **Real-time Updates**: Calculations update immediately as inputs change
- **URL Synchronization**: Form data reflected in URL parameters
- **Validation Feedback**: Clear error messages for missing requirements
- **Progressive Disclosure**: Complex calculations hidden behind simple inputs
- **Print Optimization**: Receipt formatted for standard thermal printers

## Maintenance Notes

- **Currency Handling**: Supports both CLP and USD with exchange rate consideration
- **Weight Calculations**: Complex logic for net weight (gross - tray weight - impurities)
- **State Management**: Uses React hooks for local state, callbacks for parent communication
- **Error Handling**: Comprehensive error catching in save operations
- **Performance**: Memoized calculations to prevent unnecessary re-renders
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Future Enhancements

- Pallet assignment functionality (currently hidden)
- Format selection (currently commented out)
- Enhanced validation rules
- Batch processing capabilities
- Integration with weighing scales
- Mobile-optimized interface</content>
<parameter name="filePath">/Users/felipe/dev/ElectNextStart/app/home/receptions/newRecepcion/README.md