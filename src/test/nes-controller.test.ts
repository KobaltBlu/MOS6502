import { describe, expect, it } from "vitest";
import { NesController } from "../machines/nes/controller";

describe("NES controller", () => {
  it("keeps returning A while strobe is high", () => {
    const controller = new NesController();
    controller.setButtons(1, [true, false, false, false, false, false, false, false]);

    controller.writeByte(0x4016, 1);
    expect(controller.readByte(0x4016)).toBe(1);
    expect(controller.readByte(0x4016)).toBe(1);

    controller.writeByte(0x4016, 0);
    expect(controller.readByte(0x4016)).toBe(1);
    expect(controller.readByte(0x4016)).toBe(0);
  });

  it("returns one after the eight latched buttons are shifted out", () => {
    const controller = new NesController();
    controller.setButtons(1, [false, false, false, false, false, false, false, true]);

    controller.writeByte(0x4016, 1);
    controller.writeByte(0x4016, 0);

    for (let i = 0; i < 7; i++) {
      expect(controller.readByte(0x4016)).toBe(0);
    }
    expect(controller.readByte(0x4016)).toBe(1);
    expect(controller.readByte(0x4016)).toBe(1);
  });
});
