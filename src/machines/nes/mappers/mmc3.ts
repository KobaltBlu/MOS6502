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
      bank = this.bankData[7] % prgBanks;
    } else if (address < 0xe000) {
      bank = this.prgMode ? this.bankData[6] % prgBanks : secondLast;
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
        this.prgMode = (value & 0x40) !== 0;
        this.chrMode = (value & 0x80) !== 0;
      }
      return;
    }

    if (address < 0xc000) {
      if ((address & 0x0001) === 0) {
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
    let bank: number;

    if (this.chrMode) {
      const banks = [
        this.bankData[2],
        this.bankData[3],
        this.bankData[4],
        this.bankData[5],
        this.bankData[0] & 0xfe,
        this.bankData[0] | 0x01,
        this.bankData[1] & 0xfe,
        this.bankData[1] | 0x01,
      ];
      bank = banks[slot] % chrBanks;
    } else {
      const banks = [
        this.bankData[0] & 0xfe,
        this.bankData[0] | 0x01,
        this.bankData[1] & 0xfe,
        this.bankData[1] | 0x01,
        this.bankData[2],
        this.bankData[3],
        this.bankData[4],
        this.bankData[5],
      ];
      bank = banks[slot] % chrBanks;
    }

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
