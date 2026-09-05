import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Map,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHARACTERS, type CharacterId } from "@/game/characters";
import { CHEAT_LIST } from "@/game/cheats";
import { MAIN_LEVELS, NAME_MAX } from "@/game/constants";
import { SECRET_LEVELS } from "@/game/content";
import { Game } from "@/game/engine";
import { EPILOGUE_LINES } from "@/game/legend";
import { LEVELS } from "@/game/levels";
import { RIDDLES, RIDDLE_BY_ID, resolveRiddle } from "@/game/riddles";
import { useHud } from "@/game/store";
import { cn } from "@/lib/utils";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const hud = useHud();
  const [answer, setAnswer] = useState("");
  const [fame, setFame] = useState("");
  const [cheatsOpen, setCheatsOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas);
    gameRef.current = game;
    void game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hud.overlay !== "riddle") setAnswer("");
    if (hud.overlay !== "hall") setFame("");
  }, [hud.overlay]);

  useEffect(() => {
    if (!hud.banner) return;
    const t = window.setTimeout(() => useHud.getState().patch({ banner: null }), 4000);
    return () => window.clearTimeout(t);
  }, [hud.banner]);

  useEffect(() => {
    if (hud.overlay !== "epilogue") return;
    if (hud.epilogueStep >= EPILOGUE_LINES.length) return;
    const t = window.setTimeout(() => gameRef.current?.advanceEpilogue(), 4200);
    return () => window.clearTimeout(t);
  }, [hud.overlay, hud.epilogueStep]);

  const game = () => gameRef.current;
  const fireCheat = (code: string) => {
    game()?.applyCheat(code);
    setCheatsOpen(false);
  };
  const selected = CHARACTERS.find((c) => c.id === hud.character) ?? CHARACTERS[0];
  const riddle = hud.riddleId ? resolveRiddle(hud.riddleId, hud.riddleRoll) : undefined;
  const ownedSet = new Set(hud.owned);
  const epi = EPILOGUE_LINES[hud.epilogueStep];

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 flex items-center justify-center bg-bg">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full touch-none select-none"
          style={{ touchAction: "none" }}
        />
      </div>

      {hud.overlay === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-3 rounded-[20px] border border-border bg-bg/70 px-4 py-2">
              <img src="/game/sprites/coin-hud.png" alt="" className="size-8 object-contain" />
              <p className="font-display text-xl tabular-nums tracking-tight">
                {hud.coins}
                <span className="ml-1 text-sm text-muted">/{hud.total}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-[20px] border border-border bg-bg/70 px-3 py-2 text-sm">
              <img src={`/game/sprites/${selected.id}-portrait.png`} alt="" className="size-7 object-contain" />
              <span className="text-muted">{selected.hint}</span>
            </div>
            {hud.hint && hud.hint !== selected.hint && (
              <p className="rounded-[16px] border border-border bg-bg/70 px-3 py-2 text-sm text-accent">{hud.hint}</p>
            )}
            {hud.banner && (
              <p className="rounded-[16px] border border-accent bg-bg/80 px-3 py-2 text-sm font-medium text-accent">
                {hud.banner}
              </p>
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <p className="hidden rounded-[16px] border border-border bg-bg/70 px-3 py-2 text-sm tabular-nums text-muted sm:block">
              {hud.levelName} · měšec {hud.purse}
            </p>
            <Button
              variant="secondary"
              size="icon"
              aria-label={hud.muted ? "Zapnout zvuk" : "Ztlumit"}
              onClick={() => useHud.getState().toggleMute()}
            >
              {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Pauza"
              onClick={() => {
                const g = game();
                if (!g) return;
                g.overlay = "paused";
                useHud.getState().setOverlay("paused");
              }}
            >
              <Pause className="size-5" />
            </Button>
          </div>
        </div>
      )}

      {hud.overlay === "playing" && <TouchPad gameRef={gameRef} canJump={selected.canJump} hint={selected.hint} />}

      {hud.overlay === "intro" && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button size="lg" onClick={() => game()?.dismissIntro()}>
            Pokračovat
          </Button>
        </div>
      )}

      {hud.overlay === "epilogue" && (
        <Panel>
          {epi ? (
            <>
              <img
                src={`/game/sprites/fox-${epi.face}.png`}
                alt=""
                className="h-40 w-40 object-contain"
              />
              <p className="max-w-md font-display text-2xl leading-snug">{epi.text}</p>
              <Button variant="ghost" onClick={() => game()?.advanceEpilogue()}>
                Dál
              </Button>
            </>
          ) : (
            <>
              <img src="/game/sprites/fox-smile.png" alt="" className="h-36 w-36 object-contain" />
              <h2 className="font-display text-3xl">Konec příběhu?</h2>
              <p className="max-w-md text-muted">Volný průchod všemi úrovněmi je ti k dispozici.</p>
              <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
                <Button size="lg" onClick={() => game()?.endCompletedGame()}>
                  Ukončit dohranou hru
                </Button>
                <Button variant="secondary" size="lg" onClick={() => game()?.seekCreatorsCave()}>
                  Hledat jeskyni tvůrců
                </Button>
              </div>
            </>
          )}
        </Panel>
      )}

      {(hud.overlay === "title" || hud.overlay === "levels") && (
        <Panel roomy={hud.overlay === "levels"}>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Plošinovka · 2.0</p>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Liščí Dolina</h1>
          <p className="max-w-md text-muted">
            Začínáš s liškou. Mince kupují další hrdiny. Mezerník je schopnost, skok je W nebo šipka nahoru.
          </p>
          {hud.overlay === "title" ? (
            <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => game()?.requestPlay(0)}>
                <Play className="size-4" />
                Hrát
              </Button>
              <Button variant="secondary" size="lg" className="w-full" onClick={() => game()?.goMenu("levels")}>
                <Map className="size-4" />
                Úrovně
              </Button>
              <p className="pt-1 text-sm text-muted">Měšec {hud.purse} · hrdinů {hud.owned.length}/5</p>
              {hud.banner && <p className="text-sm font-medium text-accent">{hud.banner}</p>}
              <CheatButton open={cheatsOpen} onToggle={() => setCheatsOpen((v) => !v)} onCheat={fireCheat} />
            </div>
          ) : (
            <div className="mt-4 grid w-full max-w-lg gap-3">
              {LEVELS.filter((l) => l.id < MAIN_LEVELS).map((lvl, i) => {
                const locked = i >= hud.unlocked;
                return (
                  <button
                    key={lvl.id}
                    disabled={locked}
                    onClick={() => game()?.requestPlay(lvl.id)}
                    className={cn(
                      "rounded-[20px] border border-border bg-surface-2 px-4 py-3 text-left transition-opacity",
                      locked && "opacity-40",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-lg">
                        {i + 1}. {lvl.name}
                      </p>
                      <p className="text-sm tabular-nums text-muted">
                        {hud.best[i] ?? 0}/{lvl.coins.length}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">{locked ? "Nejprve splň předchozí úroveň" : lvl.blurb}</p>
                  </button>
                );
              })}
              {SECRET_LEVELS.map((lvl) => {
                const riddleDef = RIDDLES.find((r) => r.secretLevel === lvl.id);
                const unlocked = lvl.hall
                  ? hud.solved.includes("alencina") || hud.openedDoors.includes("hall")
                  : Boolean(riddleDef && (hud.keys.includes(riddleDef.id) || hud.openedDoors.includes(riddleDef.id)));
                const label = lvl.hall ? "Tajná úroveň" : `Bonus ${lvl.id - 8}`;
                return (
                  <button
                    key={lvl.id}
                    disabled={!unlocked}
                    onClick={() => game()?.requestPlay(lvl.id)}
                    className={cn(
                      "rounded-[20px] border border-border bg-surface-2 px-4 py-3 text-left transition-opacity",
                      !unlocked && "opacity-40",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-lg">
                        {label} · {lvl.name}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">{unlocked ? lvl.blurb : "Ještě zamčeno"}</p>
                  </button>
                );
              })}
              <CheatButton open={cheatsOpen} onToggle={() => setCheatsOpen((v) => !v)} onCheat={fireCheat} />
              <Button variant="ghost" onClick={() => game()?.goMenu("title")}>
                Zpět
              </Button>
            </div>
          )}
          <p className="mt-6 max-w-md text-xs leading-relaxed text-subtle">
            A/D nebo šipky k běhu. W nebo šipka nahoru ke skoku. Mezerník zapne schopnost. U lucerny lze postavu
            vyměnit.
          </p>
        </Panel>
      )}

      {hud.overlay === "pick" && (
        <Panel roomy>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">S kým jdeš</p>
          <h2 className="font-display text-3xl">Výběr hrdiny</h2>
          <p className="max-w-md text-muted">
            {hud.pickMode === "lantern"
              ? "U lucerny můžeš vyměnit hrdinu. Pak pokračuješ odsud."
              : "Uprostřed úrovně bez lucerny už postavu nezměníš."}
          </p>
          <HeroGrid owned={ownedSet} active={hud.character} onPick={(id) => game()?.confirmPick(id)} />
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => (hud.pickMode === "lantern" ? game()?.confirmPick(hud.character) : game()?.goMenu("title"))}
          >
            {hud.pickMode === "lantern" ? "Zůstat u " + selected.name : "Zpět"}
          </Button>
        </Panel>
      )}

      {hud.overlay === "shop" && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a120c]/45" />
          <section className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border-2 border-[#8a7358] bg-[#2a2118]/92 px-5 py-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-3 rounded-b-full bg-[#6a4a28]" />
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#c4a060]">Po vlajce · obchůdek</p>
            <h2 className="font-display text-3xl text-[#efe8dc]">Obchod v dolině</h2>
            <p className="mt-1 flex items-center justify-center gap-2 text-[#c4b49a]">
              <img src="/game/sprites/coin-hud.png" alt="" className="size-6 object-contain" />
              {hud.levelName} · mince {hud.coins}/{hud.total} · měšec {hud.purse}
            </p>
            <HeroGrid
              owned={ownedSet}
              active={hud.character}
              shop
              purse={hud.purse}
              onPick={(id) => {
                const def = CHARACTERS.find((c) => c.id === id);
                if (!def) return;
                if (ownedSet.has(id)) {
                  useHud.getState().setCharacter(id);
                  return;
                }
                useHud.getState().buyCharacter(id);
              }}
            />
            <div className="mt-5 flex w-full max-w-sm mx-auto flex-col gap-3">
              <Button size="lg" onClick={() => game()?.leaveShop()}>
                {hud.levelId >= MAIN_LEVELS
                  ? "Zpět do doliny"
                  : hud.levelId + 1 < MAIN_LEVELS
                    ? "Další úroveň"
                    : "Dál"}
              </Button>
              <Button variant="ghost" onClick={() => game()?.goMenu("title")}>
                Menu
              </Button>
            </div>
          </section>
        </div>
      )}

      {hud.overlay === "riddle" && riddle && (
        <Panel>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">List s otazníkem</p>
          <h2 className="font-display text-3xl">{riddle.title}</h2>
          <p className="max-w-md text-muted">{riddle.prompt}</p>
          {riddle.kind === "choice" && riddle.options ? (
            <div className="mt-4 grid w-full max-w-sm grid-cols-5 gap-2">
              {riddle.options.map((opt) => (
                <Button
                  key={opt}
                  variant={answer === opt ? "primary" : "secondary"}
                  onClick={() => setAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          ) : (
            <input
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") game()?.submitRiddle(answer);
              }}
              className="mt-4 h-11 w-full max-w-sm rounded-[16px] border border-border bg-surface-2 px-4 text-center text-fg"
              placeholder="Jedno slovo"
            />
          )}
          <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <Button size="lg" onClick={() => game()?.submitRiddle(answer)}>
              Odpovědět
            </Button>
            <Button variant="ghost" onClick={() => game()?.closeRiddle()}>
              Zavřít
            </Button>
          </div>
        </Panel>
      )}

      {hud.overlay === "hall" && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-[24px] border border-border bg-surface/95 px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
            <p className="font-display text-xl">Deska legend</p>
            <p className="text-sm text-muted">Až dvanáct písmen. Jednou za dohrání.</p>
            <input
              autoFocus
              maxLength={NAME_MAX}
              value={fame}
              onChange={(e) => setFame(e.target.value.slice(0, NAME_MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter") game()?.submitFame(fame);
              }}
              className="h-11 w-full rounded-[16px] border border-border bg-surface-2 px-4 text-center text-fg"
              placeholder="Vaše jméno"
            />
            <div className="flex w-full gap-2">
              <Button className="flex-1" size="lg" onClick={() => game()?.submitFame(fame)}>
                <Sparkles className="size-4" />
                Vytesat na desku
              </Button>
              <Button variant="ghost" onClick={() => game()?.closeHall()}>
                Později
              </Button>
            </div>
          </div>
        </div>
      )}

      {hud.overlay === "paused" && (
        <Panel>
          <h2 className="font-display text-3xl">Pauza</h2>
          <p className="text-muted">{hud.levelName}</p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <Button
              size="lg"
              onClick={() => {
                const g = game();
                if (!g) return;
                g.overlay = "playing";
                useHud.getState().setOverlay("playing");
              }}
            >
              Pokračovat
            </Button>
            <Button variant="secondary" onClick={() => game()?.restartLevel()}>
              <RotateCcw className="size-4" />
              Od začátku
            </Button>
            <Button variant="ghost" onClick={() => game()?.goMenu()}>
              Menu
            </Button>
            <CheatButton open={cheatsOpen} onToggle={() => setCheatsOpen((v) => !v)} onCheat={fireCheat} />
          </div>
        </Panel>
      )}

      {hud.overlay === "dead" && (
        <Panel dim roomy>
          <h2 className="font-display text-3xl">To bolí</h2>
          <p className="text-muted">
            {hud.hasCheckpoint
              ? "Vracíš se k lucerně. Tady můžeš vyměnit hrdinu."
              : "Zkus to znovu od začátku úrovně."}
          </p>
          {hud.owned.length > 1 && (
            <HeroGrid owned={ownedSet} active={hud.character} onPick={(id) => game()?.continueWith(id)} />
          )}
          <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <Button size="lg" onClick={() => game()?.continueCheckpoint()}>
              {hud.hasCheckpoint ? "Pokračovat z lucerny" : "Zkusit znovu"}
            </Button>
            <Button variant="secondary" onClick={() => game()?.restartLevel()}>
              <RotateCcw className="size-4" />
              Od začátku
            </Button>
            <Button variant="ghost" onClick={() => game()?.goMenu()}>
              Menu
            </Button>
          </div>
        </Panel>
      )}

      {hud.overlay === "win" && (
        <Panel>
          <Flag className="size-8 text-accent" />
          <h2 className="font-display text-3xl">Vlajka dobyta</h2>
          <p className="text-muted">
            {hud.levelName} · mince {hud.coins}/{hud.total}
          </p>
          <Button size="lg" className="mt-4" onClick={() => game()?.leaveShop()}>
            Do obchodu
          </Button>
        </Panel>
      )}
    </main>
  );
}

function CheatButton({
  open,
  onToggle,
  onCheat,
}: {
  open: boolean;
  onToggle: () => void;
  onCheat: (code: string) => void;
}) {
  return (
    <div className="relative self-end">
      <button
        type="button"
        onClick={onToggle}
        className="size-3 rounded-[4px] border border-fg/5 bg-fg/[0.04] opacity-[0.07] transition-opacity hover:opacity-20"
      />
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 min-w-52 rounded-[16px] border border-border bg-surface p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          {CHEAT_LIST.map((c) => (
            <button
              key={c.code}
              onClick={() => onCheat(c.code)}
              className="flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              <span className="font-mono">{c.code}</span>
              <span className="text-muted">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeroGrid({
  owned,
  active,
  onPick,
  shop,
  purse = 0,
}: {
  owned: Set<string>;
  active: CharacterId;
  onPick: (id: CharacterId) => void;
  shop?: boolean;
  purse?: number;
}) {
  return (
    <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-5">
      {CHARACTERS.map((c) => {
        const have = owned.has(c.id);
        const locked = shop ? !have && purse < c.price : !have;
        return (
          <button
            key={c.id}
            disabled={locked}
            onClick={() => onPick(c.id)}
            className={cn(
              "rounded-[20px] border bg-[#3a3228]/80 px-3 py-4 text-center",
              active === c.id ? "border-accent" : "border-[#8a7358]/70",
              have && shop && "border-accent",
              locked && "opacity-40",
            )}
          >
            <img
              src={`/game/sprites/${c.id}-portrait.png?v=stall1`}
              alt=""
              className="mx-auto h-24 w-24 object-contain"
            />
            <p className="mt-2 font-display text-lg">{c.name}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-accent">{c.hint}</p>
            {shop && (
              <p className="mt-1 text-sm text-muted">
                {c.price <= 0 ? "S tebou od začátku" : have ? "Koupeno" : `${c.price} mincí`}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Panel({
  children,
  dim,
  roomy,
}: {
  children: React.ReactNode;
  dim?: boolean;
  roomy?: boolean;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-bg/70", dim && "bg-bg/50")} />
      <section
        className={cn(
          "relative flex w-full max-w-lg flex-col items-center gap-3 rounded-[28px] border border-border bg-surface px-6 py-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]",
          roomy && "max-h-[min(82dvh,720px)] max-w-xl overflow-y-auto",
        )}
      >
        {children}
      </section>
    </div>
  );
}

function TouchPad({
  gameRef,
  canJump,
  hint,
}: {
  gameRef: React.RefObject<Game | null>;
  canJump: boolean;
  hint: string;
}) {
  const press = (dir: "left" | "right" | "jump" | "ability", down: boolean) => {
    gameRef.current?.input.setTouch(dir, down);
  };
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
      <div className="pointer-events-auto flex gap-2">
        <PadBtn label="Vlevo" onHold={(d) => press("left", d)}>
          <ChevronLeft className="size-7" />
        </PadBtn>
        <PadBtn label="Vpravo" onHold={(d) => press("right", d)}>
          <ChevronRight className="size-7" />
        </PadBtn>
      </div>
      <div className="pointer-events-auto flex gap-2">
        {canJump && (
          <PadBtn label="Skok" onHold={(d) => press("jump", d)}>
            Skok
          </PadBtn>
        )}
        <PadBtn label={hint} onHold={(d) => press("ability", d)} wide>
          {hint}
        </PadBtn>
      </div>
    </div>
  );
}

function PadBtn({
  label,
  onHold,
  children,
  wide,
}: {
  label: string;
  onHold: (down: boolean) => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "h-14 rounded-[16px] border border-border bg-surface/90 text-sm font-medium text-fg",
        wide ? "min-w-28 px-5" : "min-w-14 px-3",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {children}
    </button>
  );
}
