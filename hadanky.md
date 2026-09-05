# Banka hádanek Liščí Doliny

Tento soubor je **zdroj herního obsahu**. Při startu hry se načte a ověří.
Špatný blok skončí chybou s `id` bloku.

## Pravidla

Jeden blok začíná řádkem `## bank:<id>` (běžná hádanka) nebo `## fixed:alencina`.
Povinná pole:

- `title:` krátký název
- `kind:` `word` nebo `choice`
- `prompt:` otázka (jeden řádek)
- `answer:` čárkou oddělené přijímané odpovědi (bez ohledu na velikost a diakritiku)

Pro `kind: choice` ještě:

- `options:` právě pět možností, čárkou oddělených; jedna z nich musí být ve `answer`

`id` musí být jedinečné, jen malá písmena, číslice a pomlčka.
Alenčina je mimo losování. Nová hra náhodně vybere **pět** běžných hádanek
pro pět papírů (`mapa`, `tma`, `jmeno`, `houba`, `mesic`).

Změna textu v tomto souboru se projeví po obnovení hry (dev server načte MD).
Produkční build zabalí soubor přímo do aplikace.

Příklad:

```
## bank:stin
title: Stínový list
kind: word
prompt: Chodím s tebou ve dne, v noci mizím. Co jsem?
answer: stin, stín
```

---

## bank:mapa
title: List v jantaru
kind: word
prompt: Ležím ti na kolenou, ukážu hory i řeky, a přece neudělám krok. Co jsem?
answer: mapa, mapka

## bank:tma
title: Jiskrový lístek
kind: word
prompt: Čím víc mě je, tím míň vidíš. Co jsem?
answer: tma, temnota

## bank:jmeno
title: Útesový chyták
kind: word
prompt: Patří jen tobě, ale ostatní to používají častěji než ty. Co to je?
answer: jmeno, jméno, moje jmeno, moje jméno

## bank:houba
title: Mechová hádanka
kind: word
prompt: Mám všude spoustu dírek, a přece ze mě voda nevyteče. Co jsem?
answer: houba, houbicka, houbička

## bank:mesic
title: Korunní otázka
kind: choice
prompt: Kolik měsíců v roce má 28 dní?
answer: 12
options: 1, 2, 6, 11, 12

## bank:stin
title: Stínový list
kind: word
prompt: Chodím s tebou ve dne, v noci mizím. Co jsem?
answer: stin, stín

## bank:echo
title: Ozvěna v rokli
kind: word
prompt: Mluvím, až když ty dořekneš, a říkám totéž. Co jsem?
answer: ozvena, ozvěna, echo

## bank:svicka
title: Voskový chyták
kind: word
prompt: Čím víc jím, tím menší jsem. Co jsem?
answer: svicka, svíčka, svice, svíce

## bank:klic
title: Zubaté tajemství
kind: word
prompt: Mám zuby a nekousnu, otvírám bez rukou. Co jsem?
answer: klic, klíč

## bank:reka
title: Tekutá hádanka
kind: word
prompt: Běžím bez nohou, mám koryto bez slámy. Co jsem?
answer: reka, řeka, potok

## bank:hodiny
title: Tikající list
kind: word
prompt: Mám ruce a neobjímám, obličej bez očí. Co jsem?
answer: hodiny, hodinky, orloj

## bank:vejce
title: Skořápkový chyták
kind: word
prompt: Bez oken, bez dveří, uvnitř zlatý palác. Co je to?
answer: vejce, vajicko, vajíčko

## bank:sul
title: Mořská otázka
kind: word
prompt: Jsem v moři, ve slze i na stole. Co jsem?
answer: sul, sůl

## bank:vitr
title: Šumící list
kind: word
prompt: Slyšíš mě, nevidíš mě, stromy se přede mnou klaní. Co jsem?
answer: vitr, vítr

## bank:zrcadlo
title: Stříbrný chyták
kind: word
prompt: Vidíš v něm sebe, ale ono tě nevidí. Co je to?
answer: zrcadlo

## bank:hreben
title: Zubaté tajemství hřebene
kind: word
prompt: Mám zuby v řadě, a přece nic nesním. Vlasy učešu. Co jsem?
answer: hreben, hřeben

## bank:most
title: Spojovací otázka
kind: word
prompt: Spojím dva břehy, a přece nikam nejdu. Co jsem?
answer: most

## bank:komin
title: Kouřový list
kind: word
prompt: Dům má čepici, z ní jde kouř. Co je ta čepice?
answer: komin, komín

## bank:deste
title: Kapková hádanka
kind: word
prompt: Padám z nebe, zalévám zahradu, ale nejsem slza. Co jsem?
answer: dest, déšť, destik, deštík, prsi, prší

## bank:ruka
title: Pět bratří
kind: word
prompt: Pět bratří v jedné posteli, každý má svou čepici. Co to je?
answer: ruka, prsty, ruka s prsty

## bank:postel
title: Noční chyták
kind: word
prompt: Ve dne stojím na nohou, v noci mě položí na záda. Co jsem?
answer: postel, lužko, lůžko

## bank:snih
title: Zimní list
kind: word
prompt: Padám bílý, v ruce mizím. Co jsem?
answer: snih, sníh, vločka, vlocka

## bank:duha
title: Barevný most
kind: word
prompt: Po dešti stojím na nebi, ale nikdo po mně nepřejde. Co jsem?
answer: duha

## bank:kniha
title: Listnatý chyták
kind: word
prompt: Mám listy, ale nejsem strom. Co jsem?
answer: kniha, sešit, sesit

## bank:okno
title: Skleněný list
kind: word
prompt: Vidíš skrze mě svět, ale já sama nevidím. Co jsem?
answer: okno, okynko, okénko

## fixed:alencina
title: Alenčina
kind: word
prompt: Proč je havran jako psací stůl?
answer: nevim, nevím
