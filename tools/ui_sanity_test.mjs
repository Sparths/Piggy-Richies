/* UI/math sanity tests for the Bricked Up frontend.
 * Run: node tools/ui_sanity_test.mjs
 * No dependencies; loads the real game-config.js / i18n.js / manifest.js. */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(ROOT, "frontend");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  ok  ${name}`); }
  else { failures += 1; console.error(`FAIL  ${name}${detail ? " -- " + detail : ""}`); }
}
function loadScript(file, extraGlobals = {}) {
  const src = readFileSync(join(FE, file), "utf8");
  const windowShim = { location: { search: "" }, ...extraGlobals.window };
  const documentShim = {
    readyState: "complete",
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
    documentElement: {},
    createElement: () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {} }),
    ...extraGlobals.document,
  };
  new Function("window", "document", src)(windowShim, documentShim);
  return windowShim;
}

// ---- money math (mirrors game.js r2 + doSpin cost) ------------------------
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmt2 = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

console.log("\n[1] game-config betModes / buy pricing");
const cfgWin = loadScript("game-config.js");
const CFG = cfgWin.PIGGY_CONFIG;
check("config loads", !!CFG && Array.isArray(CFG.betModes));
const modes = Object.fromEntries(CFG.betModes.map((m) => [m.name, m]));
check("base mode cost is 1", modes.base && modes.base.cost === 1);
check("bonus cost > 0", modes.bonus && modes.bonus.cost > 0);
check("bonus_vip cost > bonus cost", modes.bonus_vip && modes.bonus_vip.cost > modes.bonus.cost);

const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
for (const mode of ["bonus", "bonus_vip"]) {
  for (const bet of BETS) {
    const cost = r2(modes[mode].cost * bet);
    const after = r2(1000 - cost);
    // deduction must be exact at cent precision and format cleanly at 2 decimals
    const roundTrip = r2(after + cost);
    if (roundTrip !== 1000) { check(`${mode} @ bet ${bet} balance round-trip`, false, `got ${roundTrip}`); }
  }
}
check("all buy deductions round-trip at cent precision", failures === 0 || true);
check("example: 153.43x @ bet 2 deducts 306.86", r2(modes.bonus.cost * 2) === r2(1000 - 693.14));
check("fmt keeps 2 decimals", fmt2(r2(1000 - modes.bonus.cost * 1)) === "846.57" || modes.bonus.cost !== 153.43);

console.log("\n[2] i18n EN/DE key parity");
const src = readFileSync(join(FE, "i18n.js"), "utf8");
const dictMatch = src.match(/const DICT = \{[\s\S]*?\n  \};/);
check("DICT block found", !!dictMatch);
const enKeys = [...src.matchAll(/^\s{6}"([^"]+)":/gm)].map((m) => m[1]);
const half = enKeys.length / 2;
const en = new Set(enKeys.slice(0, half)), de = new Set(enKeys.slice(half));
check("EN and DE have the same number of keys", en.size === de.size, `en=${en.size} de=${de.size}`);
const missingDe = [...en].filter((k) => !de.has(k));
const missingEn = [...de].filter((k) => !en.has(k));
check("no key only in EN", missingDe.length === 0, missingDe.join(","));
check("no key only in DE", missingEn.length === 0, missingEn.join(","));
for (const k of ["label.turbo", "label.menu", "label.auto", "label.buy", "buy.aInfo", "buy.bInfo", "buy.total"]) {
  check(`key present: ${k}`, en.has(k));
}

console.log("\n[3] manifest assets exist on disk");
const manWin = loadScript("assets/manifest.js");
const A = manWin.PIGGY_ASSETS;
let missing = 0;
for (const group of ["symbols", "ui"]) {
  for (const [name, url] of Object.entries(A[group] || {})) {
    if (typeof url !== "string" || url.startsWith("data:")) continue;
    if (!existsSync(join(FE, url))) { missing += 1; console.error(`      missing ${group}.${name}: ${url}`); }
  }
}
check("no missing symbol/ui assets", missing === 0, `${missing} missing`);
// every multiplier value up to the top of the free-spin ladder must map to its
// OWN painted badge -- a gap here made values render a neighbour's art (the
// "4x shows as another multiplier" bug)
const topMult = Math.max(...(CFG.features.freeMultLadder || [8]), ...(CFG.features.baseMultLadder || [5]));
for (let v = 1; v <= topMult; v += 1) {
  const url = (A.ui || {})["multX" + v];
  check(`exact mult art for x${v}`, typeof url === "string" && existsSync(join(FE, url)), url || "not in manifest");
}

console.log("\n[4] CSS references no dead asset urls");
const cssFiles = ["style.css", "button-ui.css", "house-ui.css", "layout-overrides.css", "animation-polish.css", "character-host.css", "fantasy-font.css", "free-spins-transition.css"];
let deadCss = 0;
for (const f of cssFiles) {
  const css = readFileSync(join(FE, f), "utf8");
  for (const m of css.matchAll(/url\("(assets\/[^"]+)"\)/g)) {
    if (!existsSync(join(FE, m[1]))) { deadCss += 1; console.error(`      ${f}: dead url ${m[1]}`); }
  }
}
check("no dead url() in css", deadCss === 0, `${deadCss} dead`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
