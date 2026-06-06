import type { IMapper, MapperConfig, MirroringMode } from "./types";

export class NromMapper implements IMapper {
  readonly id = 0;
  private prgRom: Uint8Array;
  private chrRom: Uint8Array;
  private chrRam: boolean;
  private mirroring: MirroringMode;
  private prgSize: number;

  constructor(config: MapperConfig) {
    this.prgRom = config.prgRom;
    this.chrRom = config.chrRom;
    this.chrRam = config.chrRam;
    this.mirroring = config.mirroring;
    this.prgSize = config.prgRom.length;
  }

  readPrg(address: number): number {
    let offset = address - 0x8000;
    if (this.prgSize === 0x4000) {
      offset %= 0x4000;
    } else if (offset >= this.prgSize) {
      return 0;
    }
    return this.prgRom[offset] ?? 0;
  }

  writePrg(_address: number, _value: number): void {}

  readChr(address: number): number {
    if (this.chrRom.length === 0) {
      return 0;
    }
    return this.chrRom[address & (this.chrRom.length - 1)] ?? 0;
  }

  writeChr(address: number, value: number): void {
    if (this.chrRam) {
      this.chrRom[address & (this.chrRom.length - 1)] = value & 0xff;
    }
  }

  getMirroring(): MirroringMode {
    return this.mirroring;
  }
}
