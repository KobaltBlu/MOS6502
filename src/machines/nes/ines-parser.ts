export type InesFormat = "archaic" | "ines" | "nes2.0";

export type MirroringMode = "horizontal" | "vertical" | "four-screen";

export interface ParsedInesHeader {
  format: InesFormat;
  mapperId: number;
  prgUnits: number;
  chrUnits: number;
  mirroring: MirroringMode;
  hasTrainer: boolean;
  hasBattery: boolean;
  headerSize: number;
  prgSize: number;
  chrSize: number;
}

const INES_MAGIC = 0x1a53454e;

export function parseInesHeader(buffer: Uint8Array): ParsedInesHeader {
  if (buffer.length < 16) {
    throw new Error("iNES file too small");
  }

  const magic =
    buffer[0] | (buffer[1] << 8) | (buffer[2] << 16) | (buffer[3] << 24);
  if (magic !== INES_MAGIC) {
    throw new Error("Invalid iNES magic bytes");
  }

  const prgUnits = buffer[4];
  const chrUnits = buffer[5];
  const flags6 = buffer[6];
  const flags7 = buffer[7];

  const format = detectInesFormat(flags7);
  const mapperId = decodeMapperId(flags6, flags7, buffer, format);
  const hasTrainer = (flags6 & 0x04) !== 0;
  const hasBattery = (flags6 & 0x02) !== 0;
  const mirroring = decodeMirroring(flags6, flags7, format);

  const prgSize = prgUnits * 0x4000;
  const chrSize = chrUnits * 0x2000;
  const headerSize = 16 + (hasTrainer ? 512 : 0);

  return {
    format,
    mapperId,
    prgUnits,
    chrUnits,
    mirroring,
    hasTrainer,
    hasBattery,
    headerSize,
    prgSize,
    chrSize,
  };
}

function detectInesFormat(flags7: number): InesFormat {
  if ((flags7 & 0x0c) === 0x08) {
    return "nes2.0";
  }
  if ((flags7 & 0xf0) === 0 && (flags7 & 0x0c) === 0) {
    return "archaic";
  }
  return "ines";
}

function decodeMapperId(
  flags6: number,
  flags7: number,
  buffer: Uint8Array,
  format: InesFormat
): number {
  let mapper = (flags7 & 0xf0) | (flags6 >> 4);
  if (format === "nes2.0" && buffer.length >= 16) {
    mapper |= (buffer[8] & 0x0f) << 8;
  }
  return mapper;
}

function decodeMirroring(
  flags6: number,
  flags7: number,
  format: InesFormat
): MirroringMode {
  if (format !== "archaic" && (flags6 & 0x08) !== 0) {
    return "four-screen";
  }
  return flags6 & 0x01 ? "vertical" : "horizontal";
}

export function sliceInesPayload(
  buffer: Uint8Array,
  header: ParsedInesHeader
): { prgRom: Uint8Array; chrRom: Uint8Array } {
  const { headerSize, prgSize, chrSize } = header;
  if (buffer.length < headerSize + prgSize + chrSize) {
    throw new Error("iNES file truncated");
  }

  const prgRom = buffer.slice(headerSize, headerSize + prgSize);
  const chrRom = buffer.slice(headerSize + prgSize, headerSize + prgSize + chrSize);
  return { prgRom, chrRom };
}

/** Known NROM-256 (32KB PRG + 8KB CHR) profile used by Super Mario Bros. and similar boards. */
export function isNrom256Profile(header: ParsedInesHeader): boolean {
  return (
    header.mapperId === 0 &&
    header.prgUnits === 2 &&
    header.chrUnits === 1 &&
    !header.hasTrainer
  );
}

export { INES_MAGIC };
