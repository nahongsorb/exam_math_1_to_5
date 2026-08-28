// BASE GAME client module. All balance and combat decisions remain on Apps Script.
let gameState = null;
let gameCatalog = null;
let gameActiveTab = "village";
let gameClockTimer = null;
let gameAdminData = null;
let villagePlayers = [];
let villagePage = 1;
let playerPreviewTrigger = null;
const VILLAGE_PAGE_SIZE = 12;
const gameAdminFilters = { search: "", level: "all", activity: "all" };

const GAME_RESOURCE_META = {
  coins: ["🪙", "Coins"], wood: ["🪵", "Wood"], stone: ["🪨", "Stone"],
  brick: ["🧱", "Brick"], sand: ["🏖️", "Sand"], cement: ["🏗️", "Cement"]
};

document.addEventListener("DOMContentLoaded", () => {
  setupGameListeners();
  updateGameAccess();
});

function updateGameAccess() {
  const isStudent = Boolean(currentUser && currentUser.role === "student");
  ["btn-show-game", "btn-mobile-game", "btn-portal-game"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.classList.toggle("hidden", !isStudent);
  });
  const mobileNav = document.getElementById("mobile-primary-nav");
  if (mobileNav) mobileNav.style.gridTemplateColumns = isStudent ? "repeat(4, 1fr)" : "repeat(2, 1fr)";
}

function setupGameListeners() {
  ["btn-show-game", "btn-mobile-game", "btn-portal-game"].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", openBaseGame);
  });
  const back = document.getElementById("btn-game-back");
  if (back) back.addEventListener("click", () => { showSection("portal-section"); loadPortal(); });
  document.querySelectorAll(".game-tab").forEach(button => button.addEventListener("click", () => switchGameTab(button.dataset.gameTab)));
  const previewModal = document.getElementById("game-player-preview-modal");
  document.getElementById("btn-close-game-player-preview").addEventListener("click", closePlayerBasePreview);
  previewModal.addEventListener("click", event => { if (event.target === previewModal) closePlayerBasePreview(); });
  document.addEventListener("keydown", event => {
    trapModalFocus(event, previewModal);
    if (event.key === "Escape" && !previewModal.classList.contains("hidden")) closePlayerBasePreview();
  });

  const refreshAdmin = document.getElementById("btn-refresh-game-admin");
  if (refreshAdmin) refreshAdmin.addEventListener("click", loadGameAdminData);
  const enabledToggle = document.getElementById("game-enabled-toggle");
  if (enabledToggle) enabledToggle.addEventListener("change", changeGameEnabled);
  const adminSearch = document.getElementById("game-admin-search");
  if (adminSearch) adminSearch.addEventListener("input", event => {
    gameAdminFilters.search = event.target.value.trim().toLocaleLowerCase("th-TH");
    renderGameAdminDashboard();
  });
  const adminLevelFilter = document.getElementById("game-admin-level-filter");
  if (adminLevelFilter) adminLevelFilter.addEventListener("change", event => {
    gameAdminFilters.level = event.target.value;
    renderGameAdminDashboard();
  });
  const adminActivityFilter = document.getElementById("game-admin-activity-filter");
  if (adminActivityFilter) adminActivityFilter.addEventListener("change", event => {
    gameAdminFilters.activity = event.target.value;
    renderGameAdminDashboard();
  });
}

async function openBaseGame() {
  if (!currentUser || currentUser.role !== "student") return;
  showSection("game-section");
  switchGameTab("village", false);
  await loadGameProfile();
}

async function loadGameProfile(silent = false) {
  if (!silent) showLoading("กำลังเปิดหมู่บ้านของคุณ...");
  const res = await apiCall("getGameProfile");
  if (!silent) hideLoading();
  if (!res.success) {
    const suffix = res.message === "Invalid action" ? " — กรุณา Deploy google_apps_script.js เวอร์ชันล่าสุด" : "";
    setGameFeedback((res.message || "ไม่สามารถโหลดข้อมูลเกมได้") + suffix, "error");
    document.getElementById("game-village-panel").innerHTML = `<div class="game-empty">🎮 ${escapeHtml(res.message || "ระบบเกมยังไม่พร้อมใช้งาน")}${escapeHtml(suffix)}</div>`;
    return;
  }
  gameState = res.data.profile;
  gameCatalog = res.data.catalog;
  renderGameChrome();
  renderMyBase();
  renderGameBuild();
  renderGameArmy();
  startGameClock();
  if (!silent || !villagePlayers.length || gameActiveTab === "village") await loadVillageOverview();
}

function renderGameChrome() {
  if (!gameState) return;
  const status = document.getElementById("game-status-line");
  const shieldUntil = new Date(gameState.shield_until || 0).getTime() || 0;
  const shieldText = shieldUntil > Date.now() ? ` · 🛡️ Shield ${formatGameDuration(shieldUntil - Date.now())}` : "";
  status.textContent = `${gameState.nickname} · บ้านหลัก Lv.${gameState.house_level} · 🏆 ${formatGameNumber(gameState.trophy)}${shieldText}`;
  const resources = document.getElementById("game-resource-bar");
  const chips = Object.keys(GAME_RESOURCE_META).map(key => {
    const meta = GAME_RESOURCE_META[key];
    return `<div class="game-resource-chip" title="${escapeHtml(meta[1])}" aria-label="${escapeHtml(meta[1])} ${formatGameNumber(gameState.resources[key])}"><span><i aria-hidden="true">${meta[0]}</i><b>${meta[1]}</b></span><strong>${formatGameNumber(gameState.resources[key])}</strong></div>`;
  });
  chips.push(`<div class="game-resource-chip" title="Energy" aria-label="Energy ${gameState.energy} จาก ${gameState.max_energy}"><span><i aria-hidden="true">⚡</i><b>Energy</b></span><strong>${gameState.energy}/${gameState.max_energy}</strong></div>`);
  resources.innerHTML = chips.join("");
}

function switchGameTab(tab, loadRemote = true) {
  gameActiveTab = tab;
  document.querySelectorAll(".game-tab").forEach(button => button.classList.toggle("active", button.dataset.gameTab === tab));
  document.querySelectorAll(".game-panel").forEach(panel => panel.classList.remove("active"));
  const panel = document.getElementById(`game-${tab}-panel`);
  if (panel) panel.classList.add("active");
  if (!loadRemote || !gameState) return;
  if (tab === "village") loadVillageOverview();
  if (tab === "home") renderMyBase();
  if (tab === "build") renderGameBuild();
  if (tab === "attack") loadGameTargets();
  if (tab === "history") loadGameHistory();
  if (tab === "ranking") loadGameRanking();
}

function defaultVisualBuildings() {
  return { mainHouse: 1, storage: 0, vault: 0, wall: 0, archerTower: 0, fortress: 0, blacksmith: 0, barracks: 0 };
}

function visualProfile(profile) {
  const buildings = { ...defaultVisualBuildings(), ...(profile.buildings || {}) };
  const houseLevel = Number(profile.house_level || buildings.mainHouse || 1);
  if (!profile.buildings || !Number(profile.buildings.mainHouse)) buildings.mainHouse = houseLevel;
  return { ...profile, buildings, house_level: houseLevel };
}

function buildingAppearance(level) {
  const safeLevel = Math.max(1, Math.min(5, Number(level) || 1));
  const palettes = [null,
    { roof: "#8b5a3c", wall: "#c99862", accent: "#78a7c8" },
    { roof: "#b86246", wall: "#d8ad73", accent: "#65a96f" },
    { roof: "#426f9f", wall: "#d8d6cb", accent: "#55b8dc" },
    { roof: "#6552d9", wall: "#eee4cf", accent: "#f6c453" },
    { roof: "#34245f", wall: "#f2ead9", accent: "#ffd86a" }
  ];
  const palette = palettes[safeLevel];
  return {
    tier: safeLevel,
    scale: [0, .82, .91, 1.01, 1.1, 1.2][safeLevel],
    roof: palette.roof,
    wall: palette.wall,
    accent: palette.accent,
    detail: safeLevel >= 2,
    elite: safeLevel >= 4,
    royal: safeLevel >= 5
  };
}

function renderBuildingTierSvg(level, key) {
  const tier = Math.max(1, Math.min(5, Number(level) || 1));
  const isWall = key === "wall", rx = isWall ? 176 : 44 + tier * 5, ry = isWall ? 34 : 15 + tier * 2;
  const flagX = isWall ? 126 : 47, flagY = isWall ? -26 : -39;
  const crestY = isWall ? -42 : -69;
  return `<g class="base-tier-treatment tier-${tier}">
    <ellipse cx="0" cy="${isWall ? 30 : 31}" rx="${rx}" ry="${ry}" class="base-tier-foundation"/>
    ${tier >= 2 ? `<ellipse cx="0" cy="${isWall ? 28 : 29}" rx="${rx - 7}" ry="${Math.max(11, ry - 5)}" class="base-tier-ring"/>` : ""}
    ${tier >= 3 ? `<g class="base-tier-flags"><path d="M-${flagX} ${flagY + 23} V${flagY} M${flagX} ${flagY + 23} V${flagY}"/><path d="M-${flagX} ${flagY} h24 l-6 10 6 10 h-24 Z M${flagX} ${flagY} h-24 l6 10 -6 10 h24 Z"/></g>` : ""}
    ${tier >= 4 ? `<g class="base-tier-crest" transform="translate(0 ${crestY})"><circle r="15"/><path d="M-8 -3 L-3 3 L0 -7 L4 3 L9 -3 L7 7 H-7 Z"/><text y="23" text-anchor="middle">${tier}</text></g>` : ""}
    ${tier >= 5 ? `<g class="base-tier-sparkles"><path d="M-70 -58 l4 9 9 4 -9 4 -4 9 -4-9 -9-4 9-4 Z M69 -49 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3 Z"/></g>` : ""}
  </g>`;
}

function gameArmyEntries(units) {
  const source = units || {};
  return ["infantry", "archer", "cavalry", "ram", "catapult"].map(key => {
    const config = gameCatalog && gameCatalog.units && gameCatalog.units[key];
    return { key, count: Math.max(0, Number(source[key] || 0)), icon: config ? config.icon : "🪖", name: config ? config.name : key };
  }).filter(item => item.count > 0);
}

function renderArmyParade(units, compact) {
  if (!compact) return "";
  const entries = gameArmyEntries(units);
  if (!entries.length) return "";
  const armyLevel = Math.max(1, Number((units || {}).armyLevel || 1));
  const itemWidth = 66, gap = 7, labelWidth = 88;
  const width = labelWidth + entries.length * itemWidth + Math.max(0, entries.length - 1) * gap + 18;
  const x = 360 - width / 2;
  const roster = entries.map((item, index) => `<g class="base-army-unit" transform="translate(${x + labelWidth + index * (itemWidth + gap)} 351)">
    <rect width="${itemWidth}" height="43" rx="14"/><text x="20" y="29" text-anchor="middle" class="base-army-icon">${escapeHtml(item.icon)}</text><text x="47" y="27" text-anchor="middle" class="base-army-count">×${formatGameNumber(item.count)}</text>
  </g>`).join("");
  const description = entries.map(item => `${item.name} ${item.count}`).join(", ");
  return `<g class="base-army-parade" role="group" aria-label="กองทัพ ${escapeHtml(description)}"><rect x="${x}" y="342" width="${width}" height="61" rx="25" class="base-army-ground"/><text x="${x + 18}" y="365" class="base-army-title">🪖 กองทัพ</text><text x="${x + 18}" y="387" class="base-army-level">เทคโนโลยี Lv.${armyLevel}</text>${roster}</g>`;
}

function renderArmySummary(units) {
  const entries = gameArmyEntries(units);
  if (!entries.length) return `<span class="village-army-empty">ยังไม่มีกองทัพ</span>`;
  return entries.map(item => `<span title="${escapeHtml(item.name)}">${escapeHtml(item.icon)}<b>${formatGameNumber(item.count)}</b></span>`).join("");
}

function renderEmptyBuildingSlot(key, x, y, compact, constructing = false) {
  const config = gameCatalog && gameCatalog.buildings[key];
  const name = config ? config.name : key;
  const size = compact ? 31 : 43;
  const interaction = compact ? "" : `data-base-building="${key}" role="button" tabindex="0" aria-label="${escapeHtml(name)} ยังไม่ได้สร้าง"`;
  const scaffold = constructing ? `<g class="construction-scaffold"><rect x="${x - 55}" y="${y - 58}" width="110" height="94" rx="8" fill="rgba(226,146,54,.16)" stroke="#e29236" stroke-width="3" stroke-dasharray="8 5"/><path d="M${x - 44} ${y + 28} L${x - 24} ${y - 49} M${x} ${y + 30} L${x + 14} ${y - 50} M${x + 31} ${y + 27} L${x + 47} ${y - 43}" stroke="#e29236" stroke-width="4"/>${compact ? "" : `<text x="${x}" y="${y + 57}" text-anchor="middle" class="construction-label">🔨 กำลังก่อสร้าง</text>`}</g>` : "";
  return `<g class="base-building-slot is-empty${constructing ? " is-constructing" : ""}" ${interaction}>
    <ellipse cx="${x}" cy="${y + 18}" rx="${size}" ry="${Math.round(size * .38)}" fill="rgba(15,65,42,.12)" stroke="rgba(255,255,255,.48)" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="M${x - 18} ${y + 10} L${x} ${y - 8} L${x + 18} ${y + 10} V${y + 24} H${x - 18} Z" fill="rgba(25,55,43,.18)"/>
    ${scaffold}${compact || constructing ? "" : `<text x="${x}" y="${y + 43}" text-anchor="middle" class="base-building-label muted">🔒 ${escapeHtml(name)}</text>`}
  </g>`;
}

function renderBuildingSvg(key, level, x, y, options = {}) {
  const compact = Boolean(options.compact);
  if (!level) return renderEmptyBuildingSlot(key, x, y, compact, Boolean(options.constructing));
  const look = buildingAppearance(level), s = look.scale * (compact ? .76 : 1);
  const config = gameCatalog && gameCatalog.buildings[key];
  const name = config ? config.name : key;
  let art = "";
  if (key === "mainHouse") {
    art = `<ellipse cx="0" cy="30" rx="66" ry="18" fill="rgba(14,65,39,.24)"/><rect x="-48" y="-15" width="96" height="58" rx="5" fill="${look.wall}" stroke="#684b37" stroke-width="3"/><path d="M-62 -13 L0 -61 L62 -13 Z" fill="${look.roof}" stroke="#593b32" stroke-width="4"/><rect x="-11" y="13" width="22" height="30" rx="3" fill="#70462f"/><rect x="-36" y="4" width="18" height="16" rx="2" fill="#bfe5f6" stroke="#5c7480"/>${look.detail ? `<rect x="20" y="3" width="19" height="17" rx="2" fill="#bfe5f6" stroke="#5c7480"/><path d="M0 -61 V-82" stroke="#6d4a37" stroke-width="3"/><path d="M2 -81 L31 -72 L2 -63 Z" fill="${look.accent}"/>` : ""}${look.elite ? `<circle cx="0" cy="-28" r="8" fill="#f6c453" stroke="#7c5e21"/><path d="M-50 -20 L-50 -42 L-36 -42 L-36 -29" fill="${look.wall}" stroke="#684b37" stroke-width="3"/><path d="M36 -29 V-42 H50 V-20" fill="${look.wall}" stroke="#684b37" stroke-width="3"/>` : ""}`;
  } else if (key === "storage") {
    art = `<ellipse cx="0" cy="28" rx="50" ry="14" fill="rgba(14,65,39,.22)"/><rect x="-42" y="-17" width="84" height="54" rx="5" fill="#c68b4a" stroke="#6f4a2c" stroke-width="3"/><path d="M-50 -16 L0 -43 L50 -16 Z" fill="${look.roof}" stroke="#593b32" stroke-width="3"/><rect x="-18" y="7" width="36" height="30" fill="#80512e"/><path d="M-12 11 H12 M-12 18 H12 M-12 25 H12" stroke="#c99b66" stroke-width="3"/>${look.detail ? `<rect x="28" y="2" width="18" height="17" fill="#9b6a38"/><path d="M28 8 H46 M37 2 V19" stroke="#e4bd85"/>` : ""}`;
  } else if (key === "vault") {
    art = `<ellipse cx="0" cy="28" rx="48" ry="14" fill="rgba(14,65,39,.22)"/><path d="M-43 31 V-5 Q-43 -38 0 -38 Q43 -38 43 -5 V31 Z" fill="#8c98a3" stroke="#4b5861" stroke-width="4"/><circle cx="0" cy="7" r="21" fill="#56636d" stroke="#d5b85b" stroke-width="4"/><circle cx="0" cy="7" r="6" fill="#e6ca68"/><path d="M0 -8 V22 M-15 7 H15" stroke="#c6d0d6" stroke-width="3"/>${look.detail ? `<path d="M-32 -13 H32 M-37 24 H37" stroke="#b8c1c8" stroke-width="3"/>` : ""}`;
  } else if (key === "archerTower") {
    art = `<ellipse cx="0" cy="34" rx="37" ry="12" fill="rgba(14,65,39,.22)"/><path d="M-22 34 L-17 -24 H17 L22 34 Z" fill="#a8794d" stroke="#60452f" stroke-width="3"/><rect x="-31" y="-43" width="62" height="25" rx="3" fill="#8f6440" stroke="#563b29" stroke-width="3"/><path d="M-31 -43 V-56 H-18 V-43 M-6 -43 V-56 H6 V-43 M18 -43 V-56 H31 V-43" fill="#a8794d" stroke="#563b29" stroke-width="3"/><path d="M0 -17 V9 M-9 -4 H9" stroke="#c8e9f8" stroke-width="4"/>${look.detail ? `<path d="M0 -56 V-75 M2 -74 L25 -66 L2 -58 Z" fill="${look.accent}"/>` : ""}`;
  } else if (key === "fortress") {
    art = `<ellipse cx="0" cy="32" rx="59" ry="16" fill="rgba(14,65,39,.24)"/><rect x="-48" y="-23" width="96" height="64" rx="3" fill="#9ca5aa" stroke="#535d63" stroke-width="4"/><path d="M-49 -22 V-44 H-31 V-31 H-16 V-44 H2 V-31 H17 V-44 H34 V-31 H49 V-22" fill="#adb5ba" stroke="#535d63" stroke-width="4"/><path d="M-13 41 V10 Q0 -8 13 10 V41" fill="#4e5960"/><rect x="-35" y="0" width="12" height="16" fill="#516570"/><rect x="23" y="0" width="12" height="16" fill="#516570"/>${look.detail ? `<path d="M0 -44 V-68 M2 -67 L29 -58 L2 -49 Z" fill="${look.accent}"/>` : ""}`;
  } else if (key === "blacksmith") {
    art = `<ellipse cx="0" cy="29" rx="50" ry="14" fill="rgba(14,65,39,.22)"/><rect x="-43" y="-15" width="86" height="53" rx="4" fill="#9e7656" stroke="#5f4533" stroke-width="3"/><path d="M-51 -14 L-9 -43 L50 -14 Z" fill="#5d6670" stroke="#3e454c" stroke-width="3"/><rect x="19" y="-48" width="17" height="42" fill="#6d5750" stroke="#453833" stroke-width="3"/><path d="M24 -55 Q13 -67 26 -78 Q39 -65 31 -55" fill="#d7773e" opacity=".85"/><path d="M-25 18 H7 L13 9 H-18 Z M-8 18 V35" fill="#3e474e" stroke="#252c31" stroke-width="3"/>${look.detail ? `<circle cx="25" cy="18" r="10" fill="#f39a3f" opacity=".75"/>` : ""}`;
  } else if (key === "barracks") {
    art = `<ellipse cx="0" cy="31" rx="55" ry="15" fill="rgba(14,65,39,.22)"/><path d="M-49 34 L-36 -28 L0 -47 L38 -28 L50 34 Z" fill="#b66a55" stroke="#653b31" stroke-width="3"/><path d="M0 -47 V34" stroke="#f1d4b0" stroke-width="3"/><path d="M-12 34 V4 Q0 -10 12 4 V34" fill="#59443a"/><path d="M0 -47 V-66 M2 -65 L28 -56 L2 -49 Z" fill="${look.accent}"/>${look.detail ? `<path d="M-36 -28 L0 -8 L38 -28" fill="none" stroke="#e3aa7e" stroke-width="3"/>` : ""}`;
  } else if (key === "wall") {
    art = `<path d="M-160 28 V-12 H-147 V-24 H-130 V-12 H-113 V-24 H-96 V-12 H-78 V28 Z M78 28 V-12 H96 V-24 H113 V-12 H130 V-24 H147 V-12 H160 V28 Z" fill="#9ca5aa" stroke="#535d63" stroke-width="4"/><path d="M-160 6 H-78 M78 6 H160" stroke="#c3c9cc" stroke-width="3"/>${look.detail ? `<path d="M-137 -9 V25 M-103 -9 V25 M103 -9 V25 M137 -9 V25" stroke="#747f85" stroke-width="2"/>` : ""}`;
  }
  const construction = options.constructing ? (key === "wall" ? `<g class="construction-scaffold"><rect x="-166" y="-32" width="96" height="70" rx="8" fill="rgba(226,146,54,.13)" stroke="#e29236" stroke-width="3" stroke-dasharray="8 5"/><rect x="70" y="-32" width="96" height="70" rx="8" fill="rgba(226,146,54,.13)" stroke="#e29236" stroke-width="3" stroke-dasharray="8 5"/></g>` : `<g class="construction-scaffold"><rect x="-70" y="-76" width="140" height="116" rx="8" fill="rgba(226,146,54,.13)" stroke="#e29236" stroke-width="3" stroke-dasharray="8 5"/><path d="M-58 28 L-33 -68 M-12 34 L8 -70 M35 30 L58 -63" stroke="#e29236" stroke-width="4"/><text x="0" y="58" text-anchor="middle" class="construction-label">🔨 กำลังก่อสร้าง</text></g>`) : "";
  const interaction = compact ? "" : `data-base-building="${key}" role="button" tabindex="0" aria-label="${escapeHtml(name)} ระดับ ${level}"`;
  const labelX = key === "wall" ? -119 : 0;
  return `<g class="base-building is-built level-${level} tier-${look.tier}${options.constructing ? " is-constructing" : ""}" ${interaction} transform="translate(${x} ${y}) scale(${s})">${renderBuildingTierSvg(level, key)}${art}${construction}${compact ? "" : `<rect x="${labelX - 43}" y="48" width="86" height="22" rx="11" class="base-level-pill"/><text x="${labelX}" y="63" text-anchor="middle" class="base-building-level">${escapeHtml(name)} · Lv.${level}</text>`}</g>`;
}

function renderBaseScene(profile, options = {}) {
  const p = visualProfile(profile), compact = Boolean(options.compact), prefix = String(options.prefix || p.username || "base").replace(/[^a-zA-Z0-9_-]/g, "");
  const upgradeKey = p.upgrade && p.upgrade.buildingKey;
  const positions = compact ? {
    mainHouse: [360, 190], storage: [150, 260], vault: [566, 254], archerTower: [174, 92], fortress: [548, 92], blacksmith: [280, 324], barracks: [455, 325]
  } : {
    mainHouse: [360, 188], storage: [142, 253], vault: [578, 248], archerTower: [167, 83], fortress: [553, 82], blacksmith: [270, 326], barracks: [462, 327]
  };
  const buildingKeys = ["archerTower", "fortress", "storage", "vault", "blacksmith", "barracks", "mainHouse"];
  const wall = p.buildings.wall ? renderBuildingSvg("wall", p.buildings.wall, 360, 196, { compact, constructing: upgradeKey === "wall" }) : `<rect x="78" y="34" width="564" height="340" rx="76" class="base-boundary-empty"/>`;
  return `<svg class="player-base-svg${compact ? " is-compact" : ""}" viewBox="0 0 720 420" role="img" aria-label="ฐานของ ${escapeHtml(p.nickname || "ผู้เล่น")} บ้านระดับ ${p.house_level}">
    <defs><linearGradient id="grass-${prefix}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fce73"/><stop offset="1" stop-color="#4d9a66"/></linearGradient><filter id="shadow-${prefix}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-opacity=".24"/></filter></defs>
    <rect width="720" height="420" rx="${compact ? 26 : 36}" fill="url(#grass-${prefix})"/>
    <path d="M-20 365 C150 310 230 382 374 347 C520 312 617 350 745 286" class="base-road"/>
    <path d="M360 430 C344 330 348 270 360 205" class="base-path"/>
    <g class="base-scenery"><circle cx="58" cy="62" r="26"/><circle cx="82" cy="45" r="22"/><rect x="66" y="65" width="10" height="34" rx="4"/><circle cx="656" cy="320" r="27"/><circle cx="625" cy="334" r="20"/><rect x="639" y="341" width="10" height="34" rx="4"/></g>
    <g filter="url(#shadow-${prefix})">${wall}${buildingKeys.map(key => renderBuildingSvg(key, Number(p.buildings[key] || 0), positions[key][0], positions[key][1], { compact, constructing: upgradeKey === key })).join("")}</g>
    ${renderArmyParade(p.units, compact)}
    ${p.upgrade ? `<g class="base-construction-hud"><rect x="247" y="14" width="226" height="38" rx="19"/><text x="360" y="39" text-anchor="middle" data-finish-at="${p.upgrade.finishAt}">🔨 ${formatGameDuration(p.upgrade.finishAt - Date.now())}</text></g>` : ""}
  </svg>`;
}

function calculateClientDefense(profile) {
  if (!gameCatalog) return Number(profile.defense_power || 0);
  const p = visualProfile(profile);
  let total = Object.keys(gameCatalog.buildings).reduce((sum, key) => sum + Number((gameCatalog.buildings[key].defense || [])[Number(p.buildings[key] || 0)] || 0), 0);
  if (p.units) {
    const multiplier = 1 + (Number(p.units.armyLevel || 1) - 1) * .08;
    total += Object.keys(gameCatalog.units).reduce((sum, key) => sum + Number(p.units[key] || 0) * Number(gameCatalog.units[key].defense || 0) * multiplier, 0);
  }
  return Math.round(total);
}

function calculateClientAttack(profile) {
  if (!gameCatalog || !profile.units) return 0;
  const multiplier = 1 + (Number(profile.units.armyLevel || 1) - 1) * .10;
  return Math.round(Object.keys(gameCatalog.units).reduce((sum, key) => sum + Number(profile.units[key] || 0) * Number(gameCatalog.units[key].attack || 0), 0) * multiplier);
}

async function loadVillageOverview() {
  const panel = document.getElementById("game-village-panel");
  if (!villagePlayers.length) panel.innerHTML = `<div class="game-empty">กำลังสร้างแผนที่หมู่บ้านจากผู้เล่นจริง...</div>`;
  const res = await apiCall("getGameLeaderboard");
  if (!res.success) { panel.innerHTML = `<div class="game-empty">${escapeHtml(res.message || "โหลดหมู่บ้านไม่สำเร็จ")}</div>`; return; }
  villagePlayers = (res.data || []).map(player => ({ ...player, is_current_player: player.is_current_player === true || player.username === currentUser.username })).sort((a, b) => Number(b.is_current_player) - Number(a.is_current_player) || b.trophy - a.trophy);
  villagePage = Math.min(villagePage, Math.max(1, Math.ceil(villagePlayers.length / VILLAGE_PAGE_SIZE)));
  renderVillageOverview();
}

function renderVillageOverview() {
  const panel = document.getElementById("game-village-panel"), totalPages = Math.max(1, Math.ceil(villagePlayers.length / VILLAGE_PAGE_SIZE));
  const start = (villagePage - 1) * VILLAGE_PAGE_SIZE, pagePlayers = villagePlayers.slice(start, start + VILLAGE_PAGE_SIZE);
  const plots = pagePlayers.map((player, index) => `<button class="village-plot${player.is_current_player ? " is-current" : ""}" type="button" data-village-player="${escapeHtml(player.username)}" style="--plot-delay:${index * 25}ms">
    <span class="village-plot-badge">${player.is_current_player ? "บ้านของฉัน" : `🏆 ${formatGameNumber(player.trophy)}`}</span>
    <span class="village-house-art">${renderBaseScene(player, { compact: true, prefix: `plot-${villagePage}-${index}` })}</span>
    <span class="village-player-name">${escapeHtml(player.nickname)}</span>
    <span class="village-army-summary" aria-label="สรุปกองทัพ"><i class="village-army-label">🪖</i>${renderArmySummary(player.units)}</span>
    <span class="village-player-meta">บ้าน Lv.${player.house_level} · 🛡 ${formatGameNumber(player.defense_power || calculateClientDefense(player))}</span>
  </button>`).join("");
  panel.innerHTML = `<section class="village-overview" aria-labelledby="village-overview-title">
    <div class="village-heading"><div><p class="game-kicker">VILLAGE OVERVIEW</p><h2 id="village-overview-title">หมู่บ้านของห้องเรา</h2><p>เลือกบ้านเพื่อเยี่ยมชมฐานของเพื่อน · สมาชิก ${villagePlayers.length} คน</p></div><div class="village-legend"><span><i class="legend-dot current"></i> บ้านของคุณ</span><span><i class="legend-dot friend"></i> บ้านเพื่อน</span></div></div>
    <div class="village-map"><div class="village-center"><span>🌳</span><strong>ลานกลางหมู่บ้าน</strong></div><div class="village-grid">${plots || `<div class="game-empty">ยังไม่มีผู้เล่นในหมู่บ้าน</div>`}</div></div>
    ${totalPages > 1 ? `<div class="village-pagination"><button class="btn btn-secondary" data-village-page="${villagePage - 1}" ${villagePage === 1 ? "disabled" : ""}>ก่อนหน้า</button><span>โซน ${villagePage} / ${totalPages}</span><button class="btn btn-secondary" data-village-page="${villagePage + 1}" ${villagePage === totalPages ? "disabled" : ""}>ถัดไป</button></div>` : ""}
  </section>`;
  panel.querySelectorAll("[data-village-player]").forEach(button => button.addEventListener("click", () => openPlayerBasePreview(button.dataset.villagePlayer)));
  panel.querySelectorAll("[data-village-page]").forEach(button => button.addEventListener("click", () => { villagePage = Number(button.dataset.villagePage); renderVillageOverview(); panel.scrollIntoView({ behavior: "smooth", block: "start" }); }));
}

function openPlayerBasePreview(username) {
  const player = villagePlayers.find(item => item.username === username);
  if (!player) return;
  const normalizedPlayer = visualProfile(player), b = normalizedPlayer.buildings, isCurrent = player.is_current_player;
  document.getElementById("game-player-preview-content").innerHTML = `<div class="preview-player-heading"><div><p class="game-kicker">${isCurrent ? "YOUR BASE" : "PLAYER BASE"}</p><h2 id="game-player-preview-title">${escapeHtml(player.nickname)}</h2><p>บ้าน Lv.${player.house_level} · 🏆 ${formatGameNumber(player.trophy)} · 🛡 ${formatGameNumber(player.defense_power || calculateClientDefense(player))}</p></div>${isCurrent ? `<span class="current-player-tag">บ้านของฉัน</span>` : ""}</div>
    <div class="preview-base-scene">${renderBaseScene(normalizedPlayer, { prefix: `preview-${player.username}` })}</div>
    <div class="preview-army-roster"><strong>🪖 กองทัพประจำฐาน</strong><span class="village-army-summary">${renderArmySummary(player.units)}</span></div>
    <div class="preview-building-levels">${["mainHouse", "wall", "archerTower", "fortress", "storage", "vault", "barracks", "blacksmith"].map(key => { const level = Number(b[key] || 0); return `<span class="building-level-chip tier-${Math.max(0, Math.min(5, level))}">${escapeHtml(gameCatalog.buildings[key].name)} <strong>Lv.${level}</strong></span>`; }).join("")}</div>
    <div class="preview-actions"><button class="btn btn-secondary" id="btn-preview-close-action" type="button">ปิด</button><button class="btn ${isCurrent ? "btn-primary" : "btn-danger"}" id="btn-preview-primary-action" type="button">${isCurrent ? "🏡 ไปบ้านของฉัน" : "⚔️ ไปหน้าบุกโจมตี"}</button></div>`;
  playerPreviewTrigger = document.activeElement;
  const modal = document.getElementById("game-player-preview-modal"); modal.classList.remove("hidden");
  document.getElementById("btn-preview-close-action").addEventListener("click", closePlayerBasePreview);
  document.getElementById("btn-preview-primary-action").addEventListener("click", async () => {
    closePlayerBasePreview();
    if (isCurrent) { switchGameTab("home"); return; }
    switchGameTab("attack", false); await loadGameTargets();
    const target = document.querySelector(`[data-target-card="${CSS.escape(player.username)}"]`);
    if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); target.classList.add("is-highlighted"); }
    else setGameFeedback("เป้าหมายนี้อาจอยู่ภายใต้ Shield, cooldown หรือระดับบ้านห่างเกินไป", "info");
  });
  window.requestAnimationFrame(() => modal.querySelector(".game-player-preview").focus());
}

function closePlayerBasePreview() {
  document.getElementById("game-player-preview-modal").classList.add("hidden");
  if (playerPreviewTrigger && typeof playerPreviewTrigger.focus === "function") playerPreviewTrigger.focus();
  playerPreviewTrigger = null;
}

function renderMyBase() {
  if (!gameState || !gameCatalog) return;
  const defense = calculateClientDefense(gameState), attack = calculateClientAttack(gameState), upgrade = gameState.upgrade;
  const panel = document.getElementById("game-home-panel");
  panel.innerHTML = `<section class="my-base-layout">
    <div class="my-base-main"><div class="my-base-title"><div><p class="game-kicker">PLAYER BASE</p><h2>ฐานของ ${escapeHtml(gameState.nickname)}</h2><p>อาคารที่สร้างแล้วจะปรากฏบนพื้นที่จริง คลิกอาคารเพื่อไปหน้าก่อสร้าง</p></div>${upgrade ? `<span class="construction-status">🔨 กำลังก่อสร้าง</span>` : `<span class="ready-status">✓ ฐานพร้อม</span>`}</div><div class="my-base-scene">${renderBaseScene(gameState, { prefix: `mine-${gameState.username}` })}</div></div>
    <aside class="my-base-sidebar"><div class="base-stats-list"><div><span>🏠 บ้านหลัก</span><strong>Lv.${gameState.house_level}</strong></div><div><span>🛡 พลังป้องกัน</span><strong>${formatGameNumber(defense)}</strong></div><div><span>📦 ความจุ</span><strong>${formatGameNumber(gameState.storage_capacity)}</strong></div><div><span>⚔️ พลังโจมตี</span><strong>${formatGameNumber(attack)}</strong></div></div>
      ${upgrade ? `<div class="active-construction-card"><span>กำลังอัปเกรด ${escapeHtml(gameCatalog.buildings[upgrade.buildingKey].name)}</span><strong data-finish-at="${upgrade.finishAt}">${formatGameDuration(upgrade.finishAt - Date.now())}</strong><div class="construction-progress"><i data-progress-start="${upgrade.startedAt}" data-progress-finish="${upgrade.finishAt}"></i></div></div>` : `<p class="base-tip">💡 ใช้รางวัลจากคะแนนสอบเพื่อขยายฐานและเพิ่มพลังป้องกัน</p>`}
      <div class="base-quick-actions"><button class="btn btn-primary" data-go-game-tab="build" type="button">🔨 ก่อสร้าง</button><button class="btn btn-secondary" data-go-game-tab="army" type="button">🪖 จัดกองทัพ</button></div>
    </aside>
  </section>`;
  panel.querySelectorAll("[data-go-game-tab]").forEach(button => button.addEventListener("click", () => switchGameTab(button.dataset.goGameTab)));
  panel.querySelectorAll("[data-base-building]").forEach(element => {
    const goToBuild = () => { switchGameTab("build"); window.setTimeout(() => document.querySelector(`[data-building-card="${CSS.escape(element.dataset.baseBuilding)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
    element.addEventListener("click", goToBuild); element.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") goToBuild(); });
  });
  updateConstructionProgress();
}

const BUILDING_GROUPS = [
  { title: "🏠 อาคารหลัก", keys: ["mainHouse", "storage", "vault"] },
  { title: "🛡️ การป้องกัน", keys: ["wall", "archerTower", "fortress"] },
  { title: "⚔️ กองทัพ", keys: ["barracks", "blacksmith"] }
];

function renderGameBuild() {
  if (!gameState || !gameCatalog) return;
  const panel = document.getElementById("game-build-panel");
  const groups = BUILDING_GROUPS.map(group => `<section class="build-category"><div class="build-category-heading"><h2>${group.title}</h2><span>${group.keys.length} รายการ</span></div><div class="compact-building-grid">${group.keys.map(key => renderBuildingCard(key, gameCatalog.buildings[key])).join("")}</div></section>`).join("");
  const cementCard = `<article class="compact-building-card production-card"><div class="compact-building-head"><div class="compact-building-icon">🏗️</div><div><h3>ผลิต Cement</h3><p>Sand 100 + Coins 100 → Cement 10</p></div><span class="game-level">ผลิต</span></div><div class="compact-building-bottom"><div class="game-unit-controls"><input id="game-cement-batches" class="form-control" type="number" min="1" max="100" value="1" aria-label="จำนวนรอบการผลิต Cement"><button id="btn-convert-cement" class="btn btn-primary btn-compact" type="button">ผลิต</button></div></div></article>`;
  panel.innerHTML = `<div class="build-page-heading"><div><p class="game-kicker">BUILD & UPGRADE</p><h2>ก่อสร้างและพัฒนาฐาน</h2><p>เลือกอาคารเพื่อใช้ทรัพยากร เวลาก่อสร้างปรับใหม่เหลือ 20% ของเดิม</p></div>${gameState.upgrade ? `<div class="build-queue-chip">🔨 1 งานกำลังดำเนินการ</div>` : `<div class="build-queue-chip ready">✓ คิวก่อสร้างว่าง</div>`}</div>${groups}<section class="build-category"><div class="build-category-heading"><h2>🏭 การผลิต</h2><span>แปรรูปทรัพยากร</span></div><div class="compact-building-grid">${cementCard}</div></section>`;
  panel.querySelectorAll("[data-upgrade-building]").forEach(button => button.addEventListener("click", () => startBuildingUpgrade(button.dataset.upgradeBuilding)));
  document.getElementById("btn-convert-cement").addEventListener("click", convertCement);
}

function renderBuildingCard(key, config) {
  const level = Number(gameState.buildings[key] || 0), next = level + 1, maxed = !config.costs[next], cost = maxed ? null : config.costs[next];
  const isThisUpgrade = gameState.upgrade && gameState.upgrade.buildingKey === key;
  const lockedByHouse = key !== "mainHouse" && next > gameState.house_level;
  const stats = [`ป้องกัน ${formatGameNumber((config.defense || [])[level] || 0)}`];
  if (config.capacity) stats.push(`ความจุ ${formatGameNumber(config.capacity[level] || 0)}`);
  if (config.protected) stats.push(`คุ้มครอง ${formatGameNumber(config.protected[level] || 0)}`);
  if (config.unitCapacity) stats.push(`กองทัพ +${formatGameNumber(config.unitCapacity[level] || 0)}`);
  const disabled = maxed || Boolean(gameState.upgrade) || lockedByHouse;
  const action = maxed ? "สูงสุดแล้ว" : isThisUpgrade ? "กำลังก่อสร้าง" : lockedByHouse ? `ต้องมีบ้าน Lv.${next}` : `อัปเกรด Lv.${next}`;
  return `<article class="compact-building-card building-tier-${Math.max(0, Math.min(5, level))}${isThisUpgrade ? " is-constructing" : ""}${lockedByHouse ? " is-locked" : ""}" data-building-card="${key}">
    <div class="compact-building-head"><div class="compact-building-icon">${config.icon}</div><div><h3>${escapeHtml(config.name)}</h3><p>${stats.join(" · ")}</p></div><span class="game-level">Lv.${level}</span></div>
    <div class="compact-building-bottom"><div>${cost ? renderGameCost(cost) : `<span class="max-level-text">✓ ระดับสูงสุด</span>`}${cost ? `<span class="compact-build-time" title="เวลาก่อสร้าง">⏱ ${formatGameDuration(Number(config.times[next] || 0) * 1000)}</span>` : ""}</div>
      <button class="btn ${isThisUpgrade ? "btn-warning" : "btn-primary"} btn-compact" type="button" data-upgrade-building="${key}" ${disabled ? "disabled" : ""}>${action}</button></div>
    ${isThisUpgrade ? `<div class="compact-construction-row"><span data-finish-at="${gameState.upgrade.finishAt}">${formatGameDuration(gameState.upgrade.finishAt - Date.now())}</span><div class="construction-progress"><i data-progress-start="${gameState.upgrade.startedAt}" data-progress-finish="${gameState.upgrade.finishAt}"></i></div></div>` : ""}
  </article>`;
}

async function startBuildingUpgrade(key) {
  const config = gameCatalog.buildings[key], level = Number(gameState.buildings[key] || 0) + 1;
  if (!await showConfirm(`เริ่มอัปเกรด ${config.name} เป็น Lv.${level}?\n${gameCostText(config.costs[level])}`)) return;
  showLoading("กำลังตรวจสอบทรัพยากรและเริ่มก่อสร้าง...");
  const res = await apiCall("startGameBuildingUpgrade", { building_key: key });
  hideLoading();
  if (!res.success) return showGameApiError(res);
  gameState = res.data;
  setGameFeedback(`✅ ${res.message}`, "success");
  renderGameChrome(); renderMyBase(); renderGameBuild(); await loadVillageOverview();
}

async function convertCement() {
  const batches = Number(document.getElementById("game-cement-batches").value);
  if (!Number.isInteger(batches) || batches < 1) return setGameFeedback("❌ จำนวนการผลิตไม่ถูกต้อง", "error");
  if (!await showConfirm(`ผลิต Cement ${batches * 10} หน่วย โดยใช้ Sand ${batches * 100} และ Coins ${batches * 100}?`)) return;
  const res = await apiCall("convertGameCement", { batches });
  if (!res.success) return showGameApiError(res);
  gameState = res.data; setGameFeedback(`✅ ${res.message}`, "success"); renderGameChrome(); renderMyBase(); renderGameBuild();
}

function renderGameArmy() {
  if (!gameState || !gameCatalog) return;
  const barracksLevel = Number(gameState.buildings.barracks || 0);
  const used = Object.keys(gameCatalog.units).reduce((sum, key) => sum + Number(gameState.units[key] || 0) * Number(gameCatalog.units[key].space || 1), 0);
  const cap = 10 + Number((gameCatalog.buildings.barracks.unitCapacity || [])[barracksLevel] || 0) + gameState.house_level * 5;
  const currentArmyLevel = Number(gameState.units.armyLevel || 1), nextArmyCost = gameCatalog.army_upgrade_costs[currentArmyLevel + 1];
  const header = `<div class="game-summary-grid">
    <div class="game-summary-card"><small>⚔️ ระดับกองทัพ</small><strong>Lv.${currentArmyLevel}</strong></div>
    <div class="game-summary-card"><small>🎒 ความจุที่ใช้</small><strong>${used}/${cap}</strong></div>
    <div class="game-summary-card"><small>🪖 ระดับค่าย</small><strong>Lv.${barracksLevel}</strong></div>
    <div class="game-summary-card"><small>⚒️ ระดับโรงตีเหล็ก</small><strong>Lv.${Number(gameState.buildings.blacksmith || 0)}</strong></div>
  </div>`;
  const armyUpgrade = `<article class="game-card"><div class="game-card-head"><div class="game-card-title"><span>⚒️</span><h3>พัฒนาเทคโนโลยีกองทัพ</h3></div><span class="game-level">Lv.${currentArmyLevel}</span></div>
    <p>เพิ่มพลังโจมตี 10% และพลังป้องกัน 8% ต่อระดับ</p>${nextArmyCost ? renderGameCost(nextArmyCost) : ""}
    <button id="btn-upgrade-game-army" class="btn btn-primary" type="button" ${!nextArmyCost ? "disabled" : ""}>${nextArmyCost ? `อัปเกรดเป็น Lv.${currentArmyLevel + 1}` : "ระดับสูงสุด"}</button></article>`;
  const cards = Object.keys(gameCatalog.units).map(key => {
    const unit = gameCatalog.units[key], owned = Number(gameState.units[key] || 0), required = Number(unit.requires.barracks || 0), locked = barracksLevel < required;
    return `<article class="game-card"><div class="game-card-head"><div class="game-card-title"><span>${unit.icon}</span><h3>${escapeHtml(unit.name)}</h3></div><span class="game-level">มี ${owned}</span></div>
      <p>โจมตี ${unit.attack} · ป้องกัน ${unit.defense} · ใช้ที่ ${unit.space}${unit.counters ? ` · ชนะทาง ${escapeHtml(gameCatalog.units[unit.counters].name)}` : ""}</p>
      ${renderGameCost(unit.cost)}
      <div class="game-unit-controls"><input class="form-control" id="game-buy-${key}" type="number" min="1" max="100" value="1" aria-label="จำนวน ${escapeHtml(unit.name)}"><button class="btn btn-primary" data-buy-unit="${key}" type="button" ${locked ? "disabled" : ""}>${locked ? `ค่าย Lv.${required}` : "ซื้อ"}</button></div>
    </article>`;
  }).join("");
  document.getElementById("game-army-panel").innerHTML = `${header}<div class="game-card-grid">${armyUpgrade}${cards}</div>`;
  document.getElementById("game-army-panel").querySelectorAll("[data-buy-unit]").forEach(button => button.addEventListener("click", () => purchaseUnit(button.dataset.buyUnit)));
  const upgradeButton = document.getElementById("btn-upgrade-game-army");
  if (upgradeButton) upgradeButton.addEventListener("click", upgradeArmy);
}

async function purchaseUnit(key) {
  const qty = Number(document.getElementById(`game-buy-${key}`).value);
  if (!Number.isInteger(qty) || qty < 1) return setGameFeedback("❌ กรุณาระบุจำนวนยูนิตที่ถูกต้อง", "error");
  const unit = gameCatalog.units[key];
  if (!await showConfirm(`ซื้อ ${unit.name} x${qty}?\n${gameCostText(unit.cost, qty)}`)) return;
  showLoading("กำลังจัดกำลังพล...");
  const res = await apiCall("purchaseGameUnits", { unit_key: key, quantity: qty });
  hideLoading();
  if (!res.success) return showGameApiError(res);
  gameState = res.data; setGameFeedback(`✅ ${res.message}`, "success"); renderGameChrome(); renderGameArmy();
}

async function upgradeArmy() {
  if (!await showConfirm("ยืนยันการพัฒนาเทคโนโลยีกองทัพระดับถัดไป?")) return;
  showLoading("กำลังพัฒนากองทัพ...");
  const res = await apiCall("upgradeGameArmy"); hideLoading();
  if (!res.success) return showGameApiError(res);
  gameState = res.data; setGameFeedback(`✅ ${res.message}`, "success"); renderGameChrome(); renderGameArmy();
}

async function loadGameTargets() {
  const panel = document.getElementById("game-attack-panel");
  panel.innerHTML = `${renderPvpRulesPanel()}<div class="game-empty">กำลังค้นหาคู่ต่อสู้ระดับใกล้เคียง...</div>`;
  const res = await apiCall("getGameTargets");
  if (!res.success) { panel.innerHTML = `${renderPvpRulesPanel()}<div class="game-empty">${escapeHtml(res.message || "โหลดเป้าหมายไม่สำเร็จ")}</div>`; return; }
  if (!res.data.length) { panel.innerHTML = `${renderPvpRulesPanel()}<div class="game-empty">🛡️ ยังไม่มีผู้เล่นระดับใกล้เคียงให้โจมตี</div>`; return; }
  panel.innerHTML = `${renderPvpRulesPanel()}<div class="game-card-grid game-target-grid">${res.data.map(renderGameTargetCard).join("")}</div>`;
  panel.querySelectorAll("[data-scout-target]").forEach(button => button.addEventListener("click", () => scoutTarget(button.dataset.scoutTarget)));
  panel.querySelectorAll("[data-attack-target]").forEach(button => button.addEventListener("click", () => attackTarget(button.dataset.attackTarget)));
}

function renderPvpRulesPanel() {
  const rules = gameCatalog && gameCatalog.rules ? gameCatalog.rules : {};
  const shieldHours = Math.max(0, Math.round(Number(rules.shield_ms || 0) / 3600000));
  const cooldownHours = Math.max(0, Math.round(Number(rules.cooldown_ms || 0) / 3600000));
  return `<section class="pvp-rules-panel" aria-labelledby="pvp-rules-title">
    <div class="pvp-rules-heading"><div><p class="game-kicker">PVP BATTLE</p><h2 id="pvp-rules-title">เลือกคู่ต่อสู้</h2><p>สอดแนม วางกำลัง แล้วจึงตัดสินใจโจมตี</p></div><span class="pvp-energy-badge" title="Energy ปัจจุบัน">⚡ ${Number(gameState?.energy || 0)}/${Number(gameState?.max_energy || rules.max_energy || 0)}</span></div>
    <div class="pvp-rule-list">
      <div><i aria-hidden="true">⚡</i><span><strong>ใช้ 1 Energy</strong><small>ต่อการโจมตีหนึ่งครั้ง</small></span></div>
      <div><i aria-hidden="true">🛡️</i><span><strong>Shield ${shieldHours} ชั่วโมง</strong><small>หลังฐานถูกโจมตีสำเร็จ</small></span></div>
      <div><i aria-hidden="true">🔁</i><span><strong>โจมตีซ้ำ ${cooldownHours} ชั่วโมง</strong><small>สำหรับเป้าหมายคนเดิม</small></span></div>
      <div><i aria-hidden="true">🚪</i><span><strong>ไม่มี Beginner Shield</strong><small>ผู้เล่นใหม่เข้าร่วม PvP ได้ทันที</small></span></div>
    </div>
    <p class="pvp-shield-warning">⚠️ เมื่อคุณสั่งโจมตี Shield ที่มีอยู่ของคุณจะถูกยกเลิกทันที</p>
  </section>`;
}

function renderGameTargetCard(target) {
  const disabled = !target.availability.ok;
  const availabilityCode = String(target.availability.code || "");
  const statusLabel = disabled ? (availabilityCode === "SHIELD" ? "🛡️ มี Shield" : availabilityCode === "COOLDOWN" ? "⏳ รอโจมตีซ้ำ" : "🔒 ยังโจมตีไม่ได้") : "✓ พร้อมโจมตี";
  const availableAt = target.availability.available_at ? new Date(target.availability.available_at).getTime() : 0;
  const reason = disabled ? `<div class="target-availability-note"><strong>${escapeHtml(target.availability.message)}</strong>${availableAt ? `<span>เปิดใน <b data-available-at="${availableAt}">${formatGameDuration(availableAt - Date.now())}</b></span>` : ""}</div>` : `<div class="target-availability-note is-ready"><span>เลือกจำนวนทหารหรือสอดแนมก่อนโจมตี</span></div>`;
  const picker = Object.keys(gameCatalog.units).map(key => `<label>${gameCatalog.units[key].icon} ${escapeHtml(gameCatalog.units[key].name)}<input class="form-control" data-army-unit="${key}" type="number" min="0" max="${Number(gameState.units[key] || 0)}" value="${key === "infantry" ? Math.min(5, Number(gameState.units[key] || 0)) : 0}" ${disabled ? "disabled" : ""}></label>`).join("");
  return `<article class="game-card game-target-card ${disabled ? "is-unavailable" : "is-available"}" data-target-card="${escapeHtml(target.username)}" aria-disabled="${disabled}">
    <div class="game-card-head"><div class="game-card-title"><span>🧑‍🚀</span><div><h3>${escapeHtml(target.nickname)}</h3><small>บ้าน Lv.${target.house_level}</small></div></div><span class="target-status-badge ${disabled ? "is-waiting" : "is-ready"}">${statusLabel}</span></div>
    <div class="target-intel-row"><span>🏆 <strong>${formatGameNumber(target.trophy)}</strong><small>Trophy</small></span><span>🛡️ <strong>${formatGameNumber(target.defense_estimate)}</strong><small>ป้องกันโดยประมาณ</small></span><span>📦 <strong>${escapeHtml(target.loot_indicator)}</strong><small>ทรัพยากร</small></span></div>${reason}
    <div class="game-army-picker">${picker}</div><div class="game-scout-box hidden" data-scout-result></div>
    <div class="game-target-actions"><button class="btn btn-secondary" data-scout-target="${escapeHtml(target.username)}" type="button" ${disabled ? "disabled" : ""}>🔭 สอดแนม</button><button class="btn btn-danger" data-attack-target="${escapeHtml(target.username)}" type="button" ${disabled ? "disabled" : ""}>⚔️ โจมตี</button></div>
  </article>`;
}

async function scoutTarget(username) {
  const card = document.querySelector(`[data-target-card="${CSS.escape(username)}"]`), box = card.querySelector("[data-scout-result]");
  box.classList.remove("hidden"); box.textContent = "กำลังสอดแนม...";
  const res = await apiCall("scoutGameTarget", { target_username: username });
  if (!res.success) { box.textContent = `❌ ${res.message}`; return; }
  const data = res.data;
  box.innerHTML = `<strong>รายงานสอดแนม</strong><br>🛡️ ป้องกันประมาณ ${formatGameNumber(data.defense_estimate)}<br>🪖 ทหาร: ราบ ${data.army_hint.infantry}, ธนู ${data.army_hint.archer}, ม้า ${data.army_hint.cavalry}<br>🎒 Loot โดยประมาณ: ${Object.keys(data.loot_estimate).map(key => `${GAME_RESOURCE_META[key][0]} ${formatGameNumber(data.loot_estimate[key])}`).join(" · ")}`;
}

async function attackTarget(username) {
  const card = document.querySelector(`[data-target-card="${CSS.escape(username)}"]`), army = {};
  card.querySelectorAll("[data-army-unit]").forEach(input => { army[input.dataset.armyUnit] = Number(input.value || 0); });
  if (!Object.values(army).some(value => value > 0)) return setGameFeedback("❌ ต้องเลือกกองทัพอย่างน้อย 1 หน่วย", "error");
  if (!await showConfirm(`ส่งกองทัพโจมตี ${username}? การโจมตีใช้ Energy 1 และจะยกเลิก Shield ของคุณทันที`)) return;
  const requestId = `attack:${currentUser.username}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  showLoading("กำลังประมวลผลการต่อสู้...");
  const res = await apiCall("attackGameTarget", { target_username: username, army, request_id: requestId });
  hideLoading();
  if (!res.success) return showGameApiError(res);
  const result = res.data, won = result.outcome === "win";
  setGameFeedback(`${won ? "🎉 ชนะ" : "💥 แพ้"} · พลัง ${formatGameNumber(result.attack_power)} ต่อ ${formatGameNumber(result.defense_power)} · Trophy ${result.trophy_delta > 0 ? "+" : ""}${result.trophy_delta}${won ? ` · Loot ${gameCostText(result.loot)}` : ""}`, won ? "success" : "error");
  await loadGameProfile(true); await loadGameTargets();
}

async function loadGameHistory() {
  const panel = document.getElementById("game-history-panel"); panel.innerHTML = `<div class="game-empty">กำลังโหลดประวัติ 20 รายการล่าสุด...</div>`;
  const res = await apiCall("getGameHistory", { limit: 20 });
  if (!res.success || !res.data.length) { panel.innerHTML = `<div class="game-empty">📜 ยังไม่มีประวัติการต่อสู้</div>`; return; }
  panel.innerHTML = `<div class="game-history-list">${res.data.map(item => {
    const isAttack = item.perspective === "attack", won = isAttack ? item.outcome === "win" : item.outcome !== "win";
    const other = isAttack ? item.defender : item.attacker;
    return `<div class="game-history-row"><span class="outcome">${won ? "🏆" : "🛡️"}</span><div><strong>${isAttack ? "บุก" : "ป้องกันจาก"} ${escapeHtml(other)}</strong><br><small>${new Date(item.attacked_at).toLocaleString("th-TH")} · พลัง ${item.attack_power}/${item.defense_power}</small></div><strong>${isAttack ? (item.trophy_delta > 0 ? "+" : "") + item.trophy_delta : ""}</strong></div>`;
  }).join("")}</div>`;
}

async function loadGameRanking() {
  const panel = document.getElementById("game-ranking-panel"); panel.innerHTML = `<div class="game-empty">กำลังโหลดอันดับสงคราม...</div>`;
  const res = await apiCall("getGameLeaderboard");
  if (!res.success || !res.data.length) { panel.innerHTML = `<div class="game-empty">🏆 ยังไม่มีอันดับเกม</div>`; return; }
  panel.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th>อันดับ</th><th>ผู้เล่น</th><th>บ้าน</th><th>Trophy</th></tr></thead><tbody>${res.data.map((item, index) => `<tr class="${item.username === currentUser.username ? "game-ranking-me" : ""}"><td>${index + 1}</td><td>${escapeHtml(item.nickname)}</td><td>Lv.${item.house_level}</td><td>🏆 ${formatGameNumber(item.trophy)}</td></tr>`).join("")}</tbody></table></div>`;
}

function startGameClock() {
  clearInterval(gameClockTimer);
  gameClockTimer = setInterval(() => {
    let shouldRefresh = false, shouldRefreshTargets = false;
    document.querySelectorAll("[data-finish-at]").forEach(element => {
      const remaining = Number(element.dataset.finishAt) - Date.now();
      element.textContent = remaining > 0 ? `เหลือ ${formatGameDuration(remaining)}` : "กำลังยืนยันการก่อสร้าง...";
      if (remaining <= 0) shouldRefresh = true;
    });
    document.querySelectorAll("[data-available-at]").forEach(element => {
      const remaining = Number(element.dataset.availableAt) - Date.now();
      element.textContent = remaining > 0 ? formatGameDuration(remaining) : "พร้อมแล้ว";
      if (remaining <= 0) { element.removeAttribute("data-available-at"); shouldRefreshTargets = true; }
    });
    updateConstructionProgress();
    if (shouldRefresh) { clearInterval(gameClockTimer); loadGameProfile(true); }
    else if (shouldRefreshTargets && gameActiveTab === "attack") loadGameTargets();
    if (gameState) renderGameChrome();
  }, 1000);
}

function updateConstructionProgress() {
  document.querySelectorAll("[data-progress-start][data-progress-finish]").forEach(bar => {
    const start = Number(bar.dataset.progressStart), finish = Number(bar.dataset.progressFinish);
    const percent = finish > start ? Math.max(0, Math.min(100, (Date.now() - start) / (finish - start) * 100)) : 100;
    bar.style.width = `${percent}%`;
  });
}

function renderGameCost(cost, multiplier = 1) {
  return `<div class="game-cost">${Object.keys(cost || {}).filter(key => Number(cost[key])).map(key => { const meta = GAME_RESOURCE_META[key] || ["•", key]; return `<span title="${escapeHtml(meta[1])}" aria-label="${escapeHtml(meta[1])} ${formatGameNumber(Number(cost[key]) * multiplier)}">${meta[0]} ${formatGameNumber(Number(cost[key]) * multiplier)}</span>`; }).join("")}</div>`;
}

function gameCostText(cost, multiplier = 1) {
  return Object.keys(cost || {}).filter(key => Number(cost[key])).map(key => `${GAME_RESOURCE_META[key] ? GAME_RESOURCE_META[key][0] : key} ${formatGameNumber(Number(cost[key]) * multiplier)}`).join(" · ") || "ไม่มีทรัพยากร";
}

function formatGameNumber(value) { return Math.max(0, Number(value) || 0).toLocaleString("th-TH"); }
function formatGameDuration(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const days = Math.floor(total / 86400), hours = Math.floor(total % 86400 / 3600), minutes = Math.floor(total % 3600 / 60), seconds = total % 60;
  if (days) return `${days} วัน ${hours} ชม.`;
  if (hours) return `${hours} ชม. ${minutes} นาที`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setGameFeedback(message, type = "info") {
  const box = document.getElementById("game-feedback");
  box.textContent = message; box.className = `game-feedback ${type}`;
}

function showGameApiError(res) {
  let message = `❌ ${res.message || "ทำรายการไม่สำเร็จ"}`;
  if (res.required && res.available) message += `\nต้องการ: ${gameCostText(res.required)}\nมี: ${gameCostText(res.available)}`;
  setGameFeedback(message, "error");
}

function gameAdminActivityInfo(lastActive) {
  const time = new Date(lastActive).getTime();
  if (!Number.isFinite(time)) return { key: "inactive", label: "ยังไม่พบเวลาเข้าเล่น", shortLabel: "ยังไม่มีข้อมูล" };
  const age = Math.max(0, Date.now() - time);
  if (age <= 86400000) return { key: "active", label: "เข้าเล่นวันนี้", shortLabel: formatGameAdminRelativeTime(time) };
  if (age <= 604800000) return { key: "recent", label: "เข้าเล่นภายใน 7 วัน", shortLabel: formatGameAdminRelativeTime(time) };
  return { key: "inactive", label: "ควรติดตาม", shortLabel: formatGameAdminRelativeTime(time) };
}

function formatGameAdminRelativeTime(time) {
  const age = Math.max(0, Date.now() - Number(time));
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(time).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function gameAdminFilteredPlayers() {
  const players = gameAdminData && Array.isArray(gameAdminData.players) ? gameAdminData.players : [];
  return players.filter(player => {
    const name = `${player.nickname || ""} ${player.username || ""}`.toLocaleLowerCase("th-TH");
    if (gameAdminFilters.search && !name.includes(gameAdminFilters.search)) return false;
    if (gameAdminFilters.level !== "all" && String(Number(player.house_level || 1)) !== gameAdminFilters.level) return false;
    return gameAdminFilters.activity === "all" || gameAdminActivityInfo(player.last_active).key === gameAdminFilters.activity;
  });
}

function renderGameAdminSummary(players) {
  const summary = document.getElementById("game-admin-summary");
  if (!summary) return;
  const activeCount = players.filter(player => gameAdminActivityInfo(player.last_active).key === "active").length;
  const followUpCount = players.filter(player => gameAdminActivityInfo(player.last_active).key === "inactive").length;
  const averageLevel = players.length ? players.reduce((sum, player) => sum + Number(player.house_level || 1), 0) / players.length : 0;
  const totalTrophy = players.reduce((sum, player) => sum + Number(player.trophy || 0), 0);
  const cards = [
    { icon: "users", tone: "is-blue", label: "นักเรียนในหมู่บ้าน", value: `${players.length} คน`, detail: players.length ? "บัญชีที่เริ่มสร้างหมู่บ้านแล้ว" : "ยังไม่มีนักเรียนเปิดเกม" },
    { icon: "activity", tone: "is-green", label: "เข้าเล่นใน 24 ชม.", value: `${activeCount} คน`, detail: followUpCount ? `มี ${followUpCount} คนควรติดตาม` : "นักเรียนมีความเคลื่อนไหวดี" },
    { icon: "home", tone: "is-amber", label: "ระดับบ้านเฉลี่ย", value: players.length ? `Lv.${averageLevel.toFixed(1)}` : "—", detail: players.length ? `สูงสุด Lv.${Math.max(...players.map(player => Number(player.house_level || 1)))}` : "ยังไม่มีข้อมูลระดับบ้าน" },
    { icon: "trophy", tone: "is-purple", label: "ถ้วยรางวัลรวม", value: formatGameNumber(totalTrophy), detail: players.length ? `เฉลี่ย ${formatGameNumber(Math.round(totalTrophy / players.length))} ถ้วยต่อคน` : "ยังไม่มีถ้วยรางวัล" }
  ];
  summary.innerHTML = cards.map(card => `<article class="teacher-summary-card"><span class="teacher-summary-icon ${card.tone}"><i data-lucide="${card.icon}" aria-hidden="true"></i></span><div><small>${card.label}</small><strong>${card.value}</strong><p>${card.detail}</p></div></article>`).join("");
}

function renderGameAdminVillage(players) {
  const village = document.getElementById("game-admin-village");
  if (!village) return;
  if (!players.length) {
    village.innerHTML = `<div class="teacher-village-empty"><span>🏡</span><strong>ไม่พบบ้านที่ตรงกับตัวกรอง</strong><small>ลองเปลี่ยนคำค้นหาหรือสถานะการเข้าเล่น</small></div>`;
    return;
  }
  village.innerHTML = players.map((player, index) => {
    const activity = gameAdminActivityInfo(player.last_active);
    const buildings = { ...defaultVisualBuildings(), ...(player.buildings || {}), mainHouse: Number(player.house_level || 1) };
    const visual = { ...player, buildings, units: player.units || {}, house_level: Number(player.house_level || 1) };
    return `<button class="teacher-village-card" type="button" data-game-player-focus="${escapeHtml(player.username)}" aria-label="ดูข้อมูลของ ${escapeHtml(player.nickname)} บ้านระดับ ${visual.house_level}" style="--plot-delay:${index * 20}ms">
      <span class="teacher-village-card-scene">${renderBaseScene(visual, { compact: true, prefix: `teacher-${index}-${player.username}` })}</span>
      <span class="teacher-village-card-info"><strong>${escapeHtml(player.nickname)}</strong><i class="teacher-status-dot is-${activity.key}" title="${activity.label}"></i><small>@${escapeHtml(player.username)}</small><span class="teacher-village-level"><span>🏠 Lv.${visual.house_level}</span><b>🏆 ${formatGameNumber(player.trophy)}</b></span></span>
    </button>`;
  }).join("");
}

function renderGameAdminPlayerTable(players) {
  const tbody = document.getElementById("game-admin-players");
  const count = document.getElementById("game-admin-results-count");
  const total = gameAdminData && Array.isArray(gameAdminData.players) ? gameAdminData.players.length : 0;
  if (count) count.textContent = players.length === total ? `นักเรียนทั้งหมด ${total} คน` : `พบ ${players.length} จาก ${total} คน`;
  if (!tbody) return;
  if (!players.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="teacher-empty-cell">ไม่พบนักเรียนที่ตรงกับตัวกรอง</td></tr>`;
    return;
  }
  const resourceKeys = Object.keys(GAME_RESOURCE_META);
  tbody.innerHTML = players.map(player => {
    const activity = gameAdminActivityInfo(player.last_active);
    const initial = Array.from(String(player.nickname || player.username || "?"))[0] || "?";
    const resources = player.resources || {};
    return `<tr data-game-player-row="${escapeHtml(player.username)}">
      <td data-label="นักเรียน"><div class="teacher-player-name"><span class="teacher-player-avatar" aria-hidden="true">${escapeHtml(initial)}</span><span><strong>${escapeHtml(player.nickname)}</strong><small>@${escapeHtml(player.username)}</small></span></div></td>
      <td data-label="หมู่บ้าน"><span class="teacher-house-pill">🏠 บ้าน Lv.${Number(player.house_level || 1)}</span></td>
      <td data-label="ถ้วยรางวัล"><span class="teacher-trophy-pill">🏆 ${formatGameNumber(player.trophy)}</span></td>
      <td data-label="ทรัพยากร"><div class="teacher-resource-list">${resourceKeys.map(key => `<span class="teacher-resource-chip" title="${escapeHtml(GAME_RESOURCE_META[key][1])}">${GAME_RESOURCE_META[key][0]} ${formatGameNumber(resources[key])}</span>`).join("")}</div></td>
      <td data-label="เข้าเล่นล่าสุด"><div class="teacher-activity-label"><i class="teacher-status-dot is-${activity.key}"></i><span><strong>${activity.label}</strong><small>${activity.shortLabel}</small></span></div></td>
      <td data-label="จัดการ"><div class="game-admin-actions"><button class="btn btn-secondary" data-game-adjust="${escapeHtml(player.username)}" type="button"><i data-lucide="sliders-horizontal" aria-hidden="true"></i> ปรับทรัพยากร</button><button class="btn btn-danger" data-game-reset="${escapeHtml(player.username)}" type="button"><i data-lucide="rotate-ccw" aria-hidden="true"></i> เริ่มเกมใหม่</button></div></td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("[data-game-adjust]").forEach(button => button.addEventListener("click", () => adminAdjustResources(button.dataset.gameAdjust)));
  tbody.querySelectorAll("[data-game-reset]").forEach(button => button.addEventListener("click", () => adminResetGame(button.dataset.gameReset)));
}

function focusGameAdminPlayer(username, trigger) {
  document.querySelectorAll("[data-game-player-focus], [data-game-player-row]").forEach(element => element.classList.remove("is-highlighted"));
  if (trigger) trigger.classList.add("is-highlighted");
  const row = document.querySelector(`[data-game-player-row="${CSS.escape(username)}"]`);
  if (!row) return;
  row.classList.add("is-highlighted");
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => row.classList.remove("is-highlighted"), 2200);
}

function renderGameAdminDashboard() {
  if (!gameAdminData) return;
  const players = Array.isArray(gameAdminData.players) ? gameAdminData.players : [];
  const levelFilter = document.getElementById("game-admin-level-filter");
  if (levelFilter) {
    const levels = [...new Set(players.map(player => Number(player.house_level || 1)))].sort((a, b) => a - b);
    levelFilter.innerHTML = `<option value="all">ทุกระดับบ้าน</option>${levels.map(level => `<option value="${level}">บ้านระดับ ${level}</option>`).join("")}`;
    levelFilter.value = levels.includes(Number(gameAdminFilters.level)) ? gameAdminFilters.level : "all";
    gameAdminFilters.level = levelFilter.value;
  }
  const filteredPlayers = gameAdminFilteredPlayers();
  renderGameAdminSummary(players);
  renderGameAdminVillage(filteredPlayers);
  renderGameAdminPlayerTable(filteredPlayers);
  document.querySelectorAll("[data-game-player-focus]").forEach(button => button.addEventListener("click", () => focusGameAdminPlayer(button.dataset.gamePlayerFocus, button)));
  if (window.lucide) window.lucide.createIcons();
}

async function loadGameAdminData() {
  if (!currentUser || currentUser.role !== "teacher") return;
  const status = document.getElementById("game-admin-status");
  const refreshButton = document.getElementById("btn-refresh-game-admin");
  status.textContent = "กำลังอัปเดตข้อมูลหมู่บ้าน...";
  if (refreshButton) { refreshButton.disabled = true; refreshButton.setAttribute("aria-busy", "true"); }
  const res = await apiCall("getGameAdminData");
  if (refreshButton) { refreshButton.disabled = false; refreshButton.removeAttribute("aria-busy"); }
  if (!res.success) {
    status.textContent = res.message || "โหลดข้อมูลไม่สำเร็จ";
    const village = document.getElementById("game-admin-village");
    if (village) village.innerHTML = `<div class="teacher-village-empty"><span>⚠️</span><strong>ยังโหลดหมู่บ้านไม่ได้</strong><small>${escapeHtml(res.message || "กรุณาลองใหม่อีกครั้ง")}</small></div>`;
    return;
  }
  gameAdminData = res.data;
  document.getElementById("game-enabled-toggle").checked = Boolean(res.data.enabled);
  const startTime = new Date(res.data.start_date);
  const startLabel = Number.isFinite(startTime.getTime()) ? startTime.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "ยังไม่กำหนด";
  status.textContent = `${res.data.enabled ? "● หมู่บ้านเปิดใช้งาน" : "○ หมู่บ้านปิดอยู่"} · เริ่มแจก Reward ${startLabel} · อัปเดตล่าสุด ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
  renderGameAdminDashboard();
}

async function changeGameEnabled(event) {
  const enabled = event.target.checked;
  if (!await showConfirm(`${enabled ? "เปิด" : "ปิด"}ระบบเกมสำหรับนักเรียนทั้งหมด?`)) { event.target.checked = !enabled; return; }
  const res = await apiCall("setGameEnabled", { enabled });
  if (!res.success) { event.target.checked = !enabled; showNotice(res.message, "error"); return; }
  showNotice(res.message, "success"); loadGameAdminData();
}

async function adminAdjustResources(username) {
  const resource = prompt("ระบุ resource: coins, wood, stone, brick, sand หรือ cement");
  if (!resource || !GAME_RESOURCE_META[resource.trim()]) return;
  const amount = Number(prompt("จำนวนที่ต้องการเพิ่ม (ใช้ค่าติดลบเมื่อต้องการหัก)"));
  if (!Number.isInteger(amount) || amount === 0) return showNotice("จำนวนไม่ถูกต้อง", "error");
  const reason = prompt("เหตุผลในการปรับข้อมูล (อย่างน้อย 3 ตัวอักษร)");
  if (!reason || reason.trim().length < 3) return showNotice("กรุณาระบุเหตุผล", "error");
  if (!await showConfirm(`ยืนยันปรับ ${resource} ของ ${username} จำนวน ${amount > 0 ? "+" : ""}${amount}?`)) return;
  const delta = { coins: 0, wood: 0, stone: 0, brick: 0, sand: 0, cement: 0 }; delta[resource.trim()] = amount;
  const res = await apiCall("adjustGameResources", { target_username: username, delta, reason });
  showNotice(res.message, res.success ? "success" : "error"); if (res.success) loadGameAdminData();
}

async function adminResetGame(username) {
  if (!await showConfirm(`ยืนยัน RESET เกมของ ${username}?\nทรัพยากร อาคาร กองทัพ Trophy และ Shield จะกลับค่าเริ่มต้น แต่บัญชีและคะแนนสอบจะไม่ถูกลบ`)) return;
  if (!await showConfirm(`ยืนยันครั้งสุดท้าย: RESET โปรไฟล์เกม ${username}`)) return;
  const res = await apiCall("resetGameProfile", { target_username: username });
  showNotice(res.message, res.success ? "success" : "error"); if (res.success) loadGameAdminData();
}

// Local preview only. Production values always come from GAME_BALANCE on Apps
// Script; this lightweight catalog keeps ?offline=1 useful for responsive QA.
function offlineGameCatalog() {
  const building = (name, icon, defense, extra = {}) => ({ name, icon, defense: [0, defense, defense * 2, defense * 3, defense * 4, defense * 5],
    costs: [null, { wood: 50, coins: 100 }, { wood: 100, stone: 50, coins: 200 }, { wood: 160, stone: 100, brick: 50, coins: 350 }, { wood: 240, stone: 180, brick: 100, coins: 550 }, { wood: 350, stone: 260, cement: 40, coins: 800 }],
    times: [0, 60, 180, 540, 1440, 3600], ...extra });
  return {
    buildings: {
      mainHouse: building("บ้านหลัก", "🏠", 30, { capacity: [0, 1000, 1800, 2800, 4200, 6000], times: [0, 0, 120, 360, 2880, 8640] }),
      storage: building("คลัง", "📦", 5, { capacity: [0, 800, 1600, 2800, 4500, 7000], times: [0, 36, 120, 360, 1440, 2880] }),
      vault: building("ห้องนิรภัย", "🔐", 10, { protected: [0, 500, 1000, 1800, 3000, 4800], times: [0, 60, 180, 540, 1440, 3600] }),
      wall: building("กำแพง", "🧱", 50, { times: [0, 24, 120, 360, 1080, 2160] }),
      archerTower: building("หอธนู", "🏹", 65, { times: [0, 60, 180, 540, 1440, 3600] }),
      fortress: building("ป้อมปราการ", "🏰", 120, { times: [0, 180, 540, 1440, 3600, 8640] }),
      blacksmith: building("โรงตีเหล็ก", "⚒️", 10, { times: [0, 60, 240, 720, 2160, 4320] }),
      barracks: building("ค่ายทหาร", "🪖", 10, { unitCapacity: [0, 20, 35, 55, 80, 120], times: [0, 60, 180, 540, 1440, 3600] })
    },
    units: {
      infantry: { name: "ทหารราบ", icon: "⚔️", attack: 20, defense: 18, space: 1, cost: { coins: 80 }, counters: "cavalry", requires: { barracks: 0 } },
      archer: { name: "พลธนู", icon: "🏹", attack: 26, defense: 15, space: 1, cost: { coins: 120, wood: 5 }, counters: "infantry", requires: { barracks: 1 } },
      cavalry: { name: "ทหารม้า", icon: "🐎", attack: 38, defense: 28, space: 2, cost: { coins: 220 }, counters: "archer", requires: { barracks: 2 } },
      ram: { name: "เครื่องกระทุ้ง", icon: "🐏", attack: 55, defense: 8, space: 3, cost: { coins: 350, wood: 25 }, requires: { barracks: 2 } },
      catapult: { name: "เครื่องยิงหิน", icon: "🪨", attack: 85, defense: 10, space: 4, cost: { coins: 600, stone: 15 }, requires: { barracks: 3 } }
    },
    army_upgrade_costs: [null, null, { coins: 700, brick: 50 }, { coins: 1200, cement: 30 }],
    rules: { max_energy: 5, energy_regen_ms: 10800000, cooldown_ms: 43200000, shield_ms: 14400000, beginner_shield_ms: 0, max_loot_percent: .1, level_range: 2, trophy_win: 15, trophy_loss: 3 }
  };
}

function offlineGameProfile(username, nickname) {
  const key = `mock_game_${username}`;
  const saved = JSON.parse(localStorage.getItem(key) || "null");
  if (saved) {
    if (saved.previewVersion !== 2) {
      saved.previewVersion = 2;
      if (username === "student2") {
        saved.house_level = 3;
        saved.buildings = { mainHouse: 3, storage: 2, vault: 1, wall: 2, archerTower: 2, fortress: 1, blacksmith: 1, barracks: 2 };
      }
      localStorage.setItem(key, JSON.stringify(saved));
    }
    if (saved.upgrade) {
      const upgradeConfig = offlineGameCatalog().buildings[saved.upgrade.buildingKey];
      const reducedDuration = upgradeConfig ? Number(upgradeConfig.times[Number(saved.upgrade.targetLevel)] || 0) * 1000 : 0;
      const startedAt = Number(saved.upgrade.startedAt || 0);
      if (reducedDuration > 0 && startedAt > 0 && Number(saved.upgrade.finishAt || 0) - startedAt > reducedDuration) {
        saved.upgrade.finishAt = startedAt + reducedDuration;
        localStorage.setItem(key, JSON.stringify(saved));
      }
    }
    if (saved.upgrade && Number(saved.upgrade.finishAt) <= Date.now()) {
      saved.buildings[saved.upgrade.buildingKey] = Number(saved.upgrade.targetLevel);
      if (saved.upgrade.buildingKey === "mainHouse") saved.house_level = Number(saved.upgrade.targetLevel);
      saved.upgrade = null;
      localStorage.setItem(key, JSON.stringify(saved));
    }
    return saved;
  }
  const now = new Date().toISOString();
  const profile = { previewVersion: 2, username, nickname, created_at: now, last_active: now, house_level: username === "student2" ? 3 : 1, trophy: username === "student2" ? 40 : 15,
    resources: { coins: 5000, wood: 900, stone: 700, brick: 400, sand: 300, cement: 100 }, storage_capacity: 1000, vault_protected: 0,
    energy: 5, max_energy: 5, last_energy_update: now, next_energy_at: null, shield_until: null, beginner_shield_until: null, shield_active: false,
    buildings: username === "student2" ? { mainHouse: 3, storage: 2, vault: 1, wall: 2, archerTower: 2, fortress: 1, blacksmith: 1, barracks: 2 } : { mainHouse: 1, storage: 0, vault: 0, wall: 0, archerTower: 0, fortress: 0, blacksmith: 0, barracks: 0 },
    units: { infantry: 5, archer: 0, cavalry: 0, ram: 0, catapult: 0, armyLevel: 1 }, upgrade: null };
  localStorage.setItem(key, JSON.stringify(profile)); return profile;
}

function saveOfflineGameProfile(profile) { localStorage.setItem(`mock_game_${profile.username}`, JSON.stringify(profile)); }

function handleOfflineGameApi(action, data) {
  const username = currentUser ? currentUser.username : "student1";
  const user = OFFLINE_MODE.users.find(item => item.username === username) || OFFLINE_MODE.users[0];
  const profile = offlineGameProfile(user.username, user.nickname), catalog = offlineGameCatalog();
  if (action === "getGameProfile") return { success: true, data: { profile, catalog } };
  if (action === "startGameBuildingUpgrade") {
    const key = data.building_key, next = Number(profile.buildings[key] || 0) + 1, config = catalog.buildings[key];
    profile.upgrade = { buildingKey: key, targetLevel: next, startedAt: Date.now(), finishAt: Date.now() + config.times[next] * 1000 };
    saveOfflineGameProfile(profile); return { success: true, message: `เริ่มอัปเกรด ${config.name} เป็นระดับ ${next}`, data: profile };
  }
  if (action === "purchaseGameUnits") { profile.units[data.unit_key] += Number(data.quantity); saveOfflineGameProfile(profile); return { success: true, message: "ซื้อยูนิตสำเร็จ (โหมดทดลอง)", data: profile }; }
  if (action === "upgradeGameArmy") { profile.units.armyLevel += 1; saveOfflineGameProfile(profile); return { success: true, message: "อัปเกรดกองทัพสำเร็จ (โหมดทดลอง)", data: profile }; }
  if (action === "convertGameCement") { profile.resources.cement += Number(data.batches) * 10; saveOfflineGameProfile(profile); return { success: true, message: "ผลิต Cement สำเร็จ (โหมดทดลอง)", data: profile }; }
  if (action === "getGameTargets") return { success: true, data: [{ username: "student2", nickname: "น้องภูเขา", house_level: 3, trophy: 40, defense_estimate: 500, loot_indicator: "มาก", availability: { ok: true } }] };
  if (action === "scoutGameTarget") return { success: true, data: { username: "student2", nickname: "น้องภูเขา", house_level: 3, defense_estimate: 520, army_hint: { infantry: "มี", archer: "มี", cavalry: "มี" }, loot_estimate: { coins: 300, wood: 80, stone: 60, brick: 30, sand: 20, cement: 0 } } };
  if (action === "attackGameTarget") return { success: true, data: { id: "offline", outcome: "loss", attack_power: 200, defense_power: 520, loot: { coins: 0, wood: 0, stone: 0, brick: 0, sand: 0, cement: 0 }, trophy_delta: -3, energy: 4, attacked_at: new Date().toISOString() } };
  if (action === "getGameHistory") return { success: true, data: [] };
  if (action === "getGameLeaderboard") return { success: true, data: OFFLINE_MODE.users.filter(item => item.role === "student").map(item => { const p = offlineGameProfile(item.username, item.nickname); return { username: p.username, nickname: p.nickname, house_level: Number(p.buildings.mainHouse || p.house_level), trophy: p.trophy, buildings: p.buildings, units: p.units, defense_power: item.username === "student2" ? 520 : 120, is_current_player: item.username === username }; }) };
  if (action === "getGameAdminData") {
    const players = OFFLINE_MODE.users.filter(item => item.role === "student").map(item => {
      const p = offlineGameProfile(item.username, item.nickname);
      return { username: p.username, nickname: p.nickname, house_level: p.house_level, trophy: p.trophy, resources: p.resources, buildings: p.buildings, units: p.units, defense_power: item.username === "student2" ? 520 : 120, last_active: p.last_active };
    });
    return { success: true, data: { enabled: true, start_date: "2026-08-20T00:00:00+07:00", players } };
  }
  if (action === "setGameEnabled") return { success: true, message: data.enabled ? "เปิดระบบเกมแล้ว (โหมดทดลอง)" : "ปิดระบบเกมแล้ว (โหมดทดลอง)" };
  if (action === "adjustGameResources") return { success: true, message: "ปรับทรัพยากรสำเร็จ (โหมดทดลอง)" };
  if (action === "resetGameProfile") { localStorage.removeItem(`mock_game_${data.target_username}`); return { success: true, message: "รีเซ็ตโปรไฟล์เกมแล้ว (โหมดทดลอง)" }; }
  return { success: false, message: "Game action is unavailable in offline preview" };
}
