// Global State
let currentUser = null;
let currentSetId = null;
let currentPdfPage = 1;
let pdfZoomScale = 1.0;
let studentAnswers = Array(30).fill(null);

// Admin config state
let adminSelectedSet = 1;
let adminAllData = null; // Stored admin data (users, exams, submissions)

// Mock Data for Offline Demo Mode (Used when CONFIG.API_URL is empty)
const OFFLINE_MODE = {
  active: false,
  users: [
    { username: "student1", password: "123", nickname: "น้องมีนา", role: "student" },
    { username: "student2", password: "123", nickname: "น้องภูเขา", role: "student" },
    { username: "admin", password: "admin1234", nickname: "คุณครู (แอดมิน)", role: "teacher" }
  ],
  exams: [
    { set_id: 1, status: "open", start_time: "", end_time: "", answers: "1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2", release_answers: true },
    { set_id: 2, status: "open", start_time: "", end_time: "", answers: "2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3", release_answers: false },
    { set_id: 3, status: "closed", start_time: "", end_time: "", answers: "3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4", release_answers: false },
    { set_id: 4, status: "scheduled", start_time: "2026-07-04T08:00", end_time: "2026-07-04T12:00", answers: "4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1", release_answers: true },
    { set_id: 5, status: "open", start_time: "", end_time: "", answers: "1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,1,1,1,1,2,2,2,2,3,3,3,3,4,4", release_answers: true }
  ],
  submissions: [
    { id: "SUB_1", username: "student1", nickname: "น้องมีนา", set_id: 1, answers: "1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2", score: 30, submitted_at: "2026-07-03T10:00:00Z" },
    { id: "SUB_2", username: "student2", nickname: "น้องภูเขา", set_id: 1, answers: "1,2,3,3,1,2,2,4,1,2,3,4,1,1,3,4,1,2,3,4,2,2,3,4,1,2,3,4,1,1", score: 25, submitted_at: "2026-07-03T11:30:00Z" }
  ]
};

// Check if configuration URL is missing
function checkConfig() {
  const banner = document.getElementById("config-alert-banner");
  if (!CONFIG.API_URL || CONFIG.API_URL.trim() === "") {
    OFFLINE_MODE.active = true;
    banner.classList.remove("hidden");
    console.warn("⚠️ API_URL is empty. Running in OFFLINE DEMO MODE with mock data.");
  } else {
    OFFLINE_MODE.active = false;
    banner.classList.add("hidden");
  }
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  checkConfig();
  setupEventListeners();
  checkLoginStatus();
  generateWorkspaceAnswerSheet();
});

// Switch Views
function showSection(sectionId) {
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Loading Spinner control
function showLoading(text = "กำลังประมวลผล...") {
  document.getElementById("loading-text").innerText = text;
  document.getElementById("loading-overlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.add("hidden");
}

// Setup all click / form listeners
function setupEventListeners() {
  // Logo redirect
  document.getElementById("header-logo").addEventListener("click", () => {
    if (currentUser) {
      showSection("portal-section");
      loadPortal();
    } else {
      showSection("auth-section");
    }
  });

  // Auth Tabs switching
  document.getElementById("tab-login").addEventListener("click", () => {
    document.getElementById("tab-login").classList.add("active");
    document.getElementById("tab-register").classList.remove("active");
    document.getElementById("form-login").classList.add("active");
    document.getElementById("form-register").classList.remove("active");
  });

  document.getElementById("tab-register").addEventListener("click", () => {
    document.getElementById("tab-register").classList.add("active");
    document.getElementById("tab-login").classList.remove("active");
    document.getElementById("form-register").classList.add("active");
    document.getElementById("form-login").classList.remove("active");
  });

  // Setup Instructions Modal
  document.getElementById("btn-show-setup-instructions").addEventListener("click", () => {
    document.getElementById("setup-instructions-modal").classList.remove("hidden");
  });
  document.getElementById("btn-close-instructions").addEventListener("click", () => {
    document.getElementById("setup-instructions-modal").classList.add("hidden");
  });
  document.getElementById("btn-setup-modal-close").addEventListener("click", () => {
    document.getElementById("setup-instructions-modal").classList.add("hidden");
  });

  // Form submits
  document.getElementById("form-login").addEventListener("submit", handleLogin);
  document.getElementById("form-register").addEventListener("submit", handleRegister);

  // Logout button
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // Leaderboard Navigation
  document.getElementById("btn-show-leaderboard").addEventListener("click", () => {
    showSection("leaderboard-section");
    loadLeaderboard(false); // Load full table
  });
  document.getElementById("btn-leaderboard-back").addEventListener("click", () => {
    showSection("portal-section");
    loadPortal();
  });
  document.getElementById("btn-sidebar-view-all").addEventListener("click", () => {
    showSection("leaderboard-section");
    loadLeaderboard(false);
  });

  // PDF Page controls
  document.getElementById("btn-pdf-prev").addEventListener("click", () => changePdfPage(-1));
  document.getElementById("btn-pdf-next").addEventListener("click", () => changePdfPage(1));
  document.getElementById("btn-zoom-in").addEventListener("click", () => zoomPdf(0.2));
  document.getElementById("btn-zoom-out").addEventListener("click", () => zoomPdf(-0.2));

  // Submit Exam
  document.getElementById("btn-submit-exam").addEventListener("click", submitAnswersForm);
  document.getElementById("btn-result-portal").addEventListener("click", () => {
    showSection("portal-section");
    loadPortal();
  });

  // Admin section buttons
  document.getElementById("btn-show-admin").addEventListener("click", openTeacherPanel);
  document.getElementById("btn-admin-auth-cancel").addEventListener("click", () => {
    showSection("portal-section");
    loadPortal();
  });
  document.getElementById("btn-admin-close").addEventListener("click", () => {
    showSection("portal-section");
    loadPortal();
  });

  // Admin Tab Navigation
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
      
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-tab");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Admin Set Config selection sidebar
  document.querySelectorAll(".btn-set-select").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-set-select").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      adminSelectedSet = parseInt(btn.getAttribute("data-set"));
      loadAdminSetSettings();
    });
  });

  // Admin form save settings
  document.getElementById("form-admin-exam-settings").addEventListener("submit", saveAdminExamSettings);

  // Admin filter submissions
  document.getElementById("input-search-submission").addEventListener("input", filterAdminSubmissions);
  document.getElementById("select-filter-set").addEventListener("change", filterAdminSubmissions);
  document.getElementById("btn-refresh-submissions").addEventListener("click", fetchAdminAllData);
  document.getElementById("btn-export-submissions-csv").addEventListener("click", exportSubmissionsCSV);

  // Admin login submission
  document.getElementById("btn-admin-auth-submit").addEventListener("click", handleAdminAuth);
  
  // Watch exam status type in admin to toggle schedule view
  document.getElementById("admin-exam-status").addEventListener("change", (e) => {
    const row = document.getElementById("schedule-inputs-row");
    if (e.target.value === "scheduled") {
      row.classList.add("active");
    } else {
      row.classList.remove("active");
    }
  });
}

// Call Apps Script POST API
async function apiCall(action, data = {}) {
  if (OFFLINE_MODE.active) {
    return handleOfflineApi(action, data);
  }

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ action, data })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Call error: ", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + error.message };
  }
}

// Check logged in user from LocalStorage
function checkLoginStatus() {
  const cached = localStorage.getItem("exam_user");
  if (cached) {
    currentUser = JSON.parse(cached);
    document.getElementById("user-nickname-display").innerText = currentUser.nickname;
    document.getElementById("user-info-area").classList.remove("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    document.getElementById("btn-show-leaderboard").classList.remove("hidden");
    showSection("portal-section");
    loadPortal();
  } else {
    showSection("auth-section");
  }
}

// User Actions: LOGIN
async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById("login-username").value.trim();
  const pass = document.getElementById("login-password").value;
  const msgDiv = document.getElementById("login-message");
  const spinner = document.getElementById("login-spinner");
  
  msgDiv.innerText = "";
  spinner.classList.remove("hidden");
  
  const res = await apiCall("login", { username: user, password: pass });
  spinner.classList.add("hidden");
  
  if (res.success) {
    currentUser = res.data;
    localStorage.setItem("exam_user", JSON.stringify(currentUser));
    document.getElementById("user-nickname-display").innerText = currentUser.nickname;
    document.getElementById("user-info-area").classList.remove("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    document.getElementById("btn-show-leaderboard").classList.remove("hidden");
    
    showSection("portal-section");
    loadPortal();
    
    // Clear form
    document.getElementById("form-login").reset();
  } else {
    msgDiv.innerText = res.message || "เข้าสู่ระบบล้มเหลว";
  }
}

// User Actions: REGISTER
async function handleRegister(e) {
  e.preventDefault();
  const user = document.getElementById("register-username").value.trim();
  const pass = document.getElementById("register-password").value;
  const confirmPass = document.getElementById("register-confirm-password").value;
  const nick = document.getElementById("register-nickname").value.trim();
  const msgDiv = document.getElementById("register-message");
  const spinner = document.getElementById("register-spinner");
  
  msgDiv.innerText = "";
  
  if (pass !== confirmPass) {
    msgDiv.innerText = "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน";
    return;
  }
  
  spinner.classList.remove("hidden");
  const res = await apiCall("register", { username: user, password: pass, nickname: nick });
  spinner.classList.add("hidden");
  
  if (res.success) {
    // Show success message then switch to login tab
    alert("ลงทะเบียนผู้ใช้งานสำเร็จ! สามารถเข้าสู่ระบบได้ทันที");
    document.getElementById("form-register").reset();
    document.getElementById("tab-login").click();
  } else {
    msgDiv.innerText = res.message || "ไม่สามารถลงทะเบียนได้";
  }
}

// User Actions: LOGOUT
function handleLogout() {
  currentUser = null;
  localStorage.removeItem("exam_user");
  document.getElementById("user-info-area").classList.add("hidden");
  document.getElementById("btn-logout").classList.add("hidden");
  document.getElementById("btn-show-leaderboard").classList.add("hidden");
  showSection("auth-section");
}

// Generate the Workspace's Answer Sheet (30 questions layout)
function generateWorkspaceAnswerSheet() {
  const container = document.getElementById("answer-sheet-form");
  container.innerHTML = "";
  
  for (let q = 1; q <= 30; q++) {
    const row = document.createElement("div");
    row.className = "answer-row";
    row.id = `answer-row-q${q}`;
    
    row.innerHTML = `
      <div class="answer-row-num">ข้อที่ ${q}</div>
      <div class="choice-container">
        <div class="choice-item">
          <input type="radio" name="q${q}" value="1" id="q${q}-c1" data-q="${q}">
          <label class="choice-label" for="q${q}-c1">1</label>
        </div>
        <div class="choice-item">
          <input type="radio" name="q${q}" value="2" id="q${q}-c2" data-q="${q}">
          <label class="choice-label" for="q${q}-c2">2</label>
        </div>
        <div class="choice-item">
          <input type="radio" name="q${q}" value="3" id="q${q}-c3" data-q="${q}">
          <label class="choice-label" for="q${q}-c3">3</label>
        </div>
        <div class="choice-item">
          <input type="radio" name="q${q}" value="4" id="q${q}-c4" data-q="${q}">
          <label class="choice-label" for="q${q}-c4">4</label>
        </div>
        <button type="button" class="btn-clear-choice" data-q="${q}" title="ล้างคำตอบ">L</button>
      </div>
    `;
    container.appendChild(row);
  }
  
  // Attach listeners to radio clicks
  document.querySelectorAll('#answer-sheet-form input[type="radio"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      const q = parseInt(e.target.getAttribute("data-q"));
      const val = parseInt(e.target.value);
      studentAnswers[q - 1] = val;
    });
  });

  // Attach clear buttons listener
  document.querySelectorAll(".btn-clear-choice").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const q = parseInt(btn.getAttribute("data-q"));
      const radios = document.getElementsByName(`q${q}`);
      radios.forEach(r => r.checked = false);
      studentAnswers[q - 1] = null;
    });
  });
}

// Load Portal Data (Available Exams and Leaderboard Sidebar)
async function loadPortal() {
  showLoading("กำลังโหลดชุดข้อสอบ...");
  const res = await apiCall("getExamStatus");
  hideLoading();
  
  if (!res.success) {
    alert("ไม่สามารถโหลดข้อสอบได้: " + res.message);
    return;
  }
  
  const exams = res.data;
  const container = document.getElementById("exam-cards-container");
  container.innerHTML = "";
  
  // Fetch completed exams score from local storage (if any submitted by this user)
  const savedScores = JSON.parse(localStorage.getItem(`scores_${currentUser.username}`)) || {};
  
  exams.forEach(exam => {
    const card = document.createElement("div");
    card.className = `exam-card glass-panel status-${exam.status}`;
    
    let statusText = "";
    let btnHtml = "";
    
    if (exam.status === "open") {
      statusText = "เปิดให้ทำข้อสอบ";
      btnHtml = `<button class="btn btn-primary" onclick="launchExam(${exam.set_id})">เริ่มทำข้อสอบ</button>`;
    } else if (exam.status === "closed") {
      statusText = "ปิดการส่งคำตอบ";
      btnHtml = `<button class="btn btn-secondary" disabled>หมดเวลาสอบแล้ว</button>`;
    } else if (exam.status === "upcoming") {
      statusText = "เตรียมระบบ (เร็วๆ นี้)";
      let schedInfo = "";
      if (exam.start_time) {
        const timeStr = new Date(exam.start_time).toLocaleString("th-TH", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
        schedInfo = `<div style="font-size:12px; margin-top:4px;">เปิดสอบ: ${timeStr}</div>`;
      }
      btnHtml = `<button class="btn btn-secondary" disabled>รอเปิดระบบ</button>${schedInfo}`;
    }
    
    const myScore = savedScores[exam.set_id];
    const scoreText = myScore !== undefined ? `<div class="score-display-portal">คะแนนของคุณ: ${myScore}/30 คะแนน</div>` : "";
    
    card.innerHTML = `
      <div class="exam-card-header">
        <span class="exam-set-num">ข้อสอบชุดที่ ${exam.set_id}</span>
        <span class="status-badge ${exam.status}">${statusText}</span>
      </div>
      <div class="exam-card-body">
        <div class="exam-details-txt">ติวเนื้อหาเข้มข้น ม.1 เทอม 2</div>
        <div class="exam-details-txt" style="font-size:12px; margin-top:2px;">จำนวนข้อสอบ: 30 ข้อ</div>
        ${scoreText}
      </div>
      <div class="exam-card-footer">
        ${btnHtml}
      </div>
    `;
    container.appendChild(card);
  });
  
  // Load sidebar leaderboard
  loadLeaderboard(true);
}

// Load Leaderboard data (Sidebar Top 5 or Full Table)
async function loadLeaderboard(mini = true) {
  const res = await apiCall("getLeaderboard");
  if (!res.success) {
    console.error("Leaderboard load failed");
    return;
  }
  
  const list = res.data;
  
  if (mini) {
    const miniContainer = document.getElementById("mini-leaderboard");
    miniContainer.innerHTML = "";
    
    if (list.length === 0) {
      miniContainer.innerHTML = `<li style="text-align:center; color:var(--text-secondary);">ยังไม่มีคะแนนส่งในระบบ</li>`;
      return;
    }
    
    // Display up to 5
    const limit = Math.min(5, list.length);
    for (let i = 0; i < limit; i++) {
      const item = list[i];
      const li = document.createElement("li");
      li.className = `rank-${i+1}`;
      li.innerHTML = `
        <span class="leader-rank">${i+1}</span>
        <span class="leader-name">${escapeHtml(item.nickname)}</span>
        <span class="leader-score">${item.totalScore} คะแนน</span>
      `;
      miniContainer.appendChild(li);
    }
  } else {
    // Render Full Table
    const tbody = document.getElementById("leaderboard-table-body");
    tbody.innerHTML = "";
    
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-secondary);">ยังไม่มีนักเรียนส่งคะแนนในระบบ</td></tr>`;
      return;
    }
    
    list.forEach((item, index) => {
      const tr = document.createElement("tr");
      
      const s1 = item.sets["1"] !== undefined ? item.sets["1"] : "-";
      const s2 = item.sets["2"] !== undefined ? item.sets["2"] : "-";
      const s3 = item.sets["3"] !== undefined ? item.sets["3"] : "-";
      const s4 = item.sets["4"] !== undefined ? item.sets["4"] : "-";
      const s5 = item.sets["5"] !== undefined ? item.sets["5"] : "-";
      
      let rankText = index + 1;
      // Gold, Silver, Bronze icons
      if (index === 0) rankText = "🥇";
      else if (index === 1) rankText = "🥈";
      else if (index === 2) rankText = "🥉";
      
      tr.innerHTML = `
        <td style="text-align: center; font-weight: bold; font-size:16px;">${rankText}</td>
        <td style="font-weight: 500;">${escapeHtml(item.nickname)}</td>
        <td style="text-align: center;">${s1}</td>
        <td style="text-align: center;">${s2}</td>
        <td style="text-align: center;">${s3}</td>
        <td style="text-align: center;">${s4}</td>
        <td style="text-align: center;">${s5}</td>
        <td style="text-align: center; font-weight: bold; color: var(--secondary-color); font-size: 16px;">${item.totalScore}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Launch the Exam Workspace (Reset options and display PDF & Sheets)
function launchExam(setId) {
  currentSetId = setId;
  currentPdfPage = 1;
  pdfZoomScale = 1.0;
  studentAnswers = Array(30).fill(null);
  
  // Reset all radio checkboxes in answer sheet HTML
  document.querySelectorAll('#answer-sheet-form input[type="radio"]').forEach(r => r.checked = false);
  
  // Update UI Elements
  document.getElementById("exam-set-title-workspace").innerText = `ข้อสอบชุดที่ ${setId}`;
  
  // Render workspace
  showSection("exam-workspace-section");
  updatePdfPageDisplay();
}

// Update PDF Image Display
function updatePdfPageDisplay() {
  const totalPages = CONFIG.PAGES_CONFIG[currentSetId];
  document.getElementById("pdf-page-indicator").innerText = `หน้า ${currentPdfPage} / ${totalPages}`;
  
  // PDF image path: images/set{N}/page_{M}.png
  const imgElement = document.getElementById("pdf-page-image");
  imgElement.style.transform = `scale(${pdfZoomScale})`;
  imgElement.src = `images/set${currentSetId}/page_${currentPdfPage}.png`;
  
  // Enable / disable navigation buttons
  document.getElementById("btn-pdf-prev").disabled = (currentPdfPage <= 1);
  document.getElementById("btn-pdf-next").disabled = (currentPdfPage >= totalPages);
}

// Zoom PDF
function zoomPdf(factor) {
  pdfZoomScale += factor;
  if (pdfZoomScale < 0.5) pdfZoomScale = 0.5;
  if (pdfZoomScale > 2.5) pdfZoomScale = 2.5;
  
  document.getElementById("zoom-indicator").innerText = `${Math.round(pdfZoomScale * 100)}%`;
  document.getElementById("pdf-page-image").style.transform = `scale(${pdfZoomScale})`;
}

// Change PDF Page
function changePdfPage(dir) {
  const totalPages = CONFIG.PAGES_CONFIG[currentSetId];
  const target = currentPdfPage + dir;
  
  if (target >= 1 && target <= totalPages) {
    currentPdfPage = target;
    updatePdfPageDisplay();
    // Scroll PDF viewer back to top
    document.getElementById("pdf-container").scrollTop = 0;
  }
}

// Submit Student Answers
async function submitAnswersForm() {
  const unfilledCount = studentAnswers.filter(a => a === null).length;
  
  if (unfilledCount > 0) {
    const confirmSubmit = confirm(`คุณยังไม่ได้ตอบคำถามอีก ${unfilledCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`);
    if (!confirmSubmit) return;
  } else {
    const confirmSubmit = confirm("คุณตรวจสอบคำตอบดีแล้ว และต้องการส่งกระดาษคำตอบใช่หรือไม่?");
    if (!confirmSubmit) return;
  }
  
  showLoading("กำลังส่งคำตอบและบันทึกคะแนน...");
  
  // Prepare answers payload (if empty send empty string or 0)
  const cleanAnswers = studentAnswers.map(a => a === null ? "" : a);
  
  const res = await apiCall("submitExam", {
    username: currentUser.username,
    nickname: currentUser.nickname,
    set_id: currentSetId,
    answers: cleanAnswers
  });
  
  hideLoading();
  
  if (res.success) {
    const result = res.data;
    
    // Save score locally
    const savedScores = JSON.parse(localStorage.getItem(`scores_${currentUser.username}`)) || {};
    savedScores[currentSetId] = result.score;
    localStorage.setItem(`scores_${currentUser.username}`, JSON.stringify(savedScores));
    
    // Display results screen
    document.getElementById("result-set-title").innerText = `คะแนนสอบของคุณสำหรับ ข้อสอบชุดที่ ${currentSetId}`;
    document.getElementById("result-score-val").innerText = result.score;
    document.getElementById("result-total-val").innerText = result.total;
    
    const percentage = Math.round((result.score / result.total) * 100);
    document.getElementById("result-percent-val").innerText = `${percentage}%`;
    
    // Check answer release banner
    const relBanner = document.getElementById("result-answers-released-banner");
    const hidBanner = document.getElementById("result-answers-hidden-banner");
    
    const grid = document.getElementById("result-review-grid");
    grid.innerHTML = "";
    
    if (result.release_answers && result.correct_answers) {
      relBanner.classList.remove("hidden");
      hidBanner.classList.add("hidden");
      
      // Generate review box with detail correct/wrong indications
      for (let i = 0; i < 30; i++) {
        const qNum = i + 1;
        const myAns = cleanAnswers[i] !== "" ? cleanAnswers[i] : "-";
        const correctAns = result.correct_answers[i];
        const isCorrect = myAns.toString() === correctAns.toString();
        
        const box = document.createElement("div");
        box.className = `review-box ${isCorrect ? 'correct' : 'incorrect'}`;
        
        box.innerHTML = `
          <span class="review-box-num">ข้อ ${qNum}</span>
          <span class="review-box-choice">ตอบ: ${myAns}</span>
          ${!isCorrect ? `<span class="review-box-correct-hint">เฉลย: ${correctAns}</span>` : ""}
        `;
        grid.appendChild(box);
      }
      
    } else {
      relBanner.classList.add("hidden");
      hidBanner.classList.remove("hidden");
      
      // Score only view, no correct answer leak
      for (let i = 0; i < 30; i++) {
        const qNum = i + 1;
        const myAns = cleanAnswers[i] !== "" ? cleanAnswers[i] : "-";
        const box = document.createElement("div");
        box.className = "review-box";
        box.innerHTML = `
          <span class="review-box-num">ข้อ ${qNum}</span>
          <span class="review-box-choice">ตอบ: ${myAns}</span>
        `;
        grid.appendChild(box);
      }
    }
    
    showSection("result-section");
  } else {
    alert("เกิดข้อผิดพลาดในการส่งคำตอบ: " + res.message);
  }
}

// --- TEACHER ADMIN LOGIC ---

// Open Teacher Panel (Prompt password if needed)
function openTeacherPanel() {
  if (currentUser && currentUser.role === "teacher") {
    // Already teacher, show panel directly
    showSection("teacher-admin-section");
    document.getElementById("admin-auth-panel").classList.add("hidden");
    document.getElementById("admin-dashboard-panel").classList.remove("hidden");
    fetchAdminAllData();
  } else {
    // Show login popup
    showSection("teacher-admin-section");
    document.getElementById("admin-auth-panel").classList.remove("hidden");
    document.getElementById("admin-dashboard-panel").classList.add("hidden");
    document.getElementById("admin-username").value = "";
    document.getElementById("admin-password").value = "";
    document.getElementById("admin-auth-message").innerText = "";
  }
}

// Authenticate teacher login form
async function handleAdminAuth() {
  const user = document.getElementById("admin-username").value.trim();
  const pass = document.getElementById("admin-password").value;
  const msgDiv = document.getElementById("admin-auth-message");
  
  if (!user || !pass) {
    msgDiv.innerText = "กรุณากรอกผู้ใช้และรหัสผ่านคุณครู";
    return;
  }
  
  showLoading("กำลังตรวจสอบสิทธิ์คุณครู...");
  
  const res = await apiCall("getAdminData", { username: user, password: pass });
  hideLoading();
  
  if (res.success) {
    // Temp upgrade user role locally or just save state
    currentUser = { username: user, password: pass, nickname: "คุณครู (ชั่วคราว)", role: "teacher" };
    document.getElementById("user-nickname-display").innerText = "คุณครู (แอดมิน)";
    document.getElementById("user-info-area").classList.remove("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    
    document.getElementById("admin-auth-panel").classList.add("hidden");
    document.getElementById("admin-dashboard-panel").classList.remove("hidden");
    
    // Store data locally to display
    adminAllData = res.data;
    renderAdminDashboard();
  } else {
    msgDiv.innerText = res.message || "สิทธิ์การล็อกอินไม่ถูกต้อง";
  }
}

// Fetch all database records for admin
async function fetchAdminAllData() {
  if (!currentUser || currentUser.role !== "teacher") return;
  
  showLoading("กำลังโหลดข้อมูลบริหารจัดการระบบ...");
  const res = await apiCall("getAdminData", {
    username: currentUser.username,
    password: currentUser.password
  });
  hideLoading();
  
  if (res.success) {
    adminAllData = res.data;
    renderAdminDashboard();
  } else {
    alert("ไม่สามารถดึงข้อมูลสำหรับครูได้: " + res.message);
  }
}

// Render everything on Teacher Dashboard
function renderAdminDashboard() {
  if (!adminAllData) return;
  
  // Render users list
  const usersTbody = document.getElementById("table-body-users");
  usersTbody.innerHTML = "";
  adminAllData.users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.nickname)}</td>
      <td><span class="user-badge" style="background:rgba(255,255,255,0.05); color:#fff; border:none;">${u.role}</span></td>
    `;
    usersTbody.appendChild(tr);
  });
  
  // Render submissions table
  renderAdminSubmissionsList();
  
  // Load settings for the active admin selected set
  loadAdminSetSettings();
}

// Load configurations for Selected Set into admin form
function loadAdminSetSettings() {
  if (!adminAllData) return;
  
  const exam = adminAllData.exams.find(e => e.set_id.toString() === adminSelectedSet.toString());
  if (!exam) return;
  
  document.getElementById("admin-set-config-title").innerText = `ตั้งค่า: ข้อสอบชุดที่ ${adminSelectedSet}`;
  document.getElementById("admin-exam-status").value = exam.status;
  document.getElementById("admin-exam-release-answers").value = exam.release_answers.toString();
  
  // Start / End time formats conversion
  // Sheets return ISO or formatted datetime, we need "yyyy-MM-ddThh:mm" format for input
  document.getElementById("admin-exam-start-time").value = formatDateForInput(exam.start_time);
  document.getElementById("admin-exam-end-time").value = formatDateForInput(exam.end_time);
  
  // Toggle schedule visual inputs
  const scheduleRow = document.getElementById("schedule-inputs-row");
  if (exam.status === "scheduled") {
    scheduleRow.classList.add("active");
  } else {
    scheduleRow.classList.remove("active");
  }
  
  // Generate 30 key choice dropdowns in the grid
  const keysContainer = document.getElementById("admin-keys-grid");
  keysContainer.innerHTML = "";
  
  const answersList = exam.answers.split(",");
  for (let i = 0; i < 30; i++) {
    const qNum = i + 1;
    const currentVal = answersList[i] || "1";
    
    const div = document.createElement("div");
    div.className = "key-input-row";
    div.innerHTML = `
      <span class="key-row-label">ข้อ ${qNum}:</span>
      <select id="admin-key-q${qNum}" class="form-control key-select">
        <option value="1" ${currentVal === "1" ? "selected" : ""}>ตัวเลือก 1</option>
        <option value="2" ${currentVal === "2" ? "selected" : ""}>ตัวเลือก 2</option>
        <option value="3" ${currentVal === "3" ? "selected" : ""}>ตัวเลือก 3</option>
        <option value="4" ${currentVal === "4" ? "selected" : ""}>ตัวเลือก 4</option>
      </select>
    `;
    keysContainer.appendChild(div);
  }
}

// Convert date strings back to format yyyy-MM-ddThh:mm for datetime-local input
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}-${minutes}`; // wait, html5 uses T separator
  } catch (e) {
    return "";
  }
}

// Save Admin configurations for current set
async function saveAdminExamSettings(e) {
  e.preventDefault();
  
  const status = document.getElementById("admin-exam-status").value;
  const releaseAnswers = document.getElementById("admin-exam-release-answers").value;
  const startTime = document.getElementById("admin-exam-start-time").value;
  const endTime = document.getElementById("admin-exam-end-time").value;
  const spinner = document.getElementById("save-settings-spinner");
  const msgDiv = document.getElementById("admin-save-message");
  
  spinner.classList.remove("hidden");
  msgDiv.innerText = "";
  
  // Aggregate answers from 30 dropdown inputs
  const answerArray = [];
  for (let i = 1; i <= 30; i++) {
    const val = document.getElementById(`admin-key-q${i}`).value;
    answerArray.push(val);
  }
  
  const answersCsv = answerArray.join(",");
  
  const res = await apiCall("updateExamSettings", {
    username: currentUser.username,
    password: currentUser.password,
    set_id: adminSelectedSet,
    status: status,
    start_time: startTime,
    end_time: endTime,
    answers: answersCsv,
    release_answers: releaseAnswers
  });
  
  spinner.classList.add("hidden");
  
  if (res.success) {
    msgDiv.className = "success-msg";
    msgDiv.innerText = res.message;
    // Reload local data from sheet
    fetchAdminAllData();
  } else {
    msgDiv.className = "error-msg";
    msgDiv.innerText = res.message || "เกิดข้อผิดพลาดในการบันทึก";
  }
}

// Render Submissions log inside admin
function renderAdminSubmissionsList() {
  if (!adminAllData) return;
  
  const tbody = document.getElementById("table-body-submissions");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("input-search-submission").value.toLowerCase().trim();
  const filterSet = document.getElementById("select-filter-set").value;
  
  // Filter list
  const filtered = adminAllData.submissions.filter(sub => {
    const matchesSearch = sub.nickname.toLowerCase().includes(searchVal) || 
                          sub.username.toLowerCase().includes(searchVal);
    const matchesSet = (filterSet === "all") || (sub.set_id.toString() === filterSet.toString());
    
    return matchesSearch && matchesSet;
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-secondary);">ไม่พบประวัติผลสอบสอดคล้องกับการค้นหา</td></tr>`;
    return;
  }
  
  // Sort submissions by date descending
  filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  
  filtered.forEach(sub => {
    const tr = document.createElement("tr");
    const formattedDate = new Date(sub.submitted_at).toLocaleString("th-TH");
    
    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>${escapeHtml(sub.username)}</td>
      <td style="font-weight:600;">${escapeHtml(sub.nickname)}</td>
      <td style="text-align:center;">ชุดที่ ${sub.set_id}</td>
      <td style="font-weight:bold; color:var(--success-color);">${sub.score} / 30</td>
      <td style="font-size:11px; color:var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sub.answers}">
        ${sub.answers}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Triggered on key search in admin log
function filterAdminSubmissions() {
  renderAdminSubmissionsList();
}

// Download CSV for submissions
function exportSubmissionsCSV() {
  if (!adminAllData || adminAllData.submissions.length === 0) {
    alert("ไม่มีข้อมูลที่จะส่งออก");
    return;
  }
  
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for MS Excel Thai letters compatibility
  csvContent += "วันที่ส่ง,Username,ชื่อเล่น,ชุดที่,คะแนน,คำตอบที่ส่ง\r\n";
  
  adminAllData.submissions.forEach(sub => {
    const date = new Date(sub.submitted_at).toLocaleString("th-TH").replace(/,/g, "");
    csvContent += `"${date}","${sub.username}","${sub.nickname}","ชุดที่ ${sub.set_id}","${sub.score}/30","${sub.answers}"\r\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `รายงานผลสอบ_ติวม1_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link); // Required for FF
  
  link.click();
  document.body.removeChild(link);
}

// --- OFFLINE/DEMO MODE API FALLBACKS ---

function handleOfflineApi(action, data) {
  console.log(`[Offline Simulation API] Request Action: ${action}`, data);
  
  // Initial local storage setup for mock DB if empty
  if (!localStorage.getItem("mock_users")) {
    localStorage.setItem("mock_users", JSON.stringify(OFFLINE_MODE.users));
    localStorage.setItem("mock_exams", JSON.stringify(OFFLINE_MODE.exams));
    localStorage.setItem("mock_submissions", JSON.stringify(OFFLINE_MODE.submissions));
  }
  
  const dbUsers = JSON.parse(localStorage.getItem("mock_users"));
  const dbExams = JSON.parse(localStorage.getItem("mock_exams"));
  const dbSubmissions = JSON.parse(localStorage.getItem("mock_submissions"));
  
  if (action === "login") {
    const found = dbUsers.find(u => u.username.toLowerCase() === data.username.toLowerCase());
    if (found) {
      if (found.password === data.password) {
        return { success: true, data: { username: found.username, nickname: found.nickname, role: found.role } };
      }
      return { success: false, message: "รหัสผ่านไม่ถูกต้อง (เดโมโหมด)" };
    }
    return { success: false, message: "ไม่พบชื่อผู้ใช้นี้ในโหมดเดโม (ลองใช้ student1 / รหัสผ่าน 123)" };
    
  } else if (action === "register") {
    const exists = dbUsers.some(u => u.username.toLowerCase() === data.username.toLowerCase());
    if (exists) {
      return { success: false, message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว (เดโมโหมด)" };
    }
    
    dbUsers.push({ username: data.username, password: data.password, nickname: data.nickname, role: "student" });
    localStorage.setItem("mock_users", JSON.stringify(dbUsers));
    return { success: true, message: "ลงทะเบียนบัญชีใหม่สำเร็จ (เดโมโหมด)" };
    
  } else if (action === "getExamStatus") {
    // Return exam status stripped answers
    const clean = dbExams.map(ex => {
      let status = ex.status;
      if (status === "scheduled") {
        const now = new Date().getTime();
        const start = ex.start_time ? new Date(ex.start_time).getTime() : 0;
        const end = ex.end_time ? new Date(ex.end_time).getTime() : Infinity;
        if (now >= start && now <= end) status = "open";
        else if (now < start) status = "upcoming";
        else status = "closed";
      }
      return {
        set_id: ex.set_id,
        status: status,
        start_time: ex.start_time,
        end_time: ex.end_time,
        release_answers: ex.release_answers === "true" || ex.release_answers === true
      };
    });
    return { success: true, data: clean };
    
  } else if (action === "submitExam") {
    const exam = dbExams.find(ex => ex.set_id.toString() === data.set_id.toString());
    if (!exam) return { success: false, message: "ไม่พบข้อสอบชุดนี้" };
    
    const correctAnswers = exam.answers.split(",");
    let score = 0;
    
    for (let i = 0; i < correctAnswers.length; i++) {
      if (data.answers[i] !== undefined && data.answers[i] !== null && 
          data.answers[i].toString() === correctAnswers[i].toString()) {
        score++;
      }
    }
    
    const newSub = {
      id: "SUB_MOCK_" + Date.now(),
      username: data.username,
      nickname: data.nickname,
      set_id: data.set_id,
      answers: data.answers.join(","),
      score: score,
      submitted_at: new Date().toISOString()
    };
    
    dbSubmissions.push(newSub);
    localStorage.setItem("mock_submissions", JSON.stringify(dbSubmissions));
    
    return {
      success: true,
      data: {
        submission_id: newSub.id,
        score: score,
        total: 30,
        submitted_at: newSub.submitted_at,
        release_answers: exam.release_answers === "true" || exam.release_answers === true,
        correct_answers: (exam.release_answers === "true" || exam.release_answers === true) ? correctAnswers : null
      }
    };
    
  } else if (action === "getLeaderboard") {
    const studentScores = {};
    dbSubmissions.forEach(sub => {
      const nick = sub.nickname.trim();
      const set = sub.set_id.toString();
      const score = parseInt(sub.score) || 0;
      
      if (!studentScores[nick]) {
        studentScores[nick] = { nickname: nick, sets: {}, totalScore: 0 };
      }
      
      if (studentScores[nick].sets[set] === undefined || score > studentScores[nick].sets[set]) {
        studentScores[nick].sets[set] = score;
      }
    });
    
    const leaderboardList = [];
    for (let nick in studentScores) {
      const record = studentScores[nick];
      let total = 0;
      for (let set in record.sets) {
        total += record.sets[set];
      }
      record.totalScore = total;
      leaderboardList.push(record);
    }
    
    leaderboardList.sort((a, b) => b.totalScore - a.totalScore);
    return { success: true, data: leaderboardList };
    
  } else if (action === "getAdminData") {
    // Check admin
    if (data.username !== "admin" || data.password !== "admin1234") {
      return { success: false, message: "สิทธิ์แอดมินโหมดเดโมไม่ถูกต้อง" };
    }
    
    return {
      success: true,
      data: {
        users: dbUsers.map(u => ({ username: u.username, nickname: u.nickname, role: u.role })),
        exams: dbExams,
        submissions: dbSubmissions
      }
    };
    
  } else if (action === "updateExamSettings") {
    if (data.username !== "admin" || data.password !== "admin1234") {
      return { success: false, message: "ไม่มีสิทธิ์ในการแก้ไขการตั้งค่า (เดโมโหมด)" };
    }
    
    const examIdx = dbExams.findIndex(e => e.set_id.toString() === data.set_id.toString());
    if (examIdx === -1) return { success: false, message: "ไม่พบข้อสอบชุดนี้" };
    
    dbExams[examIdx].status = data.status;
    dbExams[examIdx].start_time = data.start_time;
    dbExams[examIdx].end_time = data.end_time;
    dbExams[examIdx].release_answers = data.release_answers;
    
    if (data.answers) {
      dbExams[examIdx].answers = data.answers;
    }
    
    localStorage.setItem("mock_exams", JSON.stringify(dbExams));
    return { success: true, message: "อัปเดตข้อมูลสำเร็จในตัวจำลองเดโม" };
  }
  
  return { success: false, message: "Action not handled in offline mode" };
}

// Utilities: HTML escape
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
