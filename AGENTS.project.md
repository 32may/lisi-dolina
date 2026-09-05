# Liščí Dolina

2D plošinovka pro Grok App Builder.

- **GitHub:** https://github.com/32may/lisi-dolina
- **Účet:** 32may
- **Verze:** 2.1 — postavy za mince, schopnosti na mezerníku, tajné úrovně, May a Mia

## Ovládání

- A / ← vlevo, D / → vpravo
- W / ↑ skok (dvojskok u lišky a dikobraza)
- Mezerník = speciální schopnost (ne skok)
- R restart, Esc pauza

## Postavy (měšec)

Ceny jsou nastavené tak, že všechny mince z prvních 6 úrovní (85) stačí na nákup zbylých čtyř.

| Postava | Cena | Schopnost |
|---|---|---|
| Liška | 0 | Chytrost — čte hádanky |
| Kapibara | 12 | Otevírá dveře |
| Dikobraz | 18 | Koule (držet mezerník) |
| Batole | 22 | Roztomilost — strážce nese k lucerně |
| Robot | 33 | Křehký letec (držet mezerník) |

Výběr postavy na začátku úrovně a u lucerny po smrti. Uprostřed úrovně bez checkpointu nelze měnit.

## Tajné úrovně

Pět hádanek (otec Fura) → klíče → dveře (jen kapibara) → 5 tajných úrovní s pákami. Po pěti pákách se před vlajkou 9. úrovně objeví dveře do Jeskyně slávy (May a Mia).

## Save

`localStorage` klíč `lisi-dolina-v3`. Auth a databáze vypnuté.
