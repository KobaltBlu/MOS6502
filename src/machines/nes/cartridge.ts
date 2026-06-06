import type { MemoryDevice } from "../../memory/types";
import {
  hashPrg,
  nesLog,
  setLastLoadSummary,
  type NesLoadSummary,
} from "../../platform/nes-debug-log";
import {
  isNrom256Profile,
  parseInesHeader,
  sliceInesPayload,
  type ParsedInesHeader,
} from "./ines-parser";
import { createMapper, isSupportedMapper } from "./mappers";
import type { IMapper, MirroringMode } from "./mappers";
import Memory from "../../memory/memory";

const PRG_RAM_SIZE = 0x2000;

export class INESParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "INESParseError";
  }
}

function toMapperMirroring(header: ParsedInesHeader): MirroringMode {
  if (header.mirroring === "four-screen") {
    return "horizontal";
  }
  return header.mirroring;
}

export class Cartridge implements MemoryDevice {
  prgRom: Uint8Array = new Uint8Array(0);
  chrRom: Uint8Array = new Uint8Array(0);
  mapperId: number = 0;
  mirroring: MirroringMode = "horizontal";
  inesFormat: ParsedInesHeader["format"] = "ines";
  hasBattery = false;
  prgRam: Memory;

  private mapper: IMapper | null = null;

  constructor() {
    this.prgRam = new Memory(PRG_RAM_SIZE);
    this.prgRam.baseAddress = 0x6000;
  }

  loadINES(buffer: Uint8Array): void {
    let header: ParsedInesHeader;
    try {
      header = parseInesHeader(buffer);
    } catch (error) {
      throw new INESParseError(String(error));
    }

    this.mapperId = header.mapperId;
    this.inesFormat = header.format;
    this.hasBattery = header.hasBattery;
    this.mirroring = toMapperMirroring(header);

    if (!isSupportedMapper(this.mapperId)) {
      throw new INESParseError(`Unsupported mapper ${this.mapperId}`);
    }

    const { prgRom, chrRom } = sliceInesPayload(buffer, header);
    this.prgRom = prgRom;
    this.chrRom = chrRom;
    this.prgRam = new Memory(PRG_RAM_SIZE);
    this.prgRam.baseAddress = 0x6000;

    this.mapper = createMapper(this.mapperId, {
      prgRom: this.prgRom,
      chrRom: this.chrRom,
      mirroring: this.mirroring,
    });

    const resetVector =
      this.readByte(0xfffc) | (this.readByte(0xfffd) << 8);
    const summary: NesLoadSummary = {
      fileSize: buffer.length,
      mapperId: this.mapperId,
      prgSize: header.prgSize,
      chrSize: header.chrSize,
      mirroring: this.mirroring,
      resetVector,
      prgCrc: hashPrg(this.prgRom),
      inesFormat: header.format,
      nrom256: isNrom256Profile(header),
      hasTrainer: header.hasTrainer,
      hasBattery: header.hasBattery,
    };
    setLastLoadSummary(summary);
    nesLog("cartridge", "iNES parsed", { ...summary });
  }

  getLoadSummary(): NesLoadSummary | null {
    if (this.prgRom.length === 0) {
      return null;
    }
    return {
      fileSize: 16 + this.prgRom.length + this.chrRom.length,
      mapperId: this.mapperId,
      prgSize: this.prgRom.length,
      chrSize: this.chrRom.length,
      mirroring: this.mirroring,
      resetVector: this.readByte(0xfffc) | (this.readByte(0xfffd) << 8),
      prgCrc: hashPrg(this.prgRom),
      inesFormat: this.inesFormat,
      nrom256: this.prgRom.length === 0x8000 && this.chrRom.length === 0x2000 && this.mapperId === 0,
    };
  }

  getMapper(): IMapper | null {
    return this.mapper;
  }

  getMirroring(): MirroringMode {
    return this.mapper?.getMirroring() ?? this.mirroring;
  }

  readChr(address: number): number {
    return this.mapper?.readChr(address & 0x1fff) ?? 0;
  }

  writeChr(address: number, value: number): void {
    this.mapper?.writeChr(address & 0x1fff, value);
  }

  readByte(address: number): number {
    if (address >= 0x6000 && address < 0x8000) {
      return this.prgRam.readByte(address);
    }

    if (address < 0x8000) {
      return 0;
    }

    return this.mapper?.readPrg(address) ?? 0;
  }

  writeByte(address: number, value: number): void {
    if (address >= 0x6000 && address < 0x8000) {
      this.prgRam.writeByte(address, value);
      return;
    }

    if (address >= 0x8000) {
      this.mapper?.writePrg(address, value);
    }
  }

  readShortLE(address: number): number {
    return this.readByte(address) | (this.readByte(address + 1) << 8);
  }

  writeShortLE(address: number, value: number): void {
    this.writeByte(address, value & 0xff);
    this.writeByte(address + 1, (value >> 8) & 0xff);
  }

  reset(): void {
    this.mapper?.reset?.();
    this.prgRam.bytes.fill(0);
  }
}
