// Web Application Configuration
const CONFIG = {
  // วาง URL ของ Google Apps Script Web App ที่ได้จากการ Deploy ตรงนี้
  // ตัวอย่าง: "https://script.google.com/macros/s/AKfycbz.../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbySjUoMcwSrUSXSHlcurHY4KWcen7NdCK0mUO3EfE-Gc6KA9S-DPkzXE1_9PnVju64Z/exec",
  
  TOTAL_SETS: 5,
  QUESTIONS_PER_SET: 30,
  
  // จำนวนหน้า PDF ที่ถูกแปลงเป็นรูปภาพสำหรับแต่ละชุดข้อสอบ
  PAGES_CONFIG: {
    1: 10, // ชุดที่ 1 มี 10 หน้า
    2: 10, // ชุดที่ 2 มี 10 หน้า
    3: 10, // ชุดที่ 3 มี 10 หน้า
    4: 9,  // ชุดที่ 4 มี 9 หน้า
    5: 10  // ชุดที่ 5 มี 10 หน้า
  }
};
