/* Stake's Huff & Puff: Piggy Richies -- symbol artwork.
 *
 * Premium black-and-gold vector symbols so the game reads like a real slot with
 * zero image files. A shared <defs> (gradients/filters) is injected once; each
 * symbol references it. Letters are rendered as gold gem-letters (the most
 * common symbols, so they matter most); characters sit on a soft gold emblem.
 *
 * Drop-in upgrade: list generated images in assets/manifest.js and they replace
 * the SVGs automatically (see docs/ASSET_PROMPTS.md). */
(() => {
  "use strict";

  // ---- shared gradient / filter defs (injected once) ----------------------
  const DEFS = `
    <linearGradient id="ggGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4c2"/><stop offset=".4" stop-color="#ffd23f"/>
      <stop offset=".75" stop-color="#e3a400"/><stop offset="1" stop-color="#8a5e00"/></linearGradient>
    <linearGradient id="ggGoldR" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#f0b522"/><stop offset="1" stop-color="#915c00"/></linearGradient>
    <radialGradient id="ggRuby" cx=".4" cy=".35" r=".8">
      <stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#e01b2e"/><stop offset="1" stop-color="#6e0712"/></radialGradient>
    <linearGradient id="ggSteel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f8fc"/><stop offset=".5" stop-color="#b7c4d4"/><stop offset="1" stop-color="#5f6e80"/></linearGradient>
    <linearGradient id="ggWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9a35c"/><stop offset=".55" stop-color="#a86a2e"/><stop offset="1" stop-color="#6c3f16"/></linearGradient>
    <radialGradient id="ggPink" cx=".4" cy=".32" r=".85">
      <stop offset="0" stop-color="#ffd9e6"/><stop offset=".55" stop-color="#f6a7c2"/><stop offset="1" stop-color="#d2789e"/></radialGradient>
    <radialGradient id="ggGrey" cx=".4" cy=".3" r=".9">
      <stop offset="0" stop-color="#c4ccd8"/><stop offset=".55" stop-color="#8a93a6"/><stop offset="1" stop-color="#4e5566"/></radialGradient>
    <radialGradient id="ggSoup" cx=".5" cy=".3" r=".8">
      <stop offset="0" stop-color="#ffe09a"/><stop offset=".5" stop-color="#ff9d4d"/><stop offset="1" stop-color="#cc5f17"/></radialGradient>
    <linearGradient id="ggIron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a6472"/><stop offset="1" stop-color="#222833"/></linearGradient>
    <radialGradient id="ggDisc" cx=".5" cy=".42" r=".6">
      <stop offset="0" stop-color="rgba(255,210,63,.45)"/><stop offset=".7" stop-color="rgba(255,170,40,.12)"/><stop offset="1" stop-color="rgba(255,170,40,0)"/></radialGradient>
    <linearGradient id="ggBrick" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7855a"/><stop offset="1" stop-color="#a23c1f"/></linearGradient>
    <linearGradient id="icoWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c98a4e"/><stop offset="1" stop-color="#7a4a22"/></linearGradient>
    <linearGradient id="icoStone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa6b5"/><stop offset="1" stop-color="#566070"/></linearGradient>
    <linearGradient id="icoStraw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8c878"/><stop offset="1" stop-color="#b9893a"/></linearGradient>
    <filter id="ggSh" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#000" flood-opacity=".45"/></filter>`;

  function injectDefs() {
    if (document.getElementById("piggy-defs")) return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("id", "piggy-defs");
    s.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    s.innerHTML = `<defs>${DEFS}</defs>`;
    document.body.appendChild(s);
  }

  const svg = (inner) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="sym-svg"><g filter="url(#ggSh)">${inner}</g></svg>`;
  const disc = `<circle cx="50" cy="50" r="43" fill="url(#ggDisc)"/><circle cx="50" cy="50" r="40.5" fill="none" stroke="url(#ggGold)" stroke-width="2" opacity=".45"/>`;

  // ---- gold gem letters (low symbols) ------------------------------------
  function gemLetter(ch) {
    return svg(`
      <circle cx="50" cy="50" r="40.5" fill="url(#ggDisc)"/>
      <text x="50" y="50" dy=".34em" text-anchor="middle" font-family="Georgia,'Times New Roman',serif"
            font-size="62" font-weight="700" fill="url(#ggGold)" stroke="#4a3208" stroke-width="3.5"
            paint-order="stroke" style="letter-spacing:-2px">${ch}</text>
      <text x="50" y="50" dy=".34em" text-anchor="middle" font-family="Georgia,serif" font-size="62"
            font-weight="700" fill="none" stroke="#fff7d6" stroke-width=".8" opacity=".6">${ch}</text>
      <path d="M50 13 l5 6 -5 6 -5 -6 Z" fill="url(#ggRuby)" stroke="#5a0a12" stroke-width="1.2"/>
      <circle cx="48" cy="17" r="1.4" fill="#ffd6d6" opacity=".9"/>`);
  }

  // ---- tools (mid) --------------------------------------------------------
  const axe = () => svg(`${disc}
    <rect x="46" y="24" width="8" height="58" rx="4" fill="url(#ggWood)" stroke="#5a3413" stroke-width="1.5" transform="rotate(16 50 52)"/>
    <path d="M52 24 C72 22 84 33 81 48 C70 43 60 43 49 47 Z" fill="url(#ggSteel)" stroke="#46535f" stroke-width="2"/>
    <path d="M54 27 C64 28 71 34 72 42" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`);
  const trowel = () => svg(`${disc}
    <rect x="47" y="18" width="7" height="20" rx="3.5" fill="url(#ggWood)" stroke="#5a3413" stroke-width="1.5"/>
    <rect x="43" y="34" width="14" height="8" rx="2" fill="#39424e"/>
    <path d="M50 42 L79 56 L50 88 L21 56 Z" fill="url(#ggSteel)" stroke="#46535f" stroke-width="2.5"/>
    <path d="M50 49 L50 82" stroke="#5f6e80" stroke-width="2" opacity=".5"/>
    <path d="M34 52 L50 46" stroke="#fff" stroke-width="2" opacity=".5"/>`);
  const fork = () => svg(`${disc}
    <rect x="46" y="40" width="8" height="44" rx="4" fill="url(#ggWood)" stroke="#5a3413" stroke-width="1.5"/>
    <path d="M31 44 V18 M50 44 V14 M69 44 V18" stroke="url(#ggSteel)" stroke-width="7" stroke-linecap="round"/>
    <rect x="27" y="40" width="46" height="9" rx="4.5" fill="#46535f"/>
    <path d="M31 40 V20 M50 40 V16 M69 40 V20" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".4"/>`);

  // ---- brick token --------------------------------------------------------
  const brick = () => svg(`
    <rect x="15" y="31" width="70" height="40" rx="6" fill="url(#ggBrick)" stroke="#7e2f17" stroke-width="3"/>
    <path d="M15 51 H85 M50 31 V51 M32 51 V71 M68 51 V71" stroke="#7e2f17" stroke-width="3" opacity=".75"/>
    <path d="M22 39 H45" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/>
    <path d="M69 22 l3.5 7 7 3.5 -7 3.5 -3.5 7 -3.5 -7 -7 -3.5 7 -3.5z" fill="url(#ggGold)" stroke="#8a5e00" stroke-width="1"/>`);

  // ---- pig faces (premium) -----------------------------------------------
  function pig(eyes, acc) {
    return svg(`${disc}
      <path d="M28 32 L23 17 L41 25 Z" fill="url(#ggPink)" stroke="#c06a8e" stroke-width="2"/>
      <path d="M72 32 L77 17 L59 25 Z" fill="url(#ggPink)" stroke="#c06a8e" stroke-width="2"/>
      <ellipse cx="50" cy="55" rx="31" ry="28" fill="url(#ggPink)" stroke="#c06a8e" stroke-width="2.5"/>
      <ellipse cx="50" cy="64" rx="15" ry="11" fill="#f7c1d4" stroke="#c06a8e" stroke-width="2"/>
      <ellipse cx="44" cy="64" rx="2.5" ry="3.8" fill="#9c4a6a"/><ellipse cx="56" cy="64" rx="2.5" ry="3.8" fill="#9c4a6a"/>
      ${eyes}${acc}`);
  }
  const strawPig = () => pig(
    `<circle cx="39" cy="47" r="6" fill="#fff" stroke="#c06a8e" stroke-width="1.5"/><circle cx="40" cy="48" r="2.8" fill="#3a2418"/>
     <circle cx="61" cy="47" r="6" fill="#fff" stroke="#c06a8e" stroke-width="1.5"/><circle cx="62" cy="48" r="2.8" fill="#3a2418"/>`,
    `<path d="M59 71 q14 1 22 -7" stroke="url(#ggGold)" stroke-width="4" fill="none" stroke-linecap="round"/>
     <path d="M64 72 l6 -2 M71 70 l5 -3" stroke="#caa033" stroke-width="2.4" stroke-linecap="round"/>`);
  const woodPig = () => pig(
    `<circle cx="40" cy="49" r="3.2" fill="#3a2418"/><circle cx="60" cy="49" r="3.2" fill="#3a2418"/>
     <path d="M33 43 l11 3 M67 43 l-11 3" stroke="#3a2418" stroke-width="2.4" stroke-linecap="round"/>`,
    `<path d="M22 34 q28 -22 56 0 Z" fill="url(#ggGold)" stroke="#8a5e00" stroke-width="2"/>
     <rect x="20" y="32" width="60" height="7" rx="3.5" fill="#c89020"/>
     <rect x="46" y="17" width="8" height="12" rx="2" fill="url(#ggWood)"/>`);
  const brickPig = () => pig(``,
    `<rect x="29" y="43" width="17" height="11" rx="3" fill="#1b1b22"/>
     <rect x="54" y="43" width="17" height="11" rx="3" fill="#1b1b22"/>
     <rect x="46" y="46" width="8" height="3.5" rx="1.5" fill="#1b1b22"/>
     <path d="M29 47 h-6 M71 47 h6" stroke="#1b1b22" stroke-width="3" stroke-linecap="round"/>
     <rect x="33" y="46" width="6" height="3" rx="1.5" fill="#fff" opacity=".5"/>
     <path d="M37 82 q13 11 26 0" fill="none" stroke="url(#ggGold)" stroke-width="4"/>
     <circle cx="50" cy="88" r="4.5" fill="url(#ggGold)" stroke="#8a5e00" stroke-width="1.2"/>`);

  // ---- wolf (wild) --------------------------------------------------------
  const wolf = () => svg(`${disc}
    <path d="M22 35 L13 12 L37 27 Z" fill="url(#ggGrey)" stroke="#4e5566" stroke-width="2"/>
    <path d="M78 35 L87 12 L63 27 Z" fill="url(#ggGrey)" stroke="#4e5566" stroke-width="2"/>
    <path d="M50 19 C75 19 81 44 79 59 C77 77 65 89 50 89 C35 89 23 77 21 59 C19 44 25 19 50 19 Z" fill="url(#ggGrey)" stroke="#4e5566" stroke-width="2.5"/>
    <path d="M50 50 C61 50 71 55 75 61 C69 75 60 81 50 81 C40 81 31 75 25 61 C29 55 39 50 50 50Z" fill="#cfd5e0"/>
    <path d="M30 45 l14 5 M70 45 l-14 5" stroke="#2a2f3a" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="40" cy="53" rx="4.2" ry="5.2" fill="url(#ggGold)"/><circle cx="40" cy="54" r="2.2" fill="#1b1b22"/>
    <ellipse cx="60" cy="53" rx="4.2" ry="5.2" fill="url(#ggGold)"/><circle cx="60" cy="54" r="2.2" fill="#1b1b22"/>
    <path d="M50 61 l7 6 -7 4 -7 -4 Z" fill="#1b1b22"/>
    <path d="M41 71 q9 7 18 0" fill="none" stroke="#2a2f3a" stroke-width="2.5"/>
    <path d="M44 71 l-2 7 4 -3 M56 71 l2 7 -4 -3" fill="#fff" stroke="#9aa3b3" stroke-width=".8"/>`);

  // ---- soup pot (scatter) -------------------------------------------------
  const pot = () => svg(`${disc}
    <path d="M40 32 c2 -9 -4 -11 -2 -19 M52 32 c2 -9 -4 -11 -2 -19 M64 32 c2 -9 -4 -11 -2 -19"
          stroke="#e7eef5" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
    <rect x="19" y="40" width="62" height="11" rx="5.5" fill="url(#ggIron)"/>
    <path d="M22 49 H78 L72 83 a6 6 0 0 1 -6 5 H34 a6 6 0 0 1 -6 -5 Z" fill="url(#ggIron)" stroke="#1a1f27" stroke-width="2.5"/>
    <ellipse cx="50" cy="50" rx="27" ry="7.5" fill="url(#ggSoup)"/>
    <circle cx="42" cy="50" r="3.2" fill="#ffe7b0"/><circle cx="59" cy="49" r="2.6" fill="#ffe7b0"/>
    <path d="M13 58 q-6 5 0 9 M87 58 q6 5 0 9" stroke="url(#ggIron)" stroke-width="4.5" fill="none"/>
    <path d="M26 56 l10 -3" stroke="#fff" stroke-width="2" opacity=".4"/>`);

  // ---- registry -----------------------------------------------------------
  const ART = {
    A: () => gemLetter("A"), K: () => gemLetter("K"), Q: () => gemLetter("Q"), J: () => gemLetter("J"),
    M1: axe, M2: trowel, M3: fork, P1: brickPig, P2: woodPig, P3: strawPig,
    W: wolf, S: pot, BR: brick,
  };

  const IMG = {};
  function loadImages(map, done) {
    const ids = Object.keys(map || {}); let pending = ids.length;
    if (!pending) { done && done(); return; }
    ids.forEach((id) => { const im = new Image(); im.onload = () => { IMG[id] = map[id]; if (--pending === 0) done && done(); }; im.onerror = () => { if (--pending === 0) done && done(); }; im.src = map[id]; });
  }

  // ---- UI icons (replace emoji in HUD/menus so nothing reads "AI-generated") --
  const door = `<rect x="27" y="40" width="10" height="14" rx="1.5" fill="#3a2414" stroke="#1c130a" stroke-width="1.4"/><circle cx="34.3" cy="47.5" r="1" fill="#ffd23f"/>`;
  const win = `<rect x="18" y="34" width="8" height="7" rx="1" fill="#ffcf6b"/><rect x="38" y="34" width="8" height="7" rx="1" fill="#ffcf6b"/>`;
  const houseSvg = (inner) => `<svg viewBox="0 0 64 64" class="ico-house"><g filter="url(#ggSh)">${inner}</g></svg>`;
  const HOUSE = {
    1: houseSvg(`<path d="M9 31 Q32 5 55 31 Q44 25 32 25 Q20 25 9 31Z" fill="url(#icoStraw)" stroke="#7a5a1e" stroke-width="2"/>
        <path d="M14 29q18 -13 36 0M17 25q15 -9 30 0" stroke="#8a6526" stroke-width="1.4" fill="none" opacity=".6"/>
        <rect x="15" y="31" width="34" height="23" rx="1.5" fill="#c9a256" stroke="#7a5a1e" stroke-width="2"/>${door}`),
    2: houseSvg(`<path d="M7 31 L32 12 L57 31 Z" fill="url(#icoWood)" stroke="#5a3413" stroke-width="2"/>
        <rect x="14" y="31" width="36" height="23" rx="1" fill="url(#icoWood)" stroke="#5a3413" stroke-width="2"/>
        <path d="M14 38H50M14 46H50M26 31V54M38 31V54" stroke="#5a3413" stroke-width="1.2" opacity=".5"/>${door}`),
    3: houseSvg(`<path d="M11 30V21h6v5h6v-5h6v5h6v-5h6v5h6v-5h6v9Z" fill="url(#icoStone)" stroke="#3a3f48" stroke-width="2"/>
        <rect x="12" y="30" width="40" height="24" fill="url(#icoStone)" stroke="#3a3f48" stroke-width="2"/>
        <path d="M12 38H52M12 46H52M24 30V38M40 30V38M18 46V54M32 46V54M46 46V54" stroke="#3a3f48" stroke-width="1.1" opacity=".55"/>${door}`),
  };
  const LINE = (d) => `<svg viewBox="0 0 24 24" class="ico-line">${d}</svg>`;
  const ICONS = {
    house: (lvl) => HOUSE[lvl] || HOUSE[1],
    wolf: () => ART.W(), pot: () => ART.S(), brick: () => ART.BR(), pig: () => ART.P1(),
    info: LINE('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.4" r="1.15" fill="currentColor" stroke="none"/>'),
    table: LINE('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15"/>'),
    sound: LINE('<path d="M4 9.5v5h3.5L13 18V6L7.5 9.5H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18.5 7a7 7 0 0 1 0 10"/>'),
    soundOff: LINE('<path d="M4 9.5v5h3.5L13 18V6L7.5 9.5H4z"/><path d="M16.5 10l5 4M21.5 10l-5 4"/>'),
    bolt: `<svg viewBox="0 0 24 24" class="ico-line" style="fill:currentColor;stroke:none"><path d="M13 2 4 13.5h6L11 22l9-12h-6z"/></svg>`,
    menu: LINE('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    lock: LINE('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  };

  injectDefs();
  window.PIGGY_ART = {
    svg: (id) => (ART[id] ? ART[id]() : `<svg viewBox="0 0 100 100"><text x="50" y="60" text-anchor="middle">${id}</text></svg>`),
    hasImage: (id) => !!IMG[id], imageUrl: (id) => IMG[id], loadImages,
  };
  window.PIGGY_ICONS = ICONS;
})();
