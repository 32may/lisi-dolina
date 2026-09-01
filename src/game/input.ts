const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
  "KeyR",
  "Escape",
  "Enter",
  "KeyP",
]);

export interface Actions {
  moveX: number;
  jump: boolean;
  jumpPressed: boolean;
  ability: boolean;
  abilityPressed: boolean;
  down: boolean;
  restart: boolean;
  pause: boolean;
  confirm: boolean;
}

export class Input {
  keys = new Set<string>();
  injected: Set<string> | null = null;
  prevJump = false;
  prevAbility = false;
  prevRestart = false;
  prevPause = false;
  prevConfirm = false;
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  touchJumpHeld = false;
  touchAbility = false;
  touchAbilityHeld = false;
  /** When true, keyboard is left to DOM (riddle / hall of fame). */
  blocked = false;

  attach(el: HTMLElement) {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerUp);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  detach(el: HTMLElement) {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointercancel", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerUp);
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  setTouch(dir: "left" | "right" | "jump" | "ability" | "clear", down: boolean) {
    if (dir === "left") this.touchLeft = down;
    if (dir === "right") this.touchRight = down;
    if (dir === "jump") {
      if (down && !this.touchJumpHeld) this.touchJump = true;
      this.touchJumpHeld = down;
      if (!down) this.touchJump = false;
    }
    if (dir === "ability") {
      if (down && !this.touchAbilityHeld) this.touchAbility = true;
      this.touchAbilityHeld = down;
      if (!down) this.touchAbility = false;
    }
    if (dir === "clear") {
      this.touchLeft = this.touchRight = false;
      this.touchJump = this.touchJumpHeld = false;
      this.touchAbility = this.touchAbilityHeld = false;
    }
  }

  sample(): Actions {
    const held = this.injected ?? this.keys;
    let moveX = 0;
    if (held.has("KeyA") || held.has("ArrowLeft") || this.touchLeft) moveX -= 1;
    if (held.has("KeyD") || held.has("ArrowRight") || this.touchRight) moveX += 1;

    const jumpHeld = held.has("KeyW") || held.has("ArrowUp") || this.touchJumpHeld;
    const jumpPressed = (jumpHeld && !this.prevJump) || this.touchJump;
    this.touchJump = false;

    const abilityHeld = held.has("Space") || this.touchAbilityHeld;
    const abilityPressed = (abilityHeld && !this.prevAbility) || this.touchAbility;
    this.touchAbility = false;

    const restartHeld = held.has("KeyR");
    const pauseHeld = held.has("Escape") || held.has("KeyP");
    const confirmHeld = held.has("Enter");

    const actions: Actions = {
      moveX,
      jump: jumpHeld,
      jumpPressed,
      ability: abilityHeld,
      abilityPressed,
      down: held.has("KeyS") || held.has("ArrowDown"),
      restart: restartHeld && !this.prevRestart,
      pause: pauseHeld && !this.prevPause,
      confirm: confirmHeld && !this.prevConfirm,
    };
    this.prevJump = jumpHeld;
    this.prevAbility = abilityHeld;
    this.prevRestart = restartHeld;
    this.prevPause = pauseHeld;
    this.prevConfirm = confirmHeld;
    return actions;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.blocked) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.touchLeft = this.touchRight = false;
    this.touchJump = this.touchJumpHeld = false;
    this.touchAbility = this.touchAbilityHeld = false;
  };
  private onPointerDown = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  private onPointerUp = (e: PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* already released */
    }
  };
}
