/**
 * FlowSense Emergency Siren & Audio Alert Synthesizer
 * Uses HTML5 Web Audio API - 100% reliable, zero external MP3 dependencies, works offline.
 */
class EmergencyAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.lfo = null;
    this.isPlaying = false;
    this.volume = 0.35; // safe, comfortable default volume
    this.isMuted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  /**
   * Play realistic emergency wailing siren
   * Sweeps between ~650Hz and 950Hz with acoustic low-pass filtering.
   */
  playSiren(durationSeconds = 8) {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.isPlaying) {
      this.stopSiren();
    }

    try {
      const now = this.audioCtx.currentTime;

      // Primary Siren Oscillator
      this.sirenOsc = this.audioCtx.createOscillator();
      this.sirenOsc.type = "sawtooth";

      // Acoustic filter to soften harsh harmonics
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now);

      // Low Frequency Oscillator for the wail sweep
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.75, now); // ~1.3 seconds per wail cycle

      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(160, now); // modulates +/- 160Hz around 800Hz

      this.lfo.connect(lfoGain);
      this.sirenOsc.frequency.setValueAtTime(800, now);
      lfoGain.connect(this.sirenOsc.frequency);

      // Master output gain
      this.sirenGain = this.audioCtx.createGain();
      this.sirenGain.gain.setValueAtTime(0.001, now);
      this.sirenGain.gain.exponentialRampToValueAtTime(this.volume, now + 0.2);

      // Connect graph
      this.sirenOsc.connect(filter);
      filter.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);

      this.lfo.start(now);
      this.sirenOsc.start(now);
      this.isPlaying = true;

      // Automatically ramp down after durationSeconds
      if (durationSeconds > 0) {
        const rampStart = Math.max(now + 0.5, now + durationSeconds - 0.8);
        this.sirenGain.gain.setValueAtTime(this.volume, rampStart);
        this.sirenGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

        setTimeout(() => {
          this.stopSiren();
        }, durationSeconds * 1000);
      }
    } catch (err) {
      console.warn("Emergency siren audio synthesis error:", err);
      this.isPlaying = false;
    }
  }

  stopSiren() {
    try {
      if (this.sirenGain && this.audioCtx) {
        this.sirenGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      }
      if (this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenOsc = null;
      }
      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
        this.lfo = null;
      }
    } catch {
      // safe cleanup
    }
    this.isPlaying = false;
  }

  playBeep() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(920, now);
      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("Audio beep error:", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopSiren();
    return this.isMuted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sirenGain && this.audioCtx) {
      this.sirenGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }
}

export const soundAlert = new EmergencyAudioEngine();
