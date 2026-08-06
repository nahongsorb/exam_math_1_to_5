// App State
let currentUser = null; // Format: { username, nickname }
let studentScores = {}; // Format: { setNumber: { score, category_scores, timestamp } }
let currentSetNumber = 1;
let currentQuestionIndex = 0;
const userAnswers = {}; // Format: { questionId: optionKey }
let skillsChartInstance = null; // Global Chart.js instance
let countdownInterval = null;
const DEV_MODE_ENABLED = false;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

// Developer & Sync Settings
let sheetUrl = "https://script.google.com/macros/s/AKfycbyxX3ZyCO8y7SRVvJlsYveNjwCkORDnVBdUVc2efYP6oSGtPM5M3aZS0sUK1XvjJYSs/exec";
let bypassLock = false;

// DOM Screens
const loginScreen = document.getElementById("login-screen");
const registerScreen = document.getElementById("register-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");

// DOM Elements - Auth
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");
const btnLogin = document.getElementById("btn-login");
const linkGoRegister = document.getElementById("link-go-register");

const regNicknameInput = document.getElementById("reg-nickname");
const regUsernameInput = document.getElementById("reg-username");
const regPasswordInput = document.getElementById("reg-password");
const btnRegister = document.getElementById("btn-register");
const linkGoLogin = document.getElementById("link-go-login");

// DOM Elements - Dashboard
const dashNickname = document.getElementById("dash-nickname");
const completedSetsCount = document.getElementById("completed-sets-count");
const totalScoreCount = document.getElementById("total-score-count");
const btnShowLeaderboard = document.getElementById("btn-show-leaderboard");
const btnLogout = document.getElementById("btn-logout");
const dashboardLockWarning = document.getElementById("dashboard-lock-warning");
const lockCountdown = document.getElementById("lock-countdown");
const setsGrid = document.getElementById("sets-grid");

// DOM Elements - Quiz
const studentBadgeName = document.getElementById("student-badge-name");
const quizSetBadge = document.getElementById("quiz-set-badge");
const progressCounter = document.getElementById("progress-counter");
const progressBar = document.getElementById("progress-bar");
const questionText = document.getElementById("question-text");
const optionsGrid = document.getElementById("options-grid");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const questionNavBar = document.getElementById("question-nav-bar");

// DOM Elements - Results
const resultCongrats = document.getElementById("result-congrats");
const scoreCircleProgress = document.getElementById("score-circle-progress");
const scoreNumber = document.getElementById("score-number");
const badgeAward = document.getElementById("badge-award");
const analysisContainer = document.getElementById("analysis-container");
const wrongQuestionsList = document.getElementById("wrong-questions-list");
const weaknessBullets = document.getElementById("weakness-bullets");
const btnBackDashboard = document.getElementById("btn-back-dashboard");

// DOM Elements - Leaderboard
const leaderboardRows = document.getElementById("leaderboard-rows");
const leaderboardLoading = document.getElementById("leaderboard-loading");

// DOM Elements - Dev Drawer
const devDrawer = document.getElementById("dev-drawer");
const btnToggleDev = document.getElementById("btn-toggle-dev");
const devSheetUrlInput = document.getElementById("dev-sheet-url");
const devBypassLockInput = document.getElementById("dev-bypass-lock");
const btnDevSave = document.getElementById("btn-dev-save");
const btnDevClear = document.getElementById("btn-dev-clear");

// Initialize Mock Data in LocalStorage if not exists (starts empty)
if (!localStorage.getItem("mock_users")) {
  localStorage.setItem("mock_users", JSON.stringify([]));
}
if (!localStorage.getItem("mock_scores")) {
  localStorage.setItem("mock_scores", JSON.stringify([]));
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  // Load dev settings
  const savedSheetUrl = DEV_MODE_ENABLED ? localStorage.getItem("dev_sheet_url") : null;
  if (DEV_MODE_ENABLED && savedSheetUrl) {
    sheetUrl = savedSheetUrl;
  }
  bypassLock = DEV_MODE_ENABLED && localStorage.getItem("dev_bypass_lock") === "true";
  
  if (devSheetUrlInput) devSheetUrlInput.value = sheetUrl;
  if (devBypassLockInput) devBypassLockInput.checked = bypassLock;

  // Setup Event Listeners
  if (DEV_MODE_ENABLED) {
    btnToggleDev.addEventListener("click", () => devDrawer.classList.toggle("active"));
    btnDevSave.addEventListener("click", saveDevSettings);
    btnDevClear.addEventListener("click", clearLocalCache);
  } else if (devDrawer) {
    devDrawer.remove();
  }

  linkGoRegister.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(registerScreen);
  });
  linkGoLogin.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(loginScreen);
  });

  btnLogin.addEventListener("click", loginStudent);
  btnRegister.addEventListener("click", registerStudent);

  btnLogout.addEventListener("click", logoutStudent);
  btnShowLeaderboard.addEventListener("click", () => {
    const section = document.querySelector(".leaderboard-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  });

  btnPrev.addEventListener("click", prevQuestion);
  btnNext.addEventListener("click", nextQuestion);
  btnBackDashboard.addEventListener("click", goBackDashboard);

  // Enable Keyboard Enter triggers
  loginPasswordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") loginStudent(); });
  regPasswordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") registerStudent(); });

  // Developer settings are disabled in production.
  let devClicks = 0;
  const triggerDevMode = () => {
    devClicks++;
    if (devClicks >= 5) {
      devDrawer.style.display = "block";
      setTimeout(() => {
        devDrawer.classList.add("active");
      }, 50);
      alert("🔓 เปิดโหมดตั้งค่าสำหรับผู้พัฒนาและครูผู้สอนแล้ว!");
      devClicks = 0;
    }
  };
  if (DEV_MODE_ENABLED) {
    document.querySelectorAll(".logo-img, .user-greeting").forEach(el => el.addEventListener("click", triggerDevMode));
  }

  // Auto-login if user is remembered
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    try { currentUser = JSON.parse(savedUser); } catch (e) { currentUser = null; }
    if (!currentUser || !currentUser.token) {
      currentUser = null;
      localStorage.removeItem("currentUser");
    }
  }
  if (currentUser) {
    
    // Load local cache scores
    const cachedScores = localStorage.getItem(`scores_${currentUser.username}`);
    if (cachedScores) {
      try { studentScores = JSON.parse(cachedScores) || {}; } catch (e) { studentScores = {}; }
    }
    
    // Sync with sheet if online
    syncUserProgressFromSheet();
    
    showScreen(dashboardScreen);
    renderDashboard();
  } else {
    showScreen(loginScreen);
  }
});

// Switch Screen Helper
function showScreen(screenToShow) {
  loginScreen.classList.remove("active");
  registerScreen.classList.remove("active");
  dashboardScreen.classList.remove("active");
  quizScreen.classList.remove("active");
  resultsScreen.classList.remove("active");

  screenToShow.classList.add("active");
}

// --- DEVELOPER MODE CONTROLS ---
function saveDevSettings() {
  sheetUrl = devSheetUrlInput.value.trim();
  bypassLock = devBypassLockInput.checked;

  localStorage.setItem("dev_sheet_url", sheetUrl);
  localStorage.setItem("dev_bypass_lock", bypassLock ? "true" : "false");

  alert("บันทึกการตั้งค่าผู้พัฒนาเรียบร้อยแล้ว!");
  devDrawer.classList.remove("active");
  
  if (currentUser) {
    syncUserProgressFromSheet();
  }
}

function clearLocalCache() {
  if (confirm("คุณต้องการล้างข้อมูลในเบราว์เซอร์ทั้งหมดใช่หรือไม่? (ล้างความก้าวหน้าและการตั้งค่า URL ทั้งหมด)")) {
    localStorage.clear();
    alert("ล้างข้อมูลเรียบร้อยแล้ว ระบบจะโหลดหน้าจอใหม่");
    window.location.reload();
  }
}

// --- AUTHENTICATION LOGIC ---

// Student Login
async function loginStudent() {
  const username = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;

  if (!username || !password) {
    alert("กรุณากรอก Username และ Password ให้ครบถ้วนนะลูก!");
    return;
  }

  setLoading(btnLogin, true, "กำลังตรวจสอบข้อมูล...");

  // Try Online Login first if sheetUrl is configured
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "login", username, password })
      });
      
      const data = await response.json();
      if (data.success) {
        currentUser = { username: data.user.username, nickname: data.user.nickname, token: data.token };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        
        // Save retrieved scores
        studentScores = {};
        data.scores.forEach(s => {
          studentScores[s.set_number] = {
            score: s.score,
            category_scores: s.category_scores,
            timestamp: s.timestamp
          };
        });
        localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
        
        loginUsernameInput.value = "";
        loginPasswordInput.value = "";
        setLoading(btnLogin, false);
        showScreen(dashboardScreen);
        renderDashboard();
        return;
      } else {
        alert("ข้อผิดพลาด: " + data.message);
        setLoading(btnLogin, false);
        return;
      }
    } catch (e) {
      console.warn("Sheet Connection failed, falling back to Offline local storage", e);
    }
  }

  // --- OFFLINE FALLBACK LOGIN ---
  const mockUsers = JSON.parse(localStorage.getItem("mock_users"));
  const userExists = mockUsers.find(u => u.username === username);
  
  if (userExists) {
    // Strictly verify password in offline mode
    if (userExists.password && userExists.password !== password) {
      alert("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้งนะลูก!");
      setLoading(btnLogin, false);
      return;
    }
    
    currentUser = { username: username, nickname: userExists.nickname, token: "offline" };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    
    // Load local score cache
    const cachedScores = localStorage.getItem(`scores_${currentUser.username}`);
    if (cachedScores) {
      studentScores = JSON.parse(cachedScores);
    } else {
      // Import existing scores from mock_scores if any
      const mockScores = JSON.parse(localStorage.getItem("mock_scores"));
      studentScores = {};
      mockScores.forEach(s => {
        if (s.username === username) {
          studentScores[s.set_number] = {
            score: s.score,
            category_scores: {}, // default blank for mock
            timestamp: s.timestamp
          };
        }
      });
      localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
    }
    
    loginUsernameInput.value = "";
    loginPasswordInput.value = "";
    setLoading(btnLogin, false);
    showScreen(dashboardScreen);
    renderDashboard();
  } else {
    alert("ไม่พบชื่อผู้ใช้นี้ หรือระบบเครือข่ายออฟไลน์ กรุณาสมัครสมาชิกก่อนใช้นะครับ!");
    setLoading(btnLogin, false);
  }
}

// Student Registration
async function registerStudent() {
  const nickname = regNicknameInput.value.trim();
  const username = regUsernameInput.value.trim().toLowerCase();
  const password = regPasswordInput.value;

  if (password.length < 8) {
    alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    return;
  }

  if (!nickname || !username || !password) {
    alert("กรอกข้อมูลการสมัครสมาชิกให้ครบถ้วนก่อนนะลูก!");
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    alert("Username ต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้นครับ!");
    return;
  }

  setLoading(btnRegister, true, "กำลังสมัครสมาชิก...");

  // Try Online Registration if sheetUrl is configured
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "register", username, password, nickname })
      });
      
      const data = await response.json();
      if (data.success) {
    currentUser = { username: data.user.username, nickname: data.user.nickname, token: data.token };
        studentScores = {};
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
        
        regNicknameInput.value = "";
        regUsernameInput.value = "";
        regPasswordInput.value = "";
        setLoading(btnRegister, false);
        alert("สมัครสมาชิกและเข้าสู่ระบบออนไลน์เรียบร้อยแล้ว!");
        showScreen(dashboardScreen);
        renderDashboard();
        return;
      } else {
        alert("สมัครสมาชิกไม่สำเร็จ: " + data.message);
        setLoading(btnRegister, false);
        return;
      }
    } catch (e) {
      console.warn("Sheet Connection failed, falling back to Offline registration", e);
    }
  }

  // --- OFFLINE REGISTRATION FALLBACK ---
  const mockUsers = JSON.parse(localStorage.getItem("mock_users"));
  const userExists = mockUsers.find(u => u.username === username);
  
  if (userExists) {
    alert("ชื่อผู้ใช้นี้ (Username) ถูกใช้งานแล้ว กรุณาตั้งชื่ออื่นนะลูก!");
    setLoading(btnRegister, false);
    return;
  }

  // Create new user locally
  const newUser = { username, nickname, password };
  mockUsers.push(newUser);
  localStorage.setItem("mock_users", JSON.stringify(mockUsers));
  
  currentUser = { username: newUser.username, nickname: newUser.nickname, password: password };
  studentScores = {};
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
  
  regNicknameInput.value = "";
  regUsernameInput.value = "";
  regPasswordInput.value = "";
  setLoading(btnRegister, false);
  alert("สมัครสมาชิกออฟไลน์สำเร็จ! (ข้อมูลจะถูกเก็บไว้ที่เครื่องนี้)");
  showScreen(dashboardScreen);
  renderDashboard();
}

// Sync Progress from Google Sheets (non-blocking)
async function syncUserProgressFromSheet() {
  if (!sheetUrl || !currentUser) return;
  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "session", token: currentUser.token })
    });
    const data = await response.json();
    if (data.success) {
      studentScores = {};
      data.scores.forEach(s => {
        studentScores[s.set_number] = {
          score: s.score,
          category_scores: s.category_scores,
          timestamp: s.timestamp
        };
      });
      localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
      await flushPendingScores();
      renderDashboard();
    } else if (data.message && /session|unauthorized/i.test(data.message)) {
      currentUser = null;
      localStorage.removeItem("currentUser");
      showScreen(loginScreen);
    }
  } catch (e) {
    console.warn("Background sync failed: ", e);
  }
}

function queuePendingScore(scorePayload) {
  if (!currentUser) return;
  const key = `pending_scores_${currentUser.username}`;
  let pending = [];
  try { pending = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { pending = []; }
  const index = pending.findIndex(item => item.set_number === scorePayload.set_number);
  if (index >= 0) pending[index] = scorePayload;
  else pending.push(scorePayload);
  localStorage.setItem(key, JSON.stringify(pending));
}

async function flushPendingScores() {
  if (!currentUser || !sheetUrl) return;
  const key = `pending_scores_${currentUser.username}`;
  let pending = [];
  try { pending = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { pending = []; }
  if (!pending.length) return;

  const remaining = [];
  for (const item of pending) {
    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "saveScore", token: currentUser.token, ...item })
      });
      const result = response.ok ? await response.json() : null;
      if (!result || !result.success) remaining.push(item);
    } catch (e) {
      remaining.push(item);
    }
  }

  if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
  else localStorage.removeItem(key);
}

// Logout
function logoutStudent() {
  if (confirm("น้องต้องการออกจากระบบใช่หรือไม่?")) {
    clearInterval(countdownInterval);
    currentUser = null;
    studentScores = {};
    localStorage.removeItem("currentUser");
    showScreen(loginScreen);
  }
}

// Loading indicator helper
function setLoading(button, isLoading, text = "") {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
  }
}


// --- DASHBOARD LOGIC ---

function renderDashboard() {
  dashNickname.textContent = currentUser.nickname;
  
  // Calculate completed count and total score
  let completedCount = 0;
  let totalScore = 0;
  for (let setNum in studentScores) {
    completedCount++;
    totalScore += studentScores[setNum].score;
  }
  
  completedSetsCount.textContent = completedCount;
  totalScoreCount.textContent = totalScore;

  // Check Daily Lock status
  // 1 set per calendar day (midnight based)
  let todayDone = false;
  let lastExamTime = null;

  for (let setNum in studentScores) {
    const scoreObj = studentScores[setNum];
    if (scoreObj.timestamp) {
      const examDate = new Date(scoreObj.timestamp);
      const today = new Date();
      if (examDate.getDate() === today.getDate() &&
          examDate.getMonth() === today.getMonth() &&
          examDate.getFullYear() === today.getFullYear()) {
        todayDone = true;
        if (!lastExamTime || examDate > lastExamTime) {
          lastExamTime = examDate;
        }
      }
    }
  }

  // Setup countdown to midnight if today is completed
  clearInterval(countdownInterval);
  if (todayDone && !bypassLock) {
    dashboardLockWarning.style.display = "flex";
    updateLockCountdown();
    countdownInterval = setInterval(updateLockCountdown, 1000);
  } else {
    dashboardLockWarning.style.display = "none";
  }

  // Render Sets Grid
  setsGrid.innerHTML = "";
  
  // The next uncompleted set is the only playable one (if not locked)
  let foundFirstUncompleted = false;

  for (let i = 1; i <= 20; i++) {
    const card = document.createElement("div");
    card.className = "set-card";

    const numDiv = document.createElement("div");
    numDiv.className = "set-num";
    numDiv.textContent = `ชุดที่ ${i}`;
    card.appendChild(numDiv);

    if (studentScores[i] !== undefined) {
      // COMPLETED SET
      card.classList.add("completed");
      
      const statusDiv = document.createElement("div");
      statusDiv.className = "set-status";
      statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> ทำแล้ว`;
      card.appendChild(statusDiv);

      const scoreDiv = document.createElement("div");
      scoreDiv.className = "set-score";
      scoreDiv.textContent = `${studentScores[i].score}/10 คะแนน`;
      card.appendChild(scoreDiv);

      // Completed set is clickable to view solutions
      card.addEventListener("click", () => viewExplanationsOnly(i));

    } else if (!foundFirstUncompleted && (!todayDone || bypassLock)) {
      // AVAILABLE SET TO PLAY
      card.classList.add("available");
      foundFirstUncompleted = true;

      const statusDiv = document.createElement("div");
      statusDiv.className = "set-status";
      statusDiv.innerHTML = `<i class="fas fa-play-circle"></i> พร้อมสอบ`;
      card.appendChild(statusDiv);
      
      card.addEventListener("click", () => startSetQuiz(i));
      
    } else {
      // LOCKED SET
      card.classList.add("locked");
      
      const statusDiv = document.createElement("div");
      statusDiv.className = "set-status";
      statusDiv.innerHTML = `<i class="fas fa-lock"></i> ล็อกอยู่`;
      card.appendChild(statusDiv);

      card.addEventListener("click", () => {
        if (todayDone) {
          alert("วันนี้ลูกทำข้อสอบไป 1 ชุดแล้วครับ พรุ่งนี้ค่อยกลับมาทำชุดต่อไปเพื่อความก้าวหน้าที่สม่ำเสมอนะครับ! 🌟");
        } else {
          alert("กรุณาทำข้อสอบเรียงตามลำดับ ชุดก่อนหน้านี้ยังทำไม่เสร็จเลยครับคนเก่ง!");
        }
      });
    }

    setsGrid.appendChild(card);
  }
  
  // Load leaderboard automatically in the embedded section
  openLeaderboard();
}

// Countdown timer to midnight helper
function updateLockCountdown() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = midnight - now;

  if (diffMs <= 0) {
    clearInterval(countdownInterval);
    dashboardLockWarning.style.display = "none";
    renderDashboard();
    return;
  }

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  const pad = (n) => n.toString().padStart(2, "0");
  lockCountdown.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}


// --- QUIZ GAME LOGIC ---

function startSetQuiz(setNumber) {
  currentSetNumber = setNumber;
  currentQuestionIndex = 0;
  
  // Clear previous answers
  for (let key in userAnswers) {
    delete userAnswers[key];
  }

  studentBadgeName.textContent = currentUser.nickname;
  quizSetBadge.textContent = `ชุดที่ ${currentSetNumber}`;
  
  showScreen(quizScreen);
  renderQuestion();
}

function renderQuestion() {
  const currentQuestion = examSets[currentSetNumber][currentQuestionIndex];
  
  // Update progress bar and counter
  const totalQuestions = 10;
  const answeredCount = Object.keys(userAnswers).length;
  progressCounter.textContent = `ข้อที่ ${currentQuestionIndex + 1} จาก ${totalQuestions} (ตอบแล้ว ${answeredCount} ข้อ)`;
  progressBar.style.width = `${(answeredCount / totalQuestions) * 100}%`;

  // Render question text
  questionText.innerHTML = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;

  // Render options list
  optionsGrid.innerHTML = "";
  const prefixes = { a: "ก", b: "ข", c: "ค", d: "ง" };

  Object.entries(currentQuestion.options).forEach(([key, value]) => {
    const card = document.createElement("div");
    card.className = "option-card";
    if (userAnswers[currentQuestion.id] === key) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <div class="option-prefix">${prefixes[key]}</div>
      <div class="option-text">${value}</div>
    `;

    card.addEventListener("click", () => selectOption(currentQuestion.id, key));
    optionsGrid.appendChild(card);
  });

  // Update navigation buttons
  if (currentQuestionIndex === 0) {
    btnPrev.style.visibility = "hidden";
  } else {
    btnPrev.style.visibility = "visible";
  }

  if (currentQuestionIndex === totalQuestions - 1) {
    btnNext.innerHTML = `ส่งข้อสอบ <i class="fas fa-paper-plane"></i>`;
    btnNext.style.backgroundColor = "var(--success)";
  } else {
    btnNext.innerHTML = `ข้อถัดไป <i class="fas fa-chevron-right"></i>`;
    btnNext.style.backgroundColor = "var(--primary)";
  }

  // Render question navigation bar
  renderQuestionNavBar();

  // Trigger KaTeX rendering
  triggerMathRendering(quizScreen);
}

function renderQuestionNavBar() {
  if (!questionNavBar) return;
  questionNavBar.innerHTML = "";
  const currentQuestions = examSets[currentSetNumber];
  
  currentQuestions.forEach((q, index) => {
    const btn = document.createElement("div");
    btn.className = "nav-btn";
    btn.textContent = index + 1;
    
    if (index === currentQuestionIndex) {
      btn.classList.add("active");
    } else if (userAnswers[q.id]) {
      btn.classList.add("answered");
    }
    
    btn.addEventListener("click", () => {
      currentQuestionIndex = index;
      renderQuestion();
    });
    
    questionNavBar.appendChild(btn);
  });
}

function selectOption(questionId, optionKey) {
  userAnswers[questionId] = optionKey;
  
  // Re-render selected style
  const cards = optionsGrid.querySelectorAll(".option-card");
  const prefixes = ["a", "b", "c", "d"];
  
  cards.forEach((card, index) => {
    if (prefixes[index] === optionKey) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  renderQuestionNavBar();
  
  // Update progress counter text
  const totalQuestions = 10;
  const answeredCount = Object.keys(userAnswers).length;
  progressCounter.textContent = `ข้อที่ ${currentQuestionIndex + 1} จาก ${totalQuestions} (ตอบแล้ว ${answeredCount} ข้อ)`;
  progressBar.style.width = `${(answeredCount / totalQuestions) * 100}%`;

  // Animation feedback
  const selectedQuizCard = optionsGrid.querySelector(".option-card.selected");
  if (selectedQuizCard) {
    selectedQuizCard.style.transform = "scale(0.98)";
    setTimeout(() => {
      selectedQuizCard.style.transform = "translateY(-2px)";
    }, 100);
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  const currentQuestion = examSets[currentSetNumber][currentQuestionIndex];
  
  if (!userAnswers[currentQuestion.id]) {
    alert("น้องยังไม่ได้เลือกคำตอบของข้อนี้เลย เลือกคำตอบก่อนนะครับ!");
    return;
  }

  const totalQuestions = 10;
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

// Submit Quiz Score
async function submitQuiz() {
  if (!confirm("น้องมั่นใจคำตอบและต้องการส่งข้อสอบชุดนี้แล้วใช่หรือไม่?")) {
    return;
  }

  // Calculate Score
  let score = 0;
  const currentQuestions = examSets[currentSetNumber];
  const categoryScores = {};

  currentQuestions.forEach(q => {
    const cat = q.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { correct: 0, total: 0 };
    }
    categoryScores[cat].total++;

    const studentAns = userAnswers[q.id];
    if (studentAns === q.correctAnswer) {
      score++;
      categoryScores[cat].correct++;
    }
  });

  // Calculate percentages for categories
  const percentageCategoryScores = {};
  for (let cat in categoryScores) {
    const c = categoryScores[cat];
    percentageCategoryScores[cat] = Math.round((c.correct / c.total) * 100);
  }

  // Save to State
  const now = new Date();
  studentScores[currentSetNumber] = {
    score: score,
    category_scores: percentageCategoryScores,
    timestamp: now
  };
  localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));

  // Save to Google Sheet (Online Mode) or Local Mock Table (Offline Mode)
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "saveScore",
          token: currentUser.token,
          set_number: currentSetNumber,
          score: score,
          answers: currentQuestions.map(q => userAnswers[q.id]),
          category_scores: percentageCategoryScores
        })
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      const saveResult = await response.json();
      if (!saveResult.success) throw new Error(saveResult.message || "Save failed");
      if (Number.isInteger(saveResult.score) && saveResult.score !== score) {
        score = saveResult.score;
        studentScores[currentSetNumber].score = score;
        localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(studentScores));
      }
    } catch (e) {
      queuePendingScore({
        set_number: currentSetNumber,
        score,
        answers: currentQuestions.map(q => userAnswers[q.id]),
        category_scores: percentageCategoryScores
      });
      console.warn("Could not save score online; queued locally: ", e);
      alert("บันทึกคะแนนออนไลน์ไม่สำเร็จ คะแนนยังอยู่ในเครื่องนี้ กรุณากลับมาเชื่อมต่ออินเทอร์เน็ตแล้วทำการส่งอีกครั้ง");
    }
  } else {
    // Save to Offline mock scores database
    const mockScores = JSON.parse(localStorage.getItem("mock_scores"));
    // Overwrite if exists, else append
    const idx = mockScores.findIndex(s => s.username === currentUser.username && s.set_number === currentSetNumber);
    const scoreRow = {
      username: currentUser.username,
      set_number: currentSetNumber,
      score: score,
      timestamp: now
    };
    if (idx !== -1) {
      mockScores[idx] = scoreRow;
    } else {
      mockScores.push(scoreRow);
    }
    localStorage.setItem("mock_scores", JSON.stringify(mockScores));
  }

  // Go to Results Screen
  showResults(currentSetNumber, score, percentageCategoryScores, userAnswers);
}


// --- RESULTS & EXPLANATIONS SCREEN ---

function showResults(setNumber, score, categoryPercentages, answersSubmitted) {
  resultCongrats.textContent = `น้อง ${currentUser.nickname} ได้คะแนนในชุดที่ ${setNumber}`;
  scoreNumber.textContent = `${score}/10`;

  // Circular gauge score animation
  const maxStroke = 565.48; // 2 * PI * r
  const scoreRatio = score / 10;
  const offset = maxStroke - (scoreRatio * maxStroke);
  scoreCircleProgress.style.strokeDashoffset = maxStroke;
  setTimeout(() => {
    scoreCircleProgress.style.strokeDashoffset = offset;
  }, 100);

  // Badge award emoji & text
  let awardText = "";
  let badgeEmoji = "";
  if (score === 10) {
    awardText = "สุดยอดอัจฉริยะคณิตศาสตร์ ป.6 คะแนนเต็ม 10/10!";
    badgeEmoji = "🏆";
  } else if (score >= 8) {
    awardText = "เก่งสุดยอดเลยลูก! อยู่ในเกณฑ์ระดับห้องคิงเลยนะ";
    badgeEmoji = "🥇";
  } else if (score >= 6) {
    awardText = "ทำได้ดีมากครับ! มีพื้นฐานที่ดี คอยฝึกฝนต่อนะลูก";
    badgeEmoji = "🥈";
  } else if (score >= 4) {
    awardText = "มีความตั้งใจดีมาก! ทบทวนวิธีคิดเพิ่มความมั่นใจกันต่อ";
    badgeEmoji = "🥉";
  } else {
    awardText = "พยายามเข้านะลูก! การเริ่มทำบ่อยๆ ช่วยให้เราเก่งขึ้นได้แน่นอน";
    badgeEmoji = "⭐️";
  }
  badgeAward.innerHTML = `<span>${badgeEmoji}</span> ${awardText}`;

  // Populate Analysis Graph (Chart.js)
  analysisContainer.style.display = "block";
  renderSkillsChart(categoryPercentages);

  // Populate Weakness summary bullets and Detailed Explanations for ALL 10 questions
  weaknessBullets.innerHTML = "";
  wrongQuestionsList.innerHTML = "";
  
  const currentQuestions = examSets[setNumber];
  const prefixes = { a: "ก", b: "ข", c: "ค", d: "ง" };

  const reviewOnly = answersSubmitted === null;
  currentQuestions.forEach((q, idx) => {
    const studentChoice = answersSubmitted ? answersSubmitted[q.id] : null;
    const isCorrect = reviewOnly || studentChoice === q.correctAnswer;

    // 1. Weakness Summary bullet list (Only for incorrect questions)
    if (!reviewOnly && !isCorrect) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>ข้อที่ ${idx + 1} (${q.topic}):</strong> ${q.weakness}`;
      weaknessBullets.appendChild(li);
    }

    // 2. Explanation Cards for BOTH correct and incorrect questions
    const card = document.createElement("div");
    card.className = `wrong-card ${isCorrect ? 'correct' : 'incorrect'}`;

    let statusHeader = "";
    if (isCorrect) {
      statusHeader = `<span class="wrong-q-number" style="color: var(--success);"><i class="fas fa-check-circle"></i> ข้อที่ ${idx + 1} (ถูกต้อง)</span>`;
    } else {
      statusHeader = `<span class="wrong-q-number" style="color: var(--danger);"><i class="fas fa-times-circle"></i> ข้อที่ ${idx + 1} (ไม่ถูกต้อง)</span>`;
    }

    let choiceDetailsHTML = "";
    if (studentChoice) {
      choiceDetailsHTML = `
        <div class="student-choice">
          <strong>คำตอบที่เลือก:</strong> ข้อ ${prefixes[studentChoice]}. ${q.options[studentChoice]}
          ${!isCorrect ? `<br><strong style="color: var(--success);">คำตอบที่ถูกต้อง:</strong> ข้อ ${prefixes[q.correctAnswer]}. ${q.options[q.correctAnswer]}` : ""}
        </div>
      `;
    } else {
      // If we are just viewing past test explanations
      choiceDetailsHTML = `
        <div class="student-choice" style="border-left: 3px solid var(--success); background-color: #F8FAFC;">
          <strong style="color: var(--success);">คำตอบที่ถูกต้อง:</strong> ข้อ ${prefixes[q.correctAnswer]}. ${q.options[q.correctAnswer]}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="wrong-card-header">
        ${statusHeader}
        <span class="wrong-q-topic">${q.topic}</span>
      </div>
      <div class="wrong-question-text">${q.question}</div>
      ${choiceDetailsHTML}
      <div class="weakness-explanation">
        <div class="explanation-title">
          <i class="fas fa-lightbulb"></i> วิธีคิดเฉลยแบบละเอียด:
        </div>
        <div>${q.explanation}</div>
      </div>
    `;
    wrongQuestionsList.appendChild(card);
  });

  // Hide weakness summary card if score is perfect 10/10
  const weaknessSummaryCard = document.querySelector(".weakness-summary-card");
  if (score === 10) {
    weaknessSummaryCard.style.display = "none";
  } else {
    weaknessSummaryCard.style.display = "block";
  }

  showScreen(resultsScreen);
  triggerMathRendering(resultsScreen);
}

// View Solutions directly from Dashboard for already completed sets
function viewExplanationsOnly(setNumber) {
  const scoreObj = studentScores[setNumber];
  // Reconstruct category percentages or calculate them
  const currentQuestions = examSets[setNumber];
  const categoryPercentages = scoreObj.category_scores || {};
  
  // Since we don't have recorded student answers inside Dashboard view,
  // we pass null for answers, which will just show correct answers and explanations.
  showResults(setNumber, scoreObj.score, categoryPercentages, null);
}

function goBackDashboard() {
  showScreen(dashboardScreen);
  renderDashboard();
}


// --- LEADERBOARD LOGIC ---

async function openLeaderboard() {
  leaderboardRows.innerHTML = "";
  leaderboardLoading.style.display = "flex";

  let leaderboard = [];

  // Try Online fetch if sheetUrl exists
  if (sheetUrl) {
    try {
      const response = await fetch(`${sheetUrl}?action=getLeaderboard`);
      const data = await response.json();
      if (data.success) {
        leaderboard = data.leaderboard;
      }
    } catch (e) {
      console.warn("Failed to fetch online leaderboard, calculating local offline", e);
    }
  }

  // --- OFFLINE LEADERBOARD CALCULATION ---
  if (leaderboard.length === 0) {
    const mockUsers = JSON.parse(localStorage.getItem("mock_users"));
    const mockScores = JSON.parse(localStorage.getItem("mock_scores"));
    
    // Add current logged in user to mock list temporarily if not in database
    if (currentUser && !mockUsers.find(u => u.username === currentUser.username)) {
      mockUsers.push({ username: currentUser.username, nickname: currentUser.nickname });
    }

    const userStats = {};
    
    // Aggregate mock data
    mockScores.forEach(s => {
      const u = mockUsers.find(user => user.username === s.username);
      if (!u) return;

      if (!userStats[s.username]) {
        userStats[s.username] = {
          nickname: u.nickname,
          total_sets: 0,
          total_score: 0,
          sets: {}
        };
      }
      
      // Prevent double counting set scores
      if (userStats[s.username].sets[s.set_number] === undefined) {
        userStats[s.username].sets[s.set_number] = s.score;
        userStats[s.username].total_sets++;
        userStats[s.username].total_score += s.score;
      }
    });

    // Add current user scores to calculations (if not already aggregated)
    if (currentUser) {
      const localScores = studentScores;
      for (let setNum in localScores) {
        const uKey = currentUser.username;
        if (!userStats[uKey]) {
          userStats[uKey] = {
            nickname: currentUser.nickname,
            total_sets: 0,
            total_score: 0,
            sets: {}
          };
        }
        if (userStats[uKey].sets[setNum] === undefined) {
          userStats[uKey].sets[setNum] = localScores[setNum].score;
          userStats[uKey].total_sets++;
          userStats[uKey].total_score += localScores[setNum].score;
        }
      }
    }

    // Convert stats mapping to sorted array
    for (let userKey in userStats) {
      const stat = userStats[userKey];
      leaderboard.push({
        nickname: stat.nickname,
        total_sets: stat.total_sets,
        total_score: stat.total_score,
        average_score: stat.total_sets > 0 ? parseFloat((stat.total_score / stat.total_sets).toFixed(2)) : 0
      });
    }

    // Sort: highest total_score, then highest average_score
    leaderboard.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return b.average_score - a.average_score;
    });
  }

  // Render Table
  leaderboardLoading.style.display = "none";
  if (leaderboard.length === 0) {
    leaderboardRows.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">ไม่มีคะแนนส่งเข้าระบบในขณะนี้</td></tr>`;
    return;
  }

  leaderboard.forEach((row, index) => {
    const rank = index + 1;
    let rankClass = "rank-other";
    if (rank === 1) rankClass = "rank-1";
    else if (rank === 2) rankClass = "rank-2";
    else if (rank === 3) rankClass = "rank-3";

    const tr = document.createElement("tr");
    if (currentUser && row.nickname === currentUser.nickname) {
      tr.className = "current-user";
    }

    tr.innerHTML = `
      <td><span class="leaderboard-rank ${rankClass}">${rank}</span></td>
      <td>${escapeHtml(row.nickname)} ${currentUser && row.nickname === currentUser.nickname ? " (ตัวฉัน)" : ""}</td>
      <td style="text-align: center;">${row.total_sets}/20</td>
      <td style="text-align: center; font-weight: 700; color: var(--primary);">${row.total_score}</td>
      <td style="text-align: center; font-family: var(--font-eng);">${(row.average_score || 0).toFixed(1)}</td>
    `;
    leaderboardRows.appendChild(tr);
  });
}




// --- SKILLS CHART RENDERER ---

function renderSkillsChart(categoryScores) {
  const labels = Object.keys(categoryScores);
  const percentages = labels.map(label => categoryScores[label]);

  if (skillsChartInstance) {
    skillsChartInstance.destroy();
  }

  const canvas = document.getElementById("skillsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  skillsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "เปอร์เซ็นต์ความถูกต้อง (%)",
        data: percentages,
        backgroundColor: [
          "rgba(108, 93, 211, 0.65)",  // Soft Purple
          "rgba(255, 184, 76, 0.65)",  // Soft Orange
          "rgba(107, 203, 119, 0.65)", // Soft Green
          "rgba(241, 167, 167, 0.65)", // Soft Coral
          "rgba(142, 195, 176, 0.65)", // Soft Mint
          "rgba(192, 222, 255, 0.65)"  // Soft Blue
        ],
        borderColor: [
          "#6C5DD3",
          "#FFB84C",
          "#6BCB77",
          "#F1A7A7",
          "#8EBEB0",
          "#90C8FF"
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: "y", // Horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(45, 49, 66, 0.95)",
          titleFont: { family: "Kanit", size: 13 },
          bodyFont: { family: "Kanit", size: 12 },
          callbacks: {
            label: function(context) {
              return ` ความเข้าใจหัวข้อนี้: ${context.raw}%`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: "#ECEFF1" },
          ticks: {
            callback: (value) => value + "%",
            font: { family: "Kanit", size: 11 }
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: "Kanit", size: 12, weight: "500" },
            color: "#2D3142"
          }
        }
      }
    }
  });
}


// --- MATH RENDERING HELPERS (KaTeX & Fallback) ---

function triggerMathRendering(element) {
  if (typeof renderMathInElement === "function") {
    try {
      renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX rendering error: ", e);
      applyMathFallback(element);
    }
  } else {
    applyMathFallback(element);
  }
}

function applyMathFallback(element) {
  element.querySelectorAll(".question-text, .option-text, .weakness-explanation, .wrong-question-text").forEach(el => {
    if (el.innerHTML.includes("\\(") || el.innerHTML.includes("\\frac") || el.innerHTML.includes("^{\\circ}")) {
      el.innerHTML = renderMathFallback(el.innerHTML);
    }
  });
}

function renderMathFallback(text) {
  let formatted = text;
  formatted = formatted.replace(/\^\{\\circ\}/g, "°");
  formatted = formatted.replace(/\^\\circ/g, "°");
  formatted = formatted.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="math-frac"><span class="num">$1</span><span class="den">$2</span></span>');
  formatted = formatted.replace(/\\times/g, "×");
  formatted = formatted.replace(/\\div/g, "÷");
  formatted = formatted.replace(/\\approx/g, "≈");
  formatted = formatted.replace(/\\pi/g, "π");
  formatted = formatted.replace(/\\\(|\\\)/g, "");
  return formatted;
}
