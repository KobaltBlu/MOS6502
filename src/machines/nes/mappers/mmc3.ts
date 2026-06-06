import type { IMapper, MapperConfig, MirroringMode } from "./types";

export class Mmc3Mapper implements IMapper {
  readonly id = 4;
  private prgRom: Uint8Array;
  private chrRom: Uint8Array;
  private defaultMirroring: MirroringMode;

  private bankSelect = 0;
  private bankData = new Uint8Array(8);
  private mirroring: MirroringMode;
  private prgMode = false;
  private chrMode = false;

  constructor(config: MapperConfig) {
    this.prgRom = config.prgRom;
    this.chrRom = config.chrRom;
    this.defaultMirroring = config.mirroring;
    this.mirroring = config.mirroring;
  }

  readPrg(address: number): number {
    const bankSize = 0x2000;
    const prgBanks = Math.max(1, this.prgRom.length / bankSize);
    const lastBank = prgBanks - 1;
    const secondLast = Math.max(0, lastBank - 1);

    let bank: number;
    if (address < 0xa000) {
      bank = this.prgMode ? secondLast : this.bankData[6] % prgBanks;
    } else if (address < 0xc000) {
      bank = this.prgMode ? this.bankData[6] % prgBanks : secondLast;
    } else if (address < 0xe000) {
      bank = this.bankData[7] % prgBanks;
    } else {
      bank = lastBank;
    }

    return this.prgRom[bank * bankSize + (address & 0x1fff)] ?? 0;
  }

  writePrg(address: number, value: number): void {
    if (address < 0x8000) {
      return;
    }

    if (address < 0xa000) {
      if (address & 0x0001) {
        this.bankData[this.bankSelect & 0x07] = value;
      } else {
        this.bankSelect = value;
      }
      return;
    }

    if (address < 0xc000) {
      if (address & 0x0001) {
        this.prgMode = (value & 0x40) !== 0;
        this.chrMode = (value & 0x80) !== 0;
      } else {
        this.mirroring = value & 0x01 ? "horizontal" : "vertical";
      }
      return;
    }

    // IRQ registers stubbed — no CPU IRQ yet
  }

  readChr(address: number): number {
    const bankSize = 0x0400;
    const chrBanks = Math.max(1, this.chrRom.length / bankSize);
    const slot = (address >> 10) & 0x07;
    let bankIndex: number;

    if (this.chrMode) {
      const map = [0, 2, 4, 5, 6, 7, 0, 1];
      bankIndex = map[slot];
    } else {
      const map = [0, 1, 2, 3, 4, 5, 6, 7];
      bankIndex = map[slot];
    }

    const bank = this.bankData[bankIndex] % chrBanks;
    return this.chrRom[bank * bankSize + (address & 0x03ff)] ?? 0;
  }

  writeChr(_address: number, _value: number): void {}

  getMirroring(): MirroringMode {
    return this.mirroring;
  }

  reset(): void {
    this.bankSelect = 0;
    this.bankData.fill(0);
    this.mirroring = this.defaultMirroring;
    this.prgMode = false;
    this.chrMode = false;
  }
}
