import type { IMapper, MapperConfig, MirroringMode } from "./types";

export class CnromMapper implements IMapper {
  readonly id = 3;
  private prgRom: Uint8Array;
  private chrRom: Uint8Array;
  private mirroring: MirroringMode;
  private chrBank = 0;

  constructor(config: MapperConfig) {
    this.prgRom = config.prgRom;
    this.chrRom = config.chrRom;
    this.mirroring = config.mirroring;
  }

  readPrg(address: number): number {
    const offset = address - 0x8000;
    if (this.prgRom.length === 0x4000) {
      return this.prgRom[offset % 0x4000] ?? 0;
    }
    return this.prgRom[offset] ?? 0;
  }

  writePrg(address: number, value: number): void {
    if (address >= 0x8000) {
      this.chrBank = value & 0x03;
    }
  }

  readChr(address: number): number {
    const bankSize = 0x2000;
    const bankCount = Math.max(1, this.chrRom.length / bankSize);
    const bank = this.chrBank % bankCount;
    return this.chrRom[bank * bankSize + (address & 0x1fff)] ?? 0;
  }

  writeChr(_address: number, _value: number): void {}

  getMirroring(): MirroringMode {
    return this.mirroring;
  }

  reset(): void {
    this.chrBank = 0;
  }
}
