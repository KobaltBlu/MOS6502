import { describe, expect, it } from "vitest";
import { createMapper } from "../machines/nes/mappers/index";

function mapperConfig(prgRom: Uint8Array, chrRom: Uint8Array) {
  return { prgRom, chrRom, chrRam: false, mirroring: "horizontal" as const };
}

/** Write a 5-bit value to an MMC1 register via the serial shift protocol (LSB first). */
function mmc1Serial(mapper: ReturnType<typeof createMapper>, address: number, value5: number): void {
  for (let i = 0; i < 5; i++) {
    mapper.writePrg(address, (value5 >> i) & 1);
  }
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

  it("MMC1 switches PRG bank via serial write", () => {
    const prg = new Uint8Array(0x8000);
    prg.fill(0x11, 0, 0x4000);
    prg.fill(0x22, 0x4000, 0x8000);
    const mapper = createMapper(1, mapperConfig(prg, new Uint8Array(0x2000)));
    // Default: mode 3 — $8000 maps bank 0, $C000 maps last (bank 1)
    expect(mapper.readPrg(0x8000)).toBe(0x11);
    expect(mapper.readPrg(0xc000)).toBe(0x22);

    // Write PRG bank register (reg 3, address $E000) with value 1
    mmc1Serial(mapper, 0xe000, 1);
    expect(mapper.readPrg(0x8000)).toBe(0x22);
    expect(mapper.readPrg(0xc000)).toBe(0x22);

    // Switch back to bank 0
    mmc1Serial(mapper, 0xe000, 0);
    expect(mapper.readPrg(0x8000)).toBe(0x11);
  });

  it("MMC1 switches mirroring via control register", () => {
    const mapper = createMapper(1, mapperConfig(new Uint8Array(0x4000), new Uint8Array(0x2000)));
    // Default: control=0x0C, bits 0:1 = 0b00 → vertical
    expect(mapper.getMirroring()).toBe("vertical");

    // Write control = 0x0D (bits 0:1 = 0b01 → horizontal)
    mmc1Serial(mapper, 0x8000, 0x0d);
    expect(mapper.getMirroring()).toBe("horizontal");

    // Write control = 0x0C (bits 0:1 = 0b00 → vertical)
    mmc1Serial(mapper, 0x8000, 0x0c);
    expect(mapper.getMirroring()).toBe("vertical");
  });

  it("MMC1 CHR-RAM 4KB mode write/read consistency", () => {
    const mapper = createMapper(1, {
      prgRom: new Uint8Array(0x4000),
      chrRom: new Uint8Array(0x2000),
      chrRam: true,
      mirroring: "horizontal",
    });
    // Enable 4KB CHR mode: control = 0x1C (bit4=1 | mode=3)
    mmc1Serial(mapper, 0x8000, 0x1c);
    // Set chrBank0 = 0, chrBank1 = 1
    mmc1Serial(mapper, 0xa000, 0);
    mmc1Serial(mapper, 0xc000, 1);

    mapper.writeChr(0x0000, 0xaa);
    mapper.writeChr(0x1000, 0xbb);

    expect(mapper.readChr(0x0000)).toBe(0xaa);
    expect(mapper.readChr(0x1000)).toBe(0xbb);
    // Ensure banks are distinct
    expect(mapper.readChr(0x0000)).not.toBe(mapper.readChr(0x1000));
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
