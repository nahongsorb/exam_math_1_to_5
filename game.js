// BASE GAME client module. All balance and combat decisions remain on Apps Script.
let gameState = null;
let gameCatalog = null;
let gameActiveTab = "base";
let gameClockTimer = null;
let gameAdminData = null;

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

  const refreshAdmin = document.getElementById("btn-refresh-game-admin");
  if (refreshAdmin) refreshAdmin.addEventListener("click", loadGameAdminData);
  const enabledToggle = document.getElementById("game-enabled-toggle");
  if (enabledToggle) enabledToggle.addEventListener("change", changeGameEnabled);
}

async function openBaseGame() {
  if (!currentUser || currentUser.role !== "student") return;
  showSection("game-section");
  switchGameTab("base", false);
  await loadGameProfile();
}

async function loadGameProfile(silent = false) {
  if (!silent) showLoading("กำลังเปิดหมู่บ้านของคุณ...");
  const res = await apiCall("getGameProfile");
  if (!silent) hideLoading();
  if (!res.success) {
    const suffix = res.message === "Invalid action" ? " — กรุณา Deploy google_apps_script.js เวอร์ชันล่าสุด" : "";
    setGameFeedback((res.message || "ไม่สามารถโหลดข้อมูลเกมได้") + suffix, "error");
    document.getElementById("game-base-panel").innerHTML = `<div class="game-empty">🎮 ${escapeHtml(res.message || "ระบบเกมยังไม่พร้อมใช้งาน")}${escapeHtml(suffix)}</div>`;
    return;
  }
  gameState = res.data.profile;
  gameCatalog = res.data.catalog;
  renderGameChrome();
  renderGameBase();
  renderGameArmy();
  startGameClock();
}

function renderGameChrome() {
  if (!gameState) return;
  const status = document.getElementById("game-status-line");
  const shieldUntil = Math.max(new Date(gameState.shield_until || 0).getTime() || 0, new Date(gameState.beginner_shield_until || 0).getTime() || 0);
  const shieldText = shieldUntil > Date.now() ? ` · 🛡️ Shield ${formatGameDuration(shieldUntil - Date.now())}` : "";
  status.textContent = `${gameState.nickname} · บ้านหลัก Lv.${gameState.house_level} · 🏆 ${formatGameNumber(gameState.trophy)}${shieldText}`;
  const resources = document.getElementById("game-resource-bar");
  const chips = Object.keys(GAME_RESOURCE_META).map(key => {
    const meta = GAME_RESOURCE_META[key];
    return `<div class="game-resource-chip"><span>${meta[0]} ${meta[1]}</span><strong>${formatGameNumber(gameState.resources[key])}</strong></div>`;
  });
  chips.push(`<div class="game-resource-chip"><span>⚡ Energy</span><strong>${gameState.energy}/${gameState.max_energy}</strong></div>`);
  resources.innerHTML = chips.join("");
}

function switchGameTab(tab, loadRemote = true) {
  gameActiveTab = tab;
  document.querySelectorAll(".game-tab").forEach(button => button.classList.toggle("active", button.dataset.gameTab === tab));
  document.querySelectorAll(".game-panel").forEach(panel => panel.classList.remove("active"));
  const panel = document.getElementById(`game-${tab}-panel`);
  if (panel) panel.classList.add("active");
  if (!loadRemote || !gameState) return;
  if (tab === "attack") loadGameTargets();
  if (tab === "history") loadGameHistory();
  if (tab === "ranking") loadGameRanking();
}

function renderGameBase() {
  if (!gameState || !gameCatalog) return;
  const upgrade = gameState.upgrade;
  const capacity = gameState.storage_capacity || 0;
  const summary = `
    <div class="game-summary-grid">
      <div class="game-summary-card"><small>🏠 ระดับบ้านหลัก</small><strong>Lv.${gameState.house_level}</strong></div>
      <div class="game-summary-card"><small>📦 ความจุต่อทรัพยากร</small><strong>${formatGameNumber(capacity)}</strong></div>
      <div class="game-summary-card"><small>🔐 ป้องกันจากการปล้น</small><strong>${formatGameNumber(gameState.vault_protected)}</strong></div>
      <div class="game-summary-card"><small>⏱️ งานก่อสร้าง</small><strong>${upgrade ? "กำลังทำ" : "ว่าง"}</strong></div>
    </div>`;
  const cards = Object.keys(gameCatalog.buildings).map(key => renderBuildingCard(key, gameCatalog.buildings[key])).join("");
  const cementCard = `<article class="game-card"><div class="game-card-head"><div class="game-card-title"><span>🏗️</span><h3>ผลิต Cement</h3></div><span class="game-level">Conversion</span></div><p>ใช้ 🏖️ Sand 100 + 🪙 Coins 100 เพื่อผลิต 🏗️ Cement 10 หน่วย</p><div class="game-unit-controls"><input id="game-cement-batches" class="form-control" type="number" min="1" max="100" value="1" aria-label="จำนวนรอบการผลิต Cement"><button id="btn-convert-cement" class="btn btn-primary" type="button">ผลิต</button></div></article>`;
  document.getElementById("game-base-panel").innerHTML = `${summary}<div class="game-card-grid">${cards}${cementCard}</div>`;
  document.getElementById("game-base-panel").querySelectorAll("[data-upgrade-building]").forEach(button => {
    button.addEventListener("click", () => startBuildingUpgrade(button.dataset.upgradeBuilding));
  });
  document.getElementById("btn-convert-cement").addEventListener("click", convertCement);
}

function renderBuildingCard(key, config) {
  const level = Number(gameState.buildings[key] || 0), next = level + 1;
  const maxed = !config.costs[next];
  const cost = maxed ? null : config.costs[next];
  const isThisUpgrade = gameState.upgrade && gameState.upgrade.buildingKey === key;
  let stat = `พลังป้องกัน ${formatGameNumber((config.defense || [])[level] || 0)}`;
  if (config.capacity) stat += ` · ความจุ ${formatGameNumber(config.capacity[level] || 0)}`;
  if (config.protected) stat += ` · คุ้มครอง ${formatGameNumber(config.protected[level] || 0)}`;
  if (config.unitCapacity) stat += ` · กองทัพ +${formatGameNumber(config.unitCapacity[level] || 0)}`;
  const costHtml = cost ? renderGameCost(cost) : "";
  const timeText = cost ? formatGameDuration(Number(config.times[next] || 0) * 1000) : "";
  const disabled = maxed || Boolean(gameState.upgrade) || (key !== "mainHouse" && next > gameState.house_level);
  let action = maxed ? "ระดับสูงสุด" : `อัปเกรดเป็น Lv.${next}`;
  if (isThisUpgrade) action = "กำลังก่อสร้าง";
  return `<article class="game-card">
    <div class="game-card-head"><div class="game-card-title"><span>${config.icon}</span><h3>${escapeHtml(config.name)}</h3></div><span class="game-level">Lv.${level}</span></div>
    <p>${stat}</p>${costHtml}${cost ? `<p>⏱️ ${timeText}</p>` : ""}
    ${isThisUpgrade ? `<div class="game-timer" data-finish-at="${gameState.upgrade.finishAt}">เหลือ ${formatGameDuration(gameState.upgrade.finishAt - Date.now())}</div>` : ""}
    <button class="btn btn-primary" type="button" data-upgrade-building="${key}" ${disabled ? "disabled" : ""}>${action}</button>
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
  renderGameChrome(); renderGameBase();
}

async function convertCement() {
  const batches = Number(document.getElementById("game-cement-batches").value);
  if (!Number.isInteger(batches) || batches < 1) return setGameFeedback("❌ จำนวนการผลิตไม่ถูกต้อง", "error");
  if (!await showConfirm(`ผลิต Cement ${batches * 10} หน่วย โดยใช้ Sand ${batches * 100} และ Coins ${batches * 100}?`)) return;
  const res = await apiCall("convertGameCement", { batches });
  if (!res.success) return showGameApiError(res);
  gameState = res.data; setGameFeedback(`✅ ${res.message}`, "success"); renderGameChrome(); renderGameBase();
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
  panel.innerHTML = `<div class="game-empty">กำลังค้นหาคู่ต่อสู้ระดับใกล้เคียง...</div>`;
  const res = await apiCall("getGameTargets");
  if (!res.success) { panel.innerHTML = `<div class="game-empty">${escapeHtml(res.message || "โหลดเป้าหมายไม่สำเร็จ")}</div>`; return; }
  if (!res.data.length) { panel.innerHTML = `<div class="game-empty">🛡️ ยังไม่มีผู้เล่นระดับใกล้เคียงให้โจมตี</div>`; return; }
  panel.innerHTML = `<div class="game-card-grid">${res.data.map(renderGameTargetCard).join("")}</div>`;
  panel.querySelectorAll("[data-scout-target]").forEach(button => button.addEventListener("click", () => scoutTarget(button.dataset.scoutTarget)));
  panel.querySelectorAll("[data-attack-target]").forEach(button => button.addEventListener("click", () => attackTarget(button.dataset.attackTarget)));
}

function renderGameTargetCard(target) {
  const disabled = !target.availability.ok;
  const reason = disabled ? `<p>⏳ ${escapeHtml(target.availability.message)}${target.availability.available_at ? ` · ${formatGameDuration(new Date(target.availability.available_at) - Date.now())}` : ""}</p>` : "";
  const picker = Object.keys(gameCatalog.units).map(key => `<label>${gameCatalog.units[key].icon} ${escapeHtml(gameCatalog.units[key].name)}<input class="form-control" data-army-unit="${key}" type="number" min="0" max="${Number(gameState.units[key] || 0)}" value="${key === "infantry" ? Math.min(5, Number(gameState.units[key] || 0)) : 0}"></label>`).join("");
  return `<article class="game-card game-target-card" data-target-card="${escapeHtml(target.username)}" aria-disabled="${disabled}">
    <div class="game-card-head"><div class="game-card-title"><span>🧑‍🚀</span><h3>${escapeHtml(target.nickname)}</h3></div><span class="game-level">บ้าน Lv.${target.house_level}</span></div>
    <p>🏆 ${formatGameNumber(target.trophy)} · 🛡️ ป้องกันประมาณ ${formatGameNumber(target.defense_estimate)}<br>📦 ทรัพยากร: <strong>${escapeHtml(target.loot_indicator)}</strong></p>${reason}
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
    document.querySelectorAll("[data-finish-at]").forEach(element => {
      const remaining = Number(element.dataset.finishAt) - Date.now();
      element.textContent = remaining > 0 ? `เหลือ ${formatGameDuration(remaining)}` : "กำลังยืนยันการก่อสร้าง...";
      if (remaining <= 0) { clearInterval(gameClockTimer); loadGameProfile(true); }
    });
    if (gameState) renderGameChrome();
  }, 1000);
}

function renderGameCost(cost, multiplier = 1) {
  return `<div class="game-cost">${Object.keys(cost || {}).filter(key => Number(cost[key])).map(key => `<span>${GAME_RESOURCE_META[key] ? GAME_RESOURCE_META[key][0] : "•"} ${formatGameNumber(Number(cost[key]) * multiplier)}</span>`).join("")}</div>`;
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

async function loadGameAdminData() {
  if (!currentUser || currentUser.role !== "teacher") return;
  const status = document.getElementById("game-admin-status"); status.textContent = "กำลังโหลดข้อมูลผู้เล่น...";
  const res = await apiCall("getGameAdminData");
  if (!res.success) { status.textContent = res.message || "โหลดข้อมูลไม่สำเร็จ"; return; }
  gameAdminData = res.data;
  document.getElementById("game-enabled-toggle").checked = Boolean(res.data.enabled);
  status.textContent = `${res.data.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"} · เริ่มแจก Reward หลัง ${new Date(res.data.start_date).toLocaleString("th-TH")} · ผู้เล่น ${res.data.players.length} คน`;
  const tbody = document.getElementById("game-admin-players");
  tbody.innerHTML = res.data.players.length ? res.data.players.map(player => `<tr><td><strong>${escapeHtml(player.nickname)}</strong><br><small>${escapeHtml(player.username)}</small></td><td>Lv.${player.house_level}</td><td>🏆 ${formatGameNumber(player.trophy)}</td><td>${Object.keys(player.resources).map(key => `${GAME_RESOURCE_META[key][0]}${formatGameNumber(player.resources[key])}`).join(" ")}</td><td>${new Date(player.last_active).toLocaleString("th-TH")}</td><td><div class="game-admin-actions"><button class="btn btn-secondary" data-game-adjust="${escapeHtml(player.username)}" type="button">ปรับทรัพยากร</button><button class="btn btn-danger" data-game-reset="${escapeHtml(player.username)}" type="button">Reset</button></div></td></tr>`).join("") : `<tr><td colspan="6">ยังไม่มีนักเรียนเปิดเกม</td></tr>`;
  tbody.querySelectorAll("[data-game-adjust]").forEach(button => button.addEventListener("click", () => adminAdjustResources(button.dataset.gameAdjust)));
  tbody.querySelectorAll("[data-game-reset]").forEach(button => button.addEventListener("click", () => adminResetGame(button.dataset.gameReset)));
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
    times: [0, 30, 60, 120, 300, 600], ...extra });
  return {
    buildings: {
      mainHouse: building("บ้านหลัก", "🏠", 30, { capacity: [0, 1000, 1800, 2800, 4200, 6000] }),
      storage: building("คลัง", "📦", 5, { capacity: [0, 800, 1600, 2800, 4500, 7000] }),
      vault: building("ห้องนิรภัย", "🔐", 10, { protected: [0, 500, 1000, 1800, 3000, 4800] }),
      wall: building("กำแพง", "🧱", 50), archerTower: building("หอธนู", "🏹", 65), fortress: building("ป้อมปราการ", "🏰", 120),
      blacksmith: building("โรงตีเหล็ก", "⚒️", 10), barracks: building("ค่ายทหาร", "🪖", 10, { unitCapacity: [0, 20, 35, 55, 80, 120] })
    },
    units: {
      infantry: { name: "ทหารราบ", icon: "⚔️", attack: 20, defense: 18, space: 1, cost: { coins: 80 }, counters: "cavalry", requires: { barracks: 0 } },
      archer: { name: "พลธนู", icon: "🏹", attack: 26, defense: 15, space: 1, cost: { coins: 120, wood: 5 }, counters: "infantry", requires: { barracks: 1 } },
      cavalry: { name: "ทหารม้า", icon: "🐎", attack: 38, defense: 28, space: 2, cost: { coins: 220 }, counters: "archer", requires: { barracks: 2 } },
      ram: { name: "เครื่องกระทุ้ง", icon: "🐏", attack: 55, defense: 8, space: 3, cost: { coins: 350, wood: 25 }, requires: { barracks: 2 } },
      catapult: { name: "เครื่องยิงหิน", icon: "🪨", attack: 85, defense: 10, space: 4, cost: { coins: 600, stone: 15 }, requires: { barracks: 3 } }
    },
    army_upgrade_costs: [null, null, { coins: 700, brick: 50 }, { coins: 1200, cement: 30 }],
    rules: { max_energy: 5, energy_regen_ms: 10800000, cooldown_ms: 86400000, shield_ms: 28800000, beginner_shield_ms: 259200000, max_loot_percent: .1, level_range: 2, trophy_win: 15, trophy_loss: 3 }
  };
}

function offlineGameProfile(username, nickname) {
  const key = `mock_game_${username}`;
  const saved = JSON.parse(localStorage.getItem(key) || "null");
  if (saved) return saved;
  const now = new Date().toISOString();
  const profile = { username, nickname, created_at: now, last_active: now, house_level: 1, trophy: username === "student2" ? 40 : 15,
    resources: { coins: 5000, wood: 900, stone: 700, brick: 400, sand: 300, cement: 100 }, storage_capacity: 1000, vault_protected: 0,
    energy: 5, max_energy: 5, last_energy_update: now, next_energy_at: null, shield_until: null, beginner_shield_until: null, shield_active: false,
    buildings: { mainHouse: 1, storage: 0, vault: 0, wall: 0, archerTower: 0, fortress: 0, blacksmith: 0, barracks: 0 },
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
  if (action === "getGameTargets") return { success: true, data: [{ username: "student2", nickname: "น้องภูเขา", house_level: 1, trophy: 40, defense_estimate: 150, loot_indicator: "มาก", availability: { ok: true } }] };
  if (action === "scoutGameTarget") return { success: true, data: { username: "student2", nickname: "น้องภูเขา", house_level: 1, defense_estimate: 150, army_hint: { infantry: "มี", archer: "มี", cavalry: "ไม่มี" }, loot_estimate: { coins: 300, wood: 80, stone: 60, brick: 30, sand: 20, cement: 0 } } };
  if (action === "attackGameTarget") return { success: true, data: { id: "offline", outcome: "win", attack_power: 200, defense_power: 150, loot: { coins: 300, wood: 80, stone: 60, brick: 30, sand: 20, cement: 0 }, trophy_delta: 15, energy: 4, attacked_at: new Date().toISOString() } };
  if (action === "getGameHistory") return { success: true, data: [] };
  if (action === "getGameLeaderboard") return { success: true, data: [{ username: "student2", nickname: "น้องภูเขา", house_level: 1, trophy: 40 }, { username: "student1", nickname: "น้องมีนา", house_level: 1, trophy: 15 }] };
  if (action === "getGameAdminData") {
    const players = OFFLINE_MODE.users.filter(item => item.role === "student").map(item => {
      const p = offlineGameProfile(item.username, item.nickname);
      return { username: p.username, nickname: p.nickname, house_level: p.house_level, trophy: p.trophy, resources: p.resources, last_active: p.last_active };
    });
    return { success: true, data: { enabled: true, start_date: "2026-08-20T00:00:00+07:00", players } };
  }
  if (action === "setGameEnabled") return { success: true, message: data.enabled ? "เปิดระบบเกมแล้ว (โหมดทดลอง)" : "ปิดระบบเกมแล้ว (โหมดทดลอง)" };
  if (action === "adjustGameResources") return { success: true, message: "ปรับทรัพยากรสำเร็จ (โหมดทดลอง)" };
  if (action === "resetGameProfile") { localStorage.removeItem(`mock_game_${data.target_username}`); return { success: true, message: "รีเซ็ตโปรไฟล์เกมแล้ว (โหมดทดลอง)" }; }
  return { success: false, message: "Game action is unavailable in offline preview" };
}
