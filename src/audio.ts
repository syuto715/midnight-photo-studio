type SoundName = "tap" | "memo" | "success" | "wrong" | "clock";

type AudioConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;
let muted = false;

function getAudioContext(): AudioContext | null {
  try {
    if (muted) {
      return null;
    }

    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioConstructor }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    audioContext ??= new AudioCtor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function createNoiseBuffer(context: AudioContext, duration: number, gain = 1): AudioBuffer {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * gain;
  }
  return buffer;
}

function playNoiseClick(context: AudioContext): void {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = createNoiseBuffer(context, 0.035, 0.75);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(860, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + 0.045);
}

function playPaperSweep(context: AudioContext): void {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = createNoiseBuffer(context, 0.32, 0.55);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(720, now);
  filter.frequency.exponentialRampToValueAtTime(1900, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + 0.34);
}

function playBell(context: AudioContext): void {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.075, now + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);
  master.connect(context.destination);

  for (const [frequency, level] of [
    [196, 1],
    [392, 0.38],
    [588, 0.16]
  ] as const) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(level, now);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 1.7);
  }
}

function playDullHit(context: AudioContext): void {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(96, now);
  oscillator.frequency.exponentialRampToValueAtTime(62, now + 0.22);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(260, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.065, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.38);
}

function playClockTick(context: AudioContext): void {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = createNoiseBuffer(context, 0.024, 1);
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1600, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + 0.035);
}

export const audio = {
  ensureStarted(): void {
    void getAudioContext();
  },

  isMuted(): boolean {
    return muted;
  },

  toggleMuted(): boolean {
    muted = !muted;
    if (!muted) {
      this.ensureStarted();
      this.play("tap");
    }
    return muted;
  },

  play(soundName: SoundName): void {
    try {
      const context = getAudioContext();
      if (!context) {
        return;
      }

      if (soundName === "tap") {
        playNoiseClick(context);
      } else if (soundName === "memo") {
        playPaperSweep(context);
      } else if (soundName === "success") {
        playBell(context);
      } else if (soundName === "wrong") {
        playDullHit(context);
      } else {
        playClockTick(context);
      }
    } catch {
      return;
    }
  }
};
