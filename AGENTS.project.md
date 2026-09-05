# Liščí Dolina

2D plošinovka pro Grok App Builder.

- **GitHub:** https://github.com/32may/lisi-dolina
- **Účet:** 32may
- **Verze:** 2.2 — body, jedinečné mince, deska legend (SQL), 25 hádanek z `hadanky.md`

## Ovládání

- A / ← vlevo, D / → vpravo
- W / ↑ skok (dvojskok u lišky a dikobraza)
- Mezerník = speciální schopnost (ne skok)
- R restart, Esc pauza
- U rozsvícené lucerny mezerník vymění hrdinu
- Výběr a obchod: šipky + Enter / mezerník

## Postavy (měšec)

Ceny 12 + 18 + 22 + 33 = 85. Mince z prvních 6 úrovní (85) stačí na nákup zbylých čtyř.

| Postava | Cena | Schopnost |
|---|---|---|
| Liška | 0 | Chytrost — čte hádanky |
| Kapibara | 12 | Otevírá dveře (vždy Special) |
| Dikobraz | 18 | Koule (držet mezerník) |
| Batole | 22 | Roztomilost — strážce nese k lucerně |
| Robot | 33 | Křehký letec (držet mezerník) |

## Tajné úrovně

Pět losovaných hádanek z `hadanky.md` → klíče → dveře (jen kapibara + Special) → 5 bonusů s pákami. Po pěti pákách banner „Tajný level otevřen“. Alenčina hádanka (`nevím`) otevře dveře do jeskyně tvůrců. Zápis na Desku legend až tam.

## Body

Nezávislé na mincích. Sazby v `src/game/progress.ts`. Koeficient `max(0.1, 1 - 0.1 * deathsInLevel)`.

## Save

`localStorage` klíč `lisi-dolina-v4` (čte i v3). Deska legend je sdílená SQL tabulka `legend_board` (PostgreSQL, jinak PGLite). Auth vypnuté; databáze zapnutá jen pro desku.
