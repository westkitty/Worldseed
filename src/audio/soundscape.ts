// Sparse, opt-in WORLDSEED event audio.
// There is intentionally no continuous oscillator or drone: silence is the default ambience.

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private volume = 0.12;
  private masterGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch (error) {
      console.warn('Web Audio init skipped:', error);
    }
  }

  public resume() {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, now, 0.035);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(0.35, vol));
    if (!this.masterGain || !this.ctx || this.isMuted) return;
    this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.035);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  private playSoftTone(frequency: number, duration: number, delay = 0, level = 0.028) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, start);
    filter.Q.setValueAtTime(0.35, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * this.volume), start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  public playExtinctionChime() {
    this.playSoftTone(196, 1.1, 0, 0.025);
    this.playSoftTone(146.83, 1.4, 0.08, 0.018);
  }

  public playDiscoveryFanfare() {
    [261.63, 329.63, 392].forEach((frequency, index) => {
      this.playSoftTone(frequency, 0.75, index * 0.09, 0.018);
    });
  }
}

export const soundscape = new SoundscapeEngine();
