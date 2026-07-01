# Bricked Up — Sound-Effekt-Audit & ElevenLabs-Prompts

Das Audio (`frontend/audio.js`) ist **sample-basiert mit Synth-Fallback**: jeder Cue
lädt zuerst eine WAV aus `frontend/assets/audio/`. Fehlt die Datei, wird der Sound
live per WebAudio synthetisiert ("code-generiert").

**Theme:** Märchen „Die drei kleinen Schweinchen" — der Große Böse Wolf pustet
(Kaskade), Schweinchen bauen Stroh- → Holz- → Ziegel-Festung (Ziegel sammeln),
kochender Suppentopf (Scatter), Werkzeuge (Axt/Kelle/Gabel), Gold & Reichtum.
Storybook-Charme trifft Premium-Casino. Alle Prompts unten spiegeln das wider.

## 1. Schon custom (eigene WAV vorhanden) ✅

| Cue | Datei | Wann |
|-----|-------|------|
| `spin` | `ui-crisp-casino.wav` | Dreh-Start |
| `reelStop` | `vault-drop.wav` | Walze stoppt |
| `puff` | `deep-cartoon-hit.wav` | Wolf pustet (Kaskade) |
| `win` | `win-celebration.wav` | Gewinn-Kaskade |
| `winBig` | `premium-casino-win.wav` | Big/Mega/Epic Win |
| `smallWin` | `small-win-chime.wav` | Kleiner Gewinn |
| `brick` | `brick-impact.wav` | Ziegel eingesammelt |
| `scatter` | `pot-bubble.wav` | Suppentopf/Scatter |
| `trigger` | `bonus-trigger.wav` | Freispiele ausgelöst |
| `upgrade` | `magic-upgrade.wav` | Haus-Upgrade |
| `houseComplete` | `house-complete.wav` | Haus fertiggestellt |
| `music` | `background-music.wav` | Hintergrundmusik (Loop) |

## 2. Status

✅ **Erledigt & verdrahtet** (custom WAV vorhanden, mit Synth-Fallback):

| Cue | Datei | Wann im Spiel |
|-----|-------|---------------|
| `riser` | `anticipation-riser.wav` | Anticipation, wenn 2 Töpfe liegen und die letzte Walze den 3. jagt |
| `coinTick` | `coin-tick.wav` | Münz-Ticks beim Hochzählen im Big-Win |
| `thunder` | `thunder-roll.wav` | Gewitter-Ambiente in den Freispielen |
| `multUp` | `multiplier-up.wav` | Wolf-Multiplikator steigt (x2 → x3 → …) |

ℹ️ **Bewusst NICHT ersetzt:**
- `drop` nutzt weiterhin `vault-drop.wav` (geteilt mit `reelStop`) — klingt gut so.
- Kleine Synth-„Sweetener" (Sub-Bass unter Big-Wins, Ton in der Anticipation-Walze)
  bleiben als Layer über den echten Samples.

---

## 3. ElevenLabs-Prompts (Text-to-Sound-Effects) — themengerecht

> Tab **Sound Effects** auf elevenlabs.io. Prompt einfügen, **Duration** wie unten,
> **Prompt Influence** ~0.3–0.5 (musikalisch/stilisiert) bis ~0.7 (wörtlich/realistisch).
> Export als **WAV** (Mono reicht), Dateinamen exakt wie oben, in
> `frontend/assets/audio/` ablegen. Ziel-Vibe: sauberer Game-SFX, storybook-Märchen
> mit Wolf/Schweinchen/Bausteinen — nicht foley-realistisch, sondern spielig.

### A1 · `anticipation-riser.wav` — ersetzt `riser`
```
Rising tension riser for a Three Little Pigs fairytale slot: the Big Bad Wolf
draws in a huge breath before he huffs and puffs. Start on a low gathering-wind
rumble and a deep inhaling whoosh that sweeps upward in pitch to a bright
shimmering peak over about one second, with faint creaking house timbers and a
sprinkle of magic building underneath. Suspenseful and storybook, clean and
game-ready. No blow or impact at the end — it should feel like it is building
toward the wolf's big puff. Dry, mono.
```
**Duration:** ~1.0 s · **Loop:** nein

### A2 · `coin-tick.wav` — ersetzt `coinTick`
```
A single tiny bright gold coin "ting" for a fairytale casino slot — one small
high-pitched metallic pluck, like a gold coin dropping onto a pig's pile of
treasure or into a piggy bank. Crisp and clean with a very fast decay and no
reverb tail. Extremely short, so it sounds satisfying when played rapidly many
times in a row during a coin count-up.
```
**Duration:** ~0.15 s · **Loop:** nein

### B1 · `thunder-roll.wav` — ersetzt `thunder`
```
Distant rolling thunder over a stormy fairytale night while the three little
pigs build their house. A deep, warm low-frequency rumble that swells and rolls
with a soft crack in the middle and a long fading tail. Cinematic and
cozy-spooky, storybook atmosphere rather than harsh or jump-scary — gentle
background storm. Mono.
```
**Duration:** ~1.5–2.0 s · **Loop:** nein

### B2 · `cascade-drop.wav` — dedizierter `drop`
```
A quick chunky tumble for a Three Little Pigs building slot: bricks, wooden
planks and bundles of straw dropping and settling into place as the pigs rebuild
their wall. A soft wood-and-stone thud with a tiny bounce, like little building
blocks landing on each other. Short, punchy, dry and warm, no metallic ring.
```
**Duration:** ~0.2–0.3 s · **Loop:** nein

### B3 · `multiplier-up.wav` — dedizierter `multUp`
```
A bright ascending magical power-up chime for a fairytale slot, played when the
Big Bad Wolf's win multiplier climbs a level. A snappy two-note upward sparkle
with a quick shimmer of storybook pixie-dust on top, triumphant and clean. Warm
casino-fairytale tone, ending on a bright high note.
```
**Duration:** ~0.4 s · **Loop:** nein

---

## 4. Umsetzung (erledigt)

`riser`, `coinTick`, `thunder` und `multUp` haben in `audio.js` jetzt einen
Sample-Slot in `SAMPLE_URLS` und laden ihre WAV mit Synth-Fallback. Die langen
Dateien werden als kurzer Slice gespielt (`coinTick` 0.18 s, `multUp` 0.6 s), damit
schnelle Wiederholungen tight bleiben. Alle vier decoden verifiziert in Chromium.
Die Prompts oben bleiben als Referenz, falls du einen Sound neu generieren willst.
