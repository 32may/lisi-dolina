# Liščí Dolina — verze 3.0

Pracovní větev: `v3.0` (záloha i na `fix/audit-2.2`). Tag: `v3.0`.
Save: `lisi-dolina-v4` (čte i v3 a migrují se mince jako první N ID dané mapy).
Sazby bodů: 100 hazard, 50 minutí stráže, 150 zabití, 120 dvojskok, 100 lucerna, 500 vlajka. `Math.round`.

3.0 navíc: intro jen deska legend + liška; jeskyně tvůrců podle koláže; obchůdek jako stánek na cestě; Alenčina v losování (`bank:alencina`).

Ověřeno zde: `tsc` PASS, `vite build` PASS, `src/game/logic.test.ts` 13/13, `validate-hadanky` PASS.
Prohlížeč: intro kamera drží camX=2360 / 10 s; smrt → dead bez mřížky → jeden pick; HUD klíče+páky+body; dřevěný shop; mince ID `0:0` ihned do měšce; IDDQD nastaví cheated; MAYOFF vrátí fox/0.

| ID | Požadavek | Stav | Důkaz |
|---|---|---|---|
| G01 | Plošinovka, kolize | splněno | engine collide |
| G02 | 9 hlavních úrovní | splněno | levels.ts |
| G03 | Klávesy ve hře + consume po menu | splněno | consume 0.22s |
| G04 | Klávesnice v menu | splněno | HeroGrid šipky/Enter |
| G05 | Checkpointy, nohy | splněno | spawnY podle výšky |
| G06 | Jediné rozhodnutí po smrti | splněno | qa-dead + qa-afterdeath |
| G07 | Změna u lucerny mezerníkem | splněno | tryLanternSwap |
| G08 | Stomp shora | splněno | prevBottom <= g.y |
| H01–H06 | Postavy, carry lock, curl dřív než darts | splněno | engine |
| H07 | Krátké nápovědy | splněno | characters.hint |
| E01 | Ceny 12+18+22+33=85 | splněno | characters.ts |
| E02 | Jedinečné mince ihned | splněno | collectedCoins `0:0`, purse+1 |
| E03 | Dřevěný obchod | splněno | qa-shop.png |
| E04 | Kombinace 7–9 | splněno | lucerny + swap |
| S01–S03 | Body, koeficient, eventId | splněno | progress.ts + logic.test |
| U01 | HUD klíče/páky/body | splněno | qa-hud.png |
| U02 | Banner 5 s přesný text | splněno | bannerUntil + SECRET_BANNER |
| U03 | Názvy úrovní | splněno | displayLevelTitle |
| R01–R04 | 25 hádanek + Alenčina z MD | splněno | hadanky.md, logic.test |
| R05–R06 | Dveře jen kapybara Special | splněno | canOpenDoor viaAbility |
| R07 | Bonus vrací kontext smrtí | splněno | originSnap.deaths |
| R08 | 5 pák + Alenčina | splněno | rules + engine |
| R09 | Gauntlet v jeskyni | splněno | content hall 5 úseků |
| F01–F09 | Ceremonie, deska, epilog, runId | splněno | legend.functions run_id |
| C01–C04 | Cheaty + MAYOFF | splněno | IDDQD cheated; MAYOFF fox/0 |
| M01–M03 | Dotyk nahoře i >640 | splněno | qa-hud joystick |
| D01 | typecheck/build | splněno | tsc + vite build |
| T01 | npm ci lockfile | blokováno | lockfile v sandboxu; typecheck/build PASS po stávající instalaci |
| T17 | 5 fyzických tras ke dveřím | částečně | dveře na 2/4/5/7/8; ruční trasa neprojetá celá |
| T24 | produkční Postgres persistence | blokováno | DATABASE_URL v preview není; PGLite OK, Neon nenasazen z této větve |
| T29 | skutečný telefon multi-touch | blokováno | sandbox emulace 390 a 844 |
| T32 | celá poctivá hra 1–9+jeskyně | neověřeno | potřeba lidský průchod |

T02, T05, T07 (sběr ID), T09 (koeficient unit), T14, T27/T28 (částečně IAAAY/MAYOFF/IDDQD): ověřeno v prohlížeči nebo unit testu.
T03/T08/T11–T13/T18–T23/T25/T26/T30–T32: kód je na místě, plný lidský průchod označen jako neověřený.
