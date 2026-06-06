export const NMI_VECTOR = 0xfffa;
export const RESET_VECTOR = 0xfffc;
export const IRQ_VECTOR = 0xfffe;

export const VBLANK_SCANLINE = 241;
export const PRE_RENDER_SCANLINE = 261;
export const DOTS_PER_SCANLINE = 341;
export const SCANLINES_PER_FRAME = 262;
export const VISIBLE_SCANLINES = 240;

export const PPUCTRL_NMI_ENABLE = 1 << 7;
export const PPUSTATUS_VBLANK = 1 << 7;
export const PPUSTATUS_SPRITE0_HIT = 1 << 6;
export const PPUSTATUS_SPRITE_OVERFLOW = 1 << 5;
