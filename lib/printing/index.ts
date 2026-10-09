export { EscPosEncoder } from './escpos';
export type { EscPosAlign } from './escpos';

export {
  WebUsbPrinterError,
  isWebUsbSupported,
  listPairedPrinters,
  hasPairedPrinter,
  requestPrinter,
  pairPrinter,
  printRaw,
} from './webUsbPrinter';

export {
  buildReceptionTicketEscPos,
  buildMultipackReceptionTicketEscPos,
  resolveReceptionTicketDate,
  resolveTicketHeaderParties,
} from './receptionTicket';
export type {
  ReceptionTicketSnapshot,
  TicketPack,
  TicketPalletAssignment,
  TicketProducer,
  TicketTotals,
  TicketTrayDevolution,
} from './receptionTicket';

export {
  buildTrayDeliveryTicketEscPos,
  buildTrayDeliverySnapshotFromParts,
  formatTrayTicketDateParts,
  trayDeliveryMovementLabel,
  destinationLines,
} from './trayDeliveryTicket';
export type {
  TrayDeliveryTicketSnapshot,
  TrayDeliveryCounterpartyType,
} from './trayDeliveryTicket';

export { getPrintLogoRaster } from './logo';
export type { EscPosRaster } from './logo';

export {
  aggregatePalletLines,
  applyPrintProfile,
  getDefaultReceptionPrintOptions,
  loadReceptionPrintOptions,
  saveReceptionPrintOptions,
  PRINT_PROFILE_LABELS,
} from './printOptions';
export type {
  AggregatedPalletLine,
  ReceptionPrintOptions,
  ReceptionPrintProfile,
} from './printOptions';
