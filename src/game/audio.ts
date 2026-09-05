export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.02);
    }
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol = 0.18, slide = 0) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  jump() {
    this.beep(420, 0.12, "triangle", 0.16, 180);
  }
  doubleJump() {
    this.beep(560, 0.14, "triangle", 0.16, 240);
  }
  land() {
    this.beep(90, 0.07, "sine", 0.12, -20);
  }
  coin() {
    this.beep(880, 0.08, "square", 0.09, 220);
    this.beep(1320, 0.14, "square", 0.06, 80);
  }
  checkpoint() {
    this.beep(392, 0.12, "sine", 0.14, 80);
    this.beep(523, 0.18, "sine", 0.12, 40);
  }
  die() {
    this.beep(180, 0.28, "sawtooth", 0.12, -120);
  }
  win() {
    this.beep(523, 0.16, "triangle", 0.14, 40);
    this.beep(659, 0.2, "triangle", 0.12, 40);
    this.beep(784, 0.28, "triangle", 0.12, 60);
  }
  flag() {
    this.beep(440, 0.2, "sine", 0.14, 200);
  }
  stomp() {
    this.beep(160, 0.1, "square", 0.14, -90);
    this.beep(70, 0.14, "sine", 0.1, -30);
  }
  ability() {
    this.beep(640, 0.1, "triangle", 0.12, 120);
  }
  riddle() {
    this.beep(494, 0.16, "sine", 0.12, 80);
    this.beep(740, 0.22, "sine", 0.1, 40);
  }
  key() {
    this.beep(784, 0.12, "square", 0.1, 160);
    this.beep(1175, 0.2, "triangle", 0.1, 80);
  }
  door() {
    this.beep(180, 0.22, "sine", 0.14, 90);
    this.beep(240, 0.18, "triangle", 0.1, 40);
  }
  lever() {
    this.beep(220, 0.1, "square", 0.12, -40);
    this.beep(330, 0.16, "triangle", 0.1, 80);
  }
  clap() {
    this.beep(880, 0.06, "triangle", 0.08, 40);
    this.beep(990, 0.08, "triangle", 0.07, -20);
  }
}
