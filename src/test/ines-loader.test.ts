import { describe, expect, it } from "vitest";
import { Cartridge, INESParseError } from "../machines/nes/cartridge";

function buildINES(options: {
  prgUnits?: number;
  chrUnits?: number;
  mapper?: number;
  prgFill?: number;
}): Uint8Array {
  const prgUnits = options.prgUnits ?? 2;
  const chrUnits = options.chrUnits ?? 1;
  const mapper = options.mapper ?? 0;
  const prgSize = prgUnits * 0x4000;
  const chrSize = chrUnits * 0x2000;
  const buffer = new Uint8Array(16 + prgSize + chrSize);

  buffer[0] = 0x4e;
  buffer[1] = 0x45;
  buffer[2] = 0x53;
  buffer[3] = 0x1a;
  buffer[4] = prgUnits;
  buffer[5] = chrUnits;
  buffer[6] = (mapper & 0x0f) << 4;
  buffer[7] = mapper & 0xf0;

  if (options.prgFill !== undefined) {
    buffer.fill(options.prgFill, 16, 16 + prgSize);
  }

  return buffer;
}

describe("iNES loader", () => {
  it("loads Mapper 0 PRG-ROM", () => {
    const cart = new Cartridge();
    cart.loadINES(buildINES({ prgFill: 0x42 }));

    expect(cart.mapperId).toBe(0);
    expect(cart.readByte(0x8000)).toBe(0x42);
    expect(cart.readByte(0xc000)).toBe(0x42);
  });

  it("mirrors 16KB PRG-ROM at $8000 and $C000", () => {
    const cart = new Cartridge();
    cart.loadINES(buildINES({ prgUnits: 1, prgFill: 0x11 }));

    expect(cart.readByte(0x8000)).toBe(0x11);
    expect(cart.readByte(0xc000)).toBe(0x11);
    expect(cart.readByte(0xa000)).toBe(0x11);
  });

  it("rejects invalid magic", () => {
    const cart = new Cartridge();
    const bad = buildINES({});
    bad[0] = 0x00;
    expect(() => cart.loadINES(bad)).toThrow(INESParseError);
  });

  it("loads supported mappers", () => {
    const cart = new Cartridge();
    cart.loadINES(buildINES({ mapper: 1 }));
    expect(cart.mapperId).toBe(1);
  });

  it("allocates writable CHR-RAM when a ROM has no CHR payload", () => {
    const cart = new Cartridge();
    cart.loadINES(buildINES({ chrUnits: 0 }));

    cart.writeChr(0x0123, 0x7e);
    expect(cart.readChr(0x0123)).toBe(0x7e);
  });

  it("rejects unsupported mappers", () => {
    const cart = new Cartridge();
    expect(() => cart.loadINES(buildINES({ mapper: 9 }))).toThrow(INESParseError);
  });
});
