import { describe, expect, it } from "vitest";
import Memory from "../memory/memory";
import { MemoryMap } from "../memory/memory-map";
import ROM from "../memory/rom";
import { LCDScreen } from "../devices/lcd-screen";
import { LCD_BASE, LCD_SIZE, RAM_BASE, RAM_SIZE, ROM_BASE } from "../machines/generic6502/constants";

describe("MemoryMap", () => {
  it("reads and writes RAM at region boundaries", () => {
    const map = new MemoryMap();
    const ram = new Memory(RAM_SIZE);
    map.addRegion(RAM_BASE, RAM_BASE + RAM_SIZE - 1, ram);

    map.writeByte(0x0000, 0x42);
    map.writeByte(RAM_BASE + RAM_SIZE - 1, 0x99);

    expect(map.readByte(0x0000)).toBe(0x42);
    expect(map.readByte(RAM_BASE + RAM_SIZE - 1)).toBe(0x99);
  });

  it("returns zero for unmapped addresses", () => {
    const map = new MemoryMap();
    expect(map.readByte(0x5000)).toBe(0);
  });

  it("later regions override overlapping addresses", () => {
    const map = new MemoryMap();
    const ram = new Memory(RAM_SIZE);
    const lcd = new LCDScreen();
    map.addRegion(RAM_BASE, RAM_BASE + RAM_SIZE - 1, ram);
    map.addRegion(LCD_BASE, LCD_BASE + LCD_SIZE - 1, lcd);

    map.writeByte(LCD_BASE, 0x41);
    expect(map.readByte(LCD_BASE)).toBe(0x41);
    expect(lcd.getDisplayText().charCodeAt(0)).toBe(0x41);
  });

  it("reads and writes 16-bit little-endian values", () => {
    const map = new MemoryMap();
    const ram = new Memory(0x100);
    map.addRegion(0x0100, 0x01ff, ram);

    map.writeShortLE(0x0120, 0xabcd);
    expect(map.readShortLE(0x0120)).toBe(0xabcd);
  });
});

describe("ROM", () => {
  it("ignores writes", () => {
    const map = new MemoryMap();
    const rom = new ROM(0x1000);
    map.addRegion(ROM_BASE, 0xffff, rom);

    rom.writeData(new Uint8Array([0x11, 0x22, 0x33]));
    map.writeByte(ROM_BASE, 0xff);
    map.writeShortLE(ROM_BASE, 0xffff);

    expect(map.readByte(ROM_BASE)).toBe(0x11);
    expect(map.readByte(ROM_BASE + 1)).toBe(0x22);
  });
});

describe("LCDScreen", () => {
  it("stores characters in the memory window", () => {
    const lcd = new LCDScreen();
    lcd.writeByte(LCD_BASE, 0x48);
    lcd.writeByte(LCD_BASE + 1, 0x69);

    expect(lcd.readByte(LCD_BASE)).toBe(0x48);
    expect(lcd.getDisplayText().startsWith("Hi")).toBe(true);
  });
});
