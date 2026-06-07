import type { MemoryDevice } from "../../memory/types";
import type { R2A03 } from "../../cpu/r2a03";

const SAMPLE_RATE = 44100;
const CPU_CLOCK_NTSC = 1_789_773;
const SAMPLES_PER_FRAME = Math.ceil(SAMPLE_RATE / 60) + 64;

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

const LENGTH_TABLE: readonly number[] = [
  10, 254, 20, 2, 40, 4, 80, 6,
  160, 8, 60, 10, 14, 12, 26, 14,
  12, 16, 24, 18, 48, 20, 96, 22,
  192, 24, 72, 26, 16, 28, 32, 30,
];

const NOISE_PERIOD_TABLE: readonly number[] = [
  4, 8, 16, 32, 64, 96, 128, 160,
  202, 254, 380, 508, 762, 1016, 2034, 4068,
];

interface Envelope {
  start: boolean;
  divider: number;
  decay: number;
}

export class NesApu implements MemoryDevice {
  private readonly baseAddress = 0x4000;
  private registers = new Uint8Array(0x18);
  private cpu: R2A03 | null = null;

  private frameCounterMode = false;
  private frameIrqEnabled = true;
  private frameIrqPending = false;
  private frameCycles = 0;

  private channelEnable = 0;

  private pulseTimer = [0, 0];
  private pulseDutyStep = [0, 0];
  private pulseLength = [0, 0];
  private pulseEnvelope: Envelope[] = [
    { start: false, divider: 0, decay: 0 },
    { start: false, divider: 0, decay: 0 },
  ];

  private triangleTimer = 0;
  private triangleStep = 0;
  private triangleLength = 0;
  private triangleLinearCounter = 0;
  private triangleLinearReload = false;

  private noiseTimer = 0;
  private noiseShift = 1;
  private noiseLength = 0;
  private noiseEnvelope: Envelope = { start: false, divider: 0, decay: 0 };

  private dmcEnabled = false;
  private dmcStallCycles = 0;

  private sampleBuffer = new Float32Array(SAMPLES_PER_FRAME + 8);
  private sampleIndex = 0;
  private sampleAccumulator = 0;

  bindCpu(cpu: R2A03): void {
    this.cpu = cpu;
  }

  readByte(address: number): number {
    const index = address - this.baseAddress;

    if (index === 0x15) {
      let status = 0;

      if (this.pulseLength[0] > 0) status |= 0x01;
      if (this.pulseLength[1] > 0) status |= 0x02;
      if (this.triangleLength > 0) status |= 0x04;
      if (this.noiseLength > 0) status |= 0x08;
      if (this.dmcEnabled) status |= 0x10;
      if (this.frameIrqPending) status |= 0x40;

      this.frameIrqPending = false;
      this.cpu?.clearIrq();

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

    value &= 0xff;
    this.registers[index] = value;

    switch (index) {
      case 0x00:
        this.pulseEnvelope[0].start = true;
        break;

      case 0x04:
        this.pulseEnvelope[1].start = true;
        break;

      case 0x03:
        if (this.channelEnable & 0x01) {
          this.pulseLength[0] = LENGTH_TABLE[(value >> 3) & 0x1f];
        }
        this.pulseDutyStep[0] = 0;
        this.pulseEnvelope[0].start = true;
        break;

      case 0x07:
        if (this.channelEnable & 0x02) {
          this.pulseLength[1] = LENGTH_TABLE[(value >> 3) & 0x1f];
        }
        this.pulseDutyStep[1] = 0;
        this.pulseEnvelope[1].start = true;
        break;

      case 0x0b:
        if (this.channelEnable & 0x04) {
          this.triangleLength = LENGTH_TABLE[(value >> 3) & 0x1f];
        }
        this.triangleLinearReload = true;
        break;

      case 0x0c:
        this.noiseEnvelope.start = true;
        break;

      case 0x0f:
        if (this.channelEnable & 0x08) {
          this.noiseLength = LENGTH_TABLE[(value >> 3) & 0x1f];
        }
        this.noiseEnvelope.start = true;
        break;

      case 0x15:
        this.channelEnable = value & 0x1f;
        this.dmcEnabled = (value & 0x10) !== 0;

        if ((value & 0x01) === 0) this.pulseLength[0] = 0;
        if ((value & 0x02) === 0) this.pulseLength[1] = 0;
        if ((value & 0x04) === 0) this.triangleLength = 0;
        if ((value & 0x08) === 0) this.noiseLength = 0;
        break;

      case 0x17:
        this.frameCounterMode = (value & 0x80) !== 0;
        this.frameIrqEnabled = (value & 0x40) === 0;
        this.frameIrqPending = false;
        this.frameCycles = 0;
        this.cpu?.clearIrq();

        if (this.frameCounterMode) {
          this.clockQuarterFrame();
          this.clockHalfFrame();
        }
        break;
    }
  }

  tickCpuCycle(): void {
    if (this.dmcStallCycles > 0) {
      this.dmcStallCycles--;
    }

    this.clockFrameCounter();
    this.tickToneGenerators();
    this.emitSamples();
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

    this.frameCounterMode = false;
    this.frameIrqEnabled = true;
    this.frameIrqPending = false;
    this.frameCycles = 0;

    this.channelEnable = 0;

    this.pulseTimer = [0, 0];
    this.pulseDutyStep = [0, 0];
    this.pulseLength = [0, 0];
    this.pulseEnvelope = [
      { start: false, divider: 0, decay: 0 },
      { start: false, divider: 0, decay: 0 },
    ];

    this.triangleTimer = 0;
    this.triangleStep = 0;
    this.triangleLength = 0;
    this.triangleLinearCounter = 0;
    this.triangleLinearReload = false;

    this.noiseTimer = 0;
    this.noiseShift = 1;
    this.noiseLength = 0;
    this.noiseEnvelope = { start: false, divider: 0, decay: 0 };

    this.dmcEnabled = false;
    this.dmcStallCycles = 0;

    this.sampleBuffer.fill(0);
    this.sampleIndex = 0;
    this.sampleAccumulator = 0;
  }

  private clockFrameCounter(): void {
    this.frameCycles++;

    if (!this.frameCounterMode) {
      if (
        this.frameCycles === 7457 ||
        this.frameCycles === 14913 ||
        this.frameCycles === 22371 ||
        this.frameCycles === 29829
      ) {
        this.clockQuarterFrame();
      }

      if (this.frameCycles === 14913 || this.frameCycles === 29829) {
        this.clockHalfFrame();
      }

      if (this.frameCycles >= 29830) {
        this.frameCycles = 0;

        if (this.frameIrqEnabled && !this.frameIrqPending) {
          this.frameIrqPending = true;
          this.cpu?.triggerIrq();
        }
      }

      return;
    }

    if (
      this.frameCycles === 7457 ||
      this.frameCycles === 14913 ||
      this.frameCycles === 22371 ||
      this.frameCycles === 37281
    ) {
      this.clockQuarterFrame();
    }

    if (this.frameCycles === 14913 || this.frameCycles === 37281) {
      this.clockHalfFrame();
    }

    if (this.frameCycles >= 37282) {
      this.frameCycles = 0;
    }
  }

  private clockQuarterFrame(): void {
    this.clockEnvelope(this.pulseEnvelope[0], this.registers[0]);
    this.clockEnvelope(this.pulseEnvelope[1], this.registers[4]);
    this.clockEnvelope(this.noiseEnvelope, this.registers[12]);
    this.clockTriangleLinearCounter();
  }

  private clockHalfFrame(): void {
    this.clockLengthCounters();
  }

  private clockEnvelope(envelope: Envelope, control: number): void {
    const period = control & 0x0f;
    const loop = (control & 0x20) !== 0;

    if (envelope.start) {
      envelope.start = false;
      envelope.decay = 15;
      envelope.divider = period;
      return;
    }

    if (envelope.divider > 0) {
      envelope.divider--;
      return;
    }

    envelope.divider = period;

    if (envelope.decay > 0) {
      envelope.decay--;
    } else if (loop) {
      envelope.decay = 15;
    }
  }

  private clockTriangleLinearCounter(): void {
    const control = this.registers[8];
    const reload = control & 0x7f;

    if (this.triangleLinearReload) {
      this.triangleLinearCounter = reload;
    } else if (this.triangleLinearCounter > 0) {
      this.triangleLinearCounter--;
    }

    if ((control & 0x80) === 0) {
      this.triangleLinearReload = false;
    }
  }

  private clockLengthCounters(): void {
    if ((this.registers[0] & 0x20) === 0 && this.pulseLength[0] > 0) {
      this.pulseLength[0]--;
    }

    if ((this.registers[4] & 0x20) === 0 && this.pulseLength[1] > 0) {
      this.pulseLength[1]--;
    }

    if ((this.registers[8] & 0x80) === 0 && this.triangleLength > 0) {
      this.triangleLength--;
    }

    if ((this.registers[12] & 0x20) === 0 && this.noiseLength > 0) {
      this.noiseLength--;
    }
  }

  private tickToneGenerators(): void {
    this.tickPulse(0, 0);
    this.tickPulse(1, 4);
    this.tickTriangle();
    this.tickNoise();
  }

  private tickPulse(channel: 0 | 1, base: 0 | 4): void {
    const period = this.pulsePeriod(base);

    if (
      period < 8 ||
      this.pulseLength[channel] === 0 ||
      (this.channelEnable & (1 << channel)) === 0
    ) {
      return;
    }

    if (this.pulseTimer[channel] <= 0) {
      this.pulseTimer[channel] = (period + 1) * 2;
      this.pulseDutyStep[channel] = (this.pulseDutyStep[channel] + 1) & 0x07;
    } else {
      this.pulseTimer[channel]--;
    }
  }

  private tickTriangle(): void {
    const period = this.trianglePeriod();

    if (
      period < 2 ||
      this.triangleLength === 0 ||
      this.triangleLinearCounter === 0 ||
      (this.channelEnable & 0x04) === 0
    ) {
      return;
    }

    if (this.triangleTimer <= 0) {
      this.triangleTimer = period + 1;
      this.triangleStep = (this.triangleStep + 1) & 0x1f;
    } else {
      this.triangleTimer--;
    }
  }

  private tickNoise(): void {
    if (
      this.noiseLength === 0 ||
      (this.channelEnable & 0x08) === 0
    ) {
      return;
    }

    if (this.noiseTimer <= 0) {
      const period = NOISE_PERIOD_TABLE[this.registers[14] & 0x0f];
      const tap = (this.registers[14] & 0x80) !== 0 ? 6 : 1;
      const feedback = (this.noiseShift & 1) ^ ((this.noiseShift >> tap) & 1);

      this.noiseShift = (this.noiseShift >> 1) | (feedback << 14);
      this.noiseShift &= 0x7fff;
      this.noiseTimer = period;
    } else {
      this.noiseTimer--;
    }
  }

  private emitSamples(): void {
    this.sampleAccumulator += SAMPLE_RATE;

    while (this.sampleAccumulator >= CPU_CLOCK_NTSC) {
      this.sampleAccumulator -= CPU_CLOCK_NTSC;

      if (this.sampleIndex < this.sampleBuffer.length) {
        this.sampleBuffer[this.sampleIndex++] = this.mixChannels();
      }
    }
  }

  private mixChannels(): number {
    const pulse1 = this.pulseOutput(0, 0);
    const pulse2 = this.pulseOutput(1, 4);
    const triangle = this.triangleOutput();
    const noise = this.noiseOutput();

    const pulseSum = pulse1 + pulse2;
    const pulseMix =
      pulseSum === 0
        ? 0
        : 95.88 / (8128 / pulseSum + 100);

    const tndInput =
      triangle / 8227 +
      noise / 12241;

    const tndMix =
      tndInput === 0
        ? 0
        : 159.79 / (1 / tndInput + 100);

    return Math.max(-1, Math.min(1, (pulseMix + tndMix) * 1.5 - 0.35));
  }

  private pulseOutput(channel: 0 | 1, base: 0 | 4): number {
    if (
      (this.channelEnable & (1 << channel)) === 0 ||
      this.pulseLength[channel] === 0 ||
      this.pulsePeriod(base) < 8
    ) {
      return 0;
    }

    const duty = (this.registers[base] >> 6) & 0x03;
    const volume = this.envelopeOutput(this.pulseEnvelope[channel], this.registers[base]);

    return DUTY_TABLE[duty][this.pulseDutyStep[channel]] ? volume : 0;
  }

  private triangleOutput(): number {
    if (
      (this.channelEnable & 0x04) === 0 ||
      this.triangleLength === 0 ||
      this.triangleLinearCounter === 0 ||
      this.trianglePeriod() < 2
    ) {
      return 0;
    }

    return TRIANGLE_TABLE[this.triangleStep];
  }

  private noiseOutput(): number {
    if (
      (this.channelEnable & 0x08) === 0 ||
      this.noiseLength === 0 ||
      (this.noiseShift & 1) !== 0
    ) {
      return 0;
    }

    // Slightly attenuated. This avoids the brutal hiss while keeping SMB SFX.
    return this.envelopeOutput(this.noiseEnvelope, this.registers[12]) * 0.45;
  }

  private envelopeOutput(envelope: Envelope, control: number): number {
    const constantVolume = (control & 0x10) !== 0;

    if (constantVolume) {
      return control & 0x0f;
    }

    return envelope.decay;
  }

  private pulsePeriod(base: 0 | 4): number {
    return this.registers[base + 2] | ((this.registers[base + 3] & 0x07) << 8);
  }

  private trianglePeriod(): number {
    return this.registers[10] | ((this.registers[11] & 0x07) << 8);
  }
}

export { SAMPLES_PER_FRAME, SAMPLE_RATE, CPU_CLOCK_NTSC };