import { describe, expect, it } from "vitest";
import { buildNesMemoryMap } from "../machines/nes/memory-map";
import { RAM_MIRROR_MASK } from "../machines/nes/constants";

describe("NES memory map", () => {
  it("mirrors 2KB RAM across $0000-$1FFF", () => {
    const { memoryMap } = buildNesMemoryMap();

    memoryMap.writeByte(0x0100, 0xab);
    expect(memoryMap.readByte(0x0100)).toBe(0xab);
    expect(memoryMap.readByte(0x0100 + RAM_MIRROR_MASK + 1)).toBe(0xab);
  });

  it("mirrors PPU registers every 8 bytes through $3FFF", () => {
    const { memoryMap } = buildNesMemoryMap();

    memoryMap.writeByte(0x2000, 0x80);
    expect(memoryMap.readByte(0x2000)).toBe(0x80);
    expect(memoryMap.readByte(0x2100)).toBe(0x80);
    expect(memoryMap.readByte(0x3ff0)).toBe(0x80);
  });

  it("returns zero for unmapped gaps below cartridge space", () => {
    const { memoryMap } = buildNesMemoryMap();
    expect(memoryMap.readByte(0x5000)).toBe(0);
  });
});
