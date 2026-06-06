import type { MemoryDevice } from "../../memory/types";
import type { R2A03 } from "../../cpu/r2a03";

const SAMPLE_RATE = 44100;
const CPU_CLOCK_NTSC = 1_789_773;
const SAMPLES_PER_FRAME = Math.floor(SAMPLE_RATE / 60);

const DUTY_TABLE: readonly (readonly number[])[] = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1],
];

const TRIANGLE_TABLE: readonly number[] = [
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

const NOISE_PERIOD_TABLE: readonly number[] = [
  4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
];

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

  private pulseTimer = [0, 0];
  private pulseDutyStep = [0, 0];
  private triangleTimer = 0;
  private triangleStep = 0;
  private noiseTimer = 0;
  private noiseShift = 1;
  private channelEnable = 0;
  private dmcEnabled = false;
  private dmcStallCycles = 0;
  private dmcSampleTimer = 0;
  private sampleBuffer = new Float32Array(SAMPLES_PER_FRAME);
  private sampleIndex = 0;
  private sampleAccumulator = 0;

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
      this.channelEnable = value & 0x1f;
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
    const stalled = this.dmcStallCycles > 0;
    if (this.dmcStallCycles > 0) {
      this.dmcStallCycles--;
    }

    if (!stalled && this.dmcEnabled) {
      this.dmcSampleTimer++;
      if (this.dmcSampleTimer >= 428) {
        this.dmcSampleTimer = 0;
        this.dmcStallCycles = 4;
      }
    }

    this.tickToneGenerators();

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

    this.sampleAccumulator += SAMPLE_RATE;
    while (this.sampleAccumulator >= CPU_CLOCK_NTSC) {
      this.sampleAccumulator -= CPU_CLOCK_NTSC;
      if (this.sampleIndex < this.sampleBuffer.length) {
        this.sampleBuffer[this.sampleIndex++] = this.mixChannels();
      }
    }
  }

  isDmcStalled(): boolean {
    return this.dmcStallCycles > 0;
  }

  endFrame(): void {
    // Samples are consumed by the host after frame execution.
  }

  consumeFrameBuffer(): Float32Array {
    const out = this.sampleBuffer.slice(0, this.sampleIndex);
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
    this.pulseTimer = [0, 0];
    this.pulseDutyStep = [0, 0];
    this.triangleTimer = 0;
    this.triangleStep = 0;
    this.noiseTimer = 0;
    this.noiseShift = 1;
    this.channelEnable = 0;
    this.dmcEnabled = false;
    this.dmcStallCycles = 0;
    this.dmcSampleTimer = 0;
    this.sampleBuffer.fill(0);
    this.sampleIndex = 0;
    this.sampleAccumulator = 0;
  }

  private tickToneGenerators(): void {
    this.tickPulse(0, 0);
    this.tickPulse(1, 4);
    this.tickTriangle();
    this.tickNoise();
  }

  private tickPulse(channel: 0 | 1, base: 0 | 4): void {
    const timer = this.pulsePeriod(base);
    if (timer < 8 || (this.channelEnable & (1 << channel)) === 0) {
      return;
    }

    if (this.pulseTimer[channel] <= 0) {
      this.pulseTimer[channel] = (timer + 1) * 2;
      this.pulseDutyStep[channel] = (this.pulseDutyStep[channel] + 1) & 0x07;
    } else {
      this.pulseTimer[channel]--;
    }
  }

  private tickTriangle(): void {
    const timer = this.trianglePeriod();
    if (timer < 2 || (this.channelEnable & 0x04) === 0 || (this.registers[8] & 0x7f) === 0) {
      return;
    }

    if (this.triangleTimer <= 0) {
      this.triangleTimer = timer + 1;
      this.triangleStep = (this.triangleStep + 1) & 0x1f;
    } else {
      this.triangleTimer--;
    }
  }

  private tickNoise(): void {
    if ((this.channelEnable & 0x08) === 0) {
      return;
    }

    if (this.noiseTimer <= 0) {
      const period = NOISE_PERIOD_TABLE[this.registers[14] & 0x0f];
      const tap = (this.registers[14] & 0x80) !== 0 ? 6 : 1;
      const feedback = (this.noiseShift & 1) ^ ((this.noiseShift >> tap) & 1);
      this.noiseShift = (this.noiseShift >> 1) | (feedback << 14);
      this.noiseTimer = period;
    } else {
      this.noiseTimer--;
    }
  }

  private mixChannels(): number {
    const pulse1 = this.pulseOutput(0, 0);
    const pulse2 = this.pulseOutput(1, 4);
    const triangle = this.triangleOutput();
    const noise = this.noiseOutput();

    const pulseMix = pulse1 + pulse2 === 0 ? 0 : 95.88 / (8128 / (pulse1 + pulse2) + 100);
    const tndInput = triangle / 8227 + noise / 12241;
    const tndMix = tndInput === 0 ? 0 : 159.79 / (1 / tndInput + 100);

    return Math.max(-1, Math.min(1, (pulseMix + tndMix) * 2));
  }

  private pulseOutput(channel: 0 | 1, base: 0 | 4): number {
    if ((this.channelEnable & (1 << channel)) === 0 || this.pulsePeriod(base) < 8) {
      return 0;
    }

    const duty = (this.registers[base] >> 6) & 0x03;
    const volume = this.registers[base] & 0x0f;
    return DUTY_TABLE[duty][this.pulseDutyStep[channel]] ? volume : 0;
  }

  private triangleOutput(): number {
    if ((this.channelEnable & 0x04) === 0 || (this.registers[8] & 0x7f) === 0 || this.trianglePeriod() < 2) {
      return 0;
    }
    return TRIANGLE_TABLE[this.triangleStep];
  }

  private noiseOutput(): number {
    if ((this.channelEnable & 0x08) === 0 || (this.noiseShift & 1) !== 0) {
      return 0;
    }
    return this.registers[12] & 0x0f;
  }

  private pulsePeriod(base: 0 | 4): number {
    return this.registers[base + 2] | ((this.registers[base + 3] & 0x07) << 8);
  }

  private trianglePeriod(): number {
    return this.registers[10] | ((this.registers[11] & 0x07) << 8);
  }
}

export { SAMPLES_PER_FRAME, SAMPLE_RATE, CPU_CLOCK_NTSC };
