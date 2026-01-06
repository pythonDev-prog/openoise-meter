
import { AudioMetrics, DiagnosticStatus, MachineStandard } from '../types';

export class AudioProcessor {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private aWeightingFilter: BiquadFilterNode[] = [];
  
  private calibrationOffset: number = 0;

  constructor(offset: number) {
    this.calibrationOffset = offset;
  }

  async initialize(): Promise<void> {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;

    // A-weighting approximation using multiple biquad filters
    // This is a simplified cascaded filter chain to mimic dBA
    const hpf1 = this.audioCtx.createBiquadFilter();
    hpf1.type = 'highpass';
    hpf1.frequency.value = 20.6;
    
    const hpf2 = this.audioCtx.createBiquadFilter();
    hpf2.type = 'highpass';
    hpf2.frequency.value = 107.7;
    
    const lpf1 = this.audioCtx.createBiquadFilter();
    lpf1.type = 'lowpass';
    lpf1.frequency.value = 12200;

    const notch = this.audioCtx.createBiquadFilter();
    notch.type = 'peaking';
    notch.frequency.value = 2500;
    notch.gain.value = 1.2;

    this.source.connect(hpf1);
    hpf1.connect(hpf2);
    hpf2.connect(lpf1);
    lpf1.connect(notch);
    notch.connect(this.analyser);

    this.aWeightingFilter = [hpf1, hpf2, lpf1, notch];
  }

  setCalibration(offset: number) {
    this.calibrationOffset = offset;
  }

  getMetrics(standard: MachineStandard): AudioMetrics {
    if (!this.analyser || !this.audioCtx) {
      return { db: 0, peakFrequency: 0, isStable: false, status: DiagnosticStatus.IDLE };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(this.analyser.fftSize);
    
    this.analyser.getByteFrequencyData(dataArray);
    this.analyser.getByteTimeDomainData(timeData);

    // Calculate RMS for dB
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const val = (timeData[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / timeData.length);
    // Standard formula for dB SPL (relative to 1) + user calibration offset
    const db = 20 * Math.log10(rms || 1e-6) + 100 + this.calibrationOffset;

    // Find peak frequency
    let maxVal = -1;
    let maxIndex = -1;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        maxIndex = i;
      }
    }
    const peakFrequency = maxIndex * (this.audioCtx.sampleRate / this.analyser.fftSize);

    // Diagnostic logic
    const dbExceeded = db > standard.maxDb;
    const freqAbnormal = peakFrequency > standard.peakFreqRange[1] || peakFrequency < standard.peakFreqRange[0];
    
    const status = (dbExceeded || (maxVal > 200 && freqAbnormal)) 
      ? DiagnosticStatus.ABNORMAL 
      : DiagnosticStatus.NORMAL;

    return {
      db: Math.round(db * 10) / 10,
      peakFrequency: Math.round(peakFrequency),
      isStable: rms > 0.001,
      status
    };
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
