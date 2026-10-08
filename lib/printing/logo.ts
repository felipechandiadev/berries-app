/**
 * Loads /logoPrint.png and converts it to a 1-bit ESC/POS raster (browser only).
 */

export interface EscPosRaster {
  widthBytes: number;
  height: number;
  data: Uint8Array;
}

const LOGO_URL = '/logoPrint.png';
/** Max print width in dots (~203 dpi, 80mm ≈ 576). Capsule logo looks good ~200. */
const LOGO_MAX_WIDTH = 200;
const DARK_THRESHOLD = 160;

let cached: EscPosRaster | null = null;
let inflight: Promise<EscPosRaster> | null = null;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar el logo: ${url}`));
    img.src = url;
  });
}

function rasterizeImage(
  img: HTMLImageElement,
  maxWidth: number
): EscPosRaster {
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const targetWidth = Math.max(8, Math.floor(img.naturalWidth * scale));
  const widthBytes = Math.ceil(targetWidth / 8);
  const printWidth = widthBytes * 8;
  const printHeight = Math.max(
    1,
    Math.round((img.naturalHeight * printWidth) / img.naturalWidth)
  );

  const canvas = document.createElement('canvas');
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas no disponible para rasterizar el logo.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, printWidth, printHeight);
  ctx.drawImage(img, 0, 0, printWidth, printHeight);

  const { data: pixels } = ctx.getImageData(0, 0, printWidth, printHeight);
  const data = new Uint8Array(widthBytes * printHeight);

  for (let y = 0; y < printHeight; y++) {
    for (let x = 0; x < printWidth; x++) {
      const i = (y * printWidth + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      if (a < 32) continue;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum >= DARK_THRESHOLD) continue;
      data[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  return { widthBytes, height: printHeight, data };
}

/**
 * Returns a cached monochrome raster of the ticket logo.
 * Safe to call from print handlers (browser only).
 */
export async function getPrintLogoRaster(): Promise<EscPosRaster> {
  if (typeof window === 'undefined') {
    throw new Error('El logo de ticket solo está disponible en el navegador.');
  }
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const img = await loadImage(LOGO_URL);
    cached = rasterizeImage(img, LOGO_MAX_WIDTH);
    return cached;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
