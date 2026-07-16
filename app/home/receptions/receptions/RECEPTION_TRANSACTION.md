# Recepcion Transaccion

## Flujo general
- `processReception` (en `app/actions/receptions.ts`) inicia la transaccion con `TransactionType.RECEPTION`, `TransactionDirection.OUT` y unidad CLP.
- Se resuelven: usuario operador, temporada activa y productor.
- Se normaliza el tipo de cambio (`exchangeRate`) y los totales recibidos desde el formulario (`input.totals`).
- Se crea el registro `transactions` principal con el monto total en CLP (`totalCLPToPay`).

## Packs
- Cada pack del formulario se persiste en `reception_packs`.
- Se validan variedad y formato.
- Se registran cantidades, pesos, moneda (`Currency.CLP` o `Currency.USD`) y total a pagar del pack.
- Se crean relaciones `transaction_relations` con el tipo `RECEPTION_PACK`.

## Asignaciones a pallets
- Para cada pack se consolidan asignaciones a pallets (`PalletTrayAssignment`).
- Se actualiza el estado del pallet (`AVAILABLE`, `FULL`, etc.).
- Se registran transacciones adicionales `TransactionType.PALLET_TRAY_ASSIGNMENT` y relaciones `transaction_relations` con tipo `PALLET_ASSIGNMENT`.

## Devolucion de bandejas
- Se agrupan devoluciones en `trayReceptionAggregates`.
- Para cada agrupacion se crea `TransactionType.TRAY_RETURN` y su relacion `transaction_relations` (`TRAY_RETURN`).

## Metadata guardada en `transactions.metadata`
```json
{
  "producerId": string | null,
  "producerName": string | null,
  "guideNumber": string | null,
  "varietyIds": number[],
  "formatIds": number[],
  "trayTypeIds": string[],
  "packs": [
    {
      "packId": number,
      "packNumber": number,
      "varietyId": number,
      "varietyName": string,
      "formatId": number,
      "formatName": string,
      "trayId": string | null,
      "trayLabel": string | null,
      "traysQuantity": number,
      "unitTrayWeightKg": number,
      "traysTotalWeightKg": number,
      "grossWeightKg": number,
      "netWeightBeforeImpuritiesKg": number,
      "netWeightKg": number,
      "impurityPercent": number,
      "currency": "CLP" | "USD",
      "pricePerKg": number,
      "totalToPay": number,
      "palletAssignments": [
        { "palletId": number, "traysAssigned": number }
      ]
    }
  ],
  "trayReturns": [
    {
      "transactionId": string,
      "trayId": string | null,
      "trayLabel": string | null,
      "quantityReturned": number
    }
  ],
  "totals": {
    "packsCount": number,
    "traysInPacks": number,
    "trayReturns": number,
    "grossWeightKg": number,
    "netWeightKg": number,
    "trayWeightKg": number,
    "payableCLP": number,
    "payableUSD": number,
    "totalCLPToPay": number
  },
  "exchangeRate": number,
  "totalCLPToPay": number,
  "changesHistory": [
    {
      "changedAt": string,
      "changedBy": string,
      "changedByName": string,
      "summary": string,
      "details": [
        { "field": string, "previousValue": any, "newValue": any }
      ]
    }
  ]
}
```

### Significado de `totals`
- `packsCount`: cantidad total de packs registrados en la recepcion.
- `traysInPacks`: suma de las bandejas contenidas en todos los packs.
- `trayReturns`: cantidad total de bandejas devueltas en la recepcion.
- `grossWeightKg`: peso bruto acumulado (antes de descuentos) de todos los packs.
- `netWeightKg`: peso neto acumulado (despues de descuentos/impurezas) de todos los packs.
- `trayWeightKg`: peso total asociado a las bandejas (suma de `traysTotalWeightKg`).
- `payableCLP`: monto a pagar en pesos chilenos por los packs con moneda CLP.
- `payableUSD`: monto a pagar en dolares por los packs con moneda USD.
- `totalCLPToPay`: total final a pagar en CLP, calculado como `payableCLP + payableUSD * exchangeRate`.

## Totales claves
- `totals.payableCLP`: suma de `totalToPay` de packs en CLP.
- `totals.payableUSD`: suma de `totalToPay` de packs en USD.
- `exchangeRate`: tipo de cambio aplicado al momento de procesar.
- `totals.totalCLPToPay`: `payableCLP + (payableUSD * exchangeRate)`.
- El valor se replica en `metadata.totalCLPToPay` y en el campo principal `transactions.amount`.

## Consideraciones
- El flujo es transaccional (`db.transaction`): si algo falla se revierte todo.
- Los números se normalizan mediante `normalizeNumber` para tolerar strings.
- Si no llega `totals.totalCLPToPay`, se recalcula a partir de CLP/ USD y `exchangeRate` para mantener la consistencia.
- `changesHistory` inicializa una entrada para auditoría interna; futuras actualizaciones pueden anexar eventos.
- En el grid de recepciones se proyectan `payableCLP`, `payableUSD`, `exchangeRate` y `totalCLPToPay` desde este metadata.
