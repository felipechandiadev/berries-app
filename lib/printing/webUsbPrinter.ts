/**
 * WebUSB transport for ESC/POS thermal ticket printers.
 * Requires Chrome/Edge on HTTPS or localhost and a user gesture to pair.
 */

export class WebUsbPrinterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebUsbPrinterError';
  }
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb);
}

function getUsb(): USB {
  if (!isWebUsbSupported()) {
    throw new WebUsbPrinterError(
      'WebUSB no está disponible. Usa Chrome o Edge en HTTPS o localhost.'
    );
  }
  return navigator.usb;
}

/** Prefer printer-class devices; empty filters still lets the user pick any USB device. */
const DEVICE_FILTERS: USBDeviceFilter[] = [
  { classCode: 7 }, // Printer class
];

export async function listPairedPrinters(): Promise<USBDevice[]> {
  const usb = getUsb();
  const devices = await usb.getDevices();
  return devices;
}

export async function hasPairedPrinter(): Promise<boolean> {
  if (!isWebUsbSupported()) return false;
  const devices = await listPairedPrinters();
  return devices.length > 0;
}

/**
 * Opens the browser device chooser. Must be called from a user gesture (click).
 */
export async function requestPrinter(): Promise<USBDevice> {
  const usb = getUsb();
  try {
    const device = await usb.requestDevice({ filters: DEVICE_FILTERS });
    return device;
  } catch (error: any) {
    if (error?.name === 'NotFoundError') {
      throw new WebUsbPrinterError('No se seleccionó ninguna impresora.');
    }
    throw new WebUsbPrinterError(
      error?.message || 'No fue posible emparejar la impresora USB.'
    );
  }
}

async function resolveDevice(preferRequestIfEmpty = false): Promise<USBDevice> {
  const paired = await listPairedPrinters();
  if (paired.length > 0) {
    return paired[0];
  }
  if (preferRequestIfEmpty) {
    return requestPrinter();
  }
  throw new WebUsbPrinterError(
    'No hay impresora emparejada. Emparejala desde el botón Impresora en la barra superior.'
  );
}

interface OutEndpoint {
  device: USBDevice;
  endpointNumber: number;
  interfaceNumber: number;
}

async function openOutEndpoint(device: USBDevice): Promise<OutEndpoint> {
  try {
    if (!device.opened) {
      await device.open();
    }

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const configuration = device.configuration;
    if (!configuration) {
      throw new WebUsbPrinterError('La impresora no expone una configuración USB válida.');
    }

    let interfaceNumber = -1;
    let endpointNumber = -1;

    for (const iface of configuration.interfaces) {
      for (const alt of iface.alternates) {
        const out = alt.endpoints.find(
          (ep) => ep.direction === 'out' && ep.type === 'bulk'
        );
        if (out) {
          interfaceNumber = iface.interfaceNumber;
          endpointNumber = out.endpointNumber;
          break;
        }
      }
      if (endpointNumber >= 0) break;
    }

    if (interfaceNumber < 0 || endpointNumber < 0) {
      throw new WebUsbPrinterError(
        'No se encontró un endpoint USB de salida en la impresora.'
      );
    }

    const iface = configuration.interfaces.find(
      (i) => i.interfaceNumber === interfaceNumber
    );
    if (iface && !iface.claimed) {
      await device.claimInterface(interfaceNumber);
    }

    return { device, endpointNumber, interfaceNumber };
  } catch (error: any) {
    if (error instanceof WebUsbPrinterError) throw error;
    const message = String(error?.message || error);
    if (/claim|Access|Security/i.test(message)) {
      throw new WebUsbPrinterError(
        'No se pudo reclamar la interfaz USB. En Windows puede hacer falta WinUSB (Zadig); en macOS quita la impresora de “Impresoras y escáneres”.'
      );
    }
    throw new WebUsbPrinterError(message || 'Error abriendo la impresora USB.');
  }
}

const CHUNK_SIZE = 64;

/**
 * Sends raw ESC/POS bytes to a paired (or newly requested) USB printer.
 */
export async function printRaw(
  data: Uint8Array,
  options?: { requestIfMissing?: boolean }
): Promise<void> {
  if (!data || data.length === 0) {
    throw new WebUsbPrinterError('No hay datos para imprimir.');
  }

  const device = await resolveDevice(Boolean(options?.requestIfMissing));
  const { endpointNumber } = await openOutEndpoint(device);

  try {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.subarray(offset, offset + CHUNK_SIZE);
      // Copy into a fresh ArrayBuffer so transferOut accepts BufferSource typings.
      const payload = new Uint8Array(chunk);
      const result = await device.transferOut(endpointNumber, payload);
      if (result.status !== 'ok') {
        throw new WebUsbPrinterError(
          `Fallo al enviar datos a la impresora (status: ${result.status}).`
        );
      }
    }
  } catch (error: any) {
    if (error instanceof WebUsbPrinterError) throw error;
    throw new WebUsbPrinterError(
      error?.message || 'Error enviando el ticket a la impresora.'
    );
  }
}

export async function pairPrinter(): Promise<USBDevice> {
  return requestPrinter();
}
