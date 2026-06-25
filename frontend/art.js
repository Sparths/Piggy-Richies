/* Stake's Huff & Puff: Piggy Richies -- symbol artwork.
 *
 * Hand-authored flat-vector SVGs for all 13 symbols so the game looks like a
 * real slot out of the box (no emoji). Each icon is transparent and sits on the
 * CSS tile, which provides the gem/panel background + glow.
 *
 * Drop-in upgrade: if an image exists at assets/symbols/<ID>.webp (or .png),
 * preloadAssets() detects it and the renderer uses it instead of the SVG. So
 * generated art (see docs/ASSET_PROMPTS.md) needs zero code changes.
 */
(() => {
  "use strict";

  const C = {
    pig: "#f7adc4", pigDark: "#e07a9d", pigSnout: "#f6c1d4",
    wolf: "#8a93a6", wolfDark: "#5b6273", wolfBelly: "#c7cdd9",
    gold: "#ffd23f", goldDark: "#e0a400",
    steel: "#cfd8e3", steelDark: "#8a98ab",
    wood: "#b5793f", woodDark: "#8a531f",
    straw: "#f4c95d", strawDark: "#caa033",
    brick: "#c65a3a", brickDark: "#8f3b22",
    pot: "#3a4250", potDark: "#222833",
    cream: "#f7efe0", ink: "#2a2118",
    soup: "#ffb14e",
  };

  // soft drop shadow used by every icon
  const SHADOW = `<filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2.2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/></filter>`;

  const svg = (inner, extraDefs = "") =>
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="sym-svg">
      <defs>${SHADOW}${extraDefs}</defs><g filter="url(#ds)">${inner}</g></svg>`;

  // ---- playing cards (themed to the house materials) ----------------------
  function card(letter, color, dark, motif) {
    return svg(`
      <rect x="22" y="14" width="56" height="72" rx="9" fill="${C.cream}" stroke="${dark}" stroke-width="3"/>
      <rect x="22" y="14" width="56" height="72" rx="9" fill="none" stroke="${color}" stroke-width="3" opacity="0.5"/>
      <text x="50" y="62" font-family="Georgia, serif" font-size="46" font-weight="700"
            text-anchor="middle" fill="${color}">${letter}</text>
      <g transform="translate(50 78) scale(0.8)">${motif}</g>
      <g transform="translate(30 26) scale(0.5)">${motif}</g>`);
  }
  const pip = (c) => `<circle cx="0" cy="-2" r="6" fill="${c}"/>`;

  // ---- tools --------------------------------------------------------------
  const axe = () => svg(`
    <rect x="46" y="20" width="8" height="62" rx="4" fill="${C.wood}" stroke="${C.woodDark}" stroke-width="2" transform="rotate(18 50 50)"/>
    <path d="M52 22 C70 20 82 30 80 44 C70 40 60 40 50 44 Z" fill="${C.steel}" stroke="${C.steelDark}" stroke-width="2.5"/>
    <path d="M52 22 C60 24 66 30 66 38" fill="none" stroke="#fff" stroke-width="2" opacity="0.6"/>`);
  const trowel = () => svg(`
    <rect x="47" y="16" width="7" height="22" rx="3.5" fill="${C.wood}" stroke="${C.woodDark}" stroke-width="2"/>
    <rect x="44" y="34" width="13" height="8" rx="2" fill="${C.steelDark}"/>
    <path d="M50 42 L78 56 L50 90 L22 56 Z" fill="${C.steel}" stroke="${C.steelDark}" stroke-width="3"/>
    <path d="M50 50 L50 84" stroke="${C.steelDark}" stroke-width="2" opacity="0.5"/>`);
  const fork = () => svg(`
    <rect x="46" y="40" width="8" height="46" rx="4" fill="${C.wood}" stroke="${C.woodDark}" stroke-width="2"/>
    <path d="M30 44 L30 16 M50 44 L50 12 M70 44 L70 16" stroke="${C.steel}" stroke-width="7" stroke-linecap="round"/>
    <path d="M30 44 L30 16 M50 44 L50 12 M70 44 L70 16" stroke="${C.steelDark}" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <rect x="26" y="40" width="48" height="10" rx="5" fill="${C.steelDark}"/>`);

  // ---- brick token --------------------------------------------------------
  const brick = () => svg(`
    <rect x="16" y="30" width="68" height="40" rx="6" fill="${C.brick}" stroke="${C.brickDark}" stroke-width="3"/>
    <path d="M16 50 H84 M50 30 V50 M33 50 V70 M67 50 V70" stroke="${C.brickDark}" stroke-width="3" opacity="0.7"/>
    <path d="M22 38 H44" stroke="#fff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
    <path d="M70 24 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" fill="${C.gold}"/>`);

  // ---- pig face builder ---------------------------------------------------
  function pigBase(eyes, accessory, accentName) {
    return svg(`
      <path d="M28 30 L24 16 L40 24 Z" fill="${C.pig}" stroke="${C.pigDark}" stroke-width="2.5"/>
      <path d="M72 30 L76 16 L60 24 Z" fill="${C.pig}" stroke="${C.pigDark}" stroke-width="2.5"/>
      <ellipse cx="50" cy="54" rx="32" ry="29" fill="${C.pig}" stroke="${C.pigDark}" stroke-width="3"/>
      <ellipse cx="50" cy="64" rx="16" ry="12" fill="${C.pigSnout}" stroke="${C.pigDark}" stroke-width="2.5"/>
      <ellipse cx="44" cy="64" rx="2.6" ry="4" fill="${C.pigDark}"/>
      <ellipse cx="56" cy="64" rx="2.6" ry="4" fill="${C.pigDark}"/>
      ${eyes}${accessory}`);
  }
  // P3 Straw pig -- nervous, straw strand
  const strawPig = () => pigBase(
    `<circle cx="38" cy="46" r="6.5" fill="#fff" stroke="${C.pigDark}" stroke-width="2"/><circle cx="39" cy="47" r="3" fill="${C.ink}"/>
     <circle cx="62" cy="46" r="6.5" fill="#fff" stroke="${C.pigDark}" stroke-width="2"/><circle cx="63" cy="47" r="3" fill="${C.ink}"/>`,
    `<path d="M60 70 q14 2 22 -6" stroke="${C.straw}" stroke-width="4" fill="none" stroke-linecap="round"/>
     <path d="M64 72 l6 -2 M70 70 l5 -3" stroke="${C.strawDark}" stroke-width="2.5" stroke-linecap="round"/>`);
  // P2 Wood pig -- worker, hard hat + determined brow
  const woodPig = () => pigBase(
    `<circle cx="39" cy="48" r="3.4" fill="${C.ink}"/><circle cx="61" cy="48" r="3.4" fill="${C.ink}"/>
     <path d="M32 42 l12 3 M68 42 l-12 3" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>`,
    `<path d="M22 33 q28 -22 56 0 Z" fill="${C.straw}" stroke="${C.strawDark}" stroke-width="2.5"/>
     <rect x="20" y="31" width="60" height="7" rx="3.5" fill="${C.strawDark}"/>
     <rect x="46" y="16" width="8" height="12" rx="2" fill="${C.wood}"/>`);
  // P1 Brick pig -- premium, cool sunglasses + gold chain
  const brickPig = () => pigBase(
    ``,
    `<rect x="30" y="42" width="16" height="10" rx="3" fill="${C.ink}"/>
     <rect x="54" y="42" width="16" height="10" rx="3" fill="${C.ink}"/>
     <rect x="46" y="45" width="8" height="3.5" rx="1.5" fill="${C.ink}"/>
     <path d="M30 46 h-7 M70 46 h7" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
     <path d="M38 80 q12 10 24 0" fill="none" stroke="${C.gold}" stroke-width="3.5"/>
     <circle cx="50" cy="86" r="4" fill="${C.gold}" stroke="${C.goldDark}" stroke-width="1.5"/>`);

  // ---- wolf (wild) --------------------------------------------------------
  const wolf = () => svg(`
    <path d="M22 34 L14 12 L36 26 Z" fill="${C.wolf}" stroke="${C.wolfDark}" stroke-width="2.5"/>
    <path d="M78 34 L86 12 L64 26 Z" fill="${C.wolf}" stroke="${C.wolfDark}" stroke-width="2.5"/>
    <path d="M26 22 L20 14 L31 21 Z" fill="${C.pig}" opacity="0.7"/>
    <path d="M74 22 L80 14 L69 21 Z" fill="${C.pig}" opacity="0.7"/>
    <path d="M50 20 C74 20 80 44 78 58 C76 76 64 88 50 88 C36 88 24 76 22 58 C20 44 26 20 50 20 Z"
          fill="${C.wolf}" stroke="${C.wolfDark}" stroke-width="3"/>
    <path d="M50 50 C60 50 70 54 74 60 C68 74 60 80 50 80 C40 80 32 74 26 60 C30 54 40 50 50 50Z" fill="${C.wolfBelly}"/>
    <path d="M30 44 l14 5 M70 44 l-14 5" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="40" cy="52" rx="4" ry="5" fill="${C.gold}"/><circle cx="40" cy="53" r="2.2" fill="${C.ink}"/>
    <ellipse cx="60" cy="52" rx="4" ry="5" fill="${C.gold}"/><circle cx="60" cy="53" r="2.2" fill="${C.ink}"/>
    <path d="M50 60 l7 6 -7 4 -7 -4 Z" fill="${C.ink}"/>
    <path d="M42 70 q8 6 16 0" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
    <path d="M44 70 l-2 6 4 -3 M56 70 l2 6 -4 -3" fill="#fff" stroke="${C.wolfDark}" stroke-width="1"/>`);

  // ---- soup pot (scatter) -------------------------------------------------
  const pot = () => svg(`
    <path d="M30 36 q-6 0 -6 -6 M70 36 q6 0 6 -6" stroke="${C.soup}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M40 30 c2 -8 -4 -10 -2 -18 M52 30 c2 -8 -4 -10 -2 -18 M64 30 c2 -8 -4 -10 -2 -18"
          stroke="${C.cream}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <rect x="20" y="40" width="60" height="10" rx="5" fill="${C.potDark}"/>
    <path d="M22 48 H78 L72 82 a6 6 0 0 1 -6 5 H34 a6 6 0 0 1 -6 -5 Z" fill="${C.pot}" stroke="${C.potDark}" stroke-width="3"/>
    <ellipse cx="50" cy="50" rx="26" ry="7" fill="${C.soup}"/>
    <circle cx="42" cy="50" r="3" fill="#ffd98a"/><circle cx="58" cy="49" r="2.4" fill="#ffd98a"/>
    <path d="M14 58 q-6 4 0 8 M86 58 q6 4 0 8" stroke="${C.potDark}" stroke-width="4" fill="none"/>`);

  // ---- registry -----------------------------------------------------------
  const ART = {
    A: () => card("A", "#1aa3a3", "#0f6e6e", pip("#1aa3a3")),
    K: () => card("K", C.brick, C.brickDark, pip(C.brick)),
    Q: () => card("Q", C.wood, C.woodDark, pip(C.wood)),
    J: () => card("J", C.strawDark, "#9c7a1f", pip(C.straw)),
    M1: axe, M2: trowel, M3: fork,
    P1: brickPig, P2: woodPig, P3: strawPig,
    W: wolf, S: pot, BR: brick,
  };

  const IMG = {}; // id -> url when a generated asset is found

  // Load only the images listed in the manifest -> no 404 noise for absent art.
  function loadImages(map, done) {
    const ids = Object.keys(map || {});
    let pending = ids.length;
    if (!pending) { done && done(); return; }
    ids.forEach((id) => {
      const im = new Image();
      im.onload = () => { IMG[id] = map[id]; if (--pending === 0) done && done(); };
      im.onerror = () => { if (--pending === 0) done && done(); };
      im.src = map[id];
    });
  }

  window.PIGGY_ART = {
    svg: (id) => (ART[id] ? ART[id]() : `<svg viewBox="0 0 100 100"><text x="50" y="60" text-anchor="middle">${id}</text></svg>`),
    hasImage: (id) => !!IMG[id],
    imageUrl: (id) => IMG[id],
    loadImages,
  };
})();
