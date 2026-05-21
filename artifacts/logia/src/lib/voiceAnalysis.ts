// Cheap real-time voice analysis using the Web Audio API.
//
// We compute, per ~250ms frame:
//   - Fundamental frequency (F0) via autocorrelation on the time-domain signal
//   - Frame amplitude (peak)
//   - Approximate harmonic-to-noise ratio (HNR)
//
// We then accumulate per-segment stats (f0Mean, f0Std, jitter, shimmer, hnr)
// and a rolling baseline used to derive a normalized excitement score in [0,1].
//
// Everything runs on the main thread; the analysis is light (one autocorr pass
// per frame on ~2k samples).

const FRAME_MS = 250;
const MIN_F0_HZ = 70;
const MAX_F0_HZ = 500;
const SILENCE_THRESHOLD = 0.012; // peak amplitude
const BASELINE_FRAMES = 120; // ~30s at 250ms cadence

export interface FrameStats {
  timestamp: number;
  voiced: boolean;
  f0: number | null;
  amplitude: number;
  hnr: number | null;
  excitement: number;
}

export interface SegmentStats {
  f0Mean: number | null;
  f0Std: number | null;
  jitter: number | null;
  shimmer: number | null;
  hnr: number | null;
  excitement: number;
}

interface VoiceAnalyzerOptions {
  onFrame?: (frame: FrameStats) => void;
}

export class VoiceAnalyzer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private intervalId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private opts: VoiceAnalyzerOptions;

  // Frame-level state
  private allFrames: FrameStats[] = [];
  private rollingF0: number[] = [];
  private rollingAmp: number[] = [];

  constructor(opts: VoiceAnalyzerOptions = {}) {
    this.opts = opts;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.stream = stream;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) throw new Error("Web Audio API is not supported in this browser.");
    const ctx = new Ctx();
    this.ctx = ctx;
    this.source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    this.source.connect(analyser);
    this.analyser = analyser;
    this.buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    this.intervalId = window.setInterval(() => this.tick(), FRAME_MS);
  }

  async stop(): Promise<void> {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch { /* noop */ }
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* noop */ }
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      try { await this.ctx.close(); } catch { /* noop */ }
      this.ctx = null;
    }
    this.buffer = null;
  }

  /** Returns aggregated stats for frames captured between [startMs, endMs]. */
  statsForRange(startMs: number, endMs: number, originMs: number): SegmentStats {
    const slice = this.allFrames.filter((f) => {
      const rel = f.timestamp - originMs;
      return rel >= startMs && rel <= endMs;
    });
    return aggregate(slice);
  }

  samplesForRange(
    startedAtMs: number,
    endedAtMs: number,
    originMs: number,
  ) {
    return this.allFrames
      .filter((sample) => {
        const t = sample.timestamp - originMs;
        return t >= startedAtMs && t <= endedAtMs;
      })
      .map((sample) => ({
        t: sample.timestamp - originMs,
        excitement: sample.excitement,
      }));
  }
  /** Most recent N frames' aggregate, used for live excitement display. */
  recentExcitement(): number {
    if (this.allFrames.length === 0) return 0;
    const tail = this.allFrames.slice(-6);
    const avg = tail.reduce((s, f) => s + f.excitement, 0) / tail.length;
    return clamp01(avg);
  }

  private tick(): void {
    if (!this.analyser || !this.buffer || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const now = Date.now();
    const sampleRate = this.ctx.sampleRate;

    // Peak amplitude
    let peak = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = Math.abs(this.buffer[i]!);
      if (v > peak) peak = v;
    }

    if (peak < SILENCE_THRESHOLD) {
      const frame: FrameStats = {
        timestamp: now,
        voiced: false,
        f0: null,
        amplitude: peak,
        hnr: null,
        excitement: 0,
      };
      this.allFrames.push(frame);
      this.opts.onFrame?.(frame);
      return;
    }

    const { f0, peakAutocorr } = autocorrelateF0(this.buffer, sampleRate);

    let hnr: number | null = null;
    if (peakAutocorr !== null && peakAutocorr > 0 && peakAutocorr < 1) {
      hnr = 10 * Math.log10(peakAutocorr / (1 - peakAutocorr));
    }

    // Rolling baselines for normalization
    if (f0 !== null) {
      this.rollingF0.push(f0);
      if (this.rollingF0.length > BASELINE_FRAMES) this.rollingF0.shift();
    }
    this.rollingAmp.push(peak);
    if (this.rollingAmp.length > BASELINE_FRAMES) this.rollingAmp.shift();

    const excitement = computeExcitementScore({
      f0,
      amp: peak,
      rollingF0: this.rollingF0,
      rollingAmp: this.rollingAmp,
    });

    const frame: FrameStats = {
      timestamp: now,
      voiced: true,
      f0,
      amplitude: peak,
      hnr,
      excitement,
    };
    this.allFrames.push(frame);
    if (this.allFrames.length > 4000) this.allFrames.splice(0, 1000);
    this.opts.onFrame?.(frame);
  }
}

function aggregate(frames: FrameStats[]): SegmentStats {
  const voiced = frames.filter((f) => f.voiced && f.f0 !== null);
  if (voiced.length === 0) {
    return {
      f0Mean: null,
      f0Std: null,
      jitter: null,
      shimmer: null,
      hnr: null,
      excitement: 0,
    };
  }
  const f0s = voiced.map((f) => f.f0 as number);
  const amps = voiced.map((f) => f.amplitude);
  const hnrs = voiced.map((f) => f.hnr).filter((v): v is number => v !== null);
  const excs = frames.map((f) => f.excitement);

  const f0Mean = mean(f0s);
  const f0Std = std(f0s, f0Mean);
  const meanAmp = mean(amps) || 1;

  // Jitter: mean |period_i - period_{i-1}| / mean(period). Period = 1/F0.
  const periods = f0s.map((f) => 1 / f);
  let jitterAcc = 0;
  for (let i = 1; i < periods.length; i++) {
    jitterAcc += Math.abs(periods[i]! - periods[i - 1]!);
  }
  const jitter =
    periods.length > 1 ? jitterAcc / (periods.length - 1) / mean(periods) : null;

  // Shimmer: mean |amp_i - amp_{i-1}| / mean(amp)
  let shimmerAcc = 0;
  for (let i = 1; i < amps.length; i++) {
    shimmerAcc += Math.abs(amps[i]! - amps[i - 1]!);
  }
  const shimmer =
    amps.length > 1 ? shimmerAcc / (amps.length - 1) / meanAmp : null;

  const hnr = hnrs.length > 0 ? mean(hnrs) : null;
  const excitement = excs.length > 0 ? mean(excs) : 0;

  return {
    f0Mean: round(f0Mean, 2),
    f0Std: round(f0Std, 2),
    jitter: jitter !== null ? round(jitter, 4) : null,
    shimmer: shimmer !== null ? round(shimmer, 4) : null,
    hnr: hnr !== null ? round(hnr, 2) : null,
    excitement: round(excitement, 4),
  };
}

interface ExcitementInput {
  f0: number | null;
  amp: number;
  rollingF0: number[];
  rollingAmp: number[];
}

function computeExcitementScore(inp: ExcitementInput): number {
  const { f0, amp, rollingF0, rollingAmp } = inp;

  // Need a small baseline before normalizing
  if (rollingF0.length < 6 || rollingAmp.length < 6) {
    return 0.25;
  }

  const f0Mean = mean(rollingF0);
  const f0Std = std(rollingF0, f0Mean) || 1;
  const ampMean = mean(rollingAmp);
  const ampStd = std(rollingAmp, ampMean) || 1;

  const f0Z = f0 !== null ? (f0 - f0Mean) / f0Std : 0;
  const ampZ = (amp - ampMean) / ampStd;

  // We blend pitch elevation, pitch variability (recent half), and amplitude
  const recentHalf = rollingF0.slice(-Math.min(20, rollingF0.length));
  const recentMean = mean(recentHalf);
  const recentStd = std(recentHalf, recentMean) || 1;
  const variabilityZ = (recentStd - f0Std) / Math.max(f0Std, 0.5);

  const linear = 0.45 * f0Z + 0.30 * ampZ + 0.25 * variabilityZ;
  // Sigmoid centered at 0
  const excite = 1 / (1 + Math.exp(-1.4 * linear));
  return clamp01(excite);
}

function autocorrelateF0(
  buf: Float32Array<ArrayBuffer>,
  sampleRate: number,
): { f0: number | null; peakAutocorr: number | null } {
  const minLag = Math.floor(sampleRate / MAX_F0_HZ);
  const maxLag = Math.floor(sampleRate / MIN_F0_HZ);
  const N = buf.length;

  // Energy at lag 0 for normalization
  let energy0 = 0;
  for (let i = 0; i < N; i++) energy0 += buf[i]! * buf[i]!;
  if (energy0 < 1e-6) return { f0: null, peakAutocorr: null };

  // Search for peak with center-clipping to suppress noise
  let bestLag = -1;
  let bestVal = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyA = 0;
    let energyB = 0;
    const limit = N - lag;
    for (let i = 0; i < limit; i++) {
      const a = buf[i]!;
      const b = buf[i + lag]!;
      sum += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denom = Math.sqrt(energyA * energyB) || 1e-9;
    const norm = sum / denom;
    if (norm > bestVal) {
      bestVal = norm;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestVal < 0.35) return { f0: null, peakAutocorr: bestVal };
  return { f0: sampleRate / bestLag, peakAutocorr: bestVal };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function std(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  let v = 0;
  for (const x of xs) v += (x - m) * (x - m);
  return Math.sqrt(v / (xs.length - 1));
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round(x: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(x * f) / f;
}
