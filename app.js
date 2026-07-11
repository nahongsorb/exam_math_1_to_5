// Global State
let currentUser = null;
let currentSetId = null;
let currentPdfPage = 1;
let pdfZoomScale = 1.0;
let studentAnswers = Array(30).fill(null);

// Re-exam active state
let currentReExamSetId = null;
let reExamStudentAnswers = Array(10).fill("");

// Numerical progressive re-exam questions (10 questions per set)
const RE_EXAM_QUESTIONS = {
  1: [
    { q: "1. จงหาค่า \\(48 \\div 6 \\times 5 - 8\\)", answer: ["32"] },
    { q: "2. ถ้า \\(\\frac{3}{4}\\) ของจำนวนหนึ่งเท่ากับ 24 จงหาจำนวนเดิม", answer: ["32"] },
    { q: "3. จงหา ห.ร.ม. ของ 36 และ 54", answer: ["18"] },
    { q: "4. สี่เหลี่ยมผืนผ้ามีความกว้าง 8 เซนติเมตร และยาว 15 เซนติเมตร จงหาพื้นที่ (ตารางเซนติเมตร)", answer: ["120"] },
    { q: "5. จงหาค่าเฉลี่ยของจำนวน 8, 10, 12, 14 และ 16", answer: ["12"] },
    { q: "6. ถุงใบหนึ่งมีลูกบอลสีแดง 5 ลูก สีน้ำเงิน 3 ลูก และสีเขียว 2 ลูก สุ่มหยิบลูกบอล 1 ลูก จงหาความน่าจะเป็นที่จะได้ลูกบอลสีแดง (ระบุเป็นเศษส่วนอย่างต่ำ เช่น \\(\\frac{1}{2}\\) หรือทศนิยม เช่น 0.5)", answer: ["1/2", "0.5"] },
    { q: "7. ถ้า \\(3x + 5 = 26\\) จงหาค่า \\(x\\)", answer: ["7"] },
    { q: "8. ถังน้ำใบหนึ่งมีน้ำอยู่ \\(\\frac{3}{5}\\) ของความจุทั้งหมด หากเติมน้ำเข้าไปอีก 24 ลิตร จะทำให้ถังมีน้ำเต็มพอดี จงหาความจุของถังน้ำใบนี้ (ลิตร)", answer: ["60"] },
    { q: "9. ถังทรงสี่เหลี่ยมมุมฉากมีความกว้าง 4 เซนติเมตร ยาว 5 เซนติเมตร และสูง 6 เซนติเมตร จงหาปริมาตร (ลูกบาศก์เซนติเมตร)", answer: ["120"] },
    { q: "10. สินค้าราคาป้าย 500 บาท ลดราคา 20% จงหาราคาหลังหักส่วนลด (บาท)", answer: ["400"] }
  ],
  2: [
    { q: "1. จงหาค่าของ \\(48 \\div 6 + 7 \\times 5\\)", answer: ["43"] },
    { q: "2. ร้านค้าลดราคาสินค้า 20% จากราคา 750 บาท หลังจากลดราคาแล้ว สินค้าราคากี่บาท", answer: ["600"] },
    { q: "3. แม่มีส้ม 96 ผล ต้องการแบ่งใส่ถุงให้แต่ละถุงมีจำนวนเท่ากัน และไม่เหลือส้มเลย ถ้าแต่ละถุงมี 12 ผล จะได้ทั้งหมดกี่ถุง", answer: ["8"] },
    { q: "4. จงหาค่า \\(\\frac{3}{4} + \\frac{5}{8}\\) (ระบุเป็นเศษส่วนอย่างต่ำ เช่น \\(\\frac{11}{8}\\))", answer: ["11/8", "1 3/8", "1.375"] },
    { q: "5. สี่เหลี่ยมผืนผ้ากว้าง 8 เซนติเมตร ยาว 15 เซนติเมตร มีพื้นที่กี่ตารางเซนติเมตร", answer: ["120"] },
    { q: "6. จำนวนหนึ่งเมื่อนำไปคูณด้วย 9 แล้วได้ผลลัพธ์เป็น 234 จำนวนเดิมคือเท่าใด", answer: ["26"] },
    { q: "7. นักเรียนห้องหนึ่งมีนักเรียนทั้งหมด 40 คน เป็นผู้หญิง 18 คน ผู้ชายคิดเป็นกี่เปอร์เซ็นต์ของนักเรียนทั้งหมด (ระบุเฉพาะตัวเลขเปอร์เซ็นต์ เช่น 55)", answer: ["55"] },
    { q: "8. จงหาจำนวนที่หายไป: 2, 5, 8, 11, ____, 17", answer: ["14"] },
    { q: "9. จงหาค่า \\(7^2 - 3^2\\)", answer: ["40"] },
    { q: "10. กล่องใบหนึ่งมีลูกบอลสีแดง 6 ลูก สีเขียว 4 ลูก และสีน้ำเงิน 5 ลูก ถ้าหยิบลูกบอลออกมา 1 ลูก โดยไม่มอง ความน่าจะเป็นที่จะได้ลูกบอลสีเขียว (ระบุเป็นเศษส่วนอย่างต่ำ เช่น \\(\\frac{4}{15}\\))", answer: ["4/15"] }
  ],
  3: [
    { q: "1. จงหาค่าของ \\(100 - 9 \\times 9\\)", answer: ["19"] },
    { q: "2. ถ้าครึ่งหนึ่งของจำนวนหนึ่งเท่ากับ 45 จงหาจำนวนเดิม", answer: ["90"] },
    { q: "3. จงหา ห.ร.ม. ของ 20 และ 30", answer: ["10"] },
    { q: "4. สี่เหลี่ยมจัตุรัสมีเส้นรอบรูปยาว 40 เซนติเมตร จงหาพื้นที่ (ตารางเซนติเมตร)", answer: ["100"] },
    { q: "5. จงหาค่าเฉลี่ยของจำนวน 2, 4, 6, 8, 10", answer: ["6"] },
    { q: "6. โยนเหรียญ 1 อัน 1 ครั้ง ความน่าจะเป็นที่จะออกหัวเป็นเท่าใด (เช่น \\(\\frac{1}{2}\\) หรือ 0.5)", answer: ["1/2", "0.5"] },
    { q: "7. ถ้า \\(5x + 10 = 50\\) จงหาค่า \\(x\\)", answer: ["8"] },
    { q: "8. เดินทางด้วยความเร็ว 60 กม./ชม. เป็นเวลา 3 ชั่วโมง ได้ระยะทางกี่กิโลเมตร", answer: ["180"] },
    { q: "9. ทรงกระบอกมีรัศมีฐาน 7 เซนติเมตร สูง 10 เซนติเมตร จงหาปริมาตร (ลูกบาศก์เซนติเมตร) (กำหนด \\(\\pi = \\frac{22}{7}\\))", answer: ["1540"] },
    { q: "10. ซื้อของมา 200 บาท ขายไป 250 บาท ได้กำไรกี่เปอร์เซ็นต์ (ไม่ต้องใส่เครื่องหมาย %)", answer: ["25"] }
  ],
  4: [
    { q: "1. จงหาค่าของ \\(5 \\times (12 + 8) - 15\\)", answer: ["85"] },
    { q: "2. ถ้า \\(\\frac{1}{3}\\) ของจำนวนหนึ่งเท่ากับ 15 จงหาจำนวนเดิม", answer: ["45"] },
    { q: "3. จงหา ค.ร.น. ของ 8 และ 12", answer: ["24"] },
    { q: "4. ที่ดินรูปสี่เหลี่ยมผืนผ้ามีพื้นที่ 200 ตารางเมตร กว้าง 10 เมตร จงหาความยาว (เมตร)", answer: ["20"] },
    { q: "5. จงหาค่าเฉลี่ยของจำนวน 5, 15, 25", answer: ["15"] },
    { q: "6. ทอดลูกเต๋า 1 ลูก ความน่าจะเป็นที่จะได้แต้มคู่เป็นเท่าใด (เช่น \\(\\frac{1}{2}\\) หรือ 0.5)", answer: ["1/2", "0.5"] },
    { q: "7. ถ้า \\(2x - 3 = 17\\) จงหาค่า \\(x\\)", answer: ["10"] },
    { q: "8. ทำงาน 5 วัน ได้ค่าจ้าง 1,500 บาท ถ้าทำงาน 8 วัน จะได้ค่าจ้างกี่บาท", answer: ["2400"] },
    { q: "9. กล่องกว้าง 2 ซม. ยาว 3 ซม. สูง 4 ซม. จงหาปริมาตร (ลูกบาศก์เซนติเมตร)", answer: ["24"] },
    { q: "10. ซื้อของราคา 1,200 บาท ลดราคา 15% จะต้องจ่ายเงินกี่บาท", answer: ["1020"] }
  ],
  5: [
    { q: "1. จงหาค่าของ \\(120 \\div (4 \\times 5) + 9\\)", answer: ["15"] },
    { q: "2. ถ้า \\(\\frac{2}{3}\\) ของจำนวนหนึ่งเท่ากับ 18 จงหาจำนวนเดิม", answer: ["27"] },
    { q: "3. จงหา ห.ร.ม. ของ 15, 30 และ 45", answer: ["15"] },
    { q: "4. รูปสามเหลี่ยมมีฐานยาว 8 เซนติเมตร สูง 5 เซนติเมตร จงหาพื้นที่ (ตารางเซนติเมตร)", answer: ["20"] },
    { q: "5. จงหาค่าเฉลี่ยของจำนวน 10, 20, 30, 40", answer: ["25"] },
    { q: "6. หยิบลูกบอล 1 ลูกจากกล่องที่มีสีขาว 4 ลูก สีดำ 4 ลูก จงหาความน่าจะเป็นที่จะได้สีขาว (เช่น \\(\\frac{1}{2}\\) หรือ 0.5)", answer: ["1/2", "0.5"] },
    { q: "7. ถ้า \\(6x - 4 = 32\\) จงหาค่า \\(x\\)", answer: ["6"] },
    { q: "8. อัตราส่วนอายุ A ต่อ B เป็น \\(3 : 4\\) ถ้า A อายุ 15 ปี B จะอายุเท่าใด", answer: ["20"] },
    { q: "9. ถังทรงลูกบาศก์ยาวด้านละ 10 เซนติเมตร บรรจุน้ำเต็มถัง ปริมาตรน้ำกี่ลิตร (ระบุเป็นจำนวนลิตร 1 ลิตร = 1,000 ลูกบาศก์เซนติเมตร)", answer: ["1"] },
    { q: "10. ขายของราคา 600 บาท ได้กำไร 20% ราคาทุนของสินค้านี้กี่บาท", answer: ["500"] }
  ]
};

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

// Theme Initialization and Toggle
function initTheme() {
  const savedTheme = localStorage.getItem("exam_theme") || "light";
  const toggleBtn = document.getElementById("btn-theme-toggle");
  
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    if (toggleBtn) {
      toggleBtn.querySelector(".theme-icon-light").classList.add("hidden");
      toggleBtn.querySelector(".theme-icon-dark").classList.remove("hidden");
    }
  } else {
    document.documentElement.classList.remove("dark");
    if (toggleBtn) {
      toggleBtn.querySelector(".theme-icon-light").classList.remove("hidden");
      toggleBtn.querySelector(".theme-icon-dark").classList.add("hidden");
    }
  }
}

// Refresh Lucide Icons on Dynamic Render
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

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
  initTheme();
  checkConfig();
  setupEventListeners();
  checkLoginStatus();
  generateWorkspaceAnswerSheet();
  refreshIcons();
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
  // Theme toggler click listener
  const toggleBtn = document.getElementById("btn-theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("exam_theme", isDark ? "dark" : "light");
      
      const lightIcon = toggleBtn.querySelector(".theme-icon-light");
      const darkIcon = toggleBtn.querySelector(".theme-icon-dark");
      
      if (isDark) {
        lightIcon.classList.add("hidden");
        darkIcon.classList.remove("hidden");
      } else {
        lightIcon.classList.remove("hidden");
        darkIcon.classList.add("hidden");
      }
    });
  }

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

  // Re-exam Action Listeners
  document.getElementById("btn-go-to-re-exam").addEventListener("click", () => {
    showSection("re-exam-room-section");
    loadReExamRoom();
  });
  document.getElementById("btn-re-exam-back").addEventListener("click", () => {
    showSection("portal-section");
    loadPortal();
  });
  document.getElementById("btn-submit-re-exam").addEventListener("click", submitReExamAnswers);

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
      
      if (targetId === "admin-tab-analysis") {
        renderWrongAnswersAnalysis();
      }
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

  // Toggle schedule inputs based on selected status dropdown
  document.getElementById("admin-exam-status").addEventListener("change", (e) => {
    const scheduleRow = document.getElementById("schedule-inputs-row");
    if (e.target.value === "scheduled") {
      scheduleRow.classList.add("active");
    } else {
      scheduleRow.classList.remove("active");
    }
  });

  // Admin filter submissions
  document.getElementById("input-search-submission").addEventListener("input", filterAdminSubmissions);
  document.getElementById("select-filter-set").addEventListener("change", filterAdminSubmissions);
  document.getElementById("btn-refresh-submissions").addEventListener("click", fetchAdminAllData);
  document.getElementById("btn-export-submissions-csv").addEventListener("click", exportSubmissionsCSV);
  document.getElementById("select-analysis-set").addEventListener("change", renderWrongAnswersAnalysis);

  // Admin login submission
  document.getElementById("btn-admin-auth-submit").addEventListener("click", handleAdminAuth);
  
  // Admin quick key input auto-fill
  document.getElementById("admin-quick-key-input").addEventListener("input", (e) => {
    const val = e.target.value;
    let digits = [];
    if (val.includes(",")) {
      digits = val.split(",").map(x => x.trim()).filter(x => x !== "");
    } else {
      // Strip everything except 1-4 and split to characters
      digits = val.replace(/[^1-4]/g, "").split("");
    }
    
    // Auto-select dropdown choices based on parsed digits
    const limit = Math.min(30, digits.length);
    for (let i = 0; i < limit; i++) {
      const qNum = i + 1;
      const digit = digits[i];
      if (["1", "2", "3", "4"].includes(digit)) {
        const select = document.getElementById(`admin-key-q${qNum}`);
        if (select) {
          select.value = digit;
        }
      }
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
    if (currentUser.role === "teacher") {
      currentUser.password = pass;
    }
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
        <button type="button" class="btn-clear-choice" data-q="${q}" title="ล้างคำตอบ">
          <i data-lucide="trash-2" class="icon-xs"></i>
        </button>
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
  
  refreshIcons();
}

// Load Portal Data (Available Exams and Leaderboard Sidebar)
async function loadPortal() {
  showLoading("กำลังโหลดชุดข้อสอบ...");
  const res = await apiCall("getExamStatus", { username: currentUser ? currentUser.username : null });
  hideLoading();
  
  if (!res.success) {
    alert("ไม่สามารถโหลดข้อสอบได้: " + res.message);
    return;
  }
  
  // Toggle re-exam alert banner
  const banner = document.getElementById("re-exam-alert-banner");
  if (banner) {
    if (res.pending_re_exams && res.pending_re_exams.length > 0) {
      document.getElementById("re-exam-count").innerText = res.pending_re_exams.length;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
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
      btnHtml = `<button class="btn btn-primary btn-block" onclick="launchExam(${exam.set_id})">
                  เริ่มทำข้อสอบ
                  <i data-lucide="arrow-right" class="icon-xs"></i>
                </button>`;
    } else if (exam.status === "closed") {
      statusText = "ปิดการส่งคำตอบ";
      btnHtml = `<button class="btn btn-secondary btn-block" disabled style="opacity: 0.65;">
                  <i data-lucide="lock" class="icon-xs"></i>
                  หมดเวลาสอบแล้ว
                </button>`;
    } else if (exam.status === "upcoming") {
      statusText = "เตรียมระบบ (เร็วๆ นี้)";
      let schedInfo = "";
      if (exam.start_time) {
        const timeStr = new Date(exam.start_time).toLocaleString("th-TH", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
        schedInfo = `<div class="exam-sched-info"><i data-lucide="calendar" class="icon-xxs"></i> เปิดสอบ: ${timeStr}</div>`;
      }
      btnHtml = `<button class="btn btn-secondary btn-block" disabled style="opacity: 0.65;">
                  <i data-lucide="calendar-clock" class="icon-xs"></i>
                  รอเปิดระบบ
                </button>${schedInfo}`;
    }
    
    const myScore = savedScores[exam.set_id];
    const scoreText = myScore !== undefined ? `
      <div class="score-display-portal">
        <i data-lucide="check-circle" class="icon-xs"></i>
        <span>คะแนนของคุณ: ${myScore}/30 คะแนน</span>
      </div>` : "";
    
    card.innerHTML = `
      <div class="exam-card-header">
        <div>
          <h3 class="exam-set-title">ข้อสอบชุดที่ ${exam.set_id}</h3>
          <p class="exam-card-subtitle">ติวเนื้อหาเข้มข้น ม.1 เทอม 2</p>
        </div>
        <span class="status-badge ${exam.status}">${statusText}</span>
      </div>
      <div class="exam-card-meta">
        <div class="exam-meta-item">
          <i data-lucide="help-circle" class="icon-xs"></i>
          <span>30 ข้อ</span>
        </div>
        <div class="exam-meta-item">
          <i data-lucide="clock" class="icon-xs"></i>
          <span>60 นาที</span>
        </div>
      </div>
      ${scoreText}
      <div class="exam-card-footer">
        ${btnHtml}
      </div>
    `;
    container.appendChild(card);
  });
  
  // Load sidebar leaderboard
  loadLeaderboard(true);
}

// Generate a beautiful pastel avatar with student initials
function getAvatarHtml(nickname) {
  const firstChar = nickname ? nickname.trim().charAt(0).toUpperCase() : "?";
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#FF3B30', // Apple Red
    '#FF9F0A', // Apple Orange
    '#34C759', // Apple Green
    '#0071E3', // Apple Blue
    '#AF52DE', // Apple Purple
    '#5856D6', // Apple Indigo
    '#FF2D55'  // Apple Pink
  ];
  const color = colors[Math.abs(hash) % colors.length];
  return `<div class="student-avatar" style="background-color: ${color};">${firstChar}</div>`;
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
      li.className = `rank-${i+1} mini-leaderboard-item`;
      
      let rankBadge = `<span class="leader-rank">${i+1}</span>`;
      if (i === 0) rankBadge = `<span class="leader-rank rank-1">🥇</span>`;
      else if (i === 1) rankBadge = `<span class="leader-rank rank-2">🥈</span>`;
      else if (i === 2) rankBadge = `<span class="leader-rank rank-3">🥉</span>`;
      
      let reBadgeHtml = "";
      if (item.pending_re_exams && item.pending_re_exams.length > 0) {
        reBadgeHtml = `<span class="badge-re-exam pending" title="ต้องสอบซ่อมชุดที่ ${item.pending_re_exams.join(', ')}">🔴 ซ่อมชุด ${item.pending_re_exams.join(',')}</span>`;
      }
      
      li.innerHTML = `
        ${rankBadge}
        ${getAvatarHtml(item.nickname)}
        <span class="leader-name">${escapeHtml(item.nickname)} ${reBadgeHtml}</span>
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
      let rowClass = "";
      // Gold, Silver, Bronze icons
      if (index === 0) { rankText = "🥇"; rowClass = "row-rank-1"; }
      else if (index === 1) { rankText = "🥈"; rowClass = "row-rank-2"; }
      else if (index === 2) { rankText = "🥉"; rowClass = "row-rank-3"; }
      
      let reBadgeHtml = "";
      if (item.pending_re_exams && item.pending_re_exams.length > 0) {
        reBadgeHtml = `<span class="badge-re-exam pending" title="ต้องสอบซ่อมชุดที่ ${item.pending_re_exams.join(', ')}">🔴 ซ่อมชุด ${item.pending_re_exams.join(',')}</span>`;
      }
      
      tr.className = rowClass;
      tr.innerHTML = `
        <td style="text-align: center; font-weight: bold; font-size:18px;">${rankText}</td>
        <td class="student-cell-with-avatar">
          ${getAvatarHtml(item.nickname)}
          <span class="student-nickname">${escapeHtml(item.nickname)} ${reBadgeHtml}</span>
        </td>
        <td style="text-align: center;">${s1}</td>
        <td style="text-align: center;">${s2}</td>
        <td style="text-align: center;">${s3}</td>
        <td style="text-align: center;">${s4}</td>
        <td style="text-align: center;">${s5}</td>
        <td style="text-align: center; font-weight: bold; color: var(--primary-color); font-size: 16px;">${item.totalScore}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  refreshIcons();
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
        
        const icon = isCorrect ? '<i data-lucide="check" class="icon-xxs"></i>' : '<i data-lucide="x" class="icon-xxs"></i>';
        box.innerHTML = `
          <span class="review-box-num">ข้อ ${qNum}</span>
          <span class="review-box-choice">
            ${icon}
            ตอบ: ${myAns}
          </span>
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
        box.className = "review-box score-only";
        box.innerHTML = `
          <span class="review-box-num">ข้อ ${qNum}</span>
          <span class="review-box-choice">ตอบ: ${myAns}</span>
        `;
        grid.appendChild(box);
      }
    }
    
    refreshIcons();
    showSection("result-section");
  } else {
    alert("เกิดข้อผิดพลาดในการส่งคำตอบ: " + res.message);
  }
}

// --- CLIENT RE-EXAM ROOM FUNCTIONS ---

// Load Re-exam room content
async function loadReExamRoom() {
  showLoading("กำลังโหลดห้องสอบซ่อม...");
  const res = await apiCall("getExamStatus", { username: currentUser.username });
  hideLoading();
  
  if (!res.success) {
    alert("ไม่สามารถโหลดข้อมูลห้องสอบซ่อมได้: " + res.message);
    return;
  }
  
  const pendingSets = res.pending_re_exams || [];
  const listContainer = document.getElementById("re-exam-set-list");
  listContainer.innerHTML = "";
  
  const flowContainer = document.getElementById("re-exam-questions-flow");
  const submitArea = document.getElementById("re-exam-submit-area");
  
  // Clear displays
  flowContainer.innerHTML = "";
  submitArea.classList.add("hidden");
  document.getElementById("re-exam-title-display").innerText = "กรุณาเลือกชุดข้อสอบซ่อมทางด้านซ้าย";
  
  if (pendingSets.length === 0) {
    listContainer.innerHTML = `<div style="color:var(--text-secondary); text-align:center; font-size:13px; padding:15px;">คุณไม่มีข้อสอบซ่อมค้างอยู่ในขณะนี้! 🎉</div>`;
    return;
  }
  
  pendingSets.forEach(setId => {
    const btn = document.createElement("button");
    btn.className = "btn-re-exam-set";
    btn.innerHTML = `<span>ข้อสอบชุดที่ ${setId}</span> <i data-lucide="chevron-right" class="icon-xxs"></i>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-re-exam-set").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      startReExam(parseInt(setId));
    });
    listContainer.appendChild(btn);
  });
  
  refreshIcons();
}

// Check Client Re-exam Answer helper
function checkClientReExamAnswer(setId, qIdx, value) {
  const userAns = value ? value.toString().trim() : "";
  
  // Special Q6 check for Set 1
  if (setId === 1 && qIdx === 5) {
    return userAns === "1/2" || userAns === "0.5";
  }
  
  // Special Q4 check for Set 2
  if (setId === 2 && qIdx === 3) {
    return userAns === "11/8" || userAns === "1.375" || userAns === "1 3/8";
  }
  
  const qConfig = RE_EXAM_QUESTIONS[setId];
  if (!qConfig || qIdx >= qConfig.length) return false;
  return qConfig[qIdx].answer.map(a => a.toString().trim()).includes(userAns);
}

// Start active re-exam set
function startReExam(setId) {
  currentReExamSetId = setId;
  reExamStudentAnswers = Array(10).fill("");
  
  const titleDisplay = document.getElementById("re-exam-title-display");
  titleDisplay.innerText = `ทำข้อสอบซ่อม: ข้อสอบชุดที่ ${setId}`;
  
  const flowContainer = document.getElementById("re-exam-questions-flow");
  flowContainer.innerHTML = "";
  
  const submitArea = document.getElementById("re-exam-submit-area");
  submitArea.classList.add("hidden");
  
  const questions = RE_EXAM_QUESTIONS[setId] || [];
  
  questions.forEach((q, idx) => {
    const qRow = document.createElement("div");
    qRow.className = `re-exam-q-row locked`;
    qRow.id = `re-exam-q-row-${idx}`;
    
    // Check if the answer can be a fraction (contains /)
    const isFraction = q.answer.some(ans => ans.includes("/"));
    
    let inputHtml = "";
    if (isFraction) {
      inputHtml = `
        <div class="re-exam-fraction-wrapper">
          <input type="text" inputmode="numeric" pattern="[0-9]*" class="re-exam-input re-exam-num" id="re-exam-ans-${idx}-num" placeholder="เศษ" disabled>
          <span class="re-exam-fraction-divider"></span>
          <input type="text" inputmode="numeric" pattern="[0-9]*" class="re-exam-input re-exam-den" id="re-exam-ans-${idx}-den" placeholder="ส่วน" disabled>
        </div>
        <button class="btn btn-primary" id="btn-check-re-q-${idx}" disabled style="border-radius:10px; padding:10px 16px; font-weight:600; font-size:14px;">ตรวจ</button>
        <span class="re-exam-status-icon" id="re-status-icon-${idx}"></span>
      `;
    } else {
      inputHtml = `
        <input type="text" class="re-exam-input" id="re-exam-ans-${idx}" placeholder="พิมพ์ตัวเลขคำตอบที่นี่" disabled>
        <button class="btn btn-primary" id="btn-check-re-q-${idx}" disabled style="border-radius:10px; padding:10px 16px; font-weight:600; font-size:14px;">ตรวจ</button>
        <span class="re-exam-status-icon" id="re-status-icon-${idx}"></span>
      `;
    }
    
    qRow.innerHTML = `
      <div class="re-exam-q-text">${q.q}</div>
      <div class="re-exam-input-container">
        ${inputHtml}
      </div>
    `;
    
    flowContainer.appendChild(qRow);
    
    // Add input event listeners (Enter key submit)
    const inputs = qRow.querySelectorAll(`.re-exam-input`);
    inputs.forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          checkQuestionAnswer(idx);
        }
      });
    });
    
    // Add check button event listener
    const btn = qRow.querySelector(`button`);
    btn.addEventListener("click", () => {
      checkQuestionAnswer(idx);
    });
  });
  
  // Render math in flowContainer using KaTeX auto-render
  if (window.renderMathInElement) {
    window.renderMathInElement(flowContainer, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });
  }
  
  // Unlock first question
  unlockReExamQuestion(0);
}

// Helper to unlock specific question
function unlockReExamQuestion(idx) {
  const row = document.getElementById(`re-exam-q-row-${idx}`);
  if (!row) return;
  
  row.classList.remove("locked");
  row.classList.add("active");
  
  const input = document.getElementById(`re-exam-ans-${idx}`);
  const numInput = document.getElementById(`re-exam-ans-${idx}-num`);
  const denInput = document.getElementById(`re-exam-ans-${idx}-den`);
  const btn = document.getElementById(`btn-check-re-q-${idx}`);
  
  if (input) {
    input.disabled = false;
    input.focus();
  }
  if (numInput && denInput) {
    numInput.disabled = false;
    denInput.disabled = false;
    numInput.focus();
  }
  if (btn) {
    btn.disabled = false;
  }
}

// Helper to check answer for specific question
function checkQuestionAnswer(idx) {
  const input = document.getElementById(`re-exam-ans-${idx}`);
  const numInput = document.getElementById(`re-exam-ans-${idx}-num`);
  const denInput = document.getElementById(`re-exam-ans-${idx}-den`);
  const btn = document.getElementById(`btn-check-re-q-${idx}`);
  const statusIcon = document.getElementById(`re-status-icon-${idx}`);
  const row = document.getElementById(`re-exam-q-row-${idx}`);
  
  let value = "";
  let isFraction = false;
  
  if (numInput && denInput) {
    isFraction = true;
    const num = numInput.value.trim();
    const den = denInput.value.trim();
    if (!num || !den) {
      alert("กรุณากรอกเศษส่วนให้ครบถ้วน");
      if (!num) numInput.focus();
      else denInput.focus();
      return;
    }
    value = num + "/" + den;
  } else if (input) {
    value = input.value.trim();
    if (!value) {
      alert("กรุณากรอกคำตอบ");
      input.focus();
      return;
    }
  }
  
  const isCorrect = checkClientReExamAnswer(currentReExamSetId, idx, value);
  
  if (isCorrect) {
    // Green styling and lock
    if (isFraction) {
      numInput.classList.remove("is-invalid");
      numInput.classList.add("is-valid");
      numInput.disabled = true;
      denInput.classList.remove("is-invalid");
      denInput.classList.add("is-valid");
      denInput.disabled = true;
    } else {
      input.classList.remove("is-invalid");
      input.classList.add("is-valid");
      input.disabled = true;
    }
    if (btn) btn.disabled = true;
    
    statusIcon.className = "re-exam-status-icon check";
    statusIcon.innerHTML = `<i data-lucide="check" class="icon-sm"></i>`;
    
    row.classList.remove("active", "incorrect");
    row.classList.add("correct");
    
    reExamStudentAnswers[idx] = value;
    
    // Refresh checkmark icon
    refreshIcons();
    
    // Unlock next question or show submit button
    if (idx < 9) {
      unlockReExamQuestion(idx + 1);
    } else {
      // Show submit button area
      const submitArea = document.getElementById("re-exam-submit-area");
      submitArea.classList.remove("hidden");
      document.getElementById("btn-submit-re-exam").focus();
    }
  } else {
    // Red styling & shake animation
    if (isFraction) {
      numInput.classList.add("is-invalid");
      denInput.classList.add("is-invalid");
      numInput.focus();
      numInput.select();
    } else {
      input.classList.add("is-invalid");
      input.focus();
      input.select();
    }
    statusIcon.className = "re-exam-status-icon cross";
    statusIcon.innerHTML = `<i data-lucide="x" class="icon-sm"></i>`;
    row.classList.add("incorrect");
    
    // Shake row
    row.classList.add("shake");
    setTimeout(() => {
      row.classList.remove("shake");
    }, 400);
    
    refreshIcons();
  }
}

// Submit Re-exam results
async function submitReExamAnswers() {
  if (reExamStudentAnswers.includes("")) {
    alert("กรุณาตอบคำถามให้ถูกต้องครบทุกข้อก่อนส่ง");
    return;
  }
  
  const confirmSubmit = confirm("คุณได้ตอบคำถามถูกต้องครบถ้วนแล้ว ต้องการส่งกระดาษคำตอบซ่อมเพื่อล้างสถานะหรือไม่?");
  if (!confirmSubmit) return;
  
  const spinner = document.getElementById("re-exam-submit-spinner");
  spinner.classList.remove("hidden");
  document.getElementById("btn-submit-re-exam").disabled = true;
  
  showLoading("กำลังบันทึกคะแนนสอบซ่อม...");
  const res = await apiCall("submitExam", {
    username: currentUser.username,
    nickname: currentUser.nickname,
    set_id: currentReExamSetId,
    answers: reExamStudentAnswers,
    is_re_exam: true
  });
  hideLoading();
  
  spinner.classList.add("hidden");
  document.getElementById("btn-submit-re-exam").disabled = false;
  
  if (res.success && res.data.passed) {
    alert("ยินดีด้วย! คุณสอบซ่อมชุดที่ " + currentReExamSetId + " ผ่านเรียบร้อยแล้วและระบบได้ทำการเคลียร์สถานะติดซ่อมแล้ว!");
    showSection("portal-section");
    loadPortal();
  } else {
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (res.message || "คะแนนสอบซ่อมไม่ตรงตามเกณฑ์"));
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
    localStorage.setItem("exam_user", JSON.stringify(currentUser));
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
  
  if (!currentUser.password) {
    // If no password stored, prompt for authentication
    document.getElementById("admin-auth-panel").classList.remove("hidden");
    document.getElementById("admin-dashboard-panel").classList.add("hidden");
    document.getElementById("admin-username").value = currentUser.username;
    document.getElementById("admin-password").value = "";
    document.getElementById("admin-auth-message").innerText = "กรุณากรอกรหัสผ่านคุณครูอีกครั้งเพื่อความปลอดภัย";
    return;
  }
  
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

// Helper to calculate dynamic re-exam status of a student for a set
function getStudentSetReExamStatus(username, setId) {
  if (!adminAllData) return "none";
  
  // Find exam config to get passing score
  const exam = adminAllData.exams.find(e => e.set_id.toString() === setId.toString());
  const threshold = exam && exam.passing_score !== undefined ? parseInt(exam.passing_score) : 15;
  
  // Find highest score of this student for this set
  let highestScore = -1;
  if (adminAllData.submissions) {
    adminAllData.submissions.forEach(sub => {
      if (sub.username.toLowerCase() === username.toLowerCase() && sub.set_id.toString() === setId.toString()) {
        const score = parseInt(sub.score) || 0;
        if (score > highestScore) highestScore = score;
      }
    });
  }
  
  // Find explicit re_exam entry
  const rx = adminAllData.re_exams ? adminAllData.re_exams.find(r => r.username.toLowerCase() === username.toLowerCase() && r.set_id.toString() === setId.toString()) : null;
  
  if (rx) {
    if (rx.status === "pending") {
      return "pending";
    } else if (rx.status === "passed") {
      return "passed";
    } else if (rx.status === "none") {
      return "none";
    }
  }
  
  if (highestScore !== -1) {
    if (highestScore < threshold) {
      return "pending"; // Auto-pending because score is under threshold
    } else {
      return "passed"; // Auto-passed because score is above threshold
    }
  }
  
  return "none";
}

// Render everything on Teacher Dashboard
function renderAdminDashboard() {
  if (!adminAllData) return;
  
  // Render users list
  const usersTbody = document.getElementById("table-body-users");
  usersTbody.innerHTML = "";
  adminAllData.users.forEach(u => {
    const tr = document.createElement("tr");
    
    let reExamCol = "";
    if (u.role === "student") {
      reExamCol = `<div class="teacher-re-exam-status-group">`;
      for (let s = 1; s <= 5; s++) {
        const status = getStudentSetReExamStatus(u.username, s);
        let badgeClass = "none";
        let badgeIcon = "⚪";
        let tooltip = "ไม่มีประวัติการสอบ";
        
        if (status === "pending") {
          badgeClass = "pending";
          badgeIcon = "🔴";
          tooltip = "ต้องสอบซ่อม (Pending)";
        } else if (status === "passed") {
          badgeClass = "passed";
          badgeIcon = "🟢";
          tooltip = "สอบซ่อมผ่านหรือผ่านเกณฑ์แล้ว (Passed)";
        }
        
        reExamCol += `<span class="teacher-re-exam-badge ${badgeClass}" title="${tooltip}" onclick="manageStudentReExam('${u.username}', '${u.nickname}', ${s}, '${status}')">${s}${badgeIcon}</span>`;
      }
      reExamCol += `</div>`;
    } else {
      reExamCol = `<span style="color:var(--text-secondary); font-size:12px;">คุณครู (แอดมิน)</span>`;
    }
    
    tr.innerHTML = `
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.nickname)}</td>
      <td><span class="user-badge" style="background:rgba(255,255,255,0.05); color:var(--text-primary); border:none;">${u.role}</span></td>
      <td style="text-align: center;">${reExamCol}</td>
    `;
    usersTbody.appendChild(tr);
  });

  // Global helper for managing student re-exams via the badges
  window.manageStudentReExam = async function(username, nickname, setId, currentStatus) {
    const promptMsg = `จัดการสถานะสอบซ่อมของนักเรียน: ${nickname} (${username})\nข้อสอบชุดที่ ${setId}\nสถานะปัจจุบัน: ${currentStatus}\n\nกรุณาเลือกปุ่มการทำงาน:\n1 - สั่งให้สอบซ่อม (Pending)\n2 - ทำเครื่องหมายว่าผ่านแล้ว (Passed)\n3 - ยกเลิก/ล้างสถานะ (None)\n\n(พิมพ์ตัวเลข 1, 2, 3 หรือกดยกเลิก)`;
    
    const choice = prompt(promptMsg);
    if (choice === null) return;
    
    let newStatus = "";
    if (choice === "1") {
      newStatus = "pending";
    } else if (choice === "2") {
      newStatus = "passed";
    } else if (choice === "3") {
      newStatus = "none";
    } else {
      alert("ตัวเลือกไม่ถูกต้อง");
      return;
    }
    
    showLoading("กำลังอัปเดตสถานะสอบซ่อม...");
    const res = await apiCall("toggleReExamStatus", {
      username: currentUser.username,
      password: currentUser.password,
      target_username: username,
      set_id: setId,
      status: newStatus
    });
    hideLoading();
    
    if (res.success) {
      alert(res.message);
      fetchAdminAllData();
    } else {
      alert("ล้มเหลว: " + res.message);
    }
  };
  
  // Render submissions table
  renderAdminSubmissionsList();
  
  // Load settings for the active admin selected set
  loadAdminSetSettings();
  
  // Render analysis if current tab is active
  const activeTab = document.querySelector(".admin-tab.active");
  if (activeTab && activeTab.getAttribute("data-tab") === "admin-tab-analysis") {
    renderWrongAnswersAnalysis();
  }
  
  refreshIcons();
}

// Load configurations for Selected Set into admin form
function loadAdminSetSettings() {
  if (!adminAllData) return;
  
  const exam = adminAllData.exams.find(e => e.set_id.toString() === adminSelectedSet.toString());
  if (!exam) return;
  
  document.getElementById("admin-set-config-title").innerText = `ตั้งค่า: ข้อสอบชุดที่ ${adminSelectedSet}`;
  document.getElementById("admin-exam-status").value = exam.status;
  document.getElementById("admin-exam-release-answers").value = exam.release_answers.toString();
  document.getElementById("admin-exam-passing-score").value = exam.passing_score !== undefined ? exam.passing_score : 15;
  
  // Start / End time formats conversion
  // Sheets return ISO or formatted datetime, we need "yyyy-MM-ddThh:mm" format for input
  document.getElementById("admin-exam-start-time").value = formatDateForInput(exam.start_time);
  document.getElementById("admin-exam-end-time").value = formatDateForInput(exam.end_time);
  
  // Populate quick-fill input text box
  document.getElementById("admin-quick-key-input").value = exam.answers || "";
  
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
    
    return `${year}-${month}-${day}T${hours}:${minutes}`; // html5 uses T and : separators
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
  const passingScore = document.getElementById("admin-exam-passing-score").value;
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
    release_answers: releaseAnswers,
    passing_score: passingScore
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
      <td class="student-cell-with-avatar">
        ${getAvatarHtml(sub.nickname)}
        <span class="student-nickname">${escapeHtml(sub.nickname)}</span>
      </td>
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
  if (!localStorage.getItem("mock_re_exams")) {
    localStorage.setItem("mock_re_exams", JSON.stringify([]));
  }
  if (!localStorage.getItem("mock_re_submissions")) {
    localStorage.setItem("mock_re_submissions", JSON.stringify([]));
  }
  
  const dbUsers = JSON.parse(localStorage.getItem("mock_users"));
  const dbExams = JSON.parse(localStorage.getItem("mock_exams"));
  const dbSubmissions = JSON.parse(localStorage.getItem("mock_submissions"));
  const dbReExams = JSON.parse(localStorage.getItem("mock_re_exams"));
  const dbReSubmissions = JSON.parse(localStorage.getItem("mock_re_submissions"));
  
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
        release_answers: ex.release_answers === "true" || ex.release_answers === true,
        passing_score: ex.passing_score !== undefined ? parseInt(ex.passing_score) : 15
      };
    });
    
    const pendingReExams = [];
    if (data.username) {
      const targetU = data.username.toString().trim().toLowerCase();
      dbReExams.forEach(rx => {
        if (rx.username.toString().trim().toLowerCase() === targetU && rx.status === "pending") {
          pendingReExams.push(rx.set_id.toString());
        }
      });
    }
    return { success: true, data: clean, pending_re_exams: pendingReExams };
    
  } else if (action === "submitExam") {
    const isRe = data.is_re_exam === true || data.is_re_exam === "true";
    
    if (isRe) {
      // Re-exam grading
      const setId = data.set_id.toString();
      const userAnswers = data.answers;
      let score = 0;
      
      const correctList = RE_EXAM_QUESTIONS[setId];
      for (let j = 0; j < 10; j++) {
        const uAns = userAnswers[j] ? userAnswers[j].toString().trim() : "";
        const cAnsList = correctList[j].answer;
        if (setId === "1" && j === 5) {
          if (uAns === "1/2" || uAns === "0.5") {
            score++;
          }
        } else if (setId === "2" && j === 3) {
          if (uAns === "11/8" || uAns === "1.375" || uAns === "1 3/8") {
            score++;
          }
        } else {
          if (cAnsList.map(a => a.toString().trim()).includes(uAns)) {
            score++;
          }
        }
      }
      
      const passed = (score === 10);
      const newSub = {
        id: "SUB_MOCK_RE_" + Date.now(),
        username: data.username,
        nickname: data.nickname,
        set_id: data.set_id,
        answers: data.answers.join(","),
        score: score,
        submitted_at: new Date().toISOString()
      };
      
      dbReSubmissions.push(newSub);
      localStorage.setItem("mock_re_submissions", JSON.stringify(dbReSubmissions));
      
      if (passed) {
        const targetU = data.username.toLowerCase();
        const rxIdx = dbReExams.findIndex(rx => rx.username.toLowerCase() === targetU && rx.set_id.toString() === setId);
        if (rxIdx !== -1) {
          dbReExams[rxIdx].status = "passed";
          dbReExams[rxIdx].assigned_at = newSub.submitted_at;
        } else {
          dbReExams.push({ username: data.username, nickname: data.nickname, set_id: data.set_id, status: "passed", assigned_at: newSub.submitted_at });
        }
        localStorage.setItem("mock_re_exams", JSON.stringify(dbReExams));
      }
      
      return {
        success: true,
        data: {
          submission_id: newSub.id,
          score: score,
          total: 10,
          passed: passed,
          submitted_at: newSub.submitted_at
        }
      };
    }
    
    // Normal exam grading
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
    
    // Auto-flag re-exam if score < passing_score
    const passingScore = exam.passing_score !== undefined && exam.passing_score !== "" ? parseInt(exam.passing_score) : 15;
    const targetU = data.username.toLowerCase();
    const rxIdx = dbReExams.findIndex(rx => rx.username.toLowerCase() === targetU && rx.set_id.toString() === data.set_id.toString());
    
    if (score < passingScore) {
      if (rxIdx !== -1) {
        dbReExams[rxIdx].status = "pending";
        dbReExams[rxIdx].assigned_at = newSub.submitted_at;
      } else {
        dbReExams.push({ username: data.username, nickname: data.nickname, set_id: data.set_id, status: "pending", assigned_at: newSub.submitted_at });
      }
    } else {
      if (rxIdx !== -1) {
        dbReExams[rxIdx].status = "passed";
        dbReExams[rxIdx].assigned_at = newSub.submitted_at;
      }
    }
    localStorage.setItem("mock_re_exams", JSON.stringify(dbReExams));
    
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
      if (!sub.username) return;
      const u = sub.username.toLowerCase();
      const nick = sub.nickname.trim();
      const set = sub.set_id.toString();
      const score = parseInt(sub.score) || 0;
      
      if (!studentScores[u]) {
        studentScores[u] = { nickname: nick, sets: {}, totalScore: 0, pending_re_exams: [] };
      }
      
      if (studentScores[u].sets[set] === undefined || score > studentScores[u].sets[set]) {
        studentScores[u].sets[set] = score;
      }
    });
    
    // Attach pending re-exams to leaderboard users
    dbReExams.forEach(rx => {
      if (rx.status === "pending") {
        const u = rx.username.toLowerCase();
        if (studentScores[u]) {
          if (!studentScores[u].pending_re_exams.includes(rx.set_id.toString())) {
            studentScores[u].pending_re_exams.push(rx.set_id.toString());
          }
        }
      }
    });
    
    const leaderboardList = [];
    for (let u in studentScores) {
      const record = studentScores[u];
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
    if (data.username !== "admin" || data.password !== "admin1234") {
      return { success: false, message: "สิทธิ์แอดมินโหมดเดโมไม่ถูกต้อง" };
    }
    
    return {
      success: true,
      data: {
        users: dbUsers.map(u => ({ username: u.username, nickname: u.nickname, role: u.role })),
        exams: dbExams,
        submissions: dbSubmissions,
        re_exams: dbReExams
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
    dbExams[examIdx].passing_score = data.passing_score !== undefined && data.passing_score !== "" ? parseInt(data.passing_score) : 15;
    
    if (data.answers) {
      dbExams[examIdx].answers = data.answers;
    }
    
    localStorage.setItem("mock_exams", JSON.stringify(dbExams));
    return { success: true, message: "อัปเดตข้อมูลสำเร็จในตัวจำลองเดโม" };
    
  } else if (action === "toggleReExamStatus") {
    if (data.username !== "admin" || data.password !== "admin1234") {
      return { success: false, message: "ไม่มีสิทธิ์ในการเข้าถึง (เดโมโหมด)" };
    }
    
    const targetU = data.target_username.toString().trim().toLowerCase();
    const setId = data.set_id.toString();
    const rxIdx = dbReExams.findIndex(rx => rx.username.toLowerCase() === targetU && rx.set_id.toString() === setId);
    
    if (data.status === "none") {
      if (rxIdx !== -1) {
        dbReExams.splice(rxIdx, 1);
      }
    } else {
      if (rxIdx !== -1) {
        dbReExams[rxIdx].status = data.status;
        dbReExams[rxIdx].assigned_at = new Date().toISOString();
      } else {
        const foundUser = dbUsers.find(u => u.username.toLowerCase() === targetU);
        const nickname = foundUser ? foundUser.nickname : targetU;
        dbReExams.push({
          username: data.target_username,
          nickname: nickname,
          set_id: data.set_id,
          status: data.status,
          assigned_at: new Date().toISOString()
        });
      }
    }
    localStorage.setItem("mock_re_exams", JSON.stringify(dbReExams));
    return { success: true, message: "อัปเดตสถานะสอบซ่อมสำเร็จในตัวจำลองเดโม" };
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

// Render wrong answers analysis for the teacher
function renderWrongAnswersAnalysis() {
  if (!adminAllData) return;
  
  const selectedSet = document.getElementById("select-analysis-set").value;
  const tbody = document.getElementById("table-body-analysis");
  tbody.innerHTML = "";
  
  // 1. Get the exam config for the selected set to find correct answers
  const exam = adminAllData.exams.find(e => e.set_id.toString() === selectedSet.toString());
  if (!exam || !exam.answers) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">ไม่พบข้อมูลเฉลยสำหรับข้อสอบชุดนี้</td></tr>`;
    return;
  }
  const correctAnswers = exam.answers.split(",");
  
  // 2. Filter submissions for this set
  const subs = adminAllData.submissions.filter(s => s.set_id.toString() === selectedSet.toString());
  const totalSubmissions = subs.length;
  
  document.getElementById("analysis-total-submissions").innerText = `${totalSubmissions} คน`;
  
  if (totalSubmissions === 0) {
    document.getElementById("analysis-avg-score").innerText = "0.00 / 30";
    document.getElementById("analysis-most-wrong-q").innerText = "-";
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">ยังไม่มีประวัติการส่งข้อสอบชุดนี้ในระบบ</td></tr>`;
    return;
  }
  
  // Calculate average score
  let totalScore = 0;
  subs.forEach(s => totalScore += (parseInt(s.score) || 0));
  const avgScore = (totalScore / totalSubmissions).toFixed(2);
  document.getElementById("analysis-avg-score").innerText = `${avgScore} / 30`;
  
  // 3. Initialize tally structures
  const wrongCounts = Array(30).fill(0);
  const choiceTallies = Array(30).fill(null).map(() => ({ "1": 0, "2": 0, "3": 0, "4": 0, "": 0 }));
  
  subs.forEach(sub => {
    const studentAns = sub.answers.split(",");
    for (let j = 0; j < 30; j++) {
      const myAns = studentAns[j] !== undefined ? studentAns[j].toString().trim() : "";
      const correctAns = correctAnswers[j] !== undefined ? correctAnswers[j].toString().trim() : "";
      
      // Tally student choice
      if (myAns === "1" || myAns === "2" || myAns === "3" || myAns === "4") {
        choiceTallies[j][myAns]++;
      } else {
        choiceTallies[j][""]++;
      }
      
      // Check if correct
      if (myAns !== correctAns) {
        wrongCounts[j]++;
      }
    }
  });
  
  // Find question with most wrong answers
  let maxWrongVal = -1;
  let mostWrongQs = [];
  for (let j = 0; j < 30; j++) {
    if (wrongCounts[j] > maxWrongVal) {
      maxWrongVal = wrongCounts[j];
      mostWrongQs = [j + 1];
    } else if (wrongCounts[j] === maxWrongVal) {
      mostWrongQs.push(j + 1);
    }
  }
  
  if (maxWrongVal > 0) {
    document.getElementById("analysis-most-wrong-q").innerText = `ข้อ ${mostWrongQs.join(", ")} (${maxWrongVal} คน)`;
  } else {
    document.getElementById("analysis-most-wrong-q").innerText = "-";
  }
  
  // 4. Render rows
  for (let i = 0; i < 30; i++) {
    const qNum = i + 1;
    const wrongCount = wrongCounts[i];
    const wrongRate = Math.round((wrongCount / totalSubmissions) * 100);
    const correctAns = correctAnswers[i];
    
    // Find most common wrong choice
    const tallies = choiceTallies[i];
    let maxWrongChoice = "";
    let maxWrongCount = 0;
    
    for (let choice = 1; choice <= 4; choice++) {
      const choiceStr = choice.toString();
      if (choiceStr !== correctAns && tallies[choiceStr] > maxWrongCount) {
        maxWrongCount = tallies[choiceStr];
        maxWrongChoice = choiceStr;
      }
    }
    
    if (tallies[""] > maxWrongCount) {
      maxWrongCount = tallies[""];
      maxWrongChoice = "ไม่ตอบ (ว่าง)";
    }
    
    let wrongChoiceText = "-";
    if (maxWrongCount > 0) {
      wrongChoiceText = `ตัวเลือก ${maxWrongChoice} (${maxWrongCount} คน)`;
    }
    
    // Style and indicator for high wrong rate
    let severityClass = "";
    if (wrongRate >= 70) {
      severityClass = "high-error";
    } else if (wrongRate >= 40) {
      severityClass = "medium-error";
    }
    
    const tr = document.createElement("tr");
    if (severityClass) tr.className = severityClass;
    
    tr.innerHTML = `
      <td style="text-align: center; font-weight: bold;">${qNum}</td>
      <td style="text-align: center;">
        <div class="wrong-rate-bar-container">
          <div class="wrong-rate-bar-bg">
            <div class="wrong-rate-bar-fill" style="width: ${wrongRate}%; background-color: ${severityClass === 'high-error' ? 'var(--danger-color)' : (severityClass === 'medium-error' ? 'var(--warning-color)' : 'var(--success-color)')};"></div>
          </div>
          <span class="wrong-rate-txt">${wrongRate}%</span>
        </div>
      </td>
      <td style="text-align: center;">${wrongCount} / ${totalSubmissions}</td>
      <td style="text-align: center; color: var(--text-secondary);">${wrongChoiceText}</td>
      <td style="text-align: center; font-weight: bold; color: var(--success-color);">ตัวเลือก ${correctAns}</td>
    `;
    tbody.appendChild(tr);
  }
  
  refreshIcons();
}
