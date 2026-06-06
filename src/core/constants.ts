export const PAGE_SIZE = 256;
export const STACK_PAGE = 0x0100;
export const STACK_RESET = 0xfd;
/** @deprecated Use STACK_PAGE | stackPointer (8-bit) */
export const STACK_MIN = 0x0100;
/** @deprecated Use STACK_RESET */
export const STACK_MAX = 0x01ff;
export const RESET_VECTOR = 0xfffc;
