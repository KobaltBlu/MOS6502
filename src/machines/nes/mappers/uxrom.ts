import type { IMapper, MapperConfig, MirroringMode } from "./types";

export class UxromMapper implements IMapper {
  readonly id = 2;
  private prgRom: Uint8Array;
  private chrRom: Uint8Array;
  private mirroring: MirroringMode;
  private prgBank = 0;

  constructor(config: MapperConfig) {
    this.prgRom = config.prgRom;
    this.chrRom = config.chrRom;
    this.mirroring = config.mirroring;
  }

  readPrg(address: number): number {
    if (address < 0xc000) {
      const bankSize = 0x4000;
      const bankCount = Math.max(1, this.prgRom.length / bankSize);
      const bank = this.prgBank % bankCount;
      return this.prgRom[bank * bankSize + (address - 0x8000)] ?? 0;
    }
    const fixedOffset = this.prgRom.length - 0x4000;
    return this.prgRom[fixedOffset + (address - 0xc000)] ?? 0;
  }

  writePrg(address: number, value: number): void {
    if (address >= 0x8000) {
      this.prgBank = value & 0x0f;
    }
  }

  readChr(address: number): number {
    return this.chrRom[address & (this.chrRom.length - 1)] ?? 0;
  }

  writeChr(address: number, value: number): void {
    if (this.chrRom.length > 0) {
      this.chrRom[address & (this.chrRom.length - 1)] = value & 0xff;
    }
  }

  getMirroring(): MirroringMode {
    return this.mirroring;
  }

  reset(): void {
    this.prgBank = 0;
  }
}
