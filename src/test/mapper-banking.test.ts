import { describe, expect, it } from "vitest";
import { createMapper } from "../machines/nes/mappers/index";

function mapperConfig(prgRom: Uint8Array, chrRom: Uint8Array) {
  return { prgRom, chrRom, mirroring: "horizontal" as const };
}

describe("mapper banking", () => {
  it("UxROM switches PRG at $8000", () => {
    const prg = new Uint8Array(0x8000);
    prg.fill(0x11);
    prg[0x4000] = 0xaa;
    prg[0x4001] = 0xbb;
    const mapper = createMapper(2, mapperConfig(prg, new Uint8Array(0x2000)));
    expect(mapper.readPrg(0x8000)).toBe(0x11);
    mapper.writePrg(0x8000, 1);
    expect(mapper.readPrg(0x8000)).toBe(0xaa);
    expect(mapper.readPrg(0xc000)).toBe(0xaa);
  });

  it("CNROM switches CHR banks", () => {
    const chr = new Uint8Array(0x4000);
    chr[0] = 0x01;
    chr[0x2000] = 0x02;
    const mapper = createMapper(3, mapperConfig(new Uint8Array(0x4000), chr));
    expect(mapper.readChr(0x0000)).toBe(0x01);
    mapper.writePrg(0x8000, 1);
    expect(mapper.readChr(0x0000)).toBe(0x02);
  });

  it("MMC1 accepts serial writes", () => {
    const prg = new Uint8Array(0x4000);
    prg[0] = 0x42;
    const mapper = createMapper(1, mapperConfig(prg, new Uint8Array(0x2000)));
    for (let bit = 0; bit < 5; bit++) {
      mapper.writePrg(0x8000, 0x80);
    }
    expect(mapper.readPrg(0x8000)).toBe(0x42);
  });
});
