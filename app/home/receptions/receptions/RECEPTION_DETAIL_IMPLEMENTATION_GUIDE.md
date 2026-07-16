# Guía de Implementación · ReceptionDetail

Esta guía resume la estructura de datos generada cuando se registra una recepción (`Transaction` tipo `RECEPTION`) y sugiere cómo modelar un componente `ReceptionDetail` que se renderice en `app/home/receptions/receptions`.

---

## 1. Fuentes de Datos Relevantes

| Recurso | Ubicación | Descripción |
|---------|-----------|-------------|
| `processReception` | `app/actions/receptions.ts` | Construye la transacción principal y rellena la metadata JSON. |
| Entidad `Transaction` | `data/entities/Transaction.ts` | Define los campos persistidos de la recepción (tipo `RECEPTION`). |
| Entidad `ReceptionPack` | `data/entities/ReceptionPack.ts` | Registra cada pack asociado a la recepción. |
| Relaciones y helpers | `tests/helpers/reception-assertions.ts` | Muestra cómo se esperan los vínculos con transacciones hijas y packs. |

La transacción principal queda en `transactions` con `type = RECEPTION`, `direction = OUT`, `unit = CLP`, y `amount = metadata.totalCLPToPay`.

---

## 2. Metadata de la Recepción

El objeto `metadata` almacenado en la transacción contiene:

```json
{
  "producerId": "...",
  "producerName": "...",
  "guideNumber": "...",
  "exchangeRate": 0,
  "totalCLPToPay": 42500,
  "varietyIds": [3],
  "formatIds": [2],
  "trayTypeIds": ["912a..."],
  "packs": [...],
  "trayReturns": [...],
  "totals": {
    "packsCount": 1,
    "traysInPacks": 50,
    "trayReturns": 40,
    "grossWeightKg": 100,
    "netWeightKg": 85,
    "trayWeightKg": 15,
    "payableCLP": 42500,
    "payableUSD": 0,
    "totalCLPToPay": 42500
  },
  "changesHistory": [...]
}
```

### 2.1 `metadata.packs[]`
Campos clave por pack:
- Identificación: `packId`, `packNumber`, `currency`.
- Producto: `varietyId`, `varietyName`, `formatId`, `formatName`.
- Bandeja: `trayId`, `trayLabel`, `traysQuantity`, `unitTrayWeightKg`, `traysTotalWeightKg`.
- Pesos: `grossWeightKg`, `netWeightBeforeImpuritiesKg`, `netWeightKg`, `impurityPercent`.
- Precio: `pricePerKg`, `totalToPay`.
- Pallets: `palletAssignments[]` con `palletId` y `traysAssigned`.

### 2.2 `metadata.trayReturns[]`
Asocia devoluciones de bandeja con transacciones hijas `TRAY_OUT_TO_PRODUCER`:
- `transactionId`, `trayId`, `trayLabel`, `quantityReturned`.

### 2.3 `metadata.changesHistory[]`
- `changedAt`, `changedBy`, `changedByName`, `summary`.
- `details[]`: `field`, `previousValue`, `newValue`.

---

## 3. Relaciones en `transaction_relations`

`processReception` agrega transacciones hijas vinculadas por `TransactionRelationType`:

| Relation Type | Child `Transaction.type` | Uso |
|---------------|--------------------------|-----|
| `TRAY_RECEPTION` | `TRAY_IN_FROM_PRODUCER` | Ingreso de bandejas registradas en la recepción. |
| `TRAY_DEVOLUTION` | `TRAY_OUT_TO_PRODUCER` | Devoluciones (reflejadas también en `metadata.trayReturns`). |
| `PALLET_ASSIGNMENT` | futuro opcional | Para modelar asignaciones por pallet (no existen aún). |

Para consultas, usar `transaction_relations` relacionando `parentTransactionId = receptionId`.

---

## 4. Arquitectura del componente `ReceptionDetail`

### 4.1 Integración con el `ReceptionsGrid`

- Crear un botón `DetailReceptionButton` que viva junto a las acciones del grid.
- Este botón recibe `receptionId` (y datos mínimos para tooltips) y abre el panel de detalle.
- El panel puede renderizarse como `Dialog` de ancho completo o `Sheet` lateral; en ambos casos monta el contenedor `ReceptionDetailLayout` descrito abajo.
- Asegurarse de que el grid refresque o re-hidrate su fila cuando el detalle aplique cambios (usar callbacks opcionales).

### 4.2 Layout base con sidebar

El contenedor (`ReceptionDetailLayout`) debe dividirse en:

1. **Header del componente** (top bar fija) con:
   - Título (`Recepción #ID`), fecha y usuario.
   - Acciones globales: descargar PDF, exportar Excel, cerrar panel.
2. **Sidebar de navegación** (columna izquierda) enumerando las secciones:
   - Resumen
   - Productor & Documentos
   - Indicadores
   - Packs
   - Devoluciones de bandejas
   - Movimientos relacionados
   - Historial de cambios
   - (Opcional) Adjuntos / auditorías
   Cada item del sidebar controla el scroll (via `id` + `scrollIntoView`) o tabs controladas.
3. **Content area** (columna derecha) con renderizado de la sección activa. Mantener padding consistente y permitir scroll independiente.

### 4.3 Estructura sugerida del contenido

- **Resumen Principal**: tarjeta con los datos clave de `Transaction` + totals monetarios.
- **Productor & Documentos asociados**: nombres, guía, variedades/formatos/ tipos de bandeja.
- **Indicadores clave (`metadata.totals`)**: KPIs visuales.
- **Packs recibidos**: tabla y subdetalle de pallets.
- **Devoluciones de bandejas**: tabla compacta + links a transacciones hijas.
- **Movimientos relacionados**: listados por relation type.
- **Historial de cambios**: timeline.
- Se pueden agregar secciones extra (adjuntos, auditorías) reutilizando el mismo patrón.

---

## 5. Flujo de Datos recomendado

1. **Fetch** por `receptionId` desde `receptions.ts` (crear acción server que:
   - Obtenga la transacción `Transaction`.
   - Haga `JSON.parse` de `metadata`.
   - Consulte packs (`ReceptionPack`) con `receptionTransactionId`.
   - Resuelva relaciones (`transaction_relations`) + transacciones hijas.
   - Hidrate productor (`Producer` + `Person`), usuario (`User` + `Person`), temporada (`Season`).
2. **Serialización**: mapear a DTO amigable para el componente y prevenir re-renderizados.
3. **Presentation**: construir `ReceptionDetail` con secciones arriba.

---

## 6. Consideraciones

- La metadata puede crecer; manejar campos opcionales al renderizar.
- Al mostrar transacciones hijas, tener en cuenta que `metadata` en ellas también se almacena como JSON.
- Si se descarga la recepción en PDF (ver `PrintReceptionDialog.tsx`), mantener coherencia visual entre la vista y el documento.

Con esta guía ya puedes planificar el detalle de recepción basándote en los datos reales persistidos por la aplicación.

---

## 7. Organización de carpetas y componentes

```
app/home/receptions/receptions/
   RECEPTION_DETAIL_IMPLEMENTATION_GUIDE.md
   components/
      DetailReceptionButton.tsx
      ReceptionDetail/
         index.ts
         ReceptionDetailLayout.tsx
         Sidebar.tsx
         Header.tsx
         sections/
            SummarySection.tsx
            ProducerSection.tsx
            TotalsSection.tsx
            PacksSection.tsx
            TrayReturnsSection.tsx
            RelatedMovementsSection.tsx
            HistorySection.tsx
            (otros futuros)
         hooks/
            useReceptionDetail.ts (fetch + normalización)
         types.ts (DTOs serializados)
```

- `DetailReceptionButton` obtiene `receptionId` desde la fila del grid y abre el layout.
- `useReceptionDetail` encapsula la carga (acciones server) y provee estado para secciones.
- Cada sección recibe por props los fragmentos de metadata que necesita, evitando re-parsing repetido.
- Mantener estilos compartidos (tarjetas, tablas) en subcarpeta `shared/` si se multiplican.
