import type { IMapper, MapperConfig } from "./types";
import { NromMapper } from "./nrom";
import { Mmc1Mapper } from "./mmc1";
import { UxromMapper } from "./uxrom";
import { CnromMapper } from "./cnrom";
import { Mmc3Mapper } from "./mmc3";

const SUPPORTED_MAPPERS = new Set([0, 1, 2, 3, 4]);

export function isSupportedMapper(id: number): boolean {
  return SUPPORTED_MAPPERS.has(id);
}

export function createMapper(id: number, config: MapperConfig): IMapper {
  switch (id) {
    case 0:
      return new NromMapper(config);
    case 1:
      return new Mmc1Mapper(config);
    case 2:
      return new UxromMapper(config);
    case 3:
      return new CnromMapper(config);
    case 4:
      return new Mmc3Mapper(config);
    default:
      throw new Error(`Unsupported mapper ${id}`);
  }
}

export type { IMapper, MapperConfig, MirroringMode } from "./types";
