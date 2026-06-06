import { describe, expect, it } from "vitest";
import { createMapper } from "../machines/nes/mappers/index";

function mapperConfig(prgRom: Uint8Array, chrRom: Uint8Array) {
  return { prgRom, chrRom, chrRam: false, mirroring: "horizontal" as const };
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

  it("allows CHR writes only for CHR-RAM boards", () => {
    const chrRamMapper = createMapper(0, {
      prgRom: new Uint8Array(0x4000),
      chrRom: new Uint8Array(0x2000),
      chrRam: true,
      mirroring: "horizontal",
    });
    chrRamMapper.writeChr(0x0010, 0x5a);
    expect(chrRamMapper.readChr(0x0010)).toBe(0x5a);

    const chrRom = new Uint8Array(0x2000);
    chrRom[0x10] = 0x11;
    const chrRomMapper = createMapper(0, {
      prgRom: new Uint8Array(0x4000),
      chrRom,
      chrRam: false,
      mirroring: "horizontal",
    });
    chrRomMapper.writeChr(0x0010, 0x5a);
    expect(chrRomMapper.readChr(0x0010)).toBe(0x11);
  });

  it("MMC3 bank select controls PRG mode", () => {
    const prg = new Uint8Array(0x8000);
    for (let bank = 0; bank < 4; bank++) {
      prg.fill(0x10 + bank, bank * 0x2000, (bank + 1) * 0x2000);
    }
    const mapper = createMapper(4, mapperConfig(prg, new Uint8Array(0x2000)));

    mapper.writePrg(0x8000, 0x06);
    mapper.writePrg(0x8001, 0x01);
    expect(mapper.readPrg(0x8000)).toBe(0x11);
    expect(mapper.readPrg(0xc000)).toBe(0x12);

    mapper.writePrg(0x8000, 0x46);
    expect(mapper.readPrg(0x8000)).toBe(0x12);
    expect(mapper.readPrg(0xc000)).toBe(0x11);
  });

  it("MMC3 maps 2KB CHR banks as paired 1KB slots", () => {
    const chr = new Uint8Array(0x4000);
    for (let bank = 0; bank < 16; bank++) {
      chr.fill(0x20 + bank, bank * 0x0400, (bank + 1) * 0x0400);
    }
    const mapper = createMapper(4, mapperConfig(new Uint8Array(0x8000), chr));

    mapper.writePrg(0x8000, 0x00);
    mapper.writePrg(0x8001, 0x04);
    expect(mapper.readChr(0x0000)).toBe(0x24);
    expect(mapper.readChr(0x0400)).toBe(0x25);

    mapper.writePrg(0x8000, 0x80);
    expect(mapper.readChr(0x1000)).toBe(0x24);
    expect(mapper.readChr(0x1400)).toBe(0x25);
  });
});
