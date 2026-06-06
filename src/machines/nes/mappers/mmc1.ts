import type { IMapper, MapperConfig, MirroringMode } from "./types";

export class Mmc1Mapper implements IMapper {
  readonly id = 1;
  private prgRom: Uint8Array;
  private chrRom: Uint8Array;
  private chrRam: boolean;
  private defaultMirroring: MirroringMode;

  private shiftRegister = 0x10;
  private control = 0x0c;
  private chrBank0 = 0;
  private chrBank1 = 0;
  private prgBank = 0;

  constructor(config: MapperConfig) {
    this.prgRom = config.prgRom;
    this.chrRom = config.chrRom;
    this.chrRam = config.chrRam;
    this.defaultMirroring = config.mirroring;
  }

  private writeRegister(address: number, value: number): void {
    if (value & 0x80) {
      this.shiftRegister = 0x10;
      this.control |= 0x0c;
      return;
    }

    this.shiftRegister = ((this.shiftRegister >> 1) | ((value & 1) << 4)) & 0x1f;
    if (this.shiftRegister & 1) {
      return;
    }

    const reg = (address >> 13) & 0x03;
    const data = this.shiftRegister >> 1;
    this.shiftRegister = 0x10;

    switch (reg) {
      case 0:
        this.control = data & 0x1f;
        break;
      case 1:
        this.chrBank0 = data;
        break;
      case 2:
        this.chrBank1 = data;
        break;
      case 3:
        this.prgBank = data & 0x0f;
        break;
    }
  }

  readPrg(address: number): number {
    const mode = (this.control >> 2) & 3;
    const bankSize = 0x4000;
    const prgBanks = Math.max(1, this.prgRom.length / bankSize);

    if (mode <= 1) {
      const bank = (this.prgBank & ~1) % prgBanks;
      const offset = address - 0x8000;
      return this.prgRom[bank * bankSize + (offset % (bankSize * 2))] ?? 0;
    }

    if (address < 0xc000) {
      const bank = mode === 2 ? 0 : this.prgBank % prgBanks;
      return this.prgRom[bank * bankSize + (address - 0x8000)] ?? 0;
    }

    const bank = mode === 2 ? this.prgBank % prgBanks : prgBanks - 1;
    return this.prgRom[bank * bankSize + (address - 0xc000)] ?? 0;
  }

  writePrg(address: number, value: number): void {
    if (address >= 0x8000) {
      this.writeRegister(address, value);
    }
  }

  readChr(address: number): number {
    const chrMode = (this.control >> 4) & 1;
    const bankSize = chrMode ? 0x1000 : 0x2000;
    const chrBanks = Math.max(1, this.chrRom.length / bankSize);

    if (chrMode) {
      const bank =
        address < 0x1000
          ? this.chrBank0 % chrBanks
          : this.chrBank1 % chrBanks;
      return this.chrRom[bank * bankSize + (address & 0x0fff)] ?? 0;
    }

    const bank = (this.chrBank0 & ~1) % chrBanks;
    return this.chrRom[bank * bankSize + (address & 0x1fff)] ?? 0;
  }

  writeChr(address: number, value: number): void {
    if (this.chrRam) {
      this.chrRom[address & (this.chrRom.length - 1)] = value & 0xff;
    }
  }

  getMirroring(): MirroringMode {
    switch (this.control & 0x03) {
      case 0:
        return "vertical";
      case 1:
        return "horizontal";
      case 2:
        return "vertical";
      case 3:
        return "horizontal";
      default:
        return this.defaultMirroring;
    }
  }

  reset(): void {
    this.shiftRegister = 0x10;
    this.control = 0x0c;
    this.chrBank0 = 0;
    this.chrBank1 = 0;
    this.prgBank = 0;
  }
}
