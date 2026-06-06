import type { MemoryDevice } from "../../memory/types";
import type { R2A03 } from "../../cpu/r2a03";

const SAMPLE_RATE = 44100;
const CPU_CLOCK_NTSC = 1_789_773;
const SAMPLES_PER_FRAME = Math.floor(SAMPLE_RATE / 60);

export class NesApu implements MemoryDevice {
  private baseAddress = 0x4000;
  private registers = new Uint8Array(0x18);
  private frameCounterActive = false;
  private frameCounterMode = false;
  private frameCounterStep = 0;
  private frameCounterCycles = 0;
  private frameIrqEnabled = false;
  private frameIrqPending = false;
  private cpu: R2A03 | null = null;

  private pulse1 = 0;
  private pulse2 = 0;
  private triangle = 0;
  private noise = 0;
  private dmcEnabled = false;
  private dmcStallCycles = 0;
  private dmcSampleTimer = 0;
  private sampleBuffer = new Float32Array(SAMPLES_PER_FRAME);
  private sampleIndex = 0;

  bindCpu(cpu: R2A03): void {
    this.cpu = cpu;
  }

  readByte(address: number): number {
    const index = address - this.baseAddress;
    if (index === 0x15) {
      let status = 0;
      if (this.frameIrqPending) {
        status |= 0x40;
        this.frameIrqPending = false;
        this.cpu?.clearIrq();
      }
      return status;
    }
    if (index < 0 || index >= this.registers.length) {
      return 0;
    }
    return this.registers[index];
  }

  writeByte(address: number, value: number): void {
    const index = address - this.baseAddress;
    if (index < 0 || index >= this.registers.length) {
      return;
    }
    this.registers[index] = value & 0xff;

    if (index === 0x15) {
      this.dmcEnabled = (value & 0x10) !== 0;
    }

    if (index === 0x17) {
      this.frameCounterActive = true;
      this.frameCounterMode = (value & 0x80) !== 0;
      this.frameCounterStep = 0;
      this.frameCounterCycles = 0;
      this.frameIrqEnabled = (value & 0x40) === 0;
      this.frameIrqPending = false;
      this.cpu?.clearIrq();
    }
  }

  tickCpuCycle(): void {
    if (this.dmcStallCycles > 0) {
      this.dmcStallCycles--;
      return;
    }

    if (this.dmcEnabled) {
      this.dmcSampleTimer++;
      if (this.dmcSampleTimer >= 428) {
        this.dmcSampleTimer = 0;
        this.dmcStallCycles = 4;
      }
    }

    this.pulse1 = (this.pulse1 + (this.registers[0] & 0x0f)) & 0xff;
    this.pulse2 = (this.pulse2 + (this.registers[4] & 0x0f)) & 0xff;
    this.triangle = (this.triangle + 1) & 0x1f;
    this.noise = (this.noise + 1) & 0xff;

    if (this.frameCounterActive) {
      this.frameCounterCycles++;
      const threshold = this.frameCounterMode ? 14915 : 7457;
      if (this.frameCounterCycles >= threshold) {
        this.frameCounterCycles = 0;
        this.frameCounterStep = (this.frameCounterStep + 1) & 0x03;
        if (
          !this.frameCounterMode &&
          this.frameCounterStep === 3 &&
          this.frameIrqEnabled &&
          !this.frameIrqPending
        ) {
          this.frameIrqPending = true;
          this.cpu?.triggerIrq();
        }
      }
    }

    if (this.sampleIndex < this.sampleBuffer.length) {
      this.sampleBuffer[this.sampleIndex++] = this.mixChannels();
    }
  }

  isDmcStalled(): boolean {
    return this.dmcStallCycles > 0;
  }

  endFrame(): void {
    this.sampleIndex = 0;
  }

  consumeFrameBuffer(): Float32Array {
    const out = this.sampleBuffer.slice();
    this.sampleBuffer.fill(0);
    this.sampleIndex = 0;
    return out;
  }

  reset(): void {
    this.registers.fill(0);
    this.frameCounterActive = false;
    this.frameCounterMode = false;
    this.frameCounterStep = 0;
    this.frameCounterCycles = 0;
    this.frameIrqEnabled = false;
    this.frameIrqPending = false;
    this.pulse1 = 0;
    this.pulse2 = 0;
    this.triangle = 0;
    this.noise = 0;
    this.dmcEnabled = false;
    this.dmcStallCycles = 0;
    this.dmcSampleTimer = 0;
    this.sampleBuffer.fill(0);
    this.sampleIndex = 0;
  }

  private mixChannels(): number {
    const pulseEnv1 = (this.registers[0] >> 4) & 0x0f;
    const pulseEnv2 = (this.registers[4] >> 4) & 0x0f;
    const triLinear = this.registers[8] & 0x7f;
    const noiseEnv = (this.registers[12] >> 4) & 0x0f;

    const pulse1Out = ((this.pulse1 & pulseEnv1) !== 0 ? pulseEnv1 : 0) / 15;
    const pulse2Out = ((this.pulse2 & pulseEnv2) !== 0 ? pulseEnv2 : 0) / 15;
    const triOut = triLinear > 0 ? (this.triangle & 0x0f) / 15 : 0;
    const noiseOut = ((this.noise & noiseEnv) !== 0 ? noiseEnv : 0) / 30;

    const pulseMix = 0.00752 * (pulse1Out + pulse2Out);
    const tndMix = 0.00851 * triOut + noiseOut * 0.00454;
    return pulseMix + tndMix - 0.5;
  }
}

export { SAMPLES_PER_FRAME, SAMPLE_RATE, CPU_CLOCK_NTSC };
