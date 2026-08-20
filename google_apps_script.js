/**
 * Google Apps Script for PDF Exam Practice System with Re-exam support
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this code.
 * 4. Click the "Save" icon (Floppy disk).
 * 5. For a brand-new spreadsheet only, set INITIAL_ADMIN_USERNAME and
 *    INITIAL_ADMIN_PASSWORD in Script Properties before running "setup".
 *    Never run setup against an existing live spreadsheet merely to create an admin.
 * 6. Click Deploy > New deployment.
 * 7. Click the gear icon (Select type) and choose "Web app".
 * 8. Set Description to "Exam API".
 * 9. Set Execute as: "Me" (your email).
 * 10. Set Who has access: "Anyone".
 * 11. Click Deploy, authorize permissions, and copy the Web App URL.
 * 12. Paste the Web App URL into the `config.js` file in your project.
 */

// Re-exam Answer Keys (10 questions each)
var RE_EXAM_ANSWERS = {
  "1": ["32", "32", "18", "120", "12", "1/2", "7", "60", "120", "400"],
  "2": ["43", "600", "8", "11/8", "120", "26", "55", "14", "40", "4/15"],
  "3": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"],
  "4": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"],
  "5": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"]
};

// Topic codes used only to prepare the student's own score summary on the
// server.  The endpoint never returns answers or answer keys to the browser.
var STUDENT_DASHBOARD_CHAPTERS = [
  "จำนวนนับและการคำนวณ",
  "เศษส่วน ทศนิยม และร้อยละ",
  "อัตราส่วน สัดส่วน และบัญญัติไตรยางศ์",
  "พีชคณิตและสมการเบื้องต้น",
  "การวัดและการเปลี่ยนหน่วย",
  "เรขาคณิตและสมบัติของรูป",
  "เส้นรอบรูป พื้นที่ และปริมาตร",
  "สถิติและการนำเสนอข้อมูล",
  "ความน่าจะเป็นและหลักการนับเบื้องต้น",
  "แบบรูป โจทย์เชาวน์ และการให้เหตุผลทางคณิตศาสตร์"
];

var STUDENT_DASHBOARD_TOPIC_CODES = {
  "1": [2,2,1,2,7,1,2,10,2,2,2,7,7,7,8,7,6,2,7,8,5,3,2,7,2,10,1,10,8,3],
  "2": [2,2,2,6,9,1,1,1,1,2,6,3,6,6,1,10,2,7,7,2,2,3,2,2,7,1,10,8,8,5],
  "3": [2,2,2,1,2,10,1,10,1,6,6,6,10,2,4,2,7,6,9,10,2,6,6,7,7,7,8,6,8,9],
  "4": [2,10,1,2,1,6,3,7,4,9,2,7,7,4,2,2,3,7,2,2,10,7,7,7,2,7,6,8,8,9],
  "5": [1,1,2,1,2,10,1,7,4,4,4,2,1,2,1,2,5,1,4,10,2,7,6,6,6,7,7,7,8,9],
  "6": [2,2,1,1,4,2,10,1,1,7,1,2,7,1,1,3,5,7,7,2,3,7,1,4,2,8,8,8,8,1],
  "7": [1,2,4,1,4,1,1,1,7,1,6,5,7,7,1,2,4,7,5,3,2,4,6,7,8,8,8,9,6,2],
  "8": [1,2,2,4,8,1,1,10,2,10,6,2,5,3,8,9,5,7,7,4,6,9,1,6,6,7,8,8,7,6],
  "9": [1,2,10,6,2,4,5,2,2,2,1,2,8,7,6,10,7,2,7,6,7,1,7,6,5,5,6,5,6,8],
  "10": [4,2,2,2,10,1,7,5,3,7,2,2,2,6,7,7,9,7,7,7,7,2,2,5,7,2,7,1,3,7]
};

// Authentication and password-migration helpers. Existing user and score rows
// are preserved. A legacy plaintext password is upgraded only after a valid
// login, so students continue using the same username and password.
var SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// BASE GAME balance lives on the authoritative server. The browser only renders
// the catalog returned by these APIs and never submits prices, power, or loot.
var GAME_BALANCE = {
  VERSION: 1,
  START_DATE: "2026-08-20T00:00:00+07:00",
  MAX_ENERGY: 5,
  ENERGY_REGEN_MS: 3 * 60 * 60 * 1000,
  ATTACK_COOLDOWN_MS: 24 * 60 * 60 * 1000,
  SHIELD_MS: 8 * 60 * 60 * 1000,
  BEGINNER_SHIELD_MS: 72 * 60 * 60 * 1000,
  LEVEL_RANGE: 2,
  MAX_LOOT_PERCENT: 0.10,
  TROPHY_WIN: 15,
  TROPHY_LOSS: 3,
  COUNTER_MULTIPLIER: 1.25,
  LOOT_LEVEL_MODIFIERS: { "-2": 0.50, "-1": 0.75, "0": 1, "1": 1.10, "2": 1.25 },
  STARTING: {
    coins: 500, wood: 100, stone: 100, brick: 50, sand: 50, cement: 0,
    units: { infantry: 5, archer: 0, cavalry: 0, ram: 0, catapult: 0, armyLevel: 1 }
  },
  REWARD_TIERS: [
    { min: 0, coins: 500, wood: 50, stone: 30, brick: 20, sand: 20 },
    { min: 10 / 30, coins: 700, wood: 70, stone: 45, brick: 35, sand: 30 },
    { min: 15 / 30, coins: 1000, wood: 100, stone: 70, brick: 55, sand: 45 },
    { min: 20 / 30, coins: 1400, wood: 140, stone: 100, brick: 80, sand: 60 },
    { min: 24 / 30, coins: 1900, wood: 190, stone: 140, brick: 110, sand: 90 },
    { min: 27 / 30, coins: 2500, wood: 250, stone: 190, brick: 150, sand: 120 },
    { min: 1, coins: 3500, wood: 350, stone: 270, brick: 220, sand: 180 }
  ],
  BUILDINGS: {
    mainHouse: { name: "บ้านหลัก", icon: "🏠", defense: [0, 30, 55, 85, 125, 175], capacity: [0, 1000, 1800, 2800, 4200, 6000], costs: [null, null, { wood: 120, stone: 60, coins: 200 }, { wood: 180, stone: 120, brick: 50, coins: 350 }, { wood: 260, stone: 190, brick: 100, sand: 80, coins: 550 }, { wood: 380, stone: 280, brick: 170, cement: 40, coins: 800 }], times: [0, 0, 600, 1800, 14400, 43200] },
    storage: { name: "คลัง", icon: "📦", defense: [0, 5, 10, 18, 28, 40], capacity: [0, 800, 1600, 2800, 4500, 7000], costs: [null, { wood: 60, coins: 100 }, { wood: 100, stone: 50, coins: 180 }, { wood: 160, stone: 90, brick: 40, coins: 300 }, { wood: 230, brick: 90, sand: 60, coins: 450 }, { wood: 320, brick: 150, cement: 30, coins: 650 }], times: [0, 180, 600, 1800, 7200, 14400] },
    vault: { name: "ห้องนิรภัย", icon: "🔐", defense: [0, 10, 20, 35, 55, 80], protected: [0, 500, 1000, 1800, 3000, 4800], costs: [null, { stone: 80, coins: 150 }, { stone: 140, brick: 40, coins: 250 }, { stone: 220, brick: 90, sand: 50, coins: 400 }, { stone: 320, brick: 150, cement: 30, coins: 600 }, { stone: 450, brick: 240, cement: 70, coins: 900 }], times: [0, 300, 900, 2700, 7200, 18000] },
    wall: { name: "กำแพง", icon: "🧱", defense: [0, 50, 80, 120, 175, 240], costs: [null, { stone: 50 }, { stone: 90, coins: 80 }, { stone: 150, brick: 50, coins: 150 }, { stone: 230, brick: 100, sand: 60, coins: 260 }, { stone: 340, brick: 170, cement: 40, coins: 420 }], times: [0, 120, 600, 1800, 5400, 10800] },
    archerTower: { name: "หอธนู", icon: "🏹", defense: [0, 65, 105, 155, 220, 300], costs: [null, { wood: 80, stone: 60, coins: 180 }, { wood: 130, stone: 110, coins: 300 }, { wood: 190, stone: 170, brick: 70, coins: 480 }, { wood: 270, stone: 250, brick: 130, coins: 700 }, { wood: 380, stone: 360, cement: 50, coins: 1000 }], times: [0, 300, 900, 2700, 7200, 18000] },
    fortress: { name: "ป้อมปราการ", icon: "🏰", defense: [0, 120, 200, 300, 430, 600], costs: [null, { stone: 150, brick: 60, coins: 350 }, { stone: 240, brick: 120, coins: 550 }, { stone: 360, brick: 200, cement: 30, coins: 800 }, { stone: 520, brick: 300, cement: 70, coins: 1150 }, { stone: 750, brick: 450, cement: 120, coins: 1600 }], times: [0, 900, 2700, 7200, 18000, 43200] },
    blacksmith: { name: "โรงตีเหล็ก", icon: "⚒️", defense: [0, 10, 20, 35, 55, 80], costs: [null, { wood: 90, stone: 70, coins: 250 }, { wood: 140, stone: 120, brick: 50, coins: 420 }, { wood: 220, stone: 180, brick: 100, coins: 650 }, { wood: 320, stone: 260, cement: 40, coins: 950 }, { wood: 450, stone: 380, cement: 90, coins: 1350 }], times: [0, 300, 1200, 3600, 10800, 21600] },
    barracks: { name: "ค่ายทหาร", icon: "🪖", defense: [0, 10, 20, 35, 55, 80], unitCapacity: [0, 20, 35, 55, 80, 120], costs: [null, { wood: 100, coins: 200 }, { wood: 160, stone: 80, coins: 350 }, { wood: 240, stone: 140, brick: 60, coins: 550 }, { wood: 350, stone: 220, brick: 120, coins: 800 }, { wood: 500, stone: 340, cement: 60, coins: 1200 }], times: [0, 300, 900, 2700, 7200, 18000] }
  },
  UNITS: {
    infantry: { name: "ทหารราบ", icon: "⚔️", attack: 20, defense: 18, space: 1, cost: { coins: 80 }, counters: "cavalry", requires: { barracks: 0 } },
    archer: { name: "พลธนู", icon: "🏹", attack: 26, defense: 15, space: 1, cost: { coins: 120, wood: 5 }, counters: "infantry", requires: { barracks: 1 } },
    cavalry: { name: "ทหารม้า", icon: "🐎", attack: 38, defense: 28, space: 2, cost: { coins: 220, wood: 8 }, counters: "archer", requires: { barracks: 2 } },
    ram: { name: "เครื่องกระทุ้ง", icon: "🐏", attack: 55, defense: 8, space: 3, siege: "wall", cost: { coins: 350, wood: 25 }, requires: { barracks: 2 } },
    catapult: { name: "เครื่องยิงหิน", icon: "🪨", attack: 85, defense: 10, space: 4, siege: "fortress", cost: { coins: 600, wood: 30, stone: 15 }, requires: { barracks: 3 } }
  },
  ARMY_UPGRADE_COSTS: [null, null, { coins: 700, brick: 50 }, { coins: 1200, brick: 100, cement: 30 }, { coins: 2000, brick: 180, cement: 70 }, { coins: 3200, brick: 300, cement: 120 }]
};

function normalizeUsername_(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureColumn_(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var index = headers.indexOf(name);
  if (index !== -1) return index + 1;
  var column = headers.length + 1;
  sheet.getRange(1, column).setValue(name);
  return column;
}

function ensureUserSecurityColumns_(sheet) {
  return {
    hash: ensureColumn_(sheet, "password_hash"),
    salt: ensureColumn_(sheet, "password_salt")
  };
}

function ensureExamTopicsColumn_(sheet) {
  return ensureColumn_(sheet, "topics");
}

function hashPassword_(password, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + String(password),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) { return (b + 256) % 256; })
    .map(function(b) { return ("0" + b.toString(16)).slice(-2); })
    .join("");
}

function createSession_(username, role) {
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty(
    "session:" + token,
    JSON.stringify({ username: normalizeUsername_(username), role: String(role || "student").toLowerCase(), expires: Date.now() + SESSION_TTL_MS })
  );
  return token;
}

function requireSession_(token, requiredRole) {
  if (!token) throw new Error("Unauthorized");
  var key = "session:" + String(token);
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) throw new Error("Unauthorized");
  var session = JSON.parse(raw);
  if (!session.expires || session.expires < Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty(key);
    throw new Error("Session expired");
  }
  if (requiredRole && session.role !== requiredRole) throw new Error("Forbidden");
  return session;
}

function findUserByUsername_(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, "users");
  var values = sheet.getDataRange().getValues();
  var target = normalizeUsername_(username);
  for (var i = 1; i < values.length; i++) {
    if (normalizeUsername_(values[i][0]) === target) {
      return { sheet: sheet, row: i + 1, values: values[i] };
    }
  }
  return null;
}

function verifyPasswordAndMigrate_(record, password) {
  var columns = ensureUserSecurityColumns_(record.sheet);
  var hash = record.values[columns.hash - 1];
  var salt = record.values[columns.salt - 1];
  if (hash && salt) return hashPassword_(password, salt) === String(hash);

  if (String(record.values[1] || "") !== String(password)) return false;
  var newSalt = Utilities.getUuid();
  record.sheet.getRange(record.row, columns.salt).setValue(newSalt);
  record.sheet.getRange(record.row, columns.hash).setValue(hashPassword_(password, newSalt));
  record.sheet.getRange(record.row, 2).clearContent();
  return true;
}

function createInitialTeacher_(sheet) {
  var properties = PropertiesService.getScriptProperties();
  var username = normalizeUsername_(properties.getProperty("INITIAL_ADMIN_USERNAME"));
  var password = properties.getProperty("INITIAL_ADMIN_PASSWORD");
  if (!/^[a-z0-9_]{3,40}$/.test(username) || !password || password.length < 12) {
    throw new Error("Set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD in Script Properties before setup.");
  }
  var columns = ensureUserSecurityColumns_(sheet);
  var salt = Utilities.getUuid();
  var row = Array(Math.max(sheet.getLastColumn(), columns.hash, columns.salt)).fill("");
  row[0] = username;
  row[2] = "Teacher";
  row[3] = "teacher";
  row[columns.hash - 1] = hashPassword_(password, salt);
  row[columns.salt - 1] = salt;
  sheet.appendRow(row);
}

// Run manually from the Apps Script editor only when an administrator needs
// to reset a password. Usernames, submissions, and score records are untouched.
function resetUserPassword(username, newPassword) {
  var password = String(newPassword || "");
  if (password.length < 12 || password.length > 200) throw new Error("Password must be 12-200 characters");
  var record = findUserByUsername_(username);
  if (!record) throw new Error("User not found");
  var columns = ensureUserSecurityColumns_(record.sheet);
  var salt = Utilities.getUuid();
  record.sheet.getRange(record.row, columns.salt).setValue(salt);
  record.sheet.getRange(record.row, columns.hash).setValue(hashPassword_(password, salt));
  record.sheet.getRange(record.row, 2).clearContent();
  return "Password updated for " + normalizeUsername_(username);
}

// One-time account-history transfer for a student who created a replacement
// account after forgetting a password. It preserves every submission row and
// changes only its owner to the destination account. The source account itself
// is retained, so no login credential or user record is deleted.
function moveStudentHistoryToAccount(sourceUsername, targetUsername) {
  var source = normalizeUsername_(sourceUsername);
  var target = normalizeUsername_(targetUsername);
  if (!source || !target || source === target) throw new Error("Source and target usernames must be different");

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var sourceUser = findUserByUsername_(source);
    var targetUser = findUserByUsername_(target);
    if (!sourceUser) throw new Error("Source user not found: " + source);
    if (!targetUser) throw new Error("Target user not found: " + target);
    if (String(sourceUser.values[3] || "student").toLowerCase() !== "student" ||
        String(targetUser.values[3] || "student").toLowerCase() !== "student") {
      throw new Error("This function can move history between student accounts only");
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nickname = String(targetUser.values[2] || targetUser.values[0]).trim();
    var submissionsMoved = moveStudentRows_(getOrCreateSheet(ss, "submissions"), source, target, nickname);
    var reSubmissionsMoved = moveStudentRows_(getOrCreateSheet(ss, "re_submissions"), source, target, nickname);
    var reExamsMoved = moveStudentRows_(getOrCreateSheet(ss, "re_exams"), source, target, nickname);
    var mergedReExamRows = consolidateStudentReExamRows_(getOrCreateSheet(ss, "re_exams"), target, nickname);

    return {
      success: true,
      message: "Moved history from " + source + " to " + target,
      moved: {
        submissions: submissionsMoved,
        re_submissions: reSubmissionsMoved,
        re_exams: reExamsMoved,
        merged_re_exam_rows: mergedReExamRows
      }
    };
  } finally {
    lock.releaseLock();
  }
}

// Run this one time from the Apps Script editor for the requested transfer.
// After the execution log reports success, this function can be left unused.
function movePreemHistoryToPpreem() {
  return moveStudentHistoryToAccount("Preem", "ppreem");
}

function moveStudentRows_(sheet, sourceUsername, targetUsername, targetNickname) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  var headers = values[0].map(function(header) { return String(header).trim(); });
  var usernameColumn = headers.indexOf("username");
  var nicknameColumn = headers.indexOf("nickname");
  if (usernameColumn === -1) throw new Error("Missing username column in " + sheet.getName());
  var moved = 0;
  for (var row = 1; row < values.length; row++) {
    if (normalizeUsername_(values[row][usernameColumn]) !== sourceUsername) continue;
    sheet.getRange(row + 1, usernameColumn + 1).setValue(targetUsername);
    if (nicknameColumn !== -1) sheet.getRange(row + 1, nicknameColumn + 1).setValue(targetNickname);
    moved++;
  }
  return moved;
}

// A student should have at most one re-exam status per set. Moving an account
// can create a duplicate status, so retain the strongest status (passed >
// pending > none) and remove only the duplicate status rows.
function consolidateStudentReExamRows_(sheet, username, nickname) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  var headers = values[0].map(function(header) { return String(header).trim(); });
  var usernameColumn = headers.indexOf("username");
  var nicknameColumn = headers.indexOf("nickname");
  var setColumn = headers.indexOf("set_id");
  var statusColumn = headers.indexOf("status");
  var assignedColumn = headers.indexOf("assigned_at");
  if (usernameColumn === -1 || setColumn === -1 || statusColumn === -1) return 0;
  var grouped = {};
  for (var row = 1; row < values.length; row++) {
    if (normalizeUsername_(values[row][usernameColumn]) !== username) continue;
    var setId = String(values[row][setColumn]);
    if (!grouped[setId]) grouped[setId] = [];
    grouped[setId].push({ row: row + 1, values: values[row] });
  }
  var removeRows = [];
  Object.keys(grouped).forEach(function(setId) {
    var records = grouped[setId];
    if (records.length < 2) return;
    var primary = records[0];
    var statuses = records.map(function(record) { return String(record.values[statusColumn] || "none").toLowerCase(); });
    var status = statuses.indexOf("passed") !== -1 ? "passed" : (statuses.indexOf("pending") !== -1 ? "pending" : "none");
    sheet.getRange(primary.row, statusColumn + 1).setValue(status);
    if (nicknameColumn !== -1) sheet.getRange(primary.row, nicknameColumn + 1).setValue(nickname);
    if (assignedColumn !== -1) {
      var latest = records.map(function(record) { return String(record.values[assignedColumn] || ""); }).sort().pop();
      if (latest) sheet.getRange(primary.row, assignedColumn + 1).setValue(latest);
    }
    records.slice(1).forEach(function(record) { removeRows.push(record.row); });
  });
  removeRows.sort(function(a, b) { return b - a; }).forEach(function(row) { sheet.deleteRow(row); });
  return removeRows.length;
}

// Run manually from the Apps Script editor with a strong password to create a
// separate teacher account, or to reset an existing teacher account. It never
// changes student rows, submissions, re-exams, or scores. For safety, it
// refuses to turn an existing student account into a teacher account.
function createOrUpdateTeacherAccount(username, newPassword, nickname) {
  var normalizedUsername = normalizeUsername_(username);
  var password = String(newPassword || "");
  var displayName = String(nickname || "Teacher").trim();
  if (!/^[a-z0-9_]{3,40}$/.test(normalizedUsername)) throw new Error("Username must be 3-40 lowercase letters, numbers, or underscores");
  if (password.length < 12 || password.length > 200) throw new Error("Password must be 12-200 characters");
  if (!displayName || displayName.length > 100) throw new Error("Invalid nickname");

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, "users");
    var roleColumn = ensureColumn_(sheet, "role");
    var columns = ensureUserSecurityColumns_(sheet);
    var record = findUserByUsername_(normalizedUsername);
    var salt = Utilities.getUuid();
    if (record) {
      var currentRole = String(record.values[roleColumn - 1] || "student").toLowerCase();
      if (currentRole !== "teacher") throw new Error("Refusing to change an existing student into a teacher account");
      sheet.getRange(record.row, columns.salt).setValue(salt);
      sheet.getRange(record.row, columns.hash).setValue(hashPassword_(password, salt));
      sheet.getRange(record.row, 2).clearContent();
      return "Teacher password updated for " + normalizedUsername;
    }

    var row = Array(Math.max(sheet.getLastColumn(), roleColumn, columns.hash, columns.salt)).fill("");
    row[0] = normalizedUsername;
    row[2] = displayName;
    row[roleColumn - 1] = "teacher";
    row[columns.hash - 1] = hashPassword_(password, salt);
    row[columns.salt - 1] = salt;
    sheet.appendRow(row);
    return "Teacher account created for " + normalizedUsername;
  } finally {
    lock.releaseLock();
  }
}

// One-time bootstrap helper. Set ADMIN_SETUP_USERNAME, ADMIN_SETUP_PASSWORD,
// and optionally ADMIN_SETUP_NICKNAME in Script Properties, run this function,
// then the sensitive properties are deleted automatically.
function createTeacherFromScriptProperties() {
  var properties = PropertiesService.getScriptProperties();
  var result = createOrUpdateTeacherAccount(
    properties.getProperty("ADMIN_SETUP_USERNAME"),
    properties.getProperty("ADMIN_SETUP_PASSWORD"),
    properties.getProperty("ADMIN_SETUP_NICKNAME") || "Teacher"
  );
  properties.deleteProperty("ADMIN_SETUP_PASSWORD");
  properties.deleteProperty("ADMIN_SETUP_USERNAME");
  properties.deleteProperty("ADMIN_SETUP_NICKNAME");
  return result;
}

// Optional one-time migration. It only changes the password storage format;
// usernames, roles, submissions, re-exam records, and scores are preserved.
function migrateLegacyPasswords() {
  var sheet = getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "users");
  var columns = ensureUserSecurityColumns_(sheet);
  var rows = sheet.getDataRange().getValues();
  var migrated = 0;
  for (var i = 1; i < rows.length; i++) {
    var legacyPassword = rows[i][1];
    if (!legacyPassword || rows[i][columns.hash - 1]) continue;
    var salt = Utilities.getUuid();
    sheet.getRange(i + 1, columns.salt).setValue(salt);
    sheet.getRange(i + 1, columns.hash).setValue(hashPassword_(legacyPassword, salt));
    sheet.getRange(i + 1, 2).clearContent();
    migrated++;
  }
  return "Migrated " + migrated + " user password(s).";
}

// Check if re-exam answer is correct
function checkReExamAnswer(setId, qIdx, ans) {
  var userAns = ans ? ans.toString().trim() : "";
  var setIdStr = setId.toString();
  
  // Special handling for Q6 (index 5) in Set 1 to accept both fraction and decimal
  if (setIdStr === "1" && qIdx === 5) {
    return userAns === "1/2" || userAns === "0.5";
  }
  
  // Special handling for Q4 (index 3) in Set 2 to accept both fraction and decimal
  if (setIdStr === "2" && qIdx === 3) {
    return userAns === "11/8" || userAns === "1.375" || userAns === "1 3/8";
  }
  
  var correctList = RE_EXAM_ANSWERS[setIdStr];
  if (!correctList || qIdx >= correctList.length) return false;
  return userAns === correctList[qIdx].toString().trim();
}

// Handle POST requests (main API endpoint)
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var data = requestData.data || {};
    var response;

    // Route actions
    if (action === "login") {
      response = loginUser(data.username, data.password);
    } else if (action === "register") {
      response = registerUser(data.username, data.password, data.nickname);
    } else if (action === "getExamStatus") {
      var statusSession = data.token ? requireSession_(data.token) : null;
      response = getExamStatus(statusSession ? statusSession.username : null);
    } else if (action === "getStudentDashboard") {
      var dashboardSession = requireSession_(data.token, "student");
      response = getStudentDashboard(dashboardSession.username);
    } else if (action === "submitExam") {
      var studentSession = requireSession_(data.token);
      response = submitExam(studentSession.username, "", data.set_id, data.answers, data.is_re_exam);
    } else if (action === "getLeaderboard") {
      response = getLeaderboard();
    } else if (action === "getAdminData") {
      response = getAdminData(data.username, data.password, data.token);
    } else if (action === "updateExamSettings") {
      var teacherSession = requireSession_(data.token, "teacher");
      response = updateExamSettings(teacherSession.username, null, data.set_id, data.status, data.start_time, data.end_time, data.answers, data.release_answers, data.passing_score, data.topics);
    } else if (action === "toggleReExamStatus") {
      var reExamTeacherSession = requireSession_(data.token, "teacher");
      response = toggleReExamStatus(reExamTeacherSession.username, null, data.target_username, data.set_id, data.status);
    } else if (action === "getGameProfile") {
      var gameProfileSession = requireSession_(data.token, "student");
      response = getGameProfile(gameProfileSession.username);
    } else if (action === "startGameBuildingUpgrade") {
      var gameBuildSession = requireSession_(data.token, "student");
      response = startGameBuildingUpgrade(gameBuildSession.username, data.building_key);
    } else if (action === "purchaseGameUnits") {
      var gameUnitSession = requireSession_(data.token, "student");
      response = purchaseGameUnits(gameUnitSession.username, data.unit_key, data.quantity);
    } else if (action === "upgradeGameArmy") {
      var gameArmySession = requireSession_(data.token, "student");
      response = upgradeGameArmy(gameArmySession.username);
    } else if (action === "convertGameCement") {
      var gameCementSession = requireSession_(data.token, "student");
      response = convertGameCement(gameCementSession.username, data.batches);
    } else if (action === "getGameTargets") {
      var gameTargetsSession = requireSession_(data.token, "student");
      response = getGameTargets(gameTargetsSession.username);
    } else if (action === "scoutGameTarget") {
      var gameScoutSession = requireSession_(data.token, "student");
      response = scoutGameTarget(gameScoutSession.username, data.target_username);
    } else if (action === "attackGameTarget") {
      var gameAttackSession = requireSession_(data.token, "student");
      response = attackGameTarget(gameAttackSession.username, data.target_username, data.army, data.request_id);
    } else if (action === "getGameHistory") {
      var gameHistorySession = requireSession_(data.token, "student");
      response = getGameHistory(gameHistorySession.username, data.limit);
    } else if (action === "getGameLeaderboard") {
      var gameBoardSession = requireSession_(data.token);
      response = getGameLeaderboard(gameBoardSession.username);
    } else if (action === "getGameAdminData") {
      var gameAdminSession = requireSession_(data.token, "teacher");
      response = getGameAdminData(gameAdminSession.username);
    } else if (action === "setGameEnabled") {
      var gameEnabledSession = requireSession_(data.token, "teacher");
      response = setGameEnabled(gameEnabledSession.username, data.enabled);
    } else if (action === "adjustGameResources") {
      var gameAdjustSession = requireSession_(data.token, "teacher");
      response = adjustGameResources(gameAdjustSession.username, data.target_username, data.delta, data.reason);
    } else if (action === "resetGameProfile") {
      var gameResetSession = requireSession_(data.token, "teacher");
      response = resetGameProfile(gameResetSession.username, data.target_username);
    } else {
      response = { success: false, message: "Invalid action" };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Request failed" }))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Handle GET requests (health check and status)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Sheets Exam API is running successfully. Please use POST requests for operations."
  })).setMimeType(ContentService.MimeType.TEXT);
}

// Database Setup & Migrations
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Create Users Sheet
  var usersSheet = ss.getSheetByName("users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("users");
    usersSheet.appendRow(["username", "password", "nickname", "role"]);
    createInitialTeacher_(usersSheet);
  }
  
  // 2. Create Exams Sheet
  var examsSheet = ss.getSheetByName("exams");
  if (!examsSheet) {
    examsSheet = ss.insertSheet("exams");
    examsSheet.appendRow(["set_id", "status", "start_time", "end_time", "answers", "release_answers", "passing_score"]);
    // Pre-populate 10 exam sets
    for (var i = 1; i <= 10; i++) {
      var defaultAnswers = Array(30).fill("1").join(","); // Default answer key: all 1
      examsSheet.appendRow([i, i <= 5 ? "open" : "closed", "", "", defaultAnswers, "false", 15]);
    }
  } else {
    // Migration: Add passing_score column if missing
    var headers = examsSheet.getRange(1, 1, 1, examsSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("passing_score") === -1) {
      examsSheet.getRange(1, headers.length + 1).setValue("passing_score");
      var lastRow = examsSheet.getLastRow();
      if (lastRow > 1) {
        for (var r = 2; r <= lastRow; r++) {
          examsSheet.getRange(r, headers.length + 1).setValue(15);
        }
      }
    }
  }
  ensureExamSetRecords_(examsSheet);
  
  // 3. Create Submissions Sheet
  var submissionsSheet = ss.getSheetByName("submissions");
  if (!submissionsSheet) {
    submissionsSheet = ss.insertSheet("submissions");
    submissionsSheet.appendRow(["id", "username", "nickname", "set_id", "answers", "score", "submitted_at"]);
  }
  
  // 4. Create Re-Exams (Status Tracking) Sheet
  var reExamsSheet = ss.getSheetByName("re_exams");
  if (!reExamsSheet) {
    reExamsSheet = ss.insertSheet("re_exams");
    reExamsSheet.appendRow(["username", "nickname", "set_id", "status", "assigned_at"]);
  }

  // 5. Create Re-Submissions Sheet
  var reSubmissionsSheet = ss.getSheetByName("re_submissions");
  if (!reSubmissionsSheet) {
    reSubmissionsSheet = ss.insertSheet("re_submissions");
    reSubmissionsSheet.appendRow(["id", "username", "nickname", "set_id", "answers", "score", "submitted_at"]);
  }

  ensureGameSheets_(ss);
  
  return "Setup completed! Exam tables and BASE GAME tables are initialized and verified.";
}

// Helper: Get or Create Sheet automatically (Self-healing mechanism)
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "users") {
      sheet.appendRow(["username", "password", "nickname", "role"]);
      createInitialTeacher_(sheet);
    } else if (sheetName === "exams") {
      sheet.appendRow(["set_id", "status", "start_time", "end_time", "answers", "release_answers", "passing_score"]);
      for (var i = 1; i <= 10; i++) {
        sheet.appendRow([i, i <= 5 ? "open" : "closed", "", "", Array(30).fill("1").join(","), "false", 15]);
      }
    } else if (sheetName === "submissions") {
      sheet.appendRow(["id", "username", "nickname", "set_id", "answers", "score", "submitted_at"]);
    } else if (sheetName === "re_exams") {
      sheet.appendRow(["username", "nickname", "set_id", "status", "assigned_at"]);
    } else if (sheetName === "re_submissions") {
      sheet.appendRow(["id", "username", "nickname", "set_id", "answers", "score", "submitted_at"]);
    } else if (sheetName === "game_players") {
      sheet.appendRow(gameSheetHeaders_().players);
    } else if (sheetName === "game_rewards") {
      sheet.appendRow(gameSheetHeaders_().rewards);
    } else if (sheetName === "game_battles") {
      sheet.appendRow(gameSheetHeaders_().battles);
    } else if (sheetName === "game_ledger") {
      sheet.appendRow(gameSheetHeaders_().ledger);
    } else if (sheetName === "game_settings") {
      sheet.appendRow(gameSheetHeaders_().settings);
    }
  }
  return sheet;
}

// Adds newly published sets and removes duplicate configuration rows. The first
// row is kept so an existing teacher configuration is never overwritten.
function ensureExamSetRecords_(sheet) {
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var values = sheet.getDataRange().getValues();
    var existing = {};
    var duplicateRows = [];
    for (var row = 1; row < values.length; row++) {
      var setKey = String(values[row][0]).trim();
      if (existing[setKey]) {
        duplicateRows.push(row + 1); // Sheet rows are 1-indexed.
      } else {
        existing[setKey] = true;
      }
    }
    // Delete from the bottom upward so earlier row numbers stay stable.
    for (var index = duplicateRows.length - 1; index >= 0; index--) {
      sheet.deleteRow(duplicateRows[index]);
    }
    var defaultAnswers = Array(30).fill("1").join(",");
    for (var setId = 1; setId <= 10; setId++) {
      if (!existing[String(setId)]) {
        sheet.appendRow([setId, "closed", "", "", defaultAnswers, "false", 15]);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

// Helper: Get Sheet Data as Object Array
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var data = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

// Authenticate user
function loginUser(username, password) {
  if (!username || !password) return { success: false, message: "Invalid username or password" };
  var secureRecord = findUserByUsername_(username);
  if (!secureRecord || !verifyPasswordAndMigrate_(secureRecord, password)) {
    return { success: false, message: "Invalid username or password" };
  }
  var secureRole = String(secureRecord.values[3] || "student").toLowerCase();
  return {
    success: true,
    data: {
      username: secureRecord.values[0],
      nickname: secureRecord.values[2],
      role: secureRole,
      token: createSession_(secureRecord.values[0], secureRole)
    }
  };

  if (!username || !password) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }
  var users = getSheetData("users");
  var u = username.toString().trim().toLowerCase();
  var p = password.toString();
  for (var i = 0; i < users.length; i++) {
    var dbUser = users[i].username;
    var dbPass = users[i].password;
    if (dbUser && dbPass && dbUser.toString().trim().toLowerCase() === u) {
      if (dbPass.toString() === p) {
        return {
          success: true,
          data: {
            username: users[i].username,
            nickname: users[i].nickname,
            role: users[i].role
          }
        };
      } else {
        return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
      }
    }
  }
  return { success: false, message: "ไม่พบชื่อผู้ใช้งานนี้" };
}

// Register student
function registerUser(username, password, nickname) {
  var secureUsername = normalizeUsername_(username);
  var securePassword = String(password || "");
  var secureNickname = String(nickname || "").trim();
  if (!/^[a-z0-9_]{3,40}$/.test(secureUsername) || securePassword.length < 8 || securePassword.length > 200 || !secureNickname || secureNickname.length > 100) {
    return { success: false, message: "Invalid registration data" };
  }

  var registerLock = LockService.getScriptLock();
  registerLock.waitLock(5000);
  try {
    if (findUserByUsername_(secureUsername)) return { success: false, message: "Username already exists" };
    var secureSheet = getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "users");
    var columns = ensureUserSecurityColumns_(secureSheet);
    var salt = Utilities.getUuid();
    var row = Array(Math.max(secureSheet.getLastColumn(), columns.hash, columns.salt)).fill("");
    row[0] = secureUsername;
    row[2] = secureNickname;
    row[3] = "student";
    row[columns.hash - 1] = hashPassword_(securePassword, salt);
    row[columns.salt - 1] = salt;
    secureSheet.appendRow(row);
  } finally {
    registerLock.releaseLock();
  }
  return { success: true, message: "Registration completed" };

  if (!username || !password || !nickname) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, "users");
  var users = getSheetData("users");
  
  var u = username.toString().trim().toLowerCase();
  for (var i = 0; i < users.length; i++) {
    var dbUser = users[i].username;
    if (dbUser && dbUser.toString().trim().toLowerCase() === u) {
      return { success: false, message: "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" };
    }
  }
  
  sheet.appendRow([username.toString().trim(), password.toString(), nickname.toString().trim(), "student"]);
  return { success: true, message: "ลงทะเบียนเรียบร้อยแล้ว!" };
}

// Get exams status (Safe for students)
function getExamStatus(username) {
  ensureExamSetRecords_(getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "exams"));
  var exams = getSheetData("exams");
  var now = new Date().getTime();
  var cleanExams = [];
  var returnedSetIds = {};
  
  var passingScores = {};
  for (var i = 0; i < exams.length; i++) {
    var exam = exams[i];
    var examSetId = String(exam.set_id).trim();
    // Defensive guard for a stale spreadsheet response during a migration.
    if (returnedSetIds[examSetId]) continue;
    returnedSetIds[examSetId] = true;
    var status = exam.status;
    
    if (status === "scheduled") {
      var startTime = exam.start_time ? new Date(exam.start_time).getTime() : 0;
      var endTime = exam.end_time ? new Date(exam.end_time).getTime() : Infinity;
      
      if (now >= startTime && now <= endTime) {
        status = "open";
      } else if (now < startTime) {
        status = "upcoming";
      } else {
        status = "closed";
      }
    }
    
    var threshold = exam.passing_score !== undefined && exam.passing_score !== "" ? parseInt(exam.passing_score) : 15;
    passingScores[exam.set_id.toString()] = threshold;
    
    cleanExams.push({
      set_id: exam.set_id,
      status: status,
      start_time: exam.start_time,
      end_time: exam.end_time,
      release_answers: exam.release_answers === "true" || exam.release_answers === true,
      passing_score: threshold
    });
  }
  
  var pendingReExams = [];
  if (username) {
    var reExams = getSheetData("re_exams");
    var submissions = getSheetData("submissions");
    var targetU = username.toString().trim().toLowerCase();
    
    // Map explicit re_exam statuses
    var reExamStatus = {};
    for (var j = 0; j < reExams.length; j++) {
      if (reExams[j].username && reExams[j].username.toString().trim().toLowerCase() === targetU) {
        reExamStatus[reExams[j].set_id.toString()] = reExams[j].status;
      }
    }
    
    // Map student's highest score for each set
    var highestScores = {};
    for (var s = 0; s < submissions.length; s++) {
      var sub = submissions[s];
      if (sub.username && sub.username.toString().trim().toLowerCase() === targetU) {
        var setId = sub.set_id.toString();
        var score = parseInt(sub.score) || 0;
        if (highestScores[setId] === undefined || score > highestScores[setId]) {
          highestScores[setId] = score;
        }
      }
    }
    
    // Calculate pending status
    for (var setNum = 1; setNum <= 5; setNum++) {
      var setId = setNum.toString();
      var status = reExamStatus[setId];
      var score = highestScores[setId];
      var threshold = passingScores[setId] || 15;
      
      if (status === "pending") {
        pendingReExams.push(setId);
      } else if (score !== undefined && score < threshold && status !== "passed") {
        pendingReExams.push(setId);
      }
    }
  }
  
  return { success: true, data: cleanExams, pending_re_exams: pendingReExams };
}

function getStudentDashboardTopics_(exam) {
  var topics = null;
  try {
    topics = typeof exam.topics === "string" ? JSON.parse(exam.topics) : exam.topics;
  } catch (error) {
    topics = null;
  }
  if (Array.isArray(topics) && topics.length === 30 && topics.every(function(topic) {
    return STUDENT_DASHBOARD_CHAPTERS.indexOf(String(topic).trim()) !== -1;
  })) {
    return topics.map(function(topic) { return String(topic).trim(); });
  }
  var codes = STUDENT_DASHBOARD_TOPIC_CODES[String(exam.set_id)] || [];
  return codes.map(function(code) { return STUDENT_DASHBOARD_CHAPTERS[code - 1] || ""; });
}

function buildStudentDashboardAnalysis_(submissions, examById) {
  var stats = {};
  var totalScore = 0;
  var setIds = {};

  submissions.forEach(function(submission) {
    var exam = examById[String(submission.set_id)];
    if (!exam || !exam.answers) return;
    totalScore += parseInt(submission.score, 10) || 0;
    setIds[String(submission.set_id)] = true;
    var topics = getStudentDashboardTopics_(exam);
    var correctAnswers = String(exam.answers).split(",");
    var answers = String(submission.answers || "").split(",");
    for (var index = 0; index < 30; index++) {
      var topic = topics[index];
      var answer = String(answers[index] || "").trim();
      if (!topic || ["1", "2", "3", "4"].indexOf(answer) === -1) continue;
      if (!stats[topic]) stats[topic] = { attempts: 0, correct: 0, questions: {} };
      stats[topic].attempts++;
      stats[topic].questions[String(submission.set_id) + "-" + (index + 1)] = true;
      if (answer === String(correctAnswers[index] || "").trim()) stats[topic].correct++;
    }
  });

  var topicsOut = Object.keys(stats).map(function(topic) {
    var item = stats[topic];
    var rate = item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0;
    return {
      topic: topic,
      attempts: item.attempts,
      correct: item.correct,
      wrong: item.attempts - item.correct,
      rate: rate,
      question_count: Object.keys(item.questions).length
    };
  }).sort(function(a, b) {
    return a.rate - b.rate || a.topic.localeCompare(b.topic);
  });

  var totalAttempts = topicsOut.reduce(function(sum, item) { return sum + item.attempts; }, 0);
  var totalCorrect = topicsOut.reduce(function(sum, item) { return sum + item.correct; }, 0);
  return {
    submission_count: submissions.length,
    unique_set_count: Object.keys(setIds).length,
    average_score: submissions.length ? Math.round((totalScore / submissions.length) * 10) / 10 : 0,
    attempts: totalAttempts,
    correct: totalCorrect,
    wrong: totalAttempts - totalCorrect,
    accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    topics: topicsOut
  };
}

// Returns aggregate scores only for the authenticated student.  No answer,
// answer key, other student, or class-level detail leaves the server.
function getStudentDashboard(username) {
  ensureExamSetRecords_(getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "exams"));
  var targetUsername = normalizeUsername_(username);
  var exams = getSheetData("exams");
  var submissions = getSheetData("submissions").filter(function(submission) {
    return normalizeUsername_(submission.username) === targetUsername;
  });
  var examById = {};
  exams.forEach(function(exam) {
    var id = String(exam.set_id).trim();
    if (!examById[id]) examById[id] = exam;
  });
  var submittedSets = {};
  submissions.forEach(function(submission) { submittedSets[String(submission.set_id)] = true; });
  var setIds = Object.keys(submittedSets).sort(function(a, b) { return Number(a) - Number(b); });
  var analyses = { all: buildStudentDashboardAnalysis_(submissions, examById) };
  setIds.forEach(function(setId) {
    analyses[setId] = buildStudentDashboardAnalysis_(submissions.filter(function(submission) {
      return String(submission.set_id) === setId;
    }), examById);
  });
  return { success: true, data: { submitted_sets: setIds, analyses: analyses } };
}

// Submit Exam & Auto Grade
function submitExam(username, nickname, set_id, studentAnswers, is_re_exam) {
  if (!username || !set_id || !Array.isArray(studentAnswers)) return { success: false, message: "Invalid submission" };
  var submittedStudent = findUserByUsername_(username);
  if (!submittedStudent || String(submittedStudent.values[3] || "student").toLowerCase() !== "student") {
    return { success: false, message: "Invalid student" };
  }
  username = submittedStudent.values[0];
  nickname = submittedStudent.values[2];
  var secureIsReExam = is_re_exam === true || is_re_exam === "true";
  if (secureIsReExam) {
    var secureReExamSetId = String(set_id);
    if (!Object.prototype.hasOwnProperty.call(RE_EXAM_ANSWERS, secureReExamSetId) || studentAnswers.length !== 10) {
      return { success: false, message: "Invalid re-exam submission" };
    }
    var pending = getExamStatus(username).pending_re_exams || [];
    if (pending.indexOf(secureReExamSetId) === -1) return { success: false, message: "Re-exam is not assigned" };
  } else if (studentAnswers.length !== 30 || studentAnswers.some(function(answer) {
    return answer !== "" && !["1", "2", "3", "4", 1, 2, 3, 4].includes(answer);
  })) {
    return { success: false, message: "Invalid exam answers" };
  }

  if (!username || !set_id || !studentAnswers) {
    return { success: false, message: "ข้อมูลไม่ครบถ้วน" };
  }
  
  var isRe = is_re_exam === true || is_re_exam === "true";
  
  if (isRe) {
    // 1. Grade Re-exam
    var correctAnswers = RE_EXAM_ANSWERS[set_id.toString()] || [];
    var score = 0;
    for (var j = 0; j < correctAnswers.length; j++) {
      if (checkReExamAnswer(set_id, j, studentAnswers[j])) {
        score++;
      }
    }
    
    var total = correctAnswers.length;
    var passed = (score === total); // Re-exam requires 100% (answering all 10 correct) to pass
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reSubmissionsSheet = getOrCreateSheet(ss, "re_submissions");
    var submissionId = "SUB_RE_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    var submittedAt = new Date().toISOString();
    var answersStr = studentAnswers.join(",");
    
    reSubmissionsSheet.appendRow([submissionId, username, nickname, set_id, answersStr, score, submittedAt]);
    
    if (passed) {
      // Clear pending re-exam status
      var reExamsSheet = getOrCreateSheet(ss, "re_exams");
      var values = reExamsSheet.getDataRange().getValues();
      var targetU = username.toString().trim().toLowerCase();
      var targetS = set_id.toString();
      var rowIdx = -1;
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] && values[i][2] && 
            values[i][0].toString().trim().toLowerCase() === targetU && 
            values[i][2].toString() === targetS) {
          rowIdx = i + 1;
          break;
        }
      }
      
      if (rowIdx !== -1) {
        reExamsSheet.getRange(rowIdx, 4).setValue("passed");
        reExamsSheet.getRange(rowIdx, 5).setValue(submittedAt);
      } else {
        reExamsSheet.appendRow([username, nickname, set_id, "passed", submittedAt]);
      }
    }
    
    return {
      success: true,
      data: {
        submission_id: submissionId,
        score: score,
        total: total,
        passed: passed,
        submitted_at: submittedAt
      }
    };
  }
  
  // 2. Grade Normal Exam
  var exams = getSheetData("exams");
  var examConfig = null;
  var targetSetId = set_id.toString();
  for (var i = 0; i < exams.length; i++) {
    var dbSetId = exams[i].set_id;
    if (dbSetId && dbSetId.toString() === targetSetId) {
      examConfig = exams[i];
      break;
    }
  }
  
  if (!examConfig || !examConfig.answers) {
    return { success: false, message: "ไม่พบข้อมูลข้อสอบหรือเฉลยของชุดนี้" };
  }
  
  var now = new Date().getTime();
  var status = examConfig.status;
  if (status === "scheduled") {
    var startTime = examConfig.start_time ? new Date(examConfig.start_time).getTime() : 0;
    var endTime = examConfig.end_time ? new Date(examConfig.end_time).getTime() : Infinity;
    if (now >= startTime && now <= endTime) {
      status = "open";
    } else {
      status = "closed";
    }
  }
  
  if (status !== "open") {
    return { success: false, message: "ข้อสอบชุดนี้ยังไม่เปิดให้ทำ หรือหมดเวลาสอบแล้ว" };
  }
  
  var correctAnswers = examConfig.answers.toString().split(",");
  var score = 0;
  
  for (var j = 0; j < correctAnswers.length; j++) {
    if (studentAnswers[j] !== undefined && studentAnswers[j] !== null && correctAnswers[j] !== undefined && correctAnswers[j] !== null && 
        studentAnswers[j].toString().trim() === correctAnswers[j].toString().trim()) {
      score++;
    }
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var submissionsSheet = getOrCreateSheet(ss, "submissions");
  var submissionId = "SUB_" + now + "_" + Math.floor(Math.random() * 1000);
  var submittedAt = new Date().toISOString();
  
  var answersStr = studentAnswers.join(",");
  submissionsSheet.appendRow([submissionId, username, nickname, set_id, answersStr, score, submittedAt]);

  // The game reward is derived from this server-side grade. Locking and the
  // username + exam id key make repeated/concurrent submits idempotent.
  var weeklyGameReward = grantWeeklyGameReward_(username, nickname, String(set_id), score, correctAnswers.length, submittedAt);
  
  // Auto-flag re-exam if score is below passing score
  var passingScore = examConfig.passing_score !== undefined && examConfig.passing_score !== "" ? parseInt(examConfig.passing_score) : 15;
  
  var reExamsSheet = getOrCreateSheet(ss, "re_exams");
  var values = reExamsSheet.getDataRange().getValues();
  var targetU = username.toString().trim().toLowerCase();
  var targetS = set_id.toString();
  var rowIdx = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] && values[i][2] && 
        values[i][0].toString().trim().toLowerCase() === targetU && 
        values[i][2].toString() === targetS) {
      rowIdx = i + 1;
      break;
    }
  }
  
  // Re-exam worksheets currently exist for sets 1-5 only.
  if (Number(set_id) <= 5 && score < passingScore) {
    if (rowIdx !== -1) {
      reExamsSheet.getRange(rowIdx, 4).setValue("pending");
      reExamsSheet.getRange(rowIdx, 5).setValue(submittedAt);
    } else {
      reExamsSheet.appendRow([username, nickname, set_id, "pending", submittedAt]);
    }
  } else if (Number(set_id) <= 5) {
    // Cleared if they pass the normal exam
    if (rowIdx !== -1) {
      reExamsSheet.getRange(rowIdx, 4).setValue("passed");
      reExamsSheet.getRange(rowIdx, 5).setValue(submittedAt);
    }
  }
  
  return {
    success: true,
    data: {
      submission_id: submissionId,
      score: score,
      total: correctAnswers.length,
      submitted_at: submittedAt,
      release_answers: examConfig.release_answers === "true" || examConfig.release_answers === true,
      correct_answers: (examConfig.release_answers === "true" || examConfig.release_answers === true) ? correctAnswers : null,
      weekly_game_reward: weeklyGameReward
    }
  };
}

// Get Leaderboard Data
function getLeaderboard() {
  var submissions = getSheetData("submissions");
  var reExams = getSheetData("re_exams");
  var exams = getSheetData("exams");
  
  // Map passing thresholds
  var passingScores = {};
  for (var k = 0; k < exams.length; k++) {
    passingScores[exams[k].set_id.toString()] = exams[k].passing_score !== undefined && exams[k].passing_score !== "" ? parseInt(exams[k].passing_score) : 15;
  }
  
  // Map explicit re_exam statuses
  var reExamStatus = {};
  for (var j = 0; j < reExams.length; j++) {
    var rx = reExams[j];
    if (rx.username && rx.set_id) {
      reExamStatus[rx.username.toString().trim().toLowerCase() + "_" + rx.set_id.toString()] = rx.status;
    }
  }
  
  var studentScores = {};
  
  for (var i = 0; i < submissions.length; i++) {
    var sub = submissions[i];
    if (!sub.username || !sub.set_id) continue;
    var u = sub.username.toString().trim().toLowerCase();
    var nick = sub.nickname ? sub.nickname.toString().trim() : u;
    var set = sub.set_id.toString();
    var score = parseInt(sub.score) || 0;
    
    if (!studentScores[u]) {
      studentScores[u] = {
        username: u,
        nickname: nick,
        sets: {},
        totalScore: 0,
        pending_re_exams: []
      };
    }
    
    if (studentScores[u].sets[set] === undefined || score > studentScores[u].sets[set]) {
      studentScores[u].sets[set] = score;
    }
  }
  
  // Calculate dynamic pending status for each student
  for (var u in studentScores) {
    var record = studentScores[u];
    for (var s = 1; s <= 5; s++) {
      var sid = s.toString();
      var score = record.sets[sid];
      var threshold = passingScores[sid] || 15;
      var key = u + "_" + sid;
      var status = reExamStatus[key];
      
      if (status === "pending") {
        if (record.pending_re_exams.indexOf(sid) === -1) {
          record.pending_re_exams.push(sid);
        }
      } else if (score !== undefined && score < threshold && status !== "passed") {
        if (record.pending_re_exams.indexOf(sid) === -1) {
          record.pending_re_exams.push(sid);
        }
      }
    }
  }
  
  // Also scan for forced manual assignments for students without score entries
  for (var j = 0; j < reExams.length; j++) {
    var rx = reExams[j];
    if (rx.username && rx.status === "pending") {
      var u = rx.username.toString().trim().toLowerCase();
      if (studentScores[u]) {
        if (studentScores[u].pending_re_exams.indexOf(rx.set_id.toString()) === -1) {
          studentScores[u].pending_re_exams.push(rx.set_id.toString());
        }
      }
    }
  }
  
  var leaderboardList = [];
  for (var u in studentScores) {
    var record = studentScores[u];
    var total = 0;
    for (var set in record.sets) {
      total += record.sets[set];
    }
    record.totalScore = total;
    leaderboardList.push(record);
  }
  
  leaderboardList.sort(function(a, b) {
    return b.totalScore - a.totalScore;
  });
  
  return { success: true, data: leaderboardList };
}

// Check admin credentials
function isAdmin(username, password) {
  if (!username || !password) return false;
  var secureRecord = findUserByUsername_(username);
  if (!secureRecord || !verifyPasswordAndMigrate_(secureRecord, password)) return false;
  return String(secureRecord.values[3] || "").toLowerCase() === "teacher";

  if (!username || !password) return false;
  var users = getSheetData("users");
  var u = username.toString().trim().toLowerCase();
  var p = password.toString();
  for (var i = 0; i < users.length; i++) {
    var dbUser = users[i].username;
    var dbPass = users[i].password;
    var dbRole = users[i].role;
    if (dbUser && dbPass && dbRole &&
        dbUser.toString().trim().toLowerCase() === u && 
        dbRole.toString().trim().toLowerCase() === "teacher") {
      return dbPass.toString() === p;
    }
  }
  return false;
}

// Get full dashboard data for Teacher
function getAdminData(username, password, token) {
  var adminSession;
  try {
    adminSession = token ? requireSession_(token, "teacher") : null;
  } catch (e) {
    return { success: false, message: "Unauthorized access" };
  }
  if (!adminSession) {
    if (!isAdmin(username, password)) return { success: false, message: "Unauthorized access" };
    var teacherRecord = findUserByUsername_(username);
    adminSession = { username: normalizeUsername_(username), role: "teacher" };
    token = createSession_(teacherRecord.values[0], "teacher");
  }

  ensureExamSetRecords_(getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "exams"));
  var secureUsers = getSheetData("users").map(function(u) {
    return { username: u.username, nickname: u.nickname, role: u.role };
  });
  ensureExamTopicsColumn_(getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), "exams"));
  return {
    success: true,
    token: token || String(token || ""),
    data: {
      users: secureUsers,
      exams: getSheetData("exams"),
      submissions: getSheetData("submissions"),
      re_exams: getSheetData("re_exams")
    }
  };

  if (!isAdmin(username, password)) {
    return { success: false, message: "Unauthorized access" };
  }
  
  var users = getSheetData("users");
  var exams = getSheetData("exams");
  var submissions = getSheetData("submissions");
  var reExams = getSheetData("re_exams");
  
  var cleanUsers = users.map(function(u) {
    return { username: u.username, nickname: u.nickname, role: u.role };
  });
  
  return {
    success: true,
    data: {
      users: cleanUsers,
      exams: exams,
      submissions: submissions,
      re_exams: reExams
    }
  };
}

// Update exam settings (Teacher)
function updateExamSettings(username, password, set_id, status, start_time, end_time, answers, release_answers, passing_score, topics) {
  if (password !== null && !isAdmin(username, password)) {
    return { success: false, message: "Unauthorized access" };
  }
  
  var normalizedSetId = Number(set_id);
  var allowedStatuses = ["open", "closed", "scheduled"];
  if (!Number.isInteger(normalizedSetId) || normalizedSetId < 1 || normalizedSetId > 10 || allowedStatuses.indexOf(status) === -1) {
    return { success: false, message: "Invalid exam settings" };
  }
  if (answers) {
    var safeAnswers = String(answers).split(",");
    if (safeAnswers.length !== 30 || safeAnswers.some(function(answer) { return ["1", "2", "3", "4"].indexOf(String(answer).trim()) === -1; })) {
      return { success: false, message: "Invalid answer key" };
    }
  }
  var safePassingScore = passing_score === undefined || passing_score === null || passing_score === "" ? 15 : Number(passing_score);
  if (!Number.isInteger(safePassingScore) || safePassingScore < 0 || safePassingScore > 30) {
    return { success: false, message: "Invalid passing score" };
  }
  var safeTopics = null;
  if (topics !== undefined && topics !== null && topics !== "") {
    try {
      safeTopics = typeof topics === "string" ? JSON.parse(topics) : topics;
    } catch (e) {
      return { success: false, message: "Invalid topic mapping" };
    }
    if (!Array.isArray(safeTopics) || safeTopics.length !== 30 || safeTopics.some(function(topic) {
      return typeof topic !== "string" || topic.trim().length > 80;
    })) {
      return { success: false, message: "Topics must contain 30 labels of at most 80 characters" };
    }
    safeTopics = safeTopics.map(function(topic) { return topic.trim(); });
  }

  if (set_id === undefined || set_id === null) {
    return { success: false, message: "ไม่ระบุชุดข้อสอบ" };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, "exams");
  var topicsColumn = ensureExamTopicsColumn_(sheet);
  var values = sheet.getDataRange().getValues();
  
  var setRowIdx = -1;
  var targetSetId = set_id.toString();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] !== undefined && values[i][0] !== null && values[i][0].toString() === targetSetId) {
      setRowIdx = i + 1; // 1-indexed for sheets
      break;
    }
  }
  
  if (setRowIdx === -1) {
    return { success: false, message: "ไม่พบข้อสอบชุดดังกล่าว" };
  }
  
  sheet.getRange(setRowIdx, 2).setValue(status || "open");
  sheet.getRange(setRowIdx, 3).setValue(start_time || "");
  sheet.getRange(setRowIdx, 4).setValue(end_time || "");
  
  if (answers) {
    var parts = answers.toString().split(",");
    if (parts.length !== 30) {
      return { success: false, message: "จำนวนข้อในเฉลยต้องมีทั้งหมด 30 ข้อเท่านั้น (พบ " + parts.length + " ข้อ)" };
    }
    sheet.getRange(setRowIdx, 5).setValue(answers.toString());
  }
  
  var relAns = release_answers !== undefined && release_answers !== null ? release_answers.toString() : "false";
  sheet.getRange(setRowIdx, 6).setValue(relAns);
  
  var pScore = safePassingScore;
  sheet.getRange(setRowIdx, 7).setValue(pScore);
  if (safeTopics !== null) sheet.getRange(setRowIdx, topicsColumn).setValue(JSON.stringify(safeTopics));
  
  return { success: true, message: "อัปเดตการตั้งค่าข้อสอบชุดที่ " + set_id + " สำเร็จแล้ว!" };
}

// Toggle re-exam status for a student (Teacher Action)
function toggleReExamStatus(username, password, targetUsername, setId, status) {
  var safeTarget = findUserByUsername_(targetUsername);
  var safeSetId = Number(setId);
  if (!safeTarget || String(safeTarget.values[3] || "student").toLowerCase() !== "student" ||
      !Number.isInteger(safeSetId) || safeSetId < 1 || safeSetId > 5 ||
      ["pending", "passed", "none"].indexOf(status) === -1) {
    return { success: false, message: "Invalid re-exam settings" };
  }

  if (password !== null && !isAdmin(username, password)) {
    return { success: false, message: "Unauthorized access" };
  }
  
  if (!targetUsername || !setId) {
    return { success: false, message: "ข้อมูลไม่ครบถ้วน" };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, "re_exams");
  var values = sheet.getDataRange().getValues();
  var rowIdx = -1;
  var targetU = targetUsername.toString().trim().toLowerCase();
  var targetS = setId.toString();
  
  for (var i = 1; i < values.length; i++) {
    var dbUser = values[i][0];
    var dbSet = values[i][2];
    if (dbUser && dbSet && dbUser.toString().trim().toLowerCase() === targetU && dbSet.toString() === targetS) {
      rowIdx = i + 1; // 1-indexed
      break;
    }
  }
  
  var nowStr = new Date().toISOString();
  
  if (status === "none") {
    if (rowIdx !== -1) {
      sheet.deleteRow(rowIdx);
    }
    return { success: true, message: "ล้างสถานะสอบซ่อมเรียบร้อยแล้ว" };
  } else {
    if (rowIdx !== -1) {
      sheet.getRange(rowIdx, 4).setValue(status);
      sheet.getRange(rowIdx, 5).setValue(nowStr);
    } else {
      var nickname = "";
      var usersSheet = getOrCreateSheet(ss, "users");
      var uValues = usersSheet.getDataRange().getValues();
      for (var u = 1; u < uValues.length; u++) {
        if (uValues[u][0].toString().trim().toLowerCase() === targetU) {
          nickname = uValues[u][2];
          break;
        }
      }
      sheet.appendRow([targetUsername.toString().trim(), nickname, setId.toString(), status, nowStr]);
    }
    return { success: true, message: "ปรับปรุงสถานะสอบซ่อมเรียบร้อยแล้ว" };
  }
}

// ---------------------------------------------------------------------------
// BASE GAME — authoritative data layer
// ---------------------------------------------------------------------------

function gameSheetHeaders_() {
  return {
    players: ["username", "nickname", "created_at", "updated_at", "last_active", "house_level", "trophy", "coins", "wood", "stone", "brick", "sand", "cement", "energy", "last_energy_update", "shield_until", "beginner_shield_until", "buildings_json", "units_json", "upgrade_json"],
    rewards: ["id", "username", "exam_id", "score", "max_score", "reward_json", "claimed_at"],
    battles: ["id", "request_id", "attacker", "defender", "outcome", "attack_power", "defense_power", "army_json", "defender_army_json", "loot_json", "trophy_delta", "attacked_at"],
    ledger: ["id", "username", "type", "delta_json", "balance_json", "reference_id", "created_at", "actor"],
    settings: ["key", "value", "updated_at"]
  };
}

function ensureGameSheets_(ss) {
  var headers = gameSheetHeaders_();
  Object.keys(headers).forEach(function(key) {
    var name = "game_" + key;
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers[key]);
    }
  });
  var settings = ss.getSheetByName("game_settings");
  var values = settings.getDataRange().getValues();
  var foundEnabled = false;
  var foundStart = false;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === "game_enabled") foundEnabled = true;
    if (String(values[i][0]) === "game_start_date") foundStart = true;
  }
  var now = new Date().toISOString();
  if (!foundEnabled) settings.appendRow(["game_enabled", "true", now]);
  if (!foundStart) settings.appendRow(["game_start_date", GAME_BALANCE.START_DATE, now]);
}

function getGameSetting_(key, fallback) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureGameSheets_(ss);
  var values = ss.getSheetByName("game_settings").getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(key)) return values[i][1];
  }
  return fallback;
}

function isGameEnabled_() {
  return String(getGameSetting_("game_enabled", "true")).toLowerCase() === "true";
}

function safeGameJson_(value, fallback) {
  if (!value) return fallback;
  try { return typeof value === "string" ? JSON.parse(value) : value; }
  catch (error) { return fallback; }
}

function findExactGameValueRow_(sheet, column, value) {
  if (sheet.getLastRow() < 2) return 0;
  var range = sheet.getRange(2, column, sheet.getLastRow() - 1, 1);
  if (typeof range.createTextFinder === "function") {
    var match = range.createTextFinder(String(value)).matchEntireCell(true).findNext();
    return match ? match.getRow() : 0;
  }
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) if (String(values[i][0]) === String(value)) return i + 2;
  return 0;
}

function defaultGameBuildings_() {
  return { mainHouse: 1, storage: 0, vault: 0, wall: 0, archerTower: 0, fortress: 0, blacksmith: 0, barracks: 0 };
}

function createGamePlayerObject_(username, nickname, nowMs) {
  var nowIso = new Date(nowMs).toISOString();
  return {
    username: normalizeUsername_(username), nickname: String(nickname || username),
    created_at: nowIso, updated_at: nowIso, last_active: nowIso,
    house_level: 1, trophy: 0,
    coins: GAME_BALANCE.STARTING.coins, wood: GAME_BALANCE.STARTING.wood,
    stone: GAME_BALANCE.STARTING.stone, brick: GAME_BALANCE.STARTING.brick,
    sand: GAME_BALANCE.STARTING.sand, cement: GAME_BALANCE.STARTING.cement,
    energy: GAME_BALANCE.MAX_ENERGY, last_energy_update: nowIso,
    shield_until: "", beginner_shield_until: new Date(nowMs + GAME_BALANCE.BEGINNER_SHIELD_MS).toISOString(),
    buildings: defaultGameBuildings_(), units: JSON.parse(JSON.stringify(GAME_BALANCE.STARTING.units)), upgrade: null,
    _row: 0
  };
}

function gamePlayerToRow_(p) {
  return [p.username, p.nickname, p.created_at, p.updated_at, p.last_active, p.house_level, p.trophy,
    p.coins, p.wood, p.stone, p.brick, p.sand, p.cement, p.energy, p.last_energy_update,
    p.shield_until || "", p.beginner_shield_until || "", JSON.stringify(p.buildings), JSON.stringify(p.units), p.upgrade ? JSON.stringify(p.upgrade) : ""];
}

function gameRowToPlayer_(row, rowNumber) {
  return {
    username: normalizeUsername_(row[0]), nickname: String(row[1] || row[0]), created_at: row[2], updated_at: row[3], last_active: row[4],
    house_level: Number(row[5]) || 1, trophy: Math.max(0, Number(row[6]) || 0),
    coins: Math.max(0, Number(row[7]) || 0), wood: Math.max(0, Number(row[8]) || 0), stone: Math.max(0, Number(row[9]) || 0),
    brick: Math.max(0, Number(row[10]) || 0), sand: Math.max(0, Number(row[11]) || 0), cement: Math.max(0, Number(row[12]) || 0),
    energy: Math.max(0, Math.min(GAME_BALANCE.MAX_ENERGY, Number(row[13]) || 0)), last_energy_update: row[14],
    shield_until: row[15] || "", beginner_shield_until: row[16] || "",
    buildings: safeGameJson_(row[17], defaultGameBuildings_()), units: safeGameJson_(row[18], JSON.parse(JSON.stringify(GAME_BALANCE.STARTING.units))),
    upgrade: safeGameJson_(row[19], null), _row: rowNumber
  };
}

function findGamePlayer_(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureGameSheets_(ss);
  var sheet = ss.getSheetByName("game_players");
  var values = sheet.getDataRange().getValues();
  var target = normalizeUsername_(username);
  for (var i = 1; i < values.length; i++) {
    if (normalizeUsername_(values[i][0]) === target) return gameRowToPlayer_(values[i], i + 1);
  }
  return null;
}

function writeGamePlayer_(player) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_players");
  player.updated_at = new Date().toISOString();
  var row = gamePlayerToRow_(player);
  if (player._row) sheet.getRange(player._row, 1, 1, row.length).setValues([row]);
  else {
    sheet.appendRow(row);
    player._row = sheet.getLastRow();
  }
}

function ensureGamePlayer_(username) {
  var player = findGamePlayer_(username);
  if (player) return player;
  var user = findUserByUsername_(username);
  if (!user || String(user.values[3] || "student").toLowerCase() !== "student") throw new Error("Invalid student");
  player = createGamePlayerObject_(user.values[0], user.values[2], Date.now());
  writeGamePlayer_(player);
  appendGameLedger_(player, "INITIAL_GRANT", {
    coins: player.coins, wood: player.wood, stone: player.stone, brick: player.brick, sand: player.sand, cement: player.cement
  }, "profile:" + player.username, "system");
  return player;
}

function finalizeGameState_(player, nowMs) {
  var changed = false;
  var last = new Date(player.last_energy_update || nowMs).getTime();
  if (!isFinite(last)) last = nowMs;
  if (player.energy < GAME_BALANCE.MAX_ENERGY && nowMs > last) {
    var gained = Math.floor((nowMs - last) / GAME_BALANCE.ENERGY_REGEN_MS);
    if (gained > 0) {
      player.energy = Math.min(GAME_BALANCE.MAX_ENERGY, player.energy + gained);
      player.last_energy_update = player.energy === GAME_BALANCE.MAX_ENERGY ? new Date(nowMs).toISOString() : new Date(last + gained * GAME_BALANCE.ENERGY_REGEN_MS).toISOString();
      changed = true;
    }
  }
  if (player.upgrade && Number(player.upgrade.finishAt) <= nowMs) {
    var key = player.upgrade.buildingKey;
    player.buildings[key] = Number(player.upgrade.targetLevel);
    if (key === "mainHouse") player.house_level = Number(player.upgrade.targetLevel);
    player.upgrade = null;
    changed = true;
  }
  player.last_active = new Date(nowMs).toISOString();
  return changed;
}

function gameResourceSnapshot_(p) {
  return { coins: p.coins, wood: p.wood, stone: p.stone, brick: p.brick, sand: p.sand, cement: p.cement };
}

function appendGameLedger_(player, type, delta, referenceId, actor) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_ledger");
  sheet.appendRow([Utilities.getUuid(), player.username, type, JSON.stringify(delta || {}), JSON.stringify(gameResourceSnapshot_(player)), referenceId || "", new Date().toISOString(), actor || "system"]);
}

function canAffordGameCost_(player, cost, multiplier) {
  multiplier = multiplier || 1;
  return Object.keys(cost || {}).every(function(key) { return Number(player[key] || 0) >= Number(cost[key]) * multiplier; });
}

function applyGameCost_(player, cost, multiplier) {
  multiplier = multiplier || 1;
  var delta = {};
  Object.keys(cost || {}).forEach(function(key) {
    var amount = Math.round(Number(cost[key]) * multiplier);
    player[key] = Math.max(0, Number(player[key] || 0) - amount);
    delta[key] = -amount;
  });
  return delta;
}

function getGameStorageCapacity_(player) {
  var house = GAME_BALANCE.BUILDINGS.mainHouse.capacity[player.buildings.mainHouse] || 0;
  var storage = GAME_BALANCE.BUILDINGS.storage.capacity[player.buildings.storage] || 0;
  return house + storage;
}

function publicGamePlayer_(player) {
  var now = Date.now();
  var vaultLevel = Number(player.buildings.vault || 0);
  return {
    username: player.username, nickname: player.nickname, created_at: player.created_at, last_active: player.last_active,
    house_level: player.house_level, trophy: player.trophy, resources: gameResourceSnapshot_(player),
    storage_capacity: getGameStorageCapacity_(player), vault_protected: GAME_BALANCE.BUILDINGS.vault.protected[vaultLevel] || 0,
    energy: player.energy, max_energy: GAME_BALANCE.MAX_ENERGY, last_energy_update: player.last_energy_update,
    next_energy_at: player.energy < GAME_BALANCE.MAX_ENERGY ? new Date(new Date(player.last_energy_update).getTime() + GAME_BALANCE.ENERGY_REGEN_MS).toISOString() : null,
    shield_until: player.shield_until || null, beginner_shield_until: player.beginner_shield_until || null,
    shield_active: Math.max(new Date(player.shield_until || 0).getTime() || 0, new Date(player.beginner_shield_until || 0).getTime() || 0) > now,
    buildings: player.buildings, units: player.units, upgrade: player.upgrade
  };
}

function getGameCatalog_() {
  return { buildings: GAME_BALANCE.BUILDINGS, units: GAME_BALANCE.UNITS, army_upgrade_costs: GAME_BALANCE.ARMY_UPGRADE_COSTS,
    rules: { max_energy: GAME_BALANCE.MAX_ENERGY, energy_regen_ms: GAME_BALANCE.ENERGY_REGEN_MS, cooldown_ms: GAME_BALANCE.ATTACK_COOLDOWN_MS,
      shield_ms: GAME_BALANCE.SHIELD_MS, beginner_shield_ms: GAME_BALANCE.BEGINNER_SHIELD_MS, max_loot_percent: GAME_BALANCE.MAX_LOOT_PERCENT,
      level_range: GAME_BALANCE.LEVEL_RANGE, trophy_win: GAME_BALANCE.TROPHY_WIN, trophy_loss: GAME_BALANCE.TROPHY_LOSS } };
}

function getGameProfile(username) {
  if (!isGameEnabled_()) return { success: false, code: "GAME_DISABLED", message: "คุณครูปิดระบบเกมชั่วคราว" };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(username);
    finalizeGameState_(player, Date.now());
    writeGamePlayer_(player);
    return { success: true, data: { profile: publicGamePlayer_(player), catalog: getGameCatalog_() } };
  } finally { lock.releaseLock(); }
}

function selectGameReward_(score, maxScore) {
  var ratio = maxScore > 0 ? Math.max(0, Math.min(1, Number(score) / Number(maxScore))) : 0;
  var reward = GAME_BALANCE.REWARD_TIERS[0];
  GAME_BALANCE.REWARD_TIERS.forEach(function(tier) { if (ratio + 1e-9 >= tier.min) reward = tier; });
  return { coins: reward.coins, wood: reward.wood, stone: reward.stone, brick: reward.brick, sand: reward.sand, cement: 0 };
}

function grantWeeklyGameReward_(username, nickname, examId, score, maxScore, submittedAt) {
  if (!isGameEnabled_()) return { granted: false, reason: "GAME_DISABLED" };
  var startMs = new Date(getGameSetting_("game_start_date", GAME_BALANCE.START_DATE)).getTime();
  if (new Date(submittedAt).getTime() < startMs) return { granted: false, reason: "BEFORE_GAME_START" };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureGameSheets_(ss);
    var rewardsSheet = ss.getSheetByName("game_rewards");
    var rewardId = normalizeUsername_(username) + ":" + String(examId);
    var existingRewardRow = findExactGameValueRow_(rewardsSheet, 1, rewardId);
    if (existingRewardRow) return { granted: false, reason: "ALREADY_CLAIMED", reward: safeGameJson_(rewardsSheet.getRange(existingRewardRow, 6).getValues()[0][0], {}) };
    var player = ensureGamePlayer_(username);
    finalizeGameState_(player, Date.now());
    var reward = selectGameReward_(score, maxScore);
    var capacity = getGameStorageCapacity_(player);
    var actual = {};
    Object.keys(reward).forEach(function(key) {
      var before = Number(player[key] || 0);
      player[key] = key === "coins" ? before + reward[key] : Math.min(capacity, before + reward[key]);
      actual[key] = player[key] - before;
    });
    writeGamePlayer_(player);
    rewardsSheet.appendRow([rewardId, player.username, String(examId), Number(score), Number(maxScore), JSON.stringify(actual), submittedAt]);
    appendGameLedger_(player, "EXAM_REWARD", actual, rewardId, "exam");
    return { granted: true, reward: actual, storage_capacity: capacity };
  } finally { lock.releaseLock(); }
}

function startGameBuildingUpgrade(username, buildingKey) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(username); finalizeGameState_(player, Date.now());
    if (!Object.prototype.hasOwnProperty.call(GAME_BALANCE.BUILDINGS, String(buildingKey || ""))) return { success: false, message: "ไม่พบสิ่งก่อสร้างนี้" };
    var config = GAME_BALANCE.BUILDINGS[String(buildingKey)];
    if (player.upgrade) return { success: false, message: "มีงานก่อสร้างกำลังดำเนินอยู่" };
    var current = Number(player.buildings[buildingKey] || 0);
    var next = current + 1;
    if (next >= config.costs.length || !config.costs[next]) return { success: false, message: "สิ่งก่อสร้างถึงระดับสูงสุดแล้ว" };
    if (buildingKey !== "mainHouse" && next > player.house_level) return { success: false, message: "ต้องอัปเกรดบ้านหลักก่อน" };
    if (buildingKey === "fortress" && player.house_level < 2) return { success: false, message: "ป้อมปราการต้องการบ้านหลักระดับ 2" };
    if (!canAffordGameCost_(player, config.costs[next], 1)) return { success: false, message: "ทรัพยากรไม่เพียงพอ", required: config.costs[next], available: gameResourceSnapshot_(player) };
    var delta = applyGameCost_(player, config.costs[next], 1);
    var now = Date.now();
    player.upgrade = { buildingKey: buildingKey, targetLevel: next, startedAt: now, finishAt: now + Number(config.times[next] || 0) * 1000 };
    writeGamePlayer_(player); appendGameLedger_(player, "BUILDING_UPGRADE", delta, buildingKey + ":" + next + ":" + now, player.username);
    return { success: true, message: "เริ่มอัปเกรด " + config.name + " เป็นระดับ " + next, data: publicGamePlayer_(player) };
  } finally { lock.releaseLock(); }
}

function getUsedUnitCapacity_(player) {
  var used = 0;
  Object.keys(GAME_BALANCE.UNITS).forEach(function(key) { used += Number(player.units[key] || 0) * GAME_BALANCE.UNITS[key].space; });
  return used;
}

function getUnitCapacity_(player) {
  return 10 + (GAME_BALANCE.BUILDINGS.barracks.unitCapacity[player.buildings.barracks] || 0) + player.house_level * 5;
}

function purchaseGameUnits(username, unitKey, quantity) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  var qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { success: false, message: "จำนวนยูนิตไม่ถูกต้อง" };
  if (!Object.prototype.hasOwnProperty.call(GAME_BALANCE.UNITS, String(unitKey || ""))) return { success: false, message: "ไม่พบยูนิตนี้" };
  var config = GAME_BALANCE.UNITS[String(unitKey)];
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(username); finalizeGameState_(player, Date.now());
    var requiredBarracks = Number(config.requires.barracks || 0);
    if (Number(player.buildings.barracks || 0) < requiredBarracks) return { success: false, message: "ระดับค่ายทหารยังไม่ถึงเงื่อนไข" };
    if (getUsedUnitCapacity_(player) + config.space * qty > getUnitCapacity_(player)) return { success: false, message: "ความจุกองทัพไม่พอ" };
    if (!canAffordGameCost_(player, config.cost, qty)) return { success: false, message: "ทรัพยากรไม่เพียงพอ", required: config.cost, available: gameResourceSnapshot_(player) };
    var delta = applyGameCost_(player, config.cost, qty);
    player.units[unitKey] = Number(player.units[unitKey] || 0) + qty;
    writeGamePlayer_(player); appendGameLedger_(player, "UNIT_PURCHASE", delta, unitKey + ":" + Date.now(), player.username);
    return { success: true, message: "ซื้อ " + config.name + " x" + qty + " สำเร็จ", data: publicGamePlayer_(player), used_capacity: getUsedUnitCapacity_(player), unit_capacity: getUnitCapacity_(player) };
  } finally { lock.releaseLock(); }
}

function upgradeGameArmy(username) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(username); finalizeGameState_(player, Date.now());
    var current = Number(player.units.armyLevel || 1), next = current + 1;
    var cost = GAME_BALANCE.ARMY_UPGRADE_COSTS[next];
    if (!cost) return { success: false, message: "กองทัพถึงระดับสูงสุดแล้ว" };
    if (Number(player.buildings.blacksmith || 0) < next - 1) return { success: false, message: "ต้องอัปเกรดโรงตีเหล็กก่อน" };
    if (!canAffordGameCost_(player, cost, 1)) return { success: false, message: "ทรัพยากรไม่เพียงพอ", required: cost, available: gameResourceSnapshot_(player) };
    var delta = applyGameCost_(player, cost, 1); player.units.armyLevel = next;
    writeGamePlayer_(player); appendGameLedger_(player, "ARMY_UPGRADE", delta, "army:" + next, player.username);
    return { success: true, message: "กองทัพอัปเกรดเป็นระดับ " + next, data: publicGamePlayer_(player) };
  } finally { lock.releaseLock(); }
}

function convertGameCement(username, batches) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  var qty = Number(batches);
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { success: false, message: "จำนวนการผลิตไม่ถูกต้อง" };
  var cost = { sand: 100, coins: 100 };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(username); finalizeGameState_(player, Date.now());
    if (!canAffordGameCost_(player, cost, qty)) return { success: false, message: "ทรัพยากรไม่พอสำหรับผลิต Cement", required: cost, available: gameResourceSnapshot_(player) };
    var delta = applyGameCost_(player, cost, qty); player.cement += 10 * qty; delta.cement = 10 * qty;
    writeGamePlayer_(player); appendGameLedger_(player, "CEMENT_CONVERSION", delta, "cement:" + Date.now(), player.username);
    return { success: true, message: "ผลิต Cement " + (10 * qty) + " หน่วยสำเร็จ", data: publicGamePlayer_(player) };
  } finally { lock.releaseLock(); }
}

function getGameDefensePower_(player) {
  var total = 0;
  Object.keys(GAME_BALANCE.BUILDINGS).forEach(function(key) {
    var cfg = GAME_BALANCE.BUILDINGS[key], level = Number(player.buildings[key] || 0);
    total += Number((cfg.defense || [])[level] || 0);
  });
  var armyMultiplier = 1 + (Number(player.units.armyLevel || 1) - 1) * 0.08;
  Object.keys(GAME_BALANCE.UNITS).forEach(function(key) { total += Number(player.units[key] || 0) * GAME_BALANCE.UNITS[key].defense * armyMultiplier; });
  return Math.round(total);
}

function gameLootIndicator_(player) {
  var exposed = 0, protectedAmount = GAME_BALANCE.BUILDINGS.vault.protected[player.buildings.vault] || 0;
  ["coins", "wood", "stone", "brick", "sand", "cement"].forEach(function(key) { exposed += Math.max(0, Number(player[key] || 0) - protectedAmount); });
  if (exposed < 500) return "น้อย";
  if (exposed < 1500) return "ปานกลาง";
  if (exposed < 4000) return "มาก";
  return "มหาศาล";
}

function latestAttackAgainst_(attacker, defender) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_battles");
  var cursor = sheet.getLastRow(), cutoff = Date.now() - GAME_BALANCE.ATTACK_COOLDOWN_MS;
  while (cursor >= 2) {
    var start = Math.max(2, cursor - 199), rows = sheet.getRange(start, 1, cursor - start + 1, 12).getValues();
    for (var i = rows.length - 1; i >= 0; i--) {
      var attackedAt = new Date(rows[i][11]).getTime();
      if (attackedAt < cutoff) return 0;
      if (normalizeUsername_(rows[i][2]) === normalizeUsername_(attacker) && normalizeUsername_(rows[i][3]) === normalizeUsername_(defender)) return attackedAt;
    }
    cursor = start - 1;
  }
  return 0;
}

function recentGameAttackMap_(attacker, now) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_battles"), cursor = sheet.getLastRow();
  var cutoff = now - GAME_BALANCE.ATTACK_COOLDOWN_MS, map = {}, target = normalizeUsername_(attacker), done = false;
  while (cursor >= 2 && !done) {
    var start = Math.max(2, cursor - 199), rows = sheet.getRange(start, 1, cursor - start + 1, 12).getValues();
    for (var i = rows.length - 1; i >= 0; i--) {
      var attackedAt = new Date(rows[i][11]).getTime();
      if (attackedAt < cutoff) { done = true; break; }
      if (normalizeUsername_(rows[i][2]) === target) {
        var defender = normalizeUsername_(rows[i][3]);
        if (!map[defender]) map[defender] = attackedAt;
      }
    }
    cursor = start - 1;
  }
  return map;
}

function activeGameShieldUntil_(player) {
  return Math.max(new Date(player.shield_until || 0).getTime() || 0, new Date(player.beginner_shield_until || 0).getTime() || 0);
}

function getGameTargetAvailability_(attacker, defender, now, recentAttackMap) {
  if (attacker.username === defender.username) return { ok: false, code: "SELF", message: "โจมตีตัวเองไม่ได้" };
  if (Math.abs(attacker.house_level - defender.house_level) > GAME_BALANCE.LEVEL_RANGE) return { ok: false, code: "LEVEL_RANGE", message: "ระดับบ้านห่างเกินไป" };
  var shield = activeGameShieldUntil_(defender);
  if (shield > now) return { ok: false, code: "SHIELD", message: "เป้าหมายอยู่ภายใต้ Shield", available_at: new Date(shield).toISOString() };
  var last = recentAttackMap ? Number(recentAttackMap[defender.username] || 0) : latestAttackAgainst_(attacker.username, defender.username);
  if (last && now - last < GAME_BALANCE.ATTACK_COOLDOWN_MS) return { ok: false, code: "COOLDOWN", message: "โจมตีผู้เล่นนี้แล้วภายใน 24 ชั่วโมง", available_at: new Date(last + GAME_BALANCE.ATTACK_COOLDOWN_MS).toISOString() };
  return { ok: true };
}

function getGameTargets(username) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var attacker = ensureGamePlayer_(username); finalizeGameState_(attacker, Date.now()); writeGamePlayer_(attacker);
    var rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_players").getDataRange().getValues();
    var targets = [], now = Date.now(), recentAttackMap = recentGameAttackMap_(attacker.username, now);
    for (var i = 1; i < rows.length; i++) {
      var p = gameRowToPlayer_(rows[i], i + 1); finalizeGameState_(p, now);
      if (p.username === attacker.username || Math.abs(p.house_level - attacker.house_level) > GAME_BALANCE.LEVEL_RANGE) continue;
      var availability = getGameTargetAvailability_(attacker, p, now, recentAttackMap);
      targets.push({ username: p.username, nickname: p.nickname, house_level: p.house_level, trophy: p.trophy,
        defense_estimate: Math.round(getGameDefensePower_(p) / 50) * 50, loot_indicator: gameLootIndicator_(p), availability: availability });
    }
    targets.sort(function(a, b) { return a.availability.ok === b.availability.ok ? b.trophy - a.trophy : (a.availability.ok ? -1 : 1); });
    return { success: true, data: targets.slice(0, 50) };
  } finally { lock.releaseLock(); }
}

function scoutGameTarget(username, targetUsername) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var attacker = ensureGamePlayer_(username), defender = findGamePlayer_(targetUsername), now = Date.now();
    if (!defender) return { success: false, message: "ไม่พบเป้าหมาย" };
    finalizeGameState_(attacker, now); finalizeGameState_(defender, now);
    var availability = getGameTargetAvailability_(attacker, defender, now);
    if (!availability.ok) return { success: false, code: availability.code, message: availability.message, available_at: availability.available_at };
    var protectedAmount = GAME_BALANCE.BUILDINGS.vault.protected[defender.buildings.vault] || 0, exposed = {};
    ["coins", "wood", "stone", "brick", "sand", "cement"].forEach(function(key) { exposed[key] = Math.round(Math.max(0, defender[key] - protectedAmount) * GAME_BALANCE.MAX_LOOT_PERCENT / 50) * 50; });
    return { success: true, data: { username: defender.username, nickname: defender.nickname, house_level: defender.house_level,
      defense_estimate: Math.round(getGameDefensePower_(defender) / 25) * 25,
      army_hint: { infantry: defender.units.infantry > 0 ? "มี" : "ไม่มี", archer: defender.units.archer > 0 ? "มี" : "ไม่มี", cavalry: defender.units.cavalry > 0 ? "มี" : "ไม่มี" },
      loot_estimate: exposed } };
  } finally { lock.releaseLock(); }
}

function normalizeAttackArmy_(army, player) {
  var clean = {}, total = 0, valid = true;
  Object.keys(GAME_BALANCE.UNITS).forEach(function(key) {
    var qty = Number(army && army[key] || 0);
    if (!Number.isInteger(qty) || qty < 0 || qty > Number(player.units[key] || 0)) valid = false;
    clean[key] = qty; total += qty;
  });
  return valid && total > 0 ? clean : null;
}

function getGameAttackPower_(army, attacker, defender) {
  var defenderCombatTotal = Number(defender.units.infantry || 0) + Number(defender.units.archer || 0) + Number(defender.units.cavalry || 0);
  var total = 0, levelMultiplier = 1 + (Number(attacker.units.armyLevel || 1) - 1) * 0.10;
  Object.keys(GAME_BALANCE.UNITS).forEach(function(key) {
    var cfg = GAME_BALANCE.UNITS[key], power = Number(army[key] || 0) * cfg.attack;
    if (cfg.counters && defenderCombatTotal > 0) power *= 1 + (Number(defender.units[cfg.counters] || 0) / defenderCombatTotal) * (GAME_BALANCE.COUNTER_MULTIPLIER - 1);
    total += power;
  });
  var wallPower = GAME_BALANCE.BUILDINGS.wall.defense[defender.buildings.wall] || 0;
  var fortPower = GAME_BALANCE.BUILDINGS.fortress.defense[defender.buildings.fortress] || 0;
  total += Math.min(wallPower * 0.4, Number(army.ram || 0) * 35) + Math.min((wallPower + fortPower) * 0.4, Number(army.catapult || 0) * 50);
  return Math.round(total * levelMultiplier);
}

function calculateGameLoot_(attacker, defender) {
  var protectedAmount = GAME_BALANCE.BUILDINGS.vault.protected[defender.buildings.vault] || 0;
  var diff = defender.house_level - attacker.house_level;
  var modifier = GAME_BALANCE.LOOT_LEVEL_MODIFIERS[String(diff)] || 1;
  var loot = {};
  ["coins", "wood", "stone", "brick", "sand", "cement"].forEach(function(key) {
    loot[key] = Math.max(0, Math.min(defender[key], Math.floor(Math.max(0, defender[key] - protectedAmount) * GAME_BALANCE.MAX_LOOT_PERCENT * modifier)));
  });
  return loot;
}

function attackGameTarget(username, targetUsername, army, requestId) {
  if (!isGameEnabled_()) return { success: false, message: "ระบบเกมปิดอยู่" };
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(String(requestId || ""))) return { success: false, message: "คำขอโจมตีไม่ถูกต้อง" };
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), battles = ss.getSheetByName("game_battles");
    if (findExactGameValueRow_(battles, 2, String(requestId))) return { success: false, code: "REPLAY", message: "คำขอโจมตีนี้ถูกประมวลผลแล้ว" };
    var attacker = ensureGamePlayer_(username), defender = findGamePlayer_(targetUsername), now = Date.now();
    if (!defender) return { success: false, message: "ไม่พบเป้าหมาย" };
    finalizeGameState_(attacker, now); finalizeGameState_(defender, now);
    if (attacker.energy < 1) return { success: false, code: "NO_ENERGY", message: "พลังโจมตีหมด" };
    var availability = getGameTargetAvailability_(attacker, defender, now);
    if (!availability.ok) return { success: false, code: availability.code, message: availability.message, available_at: availability.available_at };
    var cleanArmy = normalizeAttackArmy_(army, attacker);
    if (!cleanArmy) return { success: false, message: "กองทัพที่เลือกไม่ถูกต้อง" };
    var attackPower = getGameAttackPower_(cleanArmy, attacker, defender), defensePower = getGameDefensePower_(defender);
    var won = attackPower > defensePower, loot = { coins: 0, wood: 0, stone: 0, brick: 0, sand: 0, cement: 0 };
    attacker.energy -= 1; attacker.last_energy_update = new Date(now).toISOString(); attacker.shield_until = ""; attacker.beginner_shield_until = "";
    var trophyDelta = won ? GAME_BALANCE.TROPHY_WIN : -GAME_BALANCE.TROPHY_LOSS;
    attacker.trophy = Math.max(0, attacker.trophy + trophyDelta);
    if (won) {
      loot = calculateGameLoot_(attacker, defender);
      Object.keys(loot).forEach(function(key) { defender[key] = Math.max(0, defender[key] - loot[key]); attacker[key] += loot[key]; });
      defender.shield_until = new Date(now + GAME_BALANCE.SHIELD_MS).toISOString();
      appendGameLedger_(attacker, "ATTACK_LOOT_GAIN", loot, String(requestId), attacker.username);
      var loss = {}; Object.keys(loot).forEach(function(key) { loss[key] = -loot[key]; });
      appendGameLedger_(defender, "ATTACK_LOOT_LOSS", loss, String(requestId), attacker.username);
    }
    writeGamePlayer_(attacker); writeGamePlayer_(defender);
    var battleId = Utilities.getUuid(), attackedAt = new Date(now).toISOString();
    battles.appendRow([battleId, String(requestId), attacker.username, defender.username, won ? "win" : "loss", attackPower, defensePower, JSON.stringify(cleanArmy), JSON.stringify(defender.units), JSON.stringify(loot), trophyDelta, attackedAt]);
    return { success: true, data: { id: battleId, outcome: won ? "win" : "loss", attack_power: attackPower, defense_power: defensePower, loot: loot, trophy_delta: trophyDelta, energy: attacker.energy, attacked_at: attackedAt } };
  } finally { lock.releaseLock(); }
}

function getGameHistory(username, limit) {
  ensureGameSheets_(SpreadsheetApp.getActiveSpreadsheet());
  var safeLimit = Math.max(1, Math.min(20, Number(limit) || 20)), target = normalizeUsername_(username);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_battles"), cursor = sheet.getLastRow(), result = [];
  while (cursor >= 2 && result.length < safeLimit) {
    var start = Math.max(2, cursor - 199), rows = sheet.getRange(start, 1, cursor - start + 1, 12).getValues();
    for (var i = rows.length - 1; i >= 0 && result.length < safeLimit; i--) {
      if (normalizeUsername_(rows[i][2]) !== target && normalizeUsername_(rows[i][3]) !== target) continue;
      result.push({ id: rows[i][0], attacker: rows[i][2], defender: rows[i][3], outcome: rows[i][4], attack_power: rows[i][5], defense_power: rows[i][6],
        loot: safeGameJson_(rows[i][9], {}), trophy_delta: rows[i][10], attacked_at: rows[i][11], perspective: normalizeUsername_(rows[i][2]) === target ? "attack" : "defense" });
    }
    cursor = start - 1;
  }
  return { success: true, data: result };
}

function getGameLeaderboard(username) {
  ensureGameSheets_(SpreadsheetApp.getActiveSpreadsheet());
  var rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_players").getDataRange().getValues(), result = [];
  for (var i = 1; i < rows.length; i++) {
    var p = gameRowToPlayer_(rows[i], i + 1);
    result.push({
      username: p.username,
      nickname: p.nickname,
      house_level: p.house_level,
      trophy: p.trophy,
      defense_power: getGameDefensePower_(p),
      buildings: p.buildings,
      is_current_player: p.username === normalizeUsername_(username)
    });
  }
  result.sort(function(a, b) { return b.trophy - a.trophy || b.house_level - a.house_level || a.nickname.localeCompare(b.nickname); });
  return { success: true, data: result.slice(0, 100), current_username: normalizeUsername_(username) };
}

function getGameAdminData(username) {
  ensureGameSheets_(SpreadsheetApp.getActiveSpreadsheet());
  var rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_players").getDataRange().getValues(), players = [];
  for (var i = 1; i < rows.length; i++) {
    var p = gameRowToPlayer_(rows[i], i + 1);
    players.push({ username: p.username, nickname: p.nickname, house_level: p.house_level, trophy: p.trophy, resources: gameResourceSnapshot_(p), last_active: p.last_active });
  }
  players.sort(function(a, b) { return b.trophy - a.trophy; });
  return { success: true, data: { enabled: isGameEnabled_(), start_date: getGameSetting_("game_start_date", GAME_BALANCE.START_DATE), players: players } };
}

function setGameSetting_(key, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("game_settings"), values = sheet.getDataRange().getValues(), now = new Date().toISOString();
  for (var i = 1; i < values.length; i++) if (String(values[i][0]) === key) { sheet.getRange(i + 1, 2, 1, 2).setValues([[String(value), now]]); return; }
  sheet.appendRow([key, String(value), now]);
}

function setGameEnabled(username, enabled) {
  var value = enabled === true || enabled === "true";
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { ensureGameSheets_(SpreadsheetApp.getActiveSpreadsheet()); setGameSetting_("game_enabled", value ? "true" : "false"); return { success: true, message: value ? "เปิดระบบเกมแล้ว" : "ปิดระบบเกมแล้ว", enabled: value }; }
  finally { lock.releaseLock(); }
}

function adjustGameResources(username, targetUsername, delta, reason) {
  var allowed = ["coins", "wood", "stone", "brick", "sand", "cement"], clean = {}, hasChange = false;
  if (!delta || typeof delta !== "object" || String(reason || "").trim().length < 3) return { success: false, message: "กรุณาระบุจำนวนและเหตุผล" };
  for (var i = 0; i < allowed.length; i++) {
    var key = allowed[i], value = Number(delta[key] || 0);
    if (!Number.isInteger(value) || Math.abs(value) > 1000000) return { success: false, message: "จำนวนทรัพยากรไม่ถูกต้อง" };
    clean[key] = value; if (value !== 0) hasChange = true;
  }
  if (!hasChange) return { success: false, message: "ไม่มีรายการเปลี่ยนแปลง" };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var player = ensureGamePlayer_(targetUsername);
    for (var j = 0; j < allowed.length; j++) { var k = allowed[j]; if (player[k] + clean[k] < 0) return { success: false, message: "ทรัพยากรของผู้เล่นจะติดลบ" }; }
    allowed.forEach(function(k) { player[k] += clean[k]; }); writeGamePlayer_(player);
    appendGameLedger_(player, "ADMIN_ADJUSTMENT", clean, "admin:" + Date.now(), normalizeUsername_(username) + ":" + String(reason).trim());
    return { success: true, message: "ปรับทรัพยากรสำเร็จ", data: gameResourceSnapshot_(player) };
  } finally { lock.releaseLock(); }
}

function resetGameProfile(username, targetUsername) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var old = findGamePlayer_(targetUsername);
    if (!old) return { success: false, message: "ผู้เล่นยังไม่มีโปรไฟล์เกม" };
    var fresh = createGamePlayerObject_(old.username, old.nickname, Date.now()); fresh._row = old._row; writeGamePlayer_(fresh);
    appendGameLedger_(fresh, "ADMIN_RESET", gameResourceSnapshot_(fresh), "reset:" + Date.now(), normalizeUsername_(username));
    return { success: true, message: "รีเซ็ตโปรไฟล์เกมแล้ว โดยไม่กระทบบัญชีหรือคะแนนสอบ" };
  } finally { lock.releaseLock(); }
}
