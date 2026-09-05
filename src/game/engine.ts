import { loadAssets, type Assets } from "./assets";
import { GameAudio } from "./audio";
import { CHAR_BY_ID, isCharacterId, type CharacterDef, type CharacterId } from "./characters";
import { findLevel, HALL_LAYOUT, LEVEL_EXTRAS, THEME_KEYS, THEME_TINT } from "./content";
import {
  APEX_GRAVITY,
  APEX_THRESHOLD,
  AIR_ACCEL,
  AIR_DRAG,
  COIN_R,
  COYOTE_TIME,
  DROP_THROUGH_TIME,
  FIXED_DT,
  FLY_ACCEL,
  FLY_MAX,
  GRAVITY_DOWN,
  GRAVITY_UP,
  GROUND_ACCEL,
  GROUND_FRICTION,
  HARD_LAND,
  JUMP_BUFFER,
  JUMP_CUT,
  MAIN_LEVELS,
  MAX_STEPS,
  SPIKE_INSET,
  TERMINAL_VEL,
  VIEW_H,
  VIEW_W,
} from "./constants";
import { Input, type Actions } from "./input";
import { LEVELS } from "./levels";
import { formatLegend, HALL_LINES, layoutLegendSlots, runTotals } from "./legend";
import { addLegend, listLegends } from "./legend.functions";
import { coinId, SCORE } from "./progress";
import { RIDDLE_BY_ID } from "./riddles";
import { canEnterLevel, canOpenDoor, canReadFinalRiddle, doorVisible as doorIsVisible } from "./rules";
import { useHud } from "./store";
import type {
  DartDef,
  DoorSpot,
  Guard,
  LevelDef,
  LeverSpot,
  Mover,
  NpcSpot,
  Overlay,
  Platform,
  Rect,
  RiddleSpot,
} from "./types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  jumpsLeft: number;
  coyote: number;
  buffer: number;
  dropTimer: number;
  riding: Mover | null;
  squash: number;
  anim: number;
  deadTimer: number;
  spawnX: number;
  spawnY: number;
  invuln: number;
  curled: boolean;
  flying: boolean;
  carried: boolean;
  carryT: number;
  flyHurt: boolean;
  airFragile: boolean;
  usedDouble: boolean;
  carryTx: number;
  carryTy: number;
  prevBottom: number;
}

interface OriginSnap {
  id: number;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  lanterns: boolean[];
  deaths: number;
  character: CharacterId;
}

interface Companion {
  id: CharacterId;
  x: number;
  y: number;
  facing: 1 | -1;
  anim: number;
  tx?: number;
  ty?: number;
}

interface DartLive extends DartDef {
  t: number;
  gone: boolean;
}

function aabb(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pingpong(t: number, min: number, max: number) {
  const span = Math.max(1, max - min);
  const cycle = span * 2;
  let m = t % cycle;
  if (m < 0) m += cycle;
  return m < span ? min + m : max - (m - span);
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  audio = new GameAudio();
  assets: Assets | null = null;
  raf = 0;
  acc = 0;
  last = 0;
  running = false;
  overlay: Overlay = "title";
  level!: LevelDef;
  movers: Mover[] = [];
  coins: { x: number; y: number; taken: boolean; id: string }[] = [];
  checkpoints: { x: number; y: number; lit: boolean }[] = [];
  guards: Guard[] = [];
  darts: DartLive[] = [];
  riddles: RiddleSpot[] = [];
  doors: DoorSpot[] = [];
  levers: LeverSpot[] = [];
  npcs: NpcSpot[] = [];
  stats: CharacterDef = CHAR_BY_ID.fox;
  returnTo: { id: number; x: number; y: number } | null = null;
  originSnap: OriginSnap | null = null;
  companions: Companion[] = [];
  pickMode: "play" | "lantern" = "play";
  doorCool = 0;
  player!: Player;
  camX = 0;
  camY = 0;
  lookX = 0;
  trauma = 0;
  particles: Particle[] = [];
  time = 0;
  deaths = 0;
  reducedMotion = false;
  godMode = false;
  npcClap = 0;
  npcDone = false;
  hallPhase: "idle" | "clap" | "gather" | "talk" | "write" | "done" = "idle";
  talkIndex = 0;
  talkTimer = 0;
  gatherT = 0;
  ceremonyLock = false;
  ceremonyTalked = false;
  clapPlayed = false;
  lastSignedName: string | null = null;
  playerTarget: { x: number; y: number } | null = null;
  consume = 0;
  lastHudOverlay: Overlay | null = null;
  hallGate = false;
  hallNote = false;
  hallLeftDais = true;
  introLock = false;
  pendingFame: string | null = null;
  passedGuards = new Set<number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D není dostupné");
    this.ctx = ctx;
    this.input.attach(canvas);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.loadLevel(0, false);
    this.syncHud();
    this.resize();
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVis);
    this.wireControlsTest();
  }

  async start() {
    this.assets = await loadAssets();
    try {
      const rows = await listLegends();
      useHud.getState().patch({ legends: rows });
    } catch {
      /* preview without DB still plays */
    }
    useHud.getState().patch({ ready: true });
    if (!useHud.getState().seenIntro) this.beginIntro();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach(this.canvas);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVis);
    if (window.__controlsTest) delete window.__controlsTest;
  }

  private get pw() {
    return this.stats.w;
  }
  private get ph() {
    return this.stats.h;
  }

  play(levelId: number) {
    this.audio.unlock();
    const hud = useHud.getState();
    if (!canEnterLevel(hud, levelId) && !hud.cheated) return;
    this.applyCharacter(hud.character);
    const def = findLevel(levelId, LEVELS);
    if (!def.secret && !def.hall) this.originSnap = null;
    if (!def.secret) hud.resetLevelDeaths();
    this.loadLevel(levelId, true);
    this.setPlayOverlay("playing");
    this.syncHud();
  }

  requestPlay(levelId: number) {
    this.audio.unlock();
    const hud = useHud.getState();
    if (!canEnterLevel(hud, levelId) && !hud.cheated) return;
    this.pickMode = "play";
    hud.patch({ pendingLevel: levelId, overlay: "pick", pickMode: "play" });
    this.setPlayOverlay("pick");
    this.syncHud();
  }

  confirmPick(id: CharacterId) {
    const hud = useHud.getState();
    if (!hud.owned.includes(id)) return;
    const feet = this.player ? this.player.spawnY + this.ph : 0;
    hud.setCharacter(id);
    this.applyCharacter(id);
    if (this.pickMode === "lantern") {
      if (this.player) this.player.spawnY = feet - this.ph;
      this.respawn();
      return;
    }
    this.play(hud.pendingLevel);
  }

  startWithCharacter(id: CharacterId, levelId = 0) {
    useHud.getState().setCharacter(id);
    this.play(levelId);
  }

  continueCheckpoint() {
    if (this.overlay !== "dead" && this.overlay !== "pick") return;
    this.afterDeath();
  }

  continueWith(id: CharacterId) {
    const hud = useHud.getState();
    if (!hud.owned.includes(id)) return;
    const feet = this.player.spawnY + this.ph;
    hud.setCharacter(id);
    this.applyCharacter(id);
    this.player.spawnY = feet - this.ph;
    this.respawn();
  }

  leaveShop() {
    if (this.level.secret && this.originSnap) {
      this.returnFromSecret();
      return;
    }
    const next = this.level.id + 1;
    if (this.level.id < MAIN_LEVELS - 1 && next < MAIN_LEVELS) {
      this.requestPlay(next);
      return;
    }
    this.goMenu("title");
  }

  submitRiddle(answer: string) {
    const id = useHud.getState().riddleId;
    if (!id) return false;
    if (!useHud.getState().solveRiddle(id, answer)) return false;
    this.audio.key();
    this.burst(this.player.x + this.pw / 2, this.player.y, 18, "#f0c35a");
    this.setPlayOverlay("playing");
    useHud.getState().patch({ riddleId: null });
    this.syncHud();
    return true;
  }

  closeRiddle() {
    this.setPlayOverlay("playing");
    useHud.getState().patch({ riddleId: null });
    this.syncHud();
  }

  submitFame(name: string) {
    const hud = useHud.getState();
    if (hud.legendSigned) {
      this.closeHall();
      return;
    }
    const n = name.trim().slice(0, 12);
    if (!n) return;
    this.pendingFame = n;
    const { score, coins } = runTotals(hud);
    const cheated = hud.cheated;
    const runId = hud.completionId ?? hud.runId;
    hud.patch({ completionId: runId });
    void addLegend({
      data: { name: n, score: cheated ? 0 : score, coins: cheated ? 0 : coins, cheater: cheated, runId },
    })
      .then((rows) => {
        hud.signLegend(n, score, coins);
        this.lastSignedName = n;
        this.audio.win();
        this.burst(HALL_LAYOUT.cx, 180, 22, "#e8d6b4");
        useHud.getState().patch({ legends: rows });
        this.closeHall();
      })
      .catch(() => {
        useHud.getState().patch({ banner: "Zápis se nepodařil. Zkus to znovu." });
      });
  }

  closeHall() {
    this.overlay = "playing";
    this.npcDone = true;
    this.npcClap = 0;
    this.hallPhase = "done";
    this.ceremonyLock = false;
    this.ceremonyTalked = true;
    this.hallLeftDais = false;
    this.syncHud();
  }

  beginIntro() {
    this.loadLevel(14, true);
    this.overlay = "intro";
    this.introLock = true;
    this.camX = HALL_LAYOUT.introCamX;
    this.camY = 0;
    this.syncHud();
  }

  dismissIntro() {
    this.introLock = false;
    useHud.getState().markIntroSeen();
    this.goMenu("title");
  }

  newGame() {
    this.godMode = false;
    useHud.getState().newGame();
    this.beginIntro();
  }

  endCompletedGame() {
    this.newGame();
  }

  advanceEpilogue() {
    useHud.getState().patch({ epilogueStep: useHud.getState().epilogueStep + 1 });
  }

  seekCreatorsCave() {
    useHud.getState().patch({ unlocked: MAIN_LEVELS, overlay: "levels" });
    this.goMenu("levels");
  }

  applyCheat(code: string) {
    const hud = useHud.getState();
    const raw = code.trim().toUpperCase();
    if (raw === "IDDQD") {
      this.godMode = !this.godMode;
      hud.markCheated();
      hud.patch({ banner: this.godMode ? "Nesmrtelnost" : "Smrtelnost zpět" });
      this.audio.key();
      return;
    }
    if (raw === "DOOM") {
      hud.markCheated();
      for (const g of this.guards) {
        g.dead = true;
        g.squish = 0.22;
      }
      for (const d of this.darts) d.gone = true;
      this.audio.stomp();
      hud.patch({ banner: "DOOM" });
      return;
    }
    if (raw === "IDKFA") {
      hud.ownAll();
      this.audio.key();
      return;
    }
    if (raw === "IAAAY") {
      hud.devUnlock();
      this.audio.key();
      return;
    }
    if (raw === "MAYOFF") {
      this.godMode = false;
      hud.mayOff();
      const s = useHud.getState();
      this.applyCharacter(s.character);
      if (!canEnterLevel(s, this.level.id)) this.goMenu("title");
      this.audio.key();
    }
  }

  private applyCharacter(id: CharacterId) {
    this.stats = CHAR_BY_ID[id] ?? CHAR_BY_ID.fox;
  }

  private loadLevel(id: number, resetPlayer: boolean) {
    const def = findLevel(id, LEVELS);
    this.level = def;
    this.movers = def.movers.map((m) => ({ ...m, t: 0 }));
    this.coins = def.coins.map((c, i) => {
      const id = coinId(def.id, i);
      const taken = (useHud.getState().collectedCoins[String(def.id)] ?? []).includes(id);
      return { ...c, id, taken };
    });
    this.checkpoints = def.checkpoints.map((c) => ({ ...c, lit: false }));
    this.guards = def.guards.map((g) => ({
      ...g,
      dir: 1,
      dead: false,
      squish: 1,
      anim: 0,
      carrying: false,
    }));
    const extra = LEVEL_EXTRAS[def.id] ?? {};
    this.riddles = (def.riddles ?? extra.riddles ?? []).map((r) => ({ ...r }));
    this.doors = (def.doors ?? extra.doors ?? []).map((d) => ({ ...d }));
    this.levers = (def.levers ?? extra.levers ?? []).map((l) => ({ ...l }));
    this.darts = (def.darts ?? extra.darts ?? []).map((d) => ({ ...d, t: d.phase ?? 0, gone: false }));
    this.npcs = (def.npcs ?? []).map((n) => ({ ...n }));
    this.companions = [];
    this.hallPhase = useHud.getState().legendSigned && def.hall ? "done" : "idle";
    this.ceremonyLock = false;
    this.ceremonyTalked = Boolean(def.hall && useHud.getState().legendSigned);
    this.clapPlayed = false;
    this.npcClap = 0;
    this.playerTarget = null;
    this.talkIndex = 0;
    this.talkTimer = 0;
    this.hallGate = false;
    this.hallNote = false;
    this.passedGuards = new Set();
    this.introLock = this.overlay === "intro";
    if (def.hall) {
      const owned = useHud.getState().owned;
      const current = useHud.getState().character;
      let i = 0;
      for (const id of owned) {
        if (id === current) continue;
        this.companions.push({
          id,
          x: def.spawn.x - 50 - i * 46,
          y: def.spawn.y,
          facing: 1,
          anim: i * 0.2,
        });
        i++;
      }
    }
    this.particles = [];
    this.trauma = 0;
    this.applyCharacter(useHud.getState().character);
    if (resetPlayer || !this.player) {
      this.player = {
        x: def.spawn.x,
        y: def.spawn.y,
        vx: 0,
        vy: 0,
        facing: 1,
        grounded: false,
        jumpsLeft: this.stats.extraJumps,
        coyote: 0,
        buffer: 0,
        dropTimer: 0,
        riding: null,
        squash: 1,
        anim: 0,
        deadTimer: 0,
        spawnX: def.spawn.x,
        spawnY: def.spawn.y,
        invuln: 0,
        curled: false,
        flying: false,
        carried: false,
        carryT: 0,
        flyHurt: false,
        airFragile: false,
        usedDouble: false,
        carryTx: 0,
        carryTy: 0,
        prevBottom: def.spawn.y + this.stats.h,
      };
      if (!this.introLock) this.camX = Math.max(0, def.spawn.x - VIEW_W * 0.35);
      this.camY = 0;
      if (!this.level.secret) this.deaths = 0;
    }
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const raw = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS) {
      this.step(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private step(dt: number) {
    this.time += dt;
    const hud = useHud.getState();
    if (hud.muted !== this.audio.muted) this.audio.setMuted(hud.muted);

    const actions = this.input.sample();
    const cheat = this.input.sampleCheat();
    if (cheat) this.applyCheat(cheat);
    if (this.consume > 0) {
      this.consume = Math.max(0, this.consume - dt);
      actions.jumpPressed = false;
      actions.abilityPressed = false;
      actions.confirm = false;
      actions.jump = false;
      actions.ability = false;
    }
    if (this.overlay === "playing") {
      if (actions.pause) {
        this.setPlayOverlay("paused");
        this.syncHud();
        return;
      }
      if (actions.restart) {
        this.requestPlay(this.level.id);
        return;
      }
      this.simulate(dt, actions);
      if (this.level.hall) this.tickHall(dt, actions);
    } else if (this.overlay === "dead") {
      this.tickDeath(dt, actions);
    } else {
      this.animateWorld(dt);
      if ((this.overlay === "hall" || this.overlay === "intro") && !this.introLock) this.updateCamera(dt);
      if (this.overlay === "intro" && this.introLock) {
        this.camX = HALL_LAYOUT.introCamX;
        this.camY = 0;
      }
      if (this.overlay === "paused" && (actions.pause || actions.confirm)) {
        this.setPlayOverlay("playing");
        this.syncHud();
      }
    }
    this.updateParticles(dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
  }

  private animateWorld(dt: number) {
    for (const m of this.movers) m.t += m.speed * dt;
    this.syncMovers();
    for (const g of this.guards) {
      g.anim += dt;
      if (g.dead) {
        g.squish = Math.max(0.12, g.squish - dt * 4);
        continue;
      }
      if (g.carrying) continue;
      g.x += g.dir * g.speed * dt;
      if (g.x <= g.minX) {
        g.x = g.minX;
        g.dir = 1;
      } else if (g.x + g.w >= g.maxX) {
        g.x = g.maxX - g.w;
        g.dir = -1;
      }
    }
    for (const c of this.companions) {
      c.anim += dt;
      if (this.ceremonyLock) continue;
      const p = this.player;
      if (!p || p.deadTimer > 0) continue;
      const i = this.companions.indexOf(c);
      const gap = 46 + i * 42;
      const tx = Math.max(8, Math.min(this.level.width - 40, p.x - p.facing * gap));
      const ty = p.y + this.ph - CHAR_BY_ID[c.id].h;
      const dx = tx - c.x;
      c.x += dx * Math.min(1, dt * 5.2);
      c.y += (ty - c.y) * Math.min(1, dt * 6.5);
      if (Math.abs(dx) > 6) c.facing = dx > 0 ? 1 : -1;
    }
    if (this.player) this.player.anim += dt;
  }

  private tickDeath(dt: number, actions: { restart: boolean; confirm: boolean; jumpPressed: boolean }) {
    const p = this.player;
    if (p.deadTimer > 0) {
      p.deadTimer -= dt;
      p.vy += GRAVITY_DOWN * dt;
      p.y += p.vy * dt;
      if (p.deadTimer <= 0) {
        this.afterDeath();
        return;
      }
    }
    this.animateWorld(dt);
    this.updateCamera(dt);
    if (actions.restart) {
      this.requestPlay(this.level.id);
      return;
    }
    if (actions.confirm || actions.jumpPressed) this.afterDeath();
  }

  private simulate(dt: number, actions: Actions) {
    const p = this.player;
    const st = this.stats;
    if (p.deadTimer > 0) {
      p.deadTimer -= dt;
      p.vy += GRAVITY_DOWN * dt;
      p.y += p.vy * dt;
      if (p.deadTimer <= 0) this.afterDeath();
      this.animateWorld(dt);
      this.updateCamera(dt);
      return;
    }

    if (p.carried) {
      this.tickCarry(dt);
      this.animateWorld(dt);
      this.updateCamera(dt);
      return;
    }

    if (this.ceremonyLock) {
      this.nudgeHeroes(dt);
      this.animateWorld(dt);
      this.updateCamera(dt);
      return;
    }

    this.animateWorld(dt);
    p.curled = st.ability === "curl" && actions.ability;
    p.flying = st.ability === "fly" && actions.ability;
    if (p.flying) p.airFragile = true;
    this.tickDarts(dt);
    this.doorCool = Math.max(0, this.doorCool - dt);
    const ride = p.riding;
    if (ride) {
      const prevX = ride.axis === "x" ? pingpong(ride.t - ride.speed * dt, ride.min, ride.max) : ride.x;
      const prevY = ride.axis === "y" ? pingpong(ride.t - ride.speed * dt, ride.min, ride.max) : ride.y;
      p.x += ride.x - prevX;
      p.y += ride.y - prevY;
    }
    p.riding = null;

    if (actions.abilityPressed) this.useAbility();

    const speed = p.curled ? st.runSpeed * 0.72 : st.runSpeed;
    const accel = p.grounded ? GROUND_ACCEL : AIR_ACCEL;
    if (actions.moveX !== 0 && !p.curled) {
      p.vx += actions.moveX * accel * dt;
      p.facing = actions.moveX > 0 ? 1 : -1;
    } else if (actions.moveX !== 0 && p.curled) {
      p.vx += actions.moveX * accel * 0.45 * dt;
      p.facing = actions.moveX > 0 ? 1 : -1;
    } else {
      const fric = p.grounded ? GROUND_FRICTION : AIR_DRAG;
      const s = Math.sign(p.vx);
      p.vx -= s * fric * dt;
      if (Math.sign(p.vx) !== s) p.vx = 0;
    }
    p.vx = Math.max(-speed, Math.min(speed, p.vx));

    if (p.grounded) {
      p.coyote = COYOTE_TIME;
      p.jumpsLeft = st.extraJumps;
    } else {
      p.coyote = Math.max(0, p.coyote - dt);
    }
    if (actions.jumpPressed && st.canJump && !p.curled) p.buffer = JUMP_BUFFER;
    else p.buffer = Math.max(0, p.buffer - dt);
    p.dropTimer = Math.max(0, p.dropTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);

    if (actions.down && actions.jumpPressed && p.grounded) {
      p.dropTimer = DROP_THROUGH_TIME;
      p.grounded = false;
      p.coyote = 0;
      p.buffer = 0;
    } else if (st.canJump && !p.curled && !p.flying && p.buffer > 0 && (p.grounded || p.coyote > 0)) {
      this.doJump(false);
    } else if (st.canJump && !p.curled && !p.flying && p.buffer > 0 && p.jumpsLeft > 0 && !p.grounded) {
      this.doJump(true);
    }

    if (!actions.jump && p.vy < 0 && !p.flying) p.vy *= Math.pow(JUMP_CUT, dt * 8);

    if (p.flying) {
      p.vy -= FLY_ACCEL * dt;
      if (actions.down) p.vy += FLY_ACCEL * 0.8 * dt;
      p.vy = Math.max(-FLY_MAX, Math.min(FLY_MAX, p.vy));
    } else {
      let g = p.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
      if (Math.abs(p.vy) < APEX_THRESHOLD) g = APEX_GRAVITY;
      p.vy = Math.min(TERMINAL_VEL, p.vy + g * dt);
    }

    p.squash += ((p.grounded ? 1 : p.vy < 0 ? 1.12 : 0.92) - p.squash) * (1 - Math.exp(-14 * dt));
    p.anim += dt * (p.grounded ? 1 + Math.abs(p.vx) / 140 : 1.4);

    const wasGrounded = p.grounded;
    const fallSpeed = p.vy;
    const startX = p.x;
    p.prevBottom = p.y + this.ph;
    p.grounded = false;
    const steps = Math.max(1, Math.ceil((Math.abs(p.vx) + Math.abs(p.vy)) * dt / 10));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      p.x += p.vx * sdt;
      const hitX = this.collideAxis("x");
      if (hitX && p.airFragile) p.flyHurt = true;
      p.y += p.vy * sdt;
      const hitY = this.collideAxis("y");
      if (hitY && p.airFragile && !p.grounded) p.flyHurt = true;
    }

    if (p.grounded && !wasGrounded && fallSpeed >= 0) {
      if (st.ability === "fly" && p.airFragile && fallSpeed > HARD_LAND) {
        this.kill();
        return;
      }
      p.airFragile = false;
      this.audio.land();
      this.burst(p.x + this.pw / 2, p.y + this.ph, 6, "#d4c4a8");
      p.squash = 0.78;
      this.awardCrossing(startX, p.x, p.usedDouble);
      p.usedDouble = false;
    }
    if (p.flyHurt && p.airFragile) {
      this.kill();
      return;
    }
    p.flyHurt = false;

    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + this.pw > this.level.width) {
      p.x = this.level.width - this.pw;
      p.vx = 0;
    }

    this.collect();
    this.updateCamera(dt);

    if (p.y > this.level.height + 40) this.kill();
  }

  private doJump(isDouble: boolean) {
    const p = this.player;
    const st = this.stats;
    if (!st.canJump) return;
    p.vy = isDouble ? st.doubleJumpVel : st.jumpVel;
    p.grounded = false;
    p.coyote = 0;
    p.buffer = 0;
    p.dropTimer = 0;
    p.riding = null;
    p.squash = 1.18;
    if (isDouble) {
      p.jumpsLeft -= 1;
      p.usedDouble = true;
      this.audio.doubleJump();
      this.burst(p.x + this.pw / 2, p.y + this.ph, 8, "#efe8dc");
    } else {
      this.audio.jump();
      this.burst(p.x + this.pw / 2, p.y + this.ph, 5, "#c4b49a");
    }
  }

  private useAbility() {
    const p = this.player;
    const st = this.stats;
    const hit = { x: p.x - 20, y: p.y - 12, w: this.pw + 40, h: this.ph + 24 };
    if (this.tryLanternSwap(hit, st.ability)) return;
    if (st.ability === "riddle") {
      const paper = this.riddles.find((r) => aabb(hit, { x: r.x - 28, y: r.y - 36, w: 56, h: 56 }));
      if (!paper) return;
      if (paper.id === "hall-note") {
        this.hallNote = true;
        this.audio.key();
        this.burst(paper.x, paper.y, 12, "#f0c35a");
        useHud.getState().patch({ hint: "Cesta k trůnům je volná" });
        return;
      }
      if (paper.id === "alencina" && !canReadFinalRiddle(useHud.getState())) {
        useHud.getState().patch({ hint: "Nejdřív pět pák z bonusů" });
        return;
      }
      if (useHud.getState().solved.includes(paper.id)) {
        useHud.getState().patch({ hint: "Už vyřešeno" });
        return;
      }
      this.audio.riddle();
      this.setPlayOverlay("riddle");
      useHud.getState().patch({ riddleId: paper.id, overlay: "riddle" });
      this.syncHud();
      return;
    }
    if (st.ability === "door") {
      const door = this.doors.find((d) => aabb(hit, { x: d.x - 24, y: d.y - 90, w: 72, h: 110 }));
      if (!door) return;
      if (door.keyId === "hall-gate") {
        this.hallGate = true;
        this.audio.door();
        useHud.getState().patch({ hint: "Brána se otevřela" });
        return;
      }
      if (!this.doorReady(door)) {
        useHud.getState().patch({
          hint: door.keyId === "hall" ? "Nejprve Alenčina hádanka" : "Chybí klíč",
        });
        return;
      }
      const hud = useHud.getState();
      if (door.keyId === "hall" && hud.owned.length < 5 && !hud.cheated) {
        useHud.getState().patch({ hint: "Potřebujete všechny postavy" });
        return;
      }
      this.audio.door();
      hud.openDoor(door.keyId);
      const secret = door.keyId === "hall" ? 14 : RIDDLE_BY_ID[door.keyId]?.secretLevel;
      if (secret == null) return;
      this.enterSecret(secret);
      return;
    }
    if (st.ability === "charm") {
      this.tryCharm();
    }
  }

  private tryLanternSwap(hit: Rect, ability: string) {
    const at = this.checkpoints.find((cp) => cp.lit && aabb(hit, { x: cp.x - 48, y: cp.y - 120, w: 96, h: 124 }));
    if (!at) return false;
    if (ability === "riddle" && this.riddles.some((r) => aabb(hit, { x: r.x - 28, y: r.y - 36, w: 56, h: 56 }))) {
      return false;
    }
    if (ability === "door" && this.doors.some((d) => this.doorVisible(d) && aabb(hit, { x: d.x - 24, y: d.y - 90, w: 72, h: 110 }))) {
      return false;
    }
    this.player.spawnX = at.x - this.pw / 2;
    this.player.spawnY = at.y - this.ph - 2;
    this.pickMode = "lantern";
    this.setPlayOverlay("pick");
    useHud.getState().patch({ overlay: "pick", pickMode: "lantern" });
    this.syncHud();
    return true;
  }

  private doorReady(door: DoorSpot) {
    return canOpenDoor(useHud.getState(), door.keyId, true);
  }

  private doorVisible(door: DoorSpot) {
    if (door.keyId === "hall-gate") return !this.hallGate;
    return doorIsVisible(useHud.getState(), door.keyId);
  }

  private enterSecret(secretId: number) {
    if (secretId === this.level.id) return;
    const p = this.player;
    this.originSnap = {
      id: this.level.id,
      x: p.x,
      y: p.y,
      spawnX: p.spawnX,
      spawnY: p.spawnY,
      lanterns: this.checkpoints.map((c) => c.lit),
      deaths: useHud.getState().levelDeaths,
      character: useHud.getState().character,
    };
    this.pickMode = "play";
    useHud.getState().resetLevelDeaths();
    useHud.getState().patch({ pendingLevel: secretId, overlay: "pick", pickMode: "play" });
    this.setPlayOverlay("pick");
    this.syncHud();
  }

  private returnFromSecret() {
    const snap = this.originSnap;
    if (!snap) {
      this.goMenu("title");
      return;
    }
    this.originSnap = null;
    this.loadLevel(snap.id, true);
    const p = this.player;
    p.x = snap.x + 80;
    p.y = snap.y;
    p.spawnX = snap.spawnX;
    p.spawnY = snap.spawnY;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 0.8;
    this.doorCool = 1.6;
    for (let i = 0; i < this.checkpoints.length; i++) this.checkpoints[i].lit = Boolean(snap.lanterns[i]);
    useHud.getState().patch({ levelDeaths: snap.deaths, deaths: snap.deaths });
    this.deaths = snap.deaths;
    this.setPlayOverlay("playing");
    this.syncHud();
  }

  private tryCharm() {
    const p = this.player;
    const hit = { x: p.x - 36, y: p.y - 8, w: this.pw + 72, h: this.ph + 16 };
    const g = this.guards.find((q) => !q.dead && !q.carrying && aabb(hit, q));
    if (!g) return;
    this.startCarry(g);
  }

  private startCarry(g: Guard) {
    const p = this.player;
    g.carrying = true;
    p.carried = true;
    p.carryT = 0;
    p.vx = 0;
    p.vy = 0;
    const ahead = this.checkpoints
      .filter((c) => c.x > p.x + 40)
      .sort((a, b) => a.x - b.x)[0];
    p.carryTx = ahead ? ahead.x : this.level.flag.x - 80;
    p.carryTy = ahead ? ahead.y - this.ph - 2 : this.level.flag.y - this.ph - 2;
    this.audio.ability();
    this.burst(p.x + this.pw / 2, p.y, 14, "#e07090");
  }

  private tickCarry(dt: number) {
    const p = this.player;
    const g = this.guards.find((q) => q.carrying);
    p.carryT += dt;
    if (Math.floor(p.carryT * 8) !== Math.floor((p.carryT - dt) * 8)) {
      this.burst(p.x + this.pw / 2, p.y - 10, 2, "#e07090");
    }
    const targetX = p.carryTx;
    const targetY = p.carryTy;
    const speed = 180;
    const dx = targetX - (p.x + this.pw / 2);
    if (Math.abs(dx) < 18) {
      p.x = targetX - this.pw / 2;
      p.y = targetY;
      p.carried = false;
      p.invuln = 1.2;
      if (g) {
        g.carrying = false;
        g.x = Math.max(g.minX, Math.min(g.maxX - g.w, p.x + 50));
      }
      const ahead = this.checkpoints.find((c) => Math.abs(c.x - targetX) < 24);
      if (ahead && !ahead.lit) {
        ahead.lit = true;
        p.spawnX = ahead.x - this.pw / 2;
        p.spawnY = ahead.y - this.ph - 2;
        this.audio.checkpoint();
        useHud.getState().claimEvent(`${this.level.id}:cp:${this.checkpoints.indexOf(ahead)}`, SCORE.checkpoint);
      }
      this.syncHud();
      return;
    }
    const dir = Math.sign(dx);
    p.x += dir * speed * dt;
    p.y += (targetY - 40 - p.y) * (1 - Math.exp(-6 * dt));
    p.facing = dir >= 0 ? 1 : -1;
    if (g) {
      g.x = p.x - 8;
      g.y = p.y - 8;
      g.dir = dir >= 0 ? 1 : -1;
    }
  }

  private tickDarts(dt: number) {
    const p = this.player;
    const hit = { x: p.x, y: p.y, w: this.pw, h: this.ph };
    for (const d of this.darts) {
      if (d.gone) continue;
      d.t += d.speed * dt;
      if (d.axis === "x") d.x = pingpong(d.t, d.min, d.max);
      else d.y = pingpong(d.t, d.min, d.max);
      const box = { x: d.x - 14, y: d.y - 10, w: 28, h: 20 };
      if (!aabb(hit, box)) continue;
      if (p.curled) {
        d.gone = true;
        this.audio.stomp();
        this.burst(d.x, d.y, 10, "#c4b49a");
        continue;
      }
      if (p.invuln > 0 || p.carried) continue;
      this.kill();
      return;
    }
  }

  private solids(): (Platform | Mover)[] {
    return [...this.level.platforms, ...this.movers, ...this.gateWalls()];
  }

  private gateWalls(): Platform[] {
    const walls: Platform[] = [];
    if (this.level.hall && !this.hallGate) {
      walls.push({ x: 1960, y: 400, w: 48, h: 220, kind: "solid" });
    }
    if (this.level.hall && !this.hallNote) {
      walls.push({ x: 2480, y: 400, w: 48, h: 220, kind: "solid" });
    }
    return walls;
  }

  private collideAxis(axis: "x" | "y"): boolean {
    const p = this.player;
    const box = { x: p.x, y: p.y, w: this.pw, h: this.ph };
    let hit = false;
    for (const s of this.solids()) {
      const kind = "kind" in s ? s.kind : "oneway";
      if (!aabb(box, s)) continue;
      if (axis === "x") {
        if (kind === "oneway") continue;
        if (p.vx > 0) p.x = s.x - this.pw;
        else if (p.vx < 0) p.x = s.x + s.w;
        p.vx = 0;
        box.x = p.x;
        hit = true;
      } else {
        const fromAbove = p.vy >= 0 && box.y + this.ph - p.vy * FIXED_DT <= s.y + 8;
        if (kind === "oneway") {
          if (p.dropTimer > 0) continue;
          if (!fromAbove) continue;
        }
        if (p.vy > 0 || fromAbove) {
          p.y = s.y - this.ph;
          p.vy = 0;
          p.grounded = true;
          if (!("kind" in s)) p.riding = s;
          box.y = p.y;
        } else if (p.vy < 0 && kind === "solid") {
          p.y = s.y + s.h;
          p.vy = 0;
          box.y = p.y;
          hit = true;
        }
      }
    }
    return hit;
  }

  private collect() {
    const p = this.player;
    const hit = { x: p.x, y: p.y, w: this.pw, h: this.ph };
    for (const c of this.coins) {
      if (c.taken) continue;
      const coin = { x: c.x - COIN_R, y: c.y - COIN_R, w: COIN_R * 2, h: COIN_R * 2 };
      if (aabb(hit, coin)) {
        c.taken = true;
        useHud.getState().collectCoin(this.level.id, c.id);
        this.audio.coin();
        this.burst(c.x, c.y, 10, "#f0c35a");
        this.syncHud();
      }
    }
    for (const cp of this.checkpoints) {
      const box = { x: cp.x - 48, y: cp.y - 120, w: 96, h: 124 };
      if (!cp.lit && aabb(hit, box)) {
        cp.lit = true;
        p.spawnX = cp.x - this.pw / 2;
        p.spawnY = cp.y - this.ph - 2;
        this.audio.checkpoint();
        this.burst(cp.x, cp.y - 40, 12, "#f0c35a");
        useHud.getState().claimEvent(
          `${this.level.id}:cp:${this.checkpoints.indexOf(cp)}`,
          SCORE.checkpoint,
        );
        this.syncHud();
      } else if (cp.lit && aabb(hit, box)) {
        useHud.getState().patch({ hint: "Mezerník: vyměnit hrdinu" });
      }
    }
    const f = this.level.flag;
    if (!this.level.hall) {
      const flagBox = { x: f.x - 16, y: f.y - 96, w: 48, h: 96 };
      if (aabb(hit, flagBox)) {
        this.audio.win();
        this.audio.flag();
        const coins = this.coins.filter((c) => c.taken).length;
        useHud.getState().recordWin(this.level.id, coins);
        useHud.getState().claimEvent(`${this.level.id}:flag`, SCORE.flag);
        this.burst(f.x, f.y - 50, 24, "#d4c4a8");
        if (this.level.id === MAIN_LEVELS - 1 && !this.level.secret) {
          this.setPlayOverlay("epilogue");
          useHud.getState().patch({ overlay: "epilogue", epilogueStep: 0, unlocked: MAIN_LEVELS });
        } else {
          this.setPlayOverlay("shop");
        }
        this.syncHud();
        return;
      }
    }
    this.touchPapers(hit);
    this.touchDoors(hit);
    this.touchLevers(hit);
    this.touchNpcs(hit);
    this.touchGuards();
    if (p.invuln > 0) return;
    if (p.curled) return;
    for (const s of this.level.spikes) {
      const box = {
        x: s.x + SPIKE_INSET,
        y: s.y + SPIKE_INSET,
        w: s.w - SPIKE_INSET * 2,
        h: s.h - SPIKE_INSET,
      };
      if (aabb(hit, box)) {
        this.kill();
        return;
      }
    }
  }

  private touchPapers(hit: Rect) {
    if (this.stats.ability === "riddle") return;
    for (const r of this.riddles) {
      if (aabb(hit, { x: r.x - 28, y: r.y - 36, w: 56, h: 56 })) {
        useHud.getState().patch({ hint: "Jen liška to přečte" });
        return;
      }
    }
  }

  private touchDoors(hit: Rect) {
    if (this.doorCool > 0) return;
    for (const d of this.doors) {
      if (!this.doorVisible(d)) continue;
      const box = { x: d.x - 24, y: d.y - 90, w: 72, h: 110 };
      if (!aabb(hit, box)) continue;
      if (this.stats.ability !== "door") {
        useHud.getState().patch({ hint: "Jen kapibara dveře otevře" });
      }
    }
  }

  private touchLevers(hit: Rect) {
    const hud = useHud.getState();
    for (const l of this.levers) {
      if (hud.levers[l.id]) continue;
      if (!aabb(hit, { x: l.x - 20, y: l.y - 56, w: 48, h: 64 })) continue;
      hud.pullLever(l.id);
      this.audio.lever();
      this.burst(l.x, l.y - 20, 16, "#f0c35a");
      this.syncHud();
    }
  }

  private touchNpcs(_hit: Rect) {
    /* hall flow lives in tickHall */
  }

  private touchGuards() {
    const p = this.player;
    const hit = { x: p.x, y: p.y, w: this.pw, h: this.ph };
    for (const g of this.guards) {
      if (g.dead || g.squish < 0.45 || g.carrying) continue;
      if (!aabb(hit, g)) continue;
      if (p.curled) {
        g.dead = true;
        g.squish = 0.4;
        this.audio.stomp();
        this.burst(g.x + g.w / 2, g.y, 12, "#c4b49a");
        this.killGuardScore(g, true);
        continue;
      }
      if (this.stats.ability === "charm") {
        this.startCarry(g);
        return;
      }
      const fromAbove = p.vy > 80 && p.prevBottom <= g.y + 12;
      if (fromAbove) {
        g.dead = true;
        g.squish = 0.4;
        p.vy = this.stats.jumpVel * 0.62 || -420;
        p.grounded = false;
        p.jumpsLeft = Math.max(p.jumpsLeft, 1);
        this.audio.stomp();
        this.burst(g.x + g.w / 2, g.y, 12, "#c4b49a");
        this.killGuardScore(g, true);
        continue;
      }
      if (p.invuln > 0) continue;
      this.kill();
      return;
    }
    this.noteGuardPasses();
  }

  private kill() {
    if (this.godMode) return;
    const p = this.player;
    if (p.deadTimer > 0) return;
    p.deadTimer = 1.15;
    p.vy = -280;
    p.vx *= 0.3;
    p.carried = false;
    this.deaths += 1;
    useHud.getState().addDeath();
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.audio.die();
    this.burst(p.x + this.pw / 2, p.y + this.ph / 2, 16, "#c45c4a");
    this.setPlayOverlay("dead");
    this.syncHud();
  }

  private afterDeath() {
    this.input.setTouch("clear", false);
    this.input.keys.clear();
    this.consume = 0.25;
    if (useHud.getState().owned.length > 1) {
      this.pickMode = "lantern";
      this.player.deadTimer = 0;
      this.player.x = this.player.spawnX;
      this.player.y = this.player.spawnY;
      this.player.vx = 0;
      this.player.vy = 0;
      this.setPlayOverlay("pick");
      useHud.getState().patch({ pickMode: "lantern" });
      this.syncHud();
      return;
    }
    this.respawn();
  }

  private respawn() {
    const p = this.player;
    p.x = p.spawnX;
    p.y = p.spawnY;
    p.vx = 0;
    p.vy = 0;
    p.deadTimer = 0;
    p.invuln = 1.15;
    p.grounded = false;
    p.jumpsLeft = this.stats.extraJumps;
    p.riding = null;
    p.curled = false;
    p.flying = false;
    p.carried = false;
    p.airFragile = false;
    p.flyHurt = false;
    p.usedDouble = false;
    p.carryTx = 0;
    p.carryTy = 0;
    const box = { x: p.x, y: p.y, w: this.pw, h: this.ph };
    for (const g of this.guards) {
      if (!g.dead && aabb(box, g)) {
        g.x = g.minX;
        g.dir = 1;
      }
    }
    this.setPlayOverlay("playing");
    this.syncHud();
  }

  private setPlayOverlay(next: Overlay) {
    if (this.overlay !== next) {
      this.input.setTouch("clear", false);
      this.input.keys.clear();
      this.consume = 0.22;
    }
    this.overlay = next;
  }

  private awardCrossing(fromX: number, toX: number, usedDouble: boolean) {
    const hud = useHud.getState();
    const left = Math.min(fromX, toX);
    const right = Math.max(fromX, toX);
    this.level.spikes.forEach((s, i) => {
      if (left <= s.x && right >= s.x + s.w) {
        hud.claimEvent(`${this.level.id}:hz:${i}`, SCORE.hazard);
        if (usedDouble && s.w > 180) hud.claimEvent(`${this.level.id}:dj:${i}`, SCORE.doubleJump);
      }
    });
  }

  private killGuardScore(g: Guard, killed: boolean) {
    const i = this.guards.indexOf(g);
    const hud = useHud.getState();
    if (killed) {
      hud.claimEvent(`${this.level.id}:gk:${i}`, SCORE.guardKill);
      hud.claimEvent(`${this.level.id}:gp:${i}`, 0);
      this.passedGuards.add(i);
    }
  }

  private noteGuardPasses() {
    const p = this.player;
    const hud = useHud.getState();
    this.guards.forEach((g, i) => {
      if (g.dead || this.passedGuards.has(i)) return;
      if (p.x > g.maxX + 20) {
        this.passedGuards.add(i);
        hud.claimEvent(`${this.level.id}:gp:${i}`, SCORE.guardPass);
        hud.claimEvent(`${this.level.id}:gk:${i}`, 0);
      }
    });
  }

  restartLevel() {
    this.requestPlay(this.level.id);
  }

  goMenu(next: Overlay = "title") {
    this.introLock = false;
    this.setPlayOverlay(next === "levels" || next === "pick" || next === "shop" ? next : "title");
    this.originSnap = null;
    this.loadLevel(0, true);
    this.syncHud();
  }

  private syncMovers() {
    for (const m of this.movers) {
      if (m.axis === "x") m.x = pingpong(m.t, m.min, m.max);
      else m.y = pingpong(m.t, m.min, m.max);
    }
  }

  private updateCamera(dt: number) {
    if (this.introLock || this.overlay === "intro") {
      this.camX = HALL_LAYOUT.introCamX;
      this.camY = 0;
      return;
    }
    const p = this.player;
    const targetLook = p.facing * 90 + p.vx * 0.18;
    this.lookX += (targetLook - this.lookX) * (1 - Math.exp(-4 * dt));
    const tx = p.x + this.pw / 2 + this.lookX - VIEW_W * 0.42;
    const ty = p.y + this.ph / 2 - VIEW_H * 0.58;
    this.camX += (tx - this.camX) * (1 - Math.exp(-5 * dt));
    this.camY += (ty - this.camY) * (1 - Math.exp(-4 * dt));
    this.camX = Math.max(0, Math.min(this.level.width - VIEW_W, this.camX));
    this.camY = Math.max(0, Math.min(Math.max(0, this.level.height - VIEW_H), this.camY));
  }

  private burst(x: number, y: number, n: number, color: string) {
    if (this.reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.3,
        max: 0.55,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  private updateParticles(dt: number) {
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 420 * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  private syncHud() {
    const coins = this.coins.filter((c) => c.taken).length;
    const blocked =
      this.overlay === "riddle" ||
      this.overlay === "hall" ||
      this.overlay === "intro" ||
      this.overlay === "epilogue" ||
      this.overlay === "pick" ||
      this.overlay === "shop" ||
      this.overlay === "dead" ||
      this.overlay === "title" ||
      this.overlay === "levels";
    this.input.blocked = blocked;
    if (this.lastHudOverlay !== this.overlay) {
      this.lastHudOverlay = this.overlay;
      this.input.setTouch("clear", false);
      this.consume = Math.max(this.consume, 0.18);
    }
    useHud.getState().patch({
      overlay: this.overlay,
      coins,
      total: this.coins.length,
      levelId: this.level.id,
      levelName: this.level.name,
      deaths: this.deaths,
      hasCheckpoint: this.checkpoints.some((c) => c.lit),
    });
  }

  private resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = parent.clientWidth;
    const bh = parent.clientHeight;
    const scale = Math.min(bw / VIEW_W, bh / VIEW_H);
    const cssW = Math.floor(VIEW_W * scale);
    const cssH = Math.floor(VIEW_H * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(VIEW_W * dpr);
    this.canvas.height = Math.floor(VIEW_H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  };

  private onVis = () => {
    if (document.visibilityState === "visible") {
      this.audio.unlock();
      this.last = performance.now();
    } else {
      this.input.keys.clear();
    }
  };

  private wireControlsTest() {
    window.__controlsTest = {
      getYaw: () => (this.player.facing === -1 ? 1 : -1),
      getSpeed: () => this.player.vx,
      getX: () => this.player.x,
      getY: () => this.player.y,
      setKeys: (codes) => this.input.setKeys(codes),
      setSteer: (v) => {
        if (v > 0.2) this.input.setKeys(["KeyA"]);
        else if (v < -0.2) this.input.setKeys(["KeyD"]);
        else this.input.setKeys([]);
      },
    };
    const extra = window.__controlsTest as typeof window.__controlsTest & {
      getSpawnX: () => number;
      getOverlay: () => Overlay;
      lightLantern: () => void;
      dieNow: () => void;
      setPos: (x: number, y: number) => void;
      livingGuards: () => number;
      playLevel: (id: number) => void;
      setHero: (id: string) => void;
      guardPos: () => { x: number; y: number; w: number; h: number } | null;
      cheat: (code: string) => void;
      closeHall: () => void;
      beginIntro: () => void;
      dismissIntro: () => void;
      endCompletedGame: () => void;
      hallPhase: () => string;
      advanceHallTalk: () => void;
      resetHallSign: () => void;
      hudSnap: () => Record<string, unknown>;
    };
    extra.getSpawnX = () => this.player.spawnX;
    extra.getOverlay = () => this.overlay;
    extra.lightLantern = () => {
      const cp = this.checkpoints[0];
      if (!cp) return;
      const was = cp.lit;
      cp.lit = true;
      this.player.spawnX = cp.x - this.pw / 2;
      this.player.spawnY = cp.y - this.ph - 2;
      if (!was) useHud.getState().claimEvent(`${this.level.id}:cp:0`, SCORE.checkpoint);
      this.syncHud();
    };
    extra.dieNow = () => this.kill();
    extra.setPos = (x, y) => {
      this.player.x = x;
      this.player.y = y;
    };
    extra.livingGuards = () => this.guards.filter((g) => !g.dead).length;
    extra.playLevel = (id: number) => this.play(id);
    extra.setHero = (id: string) => {
      if (!isCharacterId(id)) return;
      useHud.getState().setCharacter(id);
      this.applyCharacter(id);
    };
    extra.guardPos = () => {
      const g = this.guards.find((q) => !q.dead);
      return g ? { x: g.x, y: g.y, w: g.w, h: g.h } : null;
    };
    extra.cheat = (code: string) => this.applyCheat(code);
    extra.closeHall = () => this.closeHall();
    extra.beginIntro = () => this.beginIntro();
    extra.dismissIntro = () => this.dismissIntro();
    extra.endCompletedGame = () => this.endCompletedGame();
    extra.hallPhase = () => this.hallPhase;
    extra.advanceHallTalk = () => this.advanceHallTalk();
    extra.resetHallSign = () => {
      useHud.getState().patch({ legendSigned: false });
      this.ceremonyTalked = false;
      this.hallPhase = "idle";
      this.ceremonyLock = false;
      this.clapPlayed = false;
    };
    extra.hudSnap = () => {
      const s = useHud.getState();
      return {
        overlay: s.overlay,
        keys: s.keys,
        levers: s.levers,
        levelName: s.levelName,
        banner: s.banner,
        character: s.character,
        fame: s.fame,
        solved: s.solved,
        owned: s.owned,
        godMode: this.godMode,
        legendSigned: s.legendSigned,
        hallPhase: this.hallPhase,
        seenIntro: s.seenIntro,
        cheated: s.cheated,
        unlocked: s.unlocked,
        purse: s.purse,
        score: s.score,
        collectedCoins: s.collectedCoins,
        claimedEvents: s.claimedEvents,
        runId: s.runId,
        levelDeaths: s.levelDeaths,
        camX: Math.round(this.camX),
        introLock: this.introLock,
        riddleRoll: s.riddleRoll,
        legends: s.legends.map((e) => e.name),
        companions: this.companions.map((c) => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y) })),
      };
    };
  }

  private draw() {
    const ctx = this.ctx;
    const a = this.assets;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const shake = this.reducedMotion ? 0 : this.trauma * this.trauma;
    const ox = (Math.random() * 2 - 1) * 12 * shake;
    const oy = (Math.random() * 2 - 1) * 10 * shake;
    ctx.save();
    ctx.translate(Math.round(ox), Math.round(oy));
    this.drawParallax();
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));
    this.drawWorld(a);
    ctx.restore();
  }

  private drawParallax() {
    const ctx = this.ctx;
    const a = this.assets;
    const theme = this.level.theme;
    const key = this.level.themeKey ?? THEME_KEYS[this.level.id] ?? "jantar";
    const sky = a?.skies[key];
    const far = a?.far;
    const mid = theme === "cave" ? a?.caveMid : a?.mid;
    const near = a?.near;
    if (theme === "cave") ctx.fillStyle = "#120c14";
    else if (theme === "ruins") ctx.fillStyle = "#1a1630";
    else ctx.fillStyle = "#1a1428";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const layers: { img?: HTMLImageElement; f: number; alpha: number }[] = [
      { img: sky, f: 0.04, alpha: 1 },
      { img: far, f: 0.16, alpha: theme === "cave" ? 0.45 : 0.9 },
      { img: mid, f: 0.38, alpha: 0.95 },
      { img: near, f: 0.62, alpha: 0.85 },
    ];
    for (const L of layers) {
      if (!L.img) continue;
      ctx.globalAlpha = L.alpha;
      const img = L.img;
      const h = VIEW_H;
      const w = (img.width / img.height) * h;
      const x = -((this.camX * L.f) % (w * 2));
      for (let i = -1; i < 4; i++) {
        const dx = x + i * w;
        if (i % 2 === 0) ctx.drawImage(img, dx, 0, w, h);
        else {
          ctx.save();
          ctx.translate(dx + w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
    const tint = THEME_TINT[key];
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const fade = ctx.createLinearGradient(0, VIEW_H * 0.38, 0, VIEW_H);
    if (theme === "cave") {
      fade.addColorStop(0, "rgba(12, 8, 14, 0)");
      fade.addColorStop(0.4, "rgba(16, 10, 16, 0.35)");
      fade.addColorStop(0.72, "rgba(14, 10, 16, 0.88)");
      fade.addColorStop(1, "rgba(10, 8, 12, 1)");
    } else if (theme === "ruins") {
      fade.addColorStop(0, "rgba(18, 16, 32, 0)");
      fade.addColorStop(0.4, "rgba(20, 18, 36, 0.28)");
      fade.addColorStop(0.72, "rgba(16, 16, 30, 0.86)");
      fade.addColorStop(1, "rgba(12, 12, 24, 1)");
    } else {
      fade.addColorStop(0, "rgba(14, 16, 28, 0)");
      fade.addColorStop(0.38, "rgba(18, 16, 30, 0.22)");
      fade.addColorStop(0.68, "rgba(14, 14, 24, 0.84)");
      fade.addColorStop(1, "rgba(10, 12, 20, 1)");
    }
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private drawWorld(a: Assets | null) {
    const ctx = this.ctx;
    for (const pl of this.level.platforms) this.drawPlatform(pl, a?.stone, false);
    for (const m of this.movers) this.drawPlatform(m, a?.wood, true);
    for (const s of this.level.spikes) this.drawSpike(s, a?.spike);
    for (const c of this.coins) {
      if (c.taken) continue;
      this.drawSheet(a?.coin, Math.floor(this.time * 8) % 4, c.x, c.y, 36, 36, 1, true);
    }
    for (const cp of this.checkpoints) {
      const img = cp.lit ? a?.checkpointLit : a?.checkpoint;
      if (img) {
        const h = 92;
        const w = (img.width / img.height) * h;
        ctx.drawImage(img, cp.x - w / 2, cp.y - h, w, h);
      }
    }
    this.drawGuards(a);
    this.drawExtras(a);
    if (!this.level.hall) {
      const f = this.level.flag;
      this.drawSheet(a?.flag, Math.floor(this.time * 6) % 4, f.x + 8, f.y - 8, 72, 96, 1, false);
    }
    for (const c of this.companions) this.drawCompanion(a, c);
    this.drawPlayer(a);
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawPlatform(r: Rect, img: HTMLImageElement | undefined, moving: boolean) {
    const ctx = this.ctx;
    if (!moving && r.y <= 4 && r.h > 140) {
      ctx.fillStyle = this.level.theme === "cave" ? "#120c14" : this.level.theme === "ruins" ? "#161224" : "#14121c";
      ctx.fillRect(r.x, r.y, r.w, r.h - 34);
      this.drawPlatform({ x: r.x, y: r.y + r.h - 36, w: r.w, h: 36 }, img, false);
      return;
    }
    const capH = Math.min(moving ? 26 : 38, r.h);
    const bodyY = r.y + capH - 4;
    if (r.h > capH) {
      ctx.fillStyle = moving ? "#4a3624" : "#2c261c";
      ctx.fillRect(r.x, bodyY, r.w, r.y + r.h - bodyY);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(r.x, bodyY, r.w, 8);
    }
    if (img) {
      const iw = img.width;
      const ih = img.height;
      const cap = Math.min(Math.floor(iw * 0.2), Math.floor(r.w / 3));
      const srcCap = Math.floor(iw * 0.2);
      const srcMid = Math.max(1, iw - srcCap * 2);
      ctx.drawImage(img, 0, 0, srcCap, ih, r.x, r.y, cap, capH);
      ctx.drawImage(img, srcCap, 0, srcMid, ih, r.x + cap, r.y, Math.max(1, r.w - cap * 2), capH);
      ctx.drawImage(img, iw - srcCap, 0, srcCap, ih, r.x + r.w - cap, r.y, cap, capH);
    } else {
      ctx.fillStyle = moving ? "#8a6a45" : "#5a5346";
      ctx.fillRect(r.x, r.y, r.w, capH);
    }
  }

  private drawSpike(s: Rect, img?: HTMLImageElement) {
    const ctx = this.ctx;
    if (!img) {
      ctx.fillStyle = "#6a6460";
      ctx.fillRect(s.x, s.y, s.w, s.h);
      return;
    }
    const h = s.h + 8;
    const w = (img.width / img.height) * h;
    let x = s.x;
    while (x < s.x + s.w - 4) {
      ctx.drawImage(img, x, s.y + s.h - h + 4, Math.min(w, s.x + s.w - x), h);
      x += w * 0.72;
    }
  }

  private drawSheet(
    img: HTMLImageElement | undefined,
    frame: number,
    cx: number,
    cy: number,
    dw: number,
    dh: number,
    facing: 1 | -1,
    centered: boolean,
  ) {
    const ctx = this.ctx;
    if (!img) return;
    const cols = 2;
    const rows = 2;
    const fw = img.width / cols;
    const fh = img.height / rows;
    const col = frame % cols;
    const row = Math.floor(frame / cols) % rows;
    const dx = centered ? cx - dw / 2 : cx - dw / 2;
    const dy = centered ? cy - dh / 2 : cy - dh;
    ctx.save();
    if (facing < 0) {
      ctx.translate(dx + dw / 2, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, col * fw, row * fh, fw, fh, -dw / 2, 0, dw, dh);
    } else {
      ctx.drawImage(img, col * fw, row * fh, fw, fh, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  private drawGuards(a: Assets | null) {
    for (const g of this.guards) {
      if (g.squish < 0.16) continue;
      const frame = g.dead ? 3 : Math.floor(g.anim * 6) % 4;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(g.x + g.w / 2, g.y + g.h);
      ctx.scale(g.dir, g.squish);
      const img = a?.guard;
      if (img) {
        const cols = 2;
        const fw = img.width / cols;
        const fh = img.height / 2;
        const col = frame % 2;
        const row = Math.floor(frame / 2) % 2;
        ctx.drawImage(img, col * fw, row * fh, fw, fh, -28, -52, 56, 52);
      } else {
        ctx.fillStyle = "#6a5346";
        ctx.fillRect(-g.w / 2, -g.h, g.w, g.h);
      }
      ctx.restore();
    }
  }

  private drawExtras(a: Assets | null) {
    const ctx = this.ctx;
    const hud = useHud.getState();
    for (const r of this.riddles) {
      if (r.id === "hall-note" && this.hallNote) continue;
      if (hud.solved.includes(r.id)) {
        if (r.id !== "alencina" && r.id !== "hall-note") this.drawSheet(a?.key, 0, r.x, r.y - 8, 36, 36, 1, true);
        continue;
      }
      this.drawSheet(a?.paper, Math.floor(this.time * 4) % 4, r.x, r.y, 48, 48, 1, true);
      ctx.fillStyle = "#1a1428";
      ctx.font = "700 22px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", r.x, r.y + 8);
    }
    for (const d of this.doors) {
      if (!this.doorVisible(d)) continue;
      const def = RIDDLE_BY_ID[d.keyId];
      const color = d.keyId === "hall" ? "#f0c35a" : def?.color ?? "#d4c4a8";
      const opened = d.keyId === "hall-gate" ? this.hallGate : hud.openedDoors.includes(d.keyId);
      ctx.save();
      ctx.globalAlpha = opened ? 0.95 : 0.8;
      if (a?.door) {
        const h = 110;
        const w = (a.door.width / a.door.height) * h;
        ctx.drawImage(a.door, d.x - w / 2, d.y - h + 16, w, h);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(d.x - 22, d.y - 88, 52, 100);
      if (!opened) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(d.x - 22, d.y - 88, 52, 100);
      }
      ctx.restore();
    }
    for (const l of this.levers) {
      const pulled = hud.levers[l.id];
      this.drawSheet(a?.lever, pulled ? 3 : Math.floor(this.time * 4) % 4, l.x, l.y, 48, 56, 1, false);
    }
    for (const d of this.darts) {
      if (d.gone) continue;
      ctx.save();
      ctx.filter = "sepia(1) saturate(2.4) hue-rotate(8deg) brightness(1.15)";
      this.drawSheet(a?.dart, Math.floor(this.time * 10) % 4, d.x, d.y, 40, 28, 1, true);
      ctx.restore();
    }
    for (const w of this.gateWalls()) {
      ctx.fillStyle = "#3a3228";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "#c4a060";
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    if (this.level.hall) this.drawHallSet();
    for (const n of this.npcs) {
      const clapping = this.npcClap > 0;
      const img =
        n.who === "may"
          ? clapping
            ? a?.mayClap ?? a?.may
            : a?.may
          : clapping
            ? a?.miaClap ?? a?.mia
            : a?.mia;
      const sitting = Boolean(this.level.hall);
      const h = sitting ? 200 : n.who === "may" ? 112 : 94;
      const w = sitting ? (n.who === "may" ? 156 : 138) : n.who === "may" ? 92 : 72;
      const bounce = clapping ? Math.abs(Math.sin(this.time * 18)) * 4 : 0;
      const frame = clapping ? Math.floor(this.time * 8) % 4 : Math.floor(this.time * 4) % 4;
      this.drawSheet(img, frame, n.x, n.y - bounce, w, h, 1, false);
    }
    if (this.level.hall) {
      this.drawThroneFront(HALL_LAYOUT.mayX);
      this.drawThroneFront(HALL_LAYOUT.miaX);
      this.drawHallTalk();
    }
  }

  private drawCompanion(a: Assets | null, c: Companion) {
    const ch = a?.characters[c.id];
    const st = CHAR_BY_ID[c.id];
    const moving = this.ceremonyLock
      ? c.tx != null && Math.hypot((c.tx ?? c.x) - c.x, (c.ty ?? c.y) - c.y) > 8
      : Math.abs(this.player.x - c.x) > 28;
    const sheet = moving ? (ch?.run ?? ch?.idle) : (ch?.idle ?? ch?.run);
    const frame = Math.floor(c.anim * (moving ? 8 : 4)) % 4;
    if (!sheet) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(c.x + st.w / 2, c.y + st.h);
    ctx.scale(c.facing, 1);
    const cols = 2;
    const fw = sheet.width / cols;
    const fh = sheet.height / 2;
    const col = frame % 2;
    const row = Math.floor(frame / 2) % 2;
    ctx.drawImage(sheet, col * fw, row * fh, fw, fh, -st.drawW / 2, -st.drawH, st.drawW, st.drawH);
    ctx.restore();
  }

  private drawHeart(x: number, y: number, s: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#e07090";
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.4, 0, s * 0.3);
    ctx.fill();
    ctx.restore();
  }

  private drawPlayer(a: Assets | null) {
    const p = this.player;
    const id = useHud.getState().character;
    const ch = a?.characters[id];
    let sheet = ch?.idle ?? a?.idle;
    let frame = Math.floor(p.anim * 4) % 4;
    if (p.curled && (ch?.ability || a?.curl)) {
      sheet = ch?.ability ?? a?.curl;
      frame = Math.floor(p.anim * 8) % 4;
    } else if (p.flying || (id === "robot" && !p.grounded)) {
      sheet = ch?.jump ?? a?.jump;
      frame = p.vy < -80 ? 1 : p.vy < 80 ? 2 : 3;
    } else if (!p.grounded && this.stats.canJump) {
      sheet = ch?.jump ?? a?.jump;
      frame = p.vy < -80 ? 1 : p.vy < 80 ? 2 : 3;
    } else if (Math.abs(p.vx) > 18 || id === "toddler") {
      sheet = Math.abs(p.vx) > 12 ? (ch?.run ?? a?.run) : (ch?.idle ?? a?.idle);
      frame = Math.floor(p.anim * (id === "toddler" ? 6 : 8)) % 4;
    }
    const ctx = this.ctx;
    ctx.save();
    const cx = p.x + this.pw / 2;
    const cy = p.y + this.ph;
    ctx.translate(cx, cy);
    ctx.scale(p.facing * (2 - p.squash), p.squash);
    if (p.deadTimer > 0) ctx.globalAlpha = 0.55;
    else if (p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    if (sheet) {
      const cols = 2;
      const fw = sheet.width / cols;
      const fh = sheet.height / 2;
      const col = frame % 2;
      const row = Math.floor(frame / 2) % 2;
      ctx.drawImage(
        sheet,
        col * fw,
        row * fh,
        fw,
        fh,
        -this.stats.drawW / 2,
        -this.stats.drawH,
        this.stats.drawW,
        this.stats.drawH,
      );
    } else {
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(-this.pw / 2, -this.ph, this.pw, this.ph);
    }
    ctx.restore();
    if (p.carried) {
      this.drawHeart(cx - 10, cy - this.stats.drawH - 8, 10);
      this.drawHeart(cx + 12, cy - this.stats.drawH - 14, 8);
    }
  }

  advanceHallTalk() {
    if (this.hallPhase !== "talk") return;
    this.talkTimer = 0;
    this.talkIndex += 1;
    if (this.talkIndex >= HALL_LINES.length) this.startWrite();
  }

  private tickHall(dt: number, actions: Actions) {
    if (!this.level.hall) return;
    const hud = useHud.getState();
    const p = this.player;
    const px = p.x + this.pw / 2;
    const feet = p.y + this.ph;
    const inSight = px > HALL_LAYOUT.plaqueX - 200 && this.overlay !== "intro";
    const onDais =
      px > HALL_LAYOUT.daisX - 20 && px < HALL_LAYOUT.daisX + 640 && feet > 470 && feet < 620;

    if (!onDais) this.hallLeftDais = true;

    if (!inSight) {
      this.clapPlayed = false;
      if (this.hallPhase === "clap") {
        this.hallPhase = this.ceremonyTalked || hud.legendSigned ? "done" : "idle";
        this.npcClap = 0;
      }
    }

    if (inSight && !this.clapPlayed && (this.hallPhase === "idle" || this.hallPhase === "done")) {
      this.clapPlayed = true;
      this.hallPhase = "clap";
      this.npcClap = 1.45;
      this.audio.clap();
      this.burst(1600, 380, 18, "#f0c35a");
    }

    if (this.hallPhase === "clap") {
      this.npcClap = Math.max(0, this.npcClap - dt);
      if (this.npcClap <= 0 && !onDais) {
        this.hallPhase = this.ceremonyTalked || hud.legendSigned ? "done" : "idle";
      }
    }

    if (
      onDais &&
      !hud.legendSigned &&
      !this.ceremonyLock &&
      this.hallPhase !== "talk" &&
      this.hallPhase !== "write" &&
      this.hallPhase !== "gather"
    ) {
      if (this.ceremonyTalked && !this.hallLeftDais) {
        /* form dismissed, still standing on the dais */
      } else if (this.ceremonyTalked) this.startWrite();
      else if (this.npcClap <= 0.25) this.startGather();
    }

    if (this.hallPhase === "gather") {
      this.gatherT += dt;
      this.nudgeHeroes(dt);
      if (this.gatherT > 1.15) this.startTalk();
    }

    if (this.hallPhase === "talk") {
      this.nudgeHeroes(dt);
      this.talkTimer += dt;
      if (actions.confirm || actions.jumpPressed || this.talkTimer > this.lineHold()) {
        this.talkTimer = 0;
        this.talkIndex += 1;
        if (this.talkIndex >= HALL_LINES.length) this.startWrite();
      }
    }

    if (this.hallPhase === "write" || this.hallPhase === "gather" || this.hallPhase === "talk") {
      this.ceremonyLock = true;
    }
  }

  private startGather() {
    this.hallPhase = "gather";
    this.gatherT = 0;
    this.ceremonyLock = true;
    this.npcClap = 0;
    const hud = useHud.getState();
    const ids = hud.owned;
    const n = Math.max(1, ids.length);
    const slots = ids.map((id, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const ang = Math.PI * (0.18 + 0.64 * t);
      return {
        id,
        x: HALL_LAYOUT.cx - Math.cos(ang) * 210,
        y: 598 - Math.sin(ang) * 36,
      };
    });
    const current = hud.character;
    const playerSlot = slots.find((s) => s.id === current) ?? slots[Math.floor(n / 2)];
    this.player.vx = 0;
    this.player.vy = 0;
    this.playerTarget = playerSlot;
    const prev = new Map(this.companions.map((c) => [c.id, c]));
    this.companions = slots
      .filter((s) => s.id !== current)
      .map((s, i) => {
        const old = prev.get(s.id);
        const st = CHAR_BY_ID[s.id];
        return {
          id: s.id,
          x: old?.x ?? this.player.x - 40 - i * 36,
          y: old?.y ?? this.player.y,
          tx: s.x - st.w / 2,
          ty: s.y - st.h,
          facing: 1 as const,
          anim: old?.anim ?? i * 0.2,
        };
      });
  }

  private startTalk() {
    this.hallPhase = "talk";
    this.talkIndex = 0;
    this.talkTimer = 0;
    this.ceremonyLock = true;
    this.setPlayOverlay("playing");
    this.syncHud();
  }

  private startWrite() {
    if (useHud.getState().legendSigned) {
      this.hallPhase = "done";
      this.ceremonyLock = false;
      this.ceremonyTalked = true;
      this.setPlayOverlay("playing");
      this.syncHud();
      return;
    }
    this.hallPhase = "write";
    this.ceremonyTalked = true;
    this.ceremonyLock = true;
    this.setPlayOverlay("hall");
    this.syncHud();
  }

  private nudgeHeroes(dt: number) {
    const p = this.player;
    if (this.playerTarget) {
      const tx = this.playerTarget.x - this.pw / 2;
      const ty = this.playerTarget.y - this.ph;
      p.x += (tx - p.x) * Math.min(1, dt * 4);
      p.y += (ty - p.y) * Math.min(1, dt * 4);
      p.vx = 0;
      p.vy = 0;
      p.facing = 1;
    }
    for (const c of this.companions) {
      if (c.tx == null || c.ty == null) continue;
      c.x += (c.tx - c.x) * Math.min(1, dt * 4);
      c.y += (c.ty - c.y) * Math.min(1, dt * 4);
      c.facing = 1;
    }
  }

  private lineHold() {
    const line = HALL_LINES[this.talkIndex];
    if (!line) return 3.8;
    const n = line.text.length;
    if (n > 70) return 8.6;
    if (n > 40) return 6.6;
    return 3.8;
  }

  private drawHallSet() {
    const ctx = this.ctx;
    const hud = useHud.getState();
    const px = HALL_LAYOUT.plaqueX;
    const pw = HALL_LAYOUT.plaqueW;
    const cx = HALL_LAYOUT.cx;
    ctx.save();
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(px, 4, pw, 248);
    ctx.strokeStyle = "#8a7358";
    ctx.lineWidth = 7;
    ctx.strokeRect(px, 4, pw, 248);
    ctx.strokeStyle = "#c4a060";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 12, 16, pw - 24, 224);
    ctx.fillStyle = "#4a4034";
    ctx.fillRect(px + 24, 56, pw - 48, 176);
    this.drawStonePedestal();
    this.drawThroneBack(HALL_LAYOUT.mayX, "May");
    this.drawThroneBack(HALL_LAYOUT.miaX, "Mia");
    ctx.fillStyle = "#efe8dc";
    ctx.font = "600 26px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.fillText("Deska legend", cx, 46);
    const entries = hud.legends.length
      ? hud.legends
      : hud.fame.map((name, i) => ({
          id: i,
          name,
          score: 0,
          coins: 0,
          createdAt: "",
          cheater: false,
        }));
    const placed = layoutLegendSlots(entries, 12);
    entries.forEach((e, i) => {
      const { slot, layer } = placed[i] ?? { slot: i % 12, layer: 0 };
      const col = slot % 3;
      const row = Math.floor(slot / 3);
      const baseX = px + 48 + col * 214 + layer * 12;
      const baseY = 86 + row * 42 + layer * 8;
      const dir = slot % 2 === 0 ? 1 : -1;
      const fresh = i === entries.length - 1 || e.name === this.lastSignedName;
      const angle = fresh ? 0.03 * dir : (0.16 + layer * 0.14) * dir * (layer % 2 === 0 ? 1 : 0.7);
      ctx.save();
      ctx.translate(baseX, baseY);
      ctx.rotate(angle);
      ctx.textAlign = "left";
      ctx.font = fresh ? "800 22px Fraunces, serif" : "700 17px Fraunces, serif";
      const label = formatLegend(e);
      ctx.fillStyle = e.cheater ? (fresh ? "#e8b080" : "rgba(90, 40, 28, 0.88)") : fresh ? "#f0d48a" : "rgba(18, 12, 8, 0.82)";
      ctx.fillText(label, 0, 0);
      ctx.fillStyle = e.cheater ? "rgba(80, 30, 20, 0.55)" : fresh ? "rgba(60, 36, 12, 0.7)" : "rgba(232, 214, 180, 0.28)";
      ctx.fillText(label, 1, -1);
      ctx.restore();
    });
    ctx.restore();
    if (this.overlay === "intro") this.drawIntroFox();
  }

  private drawStonePedestal() {
    const ctx = this.ctx;
    const x = HALL_LAYOUT.daisX + 76;
    ctx.save();
    ctx.fillStyle = "#4a4034";
    ctx.fillRect(x, 508, 488, 40);
    ctx.fillStyle = "#5a4e40";
    ctx.fillRect(x + 20, 492, 448, 22);
    ctx.strokeStyle = "#2e2820";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 508, 488, 40);
    ctx.strokeRect(x + 20, 492, 448, 22);
    ctx.fillStyle = "rgba(210, 190, 160, 0.18)";
    ctx.fillRect(x + 24, 494, 440, 5);
    ctx.restore();
  }

  private throneGeom(x: number) {
    const seatY = 424;
    const backW = 128;
    const backH = 158;
    const holeW = 58;
    const holeH = 78;
    return {
      x,
      seatY,
      backW,
      backH,
      backTop: seatY - backH,
      holeW,
      holeH,
      holeX: x - holeW / 2,
      holeY: seatY - backH + 46,
      seatW: 138,
      seatH: 26,
      armW: 22,
    };
  }

  private drawCarvedName(x: number, y: number, label: string) {
    const ctx = this.ctx;
    ctx.font = "700 28px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#2a2418";
    ctx.fillText(label, x + 2, y + 3);
    ctx.fillStyle = "#5a4c38";
    ctx.fillText(label, x + 1, y + 1);
    ctx.fillStyle = "#cbb99a";
    ctx.fillText(label, x - 1.5, y - 1.5);
    ctx.fillStyle = "#8a7a60";
    ctx.fillText(label, x, y);
  }

  private drawThroneBack(x: number, label: string) {
    const ctx = this.ctx;
    const g = this.throneGeom(x);
    ctx.save();
    ctx.fillStyle = "#6a5a44";
    ctx.strokeStyle = "#3a3228";
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.addRoundRect(x - g.backW / 2, g.backTop, g.backW, g.backH + 10, 12);
    this.addRoundRect(g.holeX, g.holeY, g.holeW, g.holeH, 16);
    ctx.fill("evenodd");
    ctx.beginPath();
    this.addRoundRect(x - g.backW / 2, g.backTop, g.backW, g.backH + 10, 12);
    this.addRoundRect(g.holeX, g.holeY, g.holeW, g.holeH, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(210, 190, 160, 0.22)";
    ctx.fillRect(x - g.backW / 2 + 8, g.backTop + 6, g.backW - 16, 8);
    this.drawCarvedName(x, g.backTop + 22, label);
    ctx.fillStyle = "#4a3e30";
    ctx.fillRect(x - 36, g.seatY + 18, 72, 56);
    ctx.restore();
  }

  private drawThroneFront(x: number) {
    const ctx = this.ctx;
    const g = this.throneGeom(x);
    ctx.save();
    ctx.fillStyle = "#5c4c38";
    ctx.strokeStyle = "#3a3228";
    ctx.lineWidth = 2;
    this.roundRect(x - g.armW - g.seatW / 2 + 10, g.seatY - 40, g.armW, 52, 6);
    ctx.fill();
    ctx.stroke();
    this.roundRect(x + g.seatW / 2 - 10, g.seatY - 40, g.armW, 52, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#6a5844";
    this.roundRect(x - g.seatW / 2, g.seatY - 6, g.seatW, g.seatH, 7);
    ctx.fill();
    ctx.strokeStyle = "#3a3228";
    ctx.stroke();
    ctx.fillStyle = "rgba(210, 190, 160, 0.28)";
    ctx.fillRect(x - g.seatW / 2 + 8, g.seatY - 4, g.seatW - 16, 5);
    ctx.fillStyle = "#3e3226";
    ctx.fillRect(x - g.seatW / 2 + 10, g.seatY + 16, g.seatW - 20, 10);
    ctx.restore();
  }

  private drawHallTalk() {
    if (this.hallPhase !== "talk") return;
    const line = HALL_LINES[this.talkIndex];
    if (!line) return;
    if (line.who === "both") {
      const may = this.npcs.find((q) => q.who === "may");
      const mia = this.npcs.find((q) => q.who === "mia");
      this.drawBothBubble(
        HALL_LAYOUT.cx,
        248,
        line.text,
        may?.x ?? HALL_LAYOUT.mayX,
        (may?.y ?? 518) - 150,
        mia?.x ?? HALL_LAYOUT.miaX,
        (mia?.y ?? 518) - 140,
      );
      return;
    }
    const n = this.npcs.find((q) => q.who === line.who);
    if (!n) return;
    this.drawBubble(n.x, n.y - 168, line.text, false);
  }

  private layoutBubble(text: string, maxW: number) {
    const ctx = this.ctx;
    ctx.font = "600 15px Outfit, sans-serif";
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW - 28) {
        if (cur) lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28);
    const bh = 18 + lines.length * 20;
    return { lines, bw, bh };
  }

  private paintBubbleText(x: number, y: number, laid: { lines: string[]; bw: number; bh: number }) {
    const ctx = this.ctx;
    ctx.fillStyle = "#2a221c";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "600 15px Outfit, sans-serif";
    laid.lines.forEach((l, i) => ctx.fillText(l, x, y - laid.bh + 10 + i * 20));
  }

  private drawTail(fromX: number, fromY: number, toX: number, toY: number) {
    const ctx = this.ctx;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const px = (-dy / len) * 7;
    const py = (dx / len) * 7;
    ctx.beginPath();
    ctx.moveTo(fromX - px, fromY - py);
    ctx.lineTo(fromX + px, fromY + py);
    ctx.lineTo(toX, toY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawBothBubble(x: number, y: number, text: string, ax: number, ay: number, bx: number, by: number) {
    const ctx = this.ctx;
    const laid = this.layoutBubble(text, 460);
    ctx.save();
    ctx.fillStyle = "rgba(250, 244, 234, 0.96)";
    ctx.strokeStyle = "#4a3a28";
    ctx.lineWidth = 2;
    this.roundRect(x - laid.bw / 2, y - laid.bh, laid.bw, laid.bh, 14);
    ctx.fill();
    ctx.stroke();
    this.drawTail(x - 70, y, ax, ay);
    this.drawTail(x + 70, y, bx, by);
    this.paintBubbleText(x, y, laid);
    ctx.restore();
  }

  private drawBubble(x: number, y: number, text: string, wide: boolean) {
    const ctx = this.ctx;
    const laid = this.layoutBubble(text, wide ? 420 : 280);
    ctx.save();
    ctx.fillStyle = "rgba(250, 244, 234, 0.96)";
    ctx.strokeStyle = "#4a3a28";
    ctx.lineWidth = 2;
    this.roundRect(x - laid.bw / 2, y - laid.bh, laid.bw, laid.bh, 14);
    ctx.fill();
    ctx.stroke();
    this.drawTail(x, y, x, y + 14);
    this.paintBubbleText(x, y, laid);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.addRoundRect(x, y, w, h, r);
  }

  private addRoundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private drawIntroFox() {
    const a = this.assets;
    const img = a?.characters.fox?.idle ?? a?.idle;
    if (!img) return;
    this.drawSheet(img, Math.floor(this.time * 4) % 4, HALL_LAYOUT.foxX, 600, 120, 136, 1, false);
    this.drawBubble(HALL_LAYOUT.foxX, 430, "Zvládneš se zapsat mezi legendy této hry?", true);
  }
}
