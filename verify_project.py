import os
import re
import sys

# Configure output encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

project_dir = r"d:\AI\tutor\ป.6 สอบเข้า ม.1 ข้อสอบ\ข้อสอบโรงเรียนดัง"

print("==================================================")
print("     เริ่มการตรวจสอบโครงสร้างโครงการ (Project Verification)")
print("==================================================")

required_files = [
    "index.html",
    "styles.css",
    "app.js",
    "config.js",
    "google_apps_script.js"
]

all_ok = True

# 1. Check core files
print("\n[1] ตรวจสอบไฟล์ระบบหลัก:")
for filename in required_files:
    path = os.path.join(project_dir, filename)
    exists = os.path.exists(path)
    status = "✓ พบไฟล์" if exists else "✗ ไม่พบไฟล์"
    print(f"  - {filename:<22} : {status}")
    if not exists:
        all_ok = False

# 2. Check images sets
print("\n[2] ตรวจสอบรูปภาพหน้าข้อสอบ PDF ที่ถูกแปลง:")
pages_config = {
    1: 10,
    2: 10,
    3: 10,
    4: 9,
    5: 10
}

images_dir = os.path.join(project_dir, "images")
if not os.path.exists(images_dir):
    print("  ✗ ไม่พบโฟลเดอร์ images ในโครงการ!")
    all_ok = False
else:
    for set_id, expected_pages in pages_config.items():
        set_dir = os.path.join(images_dir, f"set{set_id}")
        if not os.path.exists(set_dir):
            print(f"  ✗ ไม่พบโฟลเดอร์สำหรับ ชุดที่ {set_id} ({set_dir})")
            all_ok = False
            continue
            
        found_pages = 0
        missing_pages = []
        for p in range(1, expected_pages + 1):
            img_path = os.path.join(set_dir, f"page_{p}.png")
            if os.path.exists(img_path):
                found_pages += 1
            else:
                missing_pages.append(p)
                
        if found_pages == expected_pages:
            print(f"  - ข้อสอบชุดที่ {set_id} : ✓ ครบถ้วน ({found_pages}/{expected_pages} หน้า)")
        else:
            print(f"  - ข้อสอบชุดที่ {set_id} : ✗ ขาดหาย! พบ {found_pages}/{expected_pages} หน้า (ขาดหน้า: {missing_pages})")
            all_ok = False

# 3. Check linkages in HTML
print("\n[3] ตรวจสอบการเชื่อมโยงภายในไฟล์ index.html:")
html_path = os.path.join(project_dir, "index.html")
if os.path.exists(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    css_link = re.search(r'href=["\']styles\.css["\']', html_content)
    config_link = re.search(r'src=["\']config\.js["\']', html_content)
    app_link = re.search(r'src=["\']app\.js["\']', html_content)
    
    print(f"  - เชื่อมต่อ styles.css  : {'✓ ผ่าน' if css_link else '✗ ล้มเหลว'}")
    print(f"  - เชื่อมต่อ config.js  : {'✓ ผ่าน' if config_link else '✗ ล้มเหลว'}")
    print(f"  - เชื่อมต่อ app.js     : {'✓ ผ่าน' if app_link else '✗ ล้มเหลว'}")
    
    if not (css_link and config_link and app_link):
        all_ok = False
else:
    print("  ✗ ไม่สามารถตรวจสอบความเชื่อมโยงได้เนื่องจากไม่พบ index.html")
    all_ok = False

print("\n==================================================")
if all_ok:
    print(" 🎉 ผลการตรวจสอบ: โครงสร้างโครงการถูกต้องและสมบูรณ์ 100%!")
else:
    print(" ⚠️ ผลการตรวจสอบ: พบปัญหาในโครงสร้างโครงการ กรุณาตรวจสอบตามรายการด้านบน")
print("==================================================")
