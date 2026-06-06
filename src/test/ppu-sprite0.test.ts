import { describe, expect, it } from "vitest";
import { renderScanline, type PpuRenderState } from "../devices/nes/render";

describe("PPU sprite 0 hit", () => {
  it("sets sprite0Hit when sprite 0 overlaps opaque background", () => {
    const vram = new Uint8Array(0x1000);
    vram[0] = 0x01;
    const oam = new Uint8Array(256);
    oam[0] = 0;
    oam[1] = 0;
    oam[2] = 0;
    oam[3] = 0;

    const state: PpuRenderState = {
      ctrl: 0x00,
      mask: 0x1e,
      vram,
      oam,
      palette: new Uint8Array(32),
      chrRead: () => 0xff,
      mirroring: "horizontal",
      sprite0Hit: false,
    };
    state.palette[0] = 0x0f;
    state.palette[1] = 0x02;

    const framebuffer = new Uint32Array(256 * 240);
    renderScanline(state, 0, framebuffer, 0, 0);
    expect(state.sprite0Hit).toBe(true);
  });
});
