export type MirroringMode = "horizontal" | "vertical";

export interface MapperConfig {
  prgRom: Uint8Array;
  chrRom: Uint8Array;
  mirroring: MirroringMode;
}

export interface IMapper {
  readonly id: number;
  readPrg(address: number): number;
  writePrg(address: number, value: number): void;
  readChr(address: number): number;
  writeChr(address: number, value: number): void;
  getMirroring(): MirroringMode;
  reset?(): void;
}
