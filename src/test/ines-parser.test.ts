import { describe, expect, it } from "vitest";
import {
  isNrom256Profile,
  parseInesHeader,
  sliceInesPayload,
} from "../machines/nes/ines-parser";

function buildHeaderBytes(options: {
  prgUnits?: number;
  chrUnits?: number;
  mapper?: number;
  vertical?: boolean;
  trainer?: boolean;
  battery?: boolean;
  flags7?: number;
}): Uint8Array {
  const buffer = new Uint8Array(16);
  buffer[0] = 0x4e;
  buffer[1] = 0x45;
  buffer[2] = 0x53;
  buffer[3] = 0x1a;
  buffer[4] = options.prgUnits ?? 2;
  buffer[5] = options.chrUnits ?? 1;
  buffer[6] =
    ((options.mapper ?? 0) & 0x0f) << 4 |
    (options.vertical ? 0x01 : 0) |
    (options.trainer ? 0x04 : 0) |
    (options.battery ? 0x02 : 0);
  buffer[7] = options.flags7 ?? ((options.mapper ?? 0) & 0xf0);
  return buffer;
}

describe("iNES parser", () => {
  it("parses standard NROM-256 SMB-style header", () => {
    const header = parseInesHeader(buildHeaderBytes({ vertical: true }));
    expect(header.format).toBe("archaic");
    expect(header.mapperId).toBe(0);
    expect(header.prgUnits).toBe(2);
    expect(header.chrUnits).toBe(1);
    expect(header.prgSize).toBe(0x8000);
    expect(header.chrSize).toBe(0x2000);
    expect(header.mirroring).toBe("vertical");
    expect(isNrom256Profile(header)).toBe(true);
  });

  it("skips 512-byte trainer when present", () => {
    const header = parseInesHeader(buildHeaderBytes({ trainer: true }));
    expect(header.hasTrainer).toBe(true);
    expect(header.headerSize).toBe(528);

    const rom = new Uint8Array(header.headerSize + header.prgSize + header.chrSize);
    rom.set(buildHeaderBytes({ trainer: true }), 0);
    rom[528] = 0xab;
    const payload = sliceInesPayload(rom, header);
    expect(payload.prgRom[0]).toBe(0xab);
  });

  it("detects NES 2.0 signature", () => {
    const header = parseInesHeader(buildHeaderBytes({ flags7: 0x08 }));
    expect(header.format).toBe("nes2.0");
  });
});
