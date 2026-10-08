/**
 * Minimal ESC/POS encoder for 80mm thermal printers (≈42 chars/line).
 * Uses CP850 for Spanish accents without external deps.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** CP850 mapping for common Spanish characters (Unicode → byte). */
const CP850_MAP: Record<string, number> = {
  '\u00C1': 0xb5, // Á
  '\u00C0': 0xb7, // À
  '\u00E1': 0xa0, // á
  '\u00E0': 0x85, // à
  '\u00C9': 0x90, // É
  '\u00E9': 0x82, // é
  '\u00CD': 0xd6, // Í
  '\u00ED': 0xa1, // í
  '\u00D3': 0xe0, // Ó
  '\u00F3': 0xa2, // ó
  '\u00DA': 0xe9, // Ú
  '\u00FA': 0xa3, // ú
  '\u00DC': 0x9a, // Ü
  '\u00FC': 0x81, // ü
  '\u00D1': 0xa5, // Ñ
  '\u00F1': 0xa4, // ñ
  '\u00BF': 0xa8, // ¿
  '\u00A1': 0xad, // ¡
  '\u00BA': 0xa7, // º
  '\u00AA': 0xa6, // ª
  '\u00B0': 0xf8, // °
};

export type EscPosAlign = 'left' | 'center' | 'right';

export class EscPosEncoder {
  private chunks: number[] = [];
  private readonly lineWidth: number;

  constructor(lineWidth = 42) {
    this.lineWidth = lineWidth;
  }

  init(): this {
    this.chunks.push(ESC, 0x40); // ESC @
    // Select code page CP850 (ESC t 2 on many Epson-compatibles)
    this.chunks.push(ESC, 0x74, 0x02);
    return this;
  }

  align(value: EscPosAlign): this {
    const n = value === 'center' ? 1 : value === 'right' ? 2 : 0;
    this.chunks.push(ESC, 0x61, n);
    return this;
  }

  bold(on: boolean): this {
    this.chunks.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  size(widthMultiplier: 1 | 2, heightMultiplier: 1 | 2): this {
    const n = ((widthMultiplier - 1) << 4) | (heightMultiplier - 1);
    this.chunks.push(GS, 0x21, n);
    return this;
  }

  text(value: string): this {
    const encoded = encodeCp850(value);
    for (let i = 0; i < encoded.length; i++) {
      this.chunks.push(encoded[i]);
    }
    return this;
  }

  line(value = ''): this {
    this.text(value);
    this.chunks.push(LF);
    return this;
  }

  /** Key/value row truncated to line width. */
  kv(label: string, value: string): this {
    const left = String(label ?? '');
    const right = String(value ?? '');
    const gap = Math.max(1, this.lineWidth - left.length - right.length);
    return this.line(`${left}${' '.repeat(gap)}${right}`.slice(0, this.lineWidth));
  }

  separator(char = '-'): this {
    return this.line(char.repeat(this.lineWidth));
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.chunks.push(LF);
    }
    return this;
  }

  /**
   * Print a monochrome raster via GS v 0 (normal density).
   * `widthBytes` = ceil(pixelWidth / 8); `data` length must be widthBytes * height.
   */
  raster(
    widthBytes: number,
    height: number,
    data: Uint8Array,
    mode: 0 | 1 | 2 | 3 = 0
  ): this {
    if (widthBytes <= 0 || height <= 0 || data.length < widthBytes * height) {
      return this;
    }
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;
    this.chunks.push(GS, 0x76, 0x30, mode, xL, xH, yL, yH);
    for (let i = 0; i < widthBytes * height; i++) {
      this.chunks.push(data[i]);
    }
    return this;
  }

  /** Partial cut (GS V 1). */
  cut(): this {
    this.feed(3);
    this.chunks.push(GS, 0x56, 0x01);
    return this;
  }

  encode(): Uint8Array {
    return new Uint8Array(this.chunks);
  }
}

function encodeCp850(input: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
      continue;
    }
    const mapped = CP850_MAP[char];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    // Fallback: strip combining / replace with ASCII approximation
    bytes.push(0x3f); // ?
  }
  return new Uint8Array(bytes);
}
