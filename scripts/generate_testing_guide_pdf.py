import os
import sys
import subprocess
import shutil
import base64

def get_logo_base64(base_dir):
    logo_path = os.path.join(base_dir, "frontend", "src", "assets", "Yencare Logo.png")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    return ""

def build_html(logo_b64):
    logo_tag = f'<img src="data:image/png;base64,{logo_b64}" alt="YenCare Logo" class="brand-logo" />' if logo_b64 else '<div class="logo-fallback">Y</div>'
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>YenCare Live Clinical Testing Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {{
    size: A4;
    margin: 12mm 14mm 12mm 14mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a2e2b;
    background: #ffffff;
    font-size: 10pt;
    line-height: 1.5;
    padding: 0;
  }}

  /* Header Section */
  .header {{
    border-bottom: 2.5px solid #176b5f;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}

  .brand {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}

  .brand-logo {{
    height: 52px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(23,107,95,0.15));
  }}

  .logo-fallback {{
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #176b5f 0%, #0d3832 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 22px;
  }}

  .brand-text h1 {{
    font-size: 19pt;
    font-weight: 800;
    color: #173b3a;
    letter-spacing: -0.5px;
    line-height: 1.15;
  }}

  .brand-text p {{
    font-size: 9pt;
    color: #4f665e;
    font-weight: 600;
    margin-top: 2px;
  }}

  .meta-box {{
    text-align: right;
    font-size: 8pt;
    color: #556961;
    background: #f4f8f6;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #dce8df;
  }}

  .meta-box strong {{
    color: #176b5f;
  }}

  /* Live Hosted Banner */
  .live-banner {{
    background: linear-gradient(135deg, #176b5f 0%, #114e45 100%);
    color: #ffffff;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(23,107,95,0.15);
    page-break-inside: avoid;
  }}

  .live-banner-left strong {{
    font-size: 11pt;
    display: block;
    letter-spacing: -0.2px;
  }}

  .live-banner-left span {{
    font-size: 8.5pt;
    opacity: 0.9;
  }}

  .live-url-pill {{
    background: #ffffff;
    color: #176b5f;
    font-weight: 700;
    font-size: 9pt;
    padding: 6px 14px;
    border-radius: 6px;
    text-decoration: none;
    font-family: 'JetBrains Mono', Consolas, monospace;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }}

  /* Section Titles */
  h2 {{
    font-size: 12pt;
    font-weight: 800;
    color: #173b3a;
    margin-top: 14px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #e2ebe6;
    padding-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  h3 {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #176b5f;
    margin-top: 8px;
    margin-bottom: 4px;
  }}

  p, li {{
    font-size: 9pt;
    color: #33443e;
  }}

  ul, ol {{
    margin-left: 18px;
    margin-bottom: 8px;
  }}

  li {{
    margin-bottom: 3px;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px 0;
    font-size: 8.5pt;
  }}

  th, td {{
    padding: 6px 9px;
    border: 1px solid #dce8df;
    text-align: left;
    vertical-align: middle;
  }}

  th {{
    background: #edf5f1;
    color: #173b3a;
    font-weight: 700;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }}

  tr:nth-child(even) td {{
    background: #fafcfb;
  }}

  /* Cards */
  .card {{
    background: #ffffff;
    border: 1px solid #dce8df;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }}

  .card-highlight {{
    background: #f7faf8;
    border-left: 3.5px solid #176b5f;
  }}

  .card-alert {{
    background: #fffcf5;
    border-left: 3.5px solid #c9822a;
    border-color: #ead7ad;
  }}

  .badge {{
    display: inline-block;
    padding: 2px 7px;
    border-radius: 12px;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }}

  .badge-teal {{ background: #e0f2ee; color: #12574d; }}
  .badge-amber {{ background: #fef3c7; color: #92400e; }}
  .badge-blue {{ background: #e0f2fe; color: #0369a1; }}
  .badge-gray {{ background: #f3f4f6; color: #374151; }}

  code {{
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8pt;
    background: #eef4f1;
    color: #14594f;
    padding: 1px 4px;
    border-radius: 3px;
  }}

  .workflow-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
  }}

  .workflow-step {{
    border: 1px solid #dce8df;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdfc;
  }}

  .workflow-step strong {{
    font-size: 9pt;
    color: #173b3a;
    display: block;
    margin-bottom: 2px;
  }}

  .workflow-step p {{
    font-size: 7.8pt;
    color: #586b63;
    line-height: 1.35;
  }}

  .page-break {{
    page-break-before: always;
  }}

  .checklist {{
    list-style: none;
    margin-left: 0;
  }}

  .checklist li {{
    position: relative;
    padding-left: 20px;
    margin-bottom: 6px;
    font-size: 8.8pt;
  }}

  .checklist li::before {{
    content: "☐";
    position: absolute;
    left: 0;
    top: -1px;
    font-size: 11pt;
    color: #176b5f;
    font-weight: bold;
  }}

  .footer-note {{
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #dce8df;
    font-size: 7.5pt;
    color: #71877d;
    text-align: center;
  }}
</style>
</head>
<body>

  <!-- HEADER WITH LOGO -->
  <div class="header">
    <div class="brand">
      {logo_tag}
      <div class="brand-text">
        <h1>YɛnCare Testing Playbook</h1>
        <p>End-to-End Clinical Verification · Week 4 Platform Milestone</p>
      </div>
    </div>
    <div class="meta-box">
      <div><strong>Target:</strong> Live Platform Walkthrough</div>
      <div><strong>Status:</strong> Ready for QA & Team Review</div>
      <div><strong>Clinic:</strong> KNUST Students' Clinic & Hospital</div>
    </div>
  </div>

  <!-- LIVE HOSTED BANNER -->
  <div class="live-banner">
    <div class="live-banner-left">
      <strong>🚀 Live Production Deployment Available</strong>
      <span>All features, database models, and doctor workstations are live online.</span>
    </div>
    <div class="live-url-pill">
      https://yencare-platform.vercel.app
    </div>
  </div>

  <!-- 1. URLS & ACCESS -->
  <h2>1. Platform Access & Test Accounts</h2>
  <div style="display: flex; gap: 8px; margin-bottom: 8px;">
    <div class="card card-highlight" style="flex: 1.1; margin-bottom: 0;">
      <strong>Hosted & Local Endpoints</strong>
      <ul style="margin-left: 14px; margin-top: 4px; font-size: 8.2pt;">
        <li><strong>Hosted Web:</strong> <code>https://yencare-platform.vercel.app/</code></li>
        <li><strong>Hosted Staff:</strong> <code>https://yencare-platform.vercel.app/staff/login</code></li>
        <li><strong>Hosted Board:</strong> <code>https://yencare-platform.vercel.app/queue</code></li>
        <li><strong>Local Dev:</strong> <code>http://localhost:5173</code> (Backend: <code>port 4000</code>)</li>
      </ul>
    </div>
    <div class="card" style="flex: 0.9; margin-bottom: 0;">
      <strong>Operating Hours (Accra Time)</strong>
      <p style="font-size: 8.2pt; margin-top: 4px;">
        • <strong>Students' Clinic:</strong> Mon–Fri, 08:00–16:00 (Weekends closed)<br>
        • <strong>KNUST Hospital:</strong> 24/7 round-the-clock<br>
        • <strong>Demo Toggle:</strong> Staff portal includes <em>Today</em> & <em>Seed Day (2026-09-15)</em>.
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Role</th>
        <th>Staff Member</th>
        <th>Email / Staff ID</th>
        <th>Room</th>
        <th>Default Password</th>
        <th>Core Scope</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-teal">Receptionist</span></td>
        <td><strong>Abena Osei</strong></td>
        <td><code>abena.osei@yencare.gh</code> / <code>stf_01</code></td>
        <td>Front Desk</td>
        <td><code>yencare</code></td>
        <td>Roster triage, check-in, walk-in intake</td>
      </tr>
      <tr>
        <td><span class="badge badge-blue">Doctor 1</span></td>
        <td><strong>Dr. Kwame Boateng</strong></td>
        <td><code>kwame.boateng@yencare.gh</code> / <code>stf_02</code></td>
        <td><strong>Room 1</strong></td>
        <td><code>yencare</code></td>
        <td>Room 1 queue, call next, complete visit</td>
      </tr>
      <tr>
        <td><span class="badge badge-blue">Doctor 2</span></td>
        <td><strong>Dr. Ama Serwaa</strong></td>
        <td><code>ama.serwaa@yencare.gh</code> / <code>stf_04</code></td>
        <td><strong>Room 2</strong></td>
        <td><code>yencare</code></td>
        <td>Room 2 queue, call next, complete visit</td>
      </tr>
      <tr>
        <td><span class="badge badge-gray">Admin</span></td>
        <td><strong>Kojo Mensah</strong></td>
        <td><code>kojo.mensah@yencare.gh</code> / <code>stf_03</code></td>
        <td>Admin Desk</td>
        <td><code>yencare</code></td>
        <td>System oversight, clinical policy audit</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. HIGH-LEVEL WORKFLOW -->
  <h2>2. Clinical Lifecycle Workflow</h2>
  <div class="workflow-grid">
    <div class="workflow-step">
      <strong>1. Student Booking</strong>
      <p>Student picks clinic, doctor, date & time slot. Immediate YC-XXXX booking reference and SMS alert issued.</p>
    </div>
    <div class="workflow-step">
      <strong>2. Arrival & Queue</strong>
      <p>Student arrives; status updates to WAITING. Room-prefixed ticket token (#A1, #B1) is generated.</p>
    </div>
    <div class="workflow-step">
      <strong>3. Consultation</strong>
      <p>Doctor calls patient (CALLED), board directs student to room, doctor completes consultation (COMPLETED).</p>
    </div>
  </div>

  <!-- PAGE BREAK FOR CLEAN PRINTING -->
  <div class="page-break"></div>

  <!-- 3. STEP BY STEP TESTING -->
  <h2>3. Step-by-Step Testing Journeys</h2>

  <div class="card card-highlight">
    <h3>Journey 1: Student Online Booking Experience</h3>
    <ol>
      <li>Go to <code>https://yencare-platform.vercel.app/</code> (or localhost). Click <strong>"Book Consultation"</strong>.</li>
      <li><strong>Select Clinic Site:</strong> Choose <strong>KNUST Students' Clinic</strong>.</li>
      <li><strong>Enter Details:</strong> Full Name: <code>Akosua Mensah</code>, Phone: <code>024 123 4567</code>, Student Index: <code>20612345</code> (8 digits).</li>
      <li><strong>Select Service & Doctor:</strong> Choose <strong>General OPD</strong> and select <strong>Dr. Kwame Boateng (Room 1)</strong>.</li>
      <li><strong>Select Date & Slot:</strong> Pick an upcoming weekday (e.g. tomorrow) and an available time slot (e.g., <code>09:30</code>).</li>
      <li><strong>Confirm Booking:</strong> Review summary details and click <strong>"Confirm booking"</strong>.</li>
    </ol>
    <p style="margin-top: 4px; font-size: 8.2pt;"><strong>✓ Verification:</strong> Confirms with unique Booking Reference (e.g. <code>YC-4821</code>). Outbound SMS fires to phone. Reference saved in local browser storage.</p>
  </div>

  <div class="card">
    <h3>Journey 2: Self-Service Reschedule & Cancel (SMS OTP)</h3>
    <ol>
      <li>Navigate to <strong>Appointments</strong> → <strong>Find Existing Appointment</strong>. Search using your Reference Code or Student Index.</li>
      <li><strong>Reschedule Flow:</strong> Click <strong>"Reschedule Appointment"</strong> → <strong>"Send Verification Code"</strong>. Enter the 4-digit SMS OTP. Pick a new date/time slot and submit.</li>
      <li><strong>Cancel Flow:</strong> On another booking, click <strong>"Cancel Appointment"</strong>. Enter OTP, select cancellation reason, and confirm.</li>
    </ol>
    <p style="margin-top: 4px; font-size: 8.2pt;"><strong>✓ Verification:</strong> Reschedule updates date/time under identical reference code and frees old slot. Cancel sets status to <code>CANCELLED</code> and unlocks the slot immediately.</p>
  </div>

  <div class="card">
    <h3>Journey 3: Patient Arrival & Live Queue Token</h3>
    <ol>
      <li>On visit day, open the appointment card and click <strong>"I Have Arrived"</strong> (active 60 mins early to 15 mins late).</li>
      <li>Status advances: <code>BOOKED</code> → <code>CHECKED_IN</code> → <code>WAITING</code>.</li>
      <li>A sequential token is assigned (e.g., <code>#A1</code> for Room 1, <code>#B1</code> for Room 2) with estimated wait time.</li>
      <li>Open Corridor Display (<code>/queue</code>) in a separate tab; verify the token appears under the live queue.</li>
    </ol>
  </div>

  <div class="card card-highlight">
    <h3>Journey 4: Reception Desk Operations (Staff Portal)</h3>
    <ol>
      <li>Log into <code>/staff/login</code> as <strong>Abena Osei</strong> (<code>abena.osei@yencare.gh</code> / <code>yencare</code>).</li>
      <li><strong>Roster Triage:</strong> Filter by <code>All</code>, <code>Booked</code>, <code>Checked-In</code>, <code>Waiting</code>, <code>Walk-In</code>.</li>
      <li><strong>Desk Check-In:</strong> For an in-person arrival, click <strong>"Check In"</strong> → <strong>"Send to Queue"</strong>.</li>
      <li><strong>Fast-Track Walk-In:</strong> Click <strong>"+ Add Walk-In"</strong>. Enter student details, assign clinician, and submit. The walk-in is immediately slotted, checked in, and queued.</li>
    </ol>
  </div>

  <div class="card">
    <h3>Journey 5: Doctor Workstation & Consultation</h3>
    <ol>
      <li>Open an incognito window and sign in as <strong>Dr. Kwame Boateng</strong> (<code>kwame.boateng@yencare.gh</code>). Workstation defaults to <strong>Room 1</strong>.</li>
      <li><strong>Clinician Isolation (Critical):</strong> Verify Dr. Kwame sees <em>only</em> his Room 1 queue. He cannot see or call Dr. Ama's patients.</li>
      <li><strong>Call Next:</strong> Click <strong>"Call Next Patient"</strong>. Status moves to <code>CALLED</code>; Corridor Display directs patient to Room 1.</li>
      <li><strong>Complete Visit:</strong> Click <strong>"Complete Visit"</strong>. Status moves to <code>COMPLETED</code>; room resets for the next ticket.</li>
      <li>Log in as <strong>Dr. Ama Serwaa</strong> (<code>ama.serwaa@yencare.gh</code>) in <strong>Room 2</strong> to confirm separate queue isolation.</li>
    </ol>
  </div>

  <!-- PAGE BREAK FOR CLEAN PRINTING -->
  <div class="page-break"></div>

  <!-- 4. GUARDRAILS & EDGE CASES -->
  <h2>4. Critical Guardrails & Policy Stress Tests</h2>
  <p>Please execute these specific test cases to confirm platform hardening and clinical safeguards:</p>

  <ul class="checklist" style="margin-top: 8px;">
    <li>
      <strong>Student Booking Cap (Max 2 Active Bookings):</strong><br>
      Attempt to book 3 active upcoming visits for the same Student Index (<code>20612345</code>).<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: 3rd booking rejected with HTTP 409: <em>"You have reached the maximum of 2 active appointments. Please complete or cancel existing visits."</em></span>
    </li>
    <li>
      <strong>Concurrent Double-Booking Slot Collision:</strong><br>
      Two testers open the same doctor and time slot simultaneously and click confirm at the exact same second.<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: Exactly one wins (201 Created). The second receives 409 Conflict with friendly <em>"Slot Taken"</em> reassignment.</span>
    </li>
    <li>
      <strong>Clinic Operating Hours Enforcement:</strong><br>
      Attempt to book KNUST Students' Clinic on a Saturday or Sunday, or after 16:00.<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: Blocked client-side and rejected by server with operating hours notice.</span>
    </li>
    <li>
      <strong>Arrival Window Enforcement:</strong><br>
      Try checking in >60 minutes early or >15 minutes late.<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: Early arrival directs patient to wait; late arrival flags no-show risk and directs to reception desk.</span>
    </li>
    <li>
      <strong>Invalid OTP Verification:</strong><br>
      Enter an invalid code (e.g. <code>9999</code>) during cancellation or reschedule.<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: Rejected with <em>"Invalid or expired verification code"</em>. Action blocked until verified.</span>
    </li>
    <li>
      <strong>Simulated Offline Roster Display:</strong><br>
      In DevTools → Network tab, switch to <strong>Offline</strong> while on the Staff Roster page.<br>
      <span style="color: #176b5f; font-size: 8.2pt;">👉 Expected: Displays <em>"Could not load appointment roster. [Retry]"</em> with a working retry trigger.</span>
    </li>
  </ul>

  <!-- 5. BUG REPORTING -->
  <h2>5. How to Log Issues During Testing</h2>
  <div class="card card-alert">
    <strong>Bug Report Format</strong>
    <p style="font-size: 8.2pt; margin-top: 3px;">
      1. <strong>Screen / Component:</strong> (e.g. <em>Doctor Workstation → Call Next</em>)<br>
      2. <strong>User Role & Account:</strong> (e.g. <em>Dr. Kwame Boateng, Room 1</em>)<br>
      3. <strong>Steps to Reproduce:</strong> (Exact sequence of actions taken)<br>
      4. <strong>Expected Result:</strong> (What clinical rule should have occurred)<br>
      5. <strong>Actual Result:</strong> (Error message, visual defect, or unexpected status)<br>
      6. <strong>Attachments:</strong> (Console error log or screenshot)
    </p>
  </div>

  <div class="footer-note">
    YɛnCare Clinical Platform · Hosted at <a href="https://yencare-platform.vercel.app/" style="color: #176b5f; text-decoration: none;"><strong>yencare-platform.vercel.app</strong></a> · KNUST Students' Clinic & Hospital · Confidential Internal Document
  </div>

</body>
</html>
"""

def generate_pdf():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_b64 = get_logo_base64(base_dir)
    html_content = build_html(logo_b64)

    temp_html = os.path.join(base_dir, "testing_guide_temp.html")
    output_pdf = os.path.join(base_dir, "docs", "testing", "YenCare_Live_Testing_Guide.pdf")

    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    abs_html = os.path.abspath(temp_html)
    abs_pdf = os.path.abspath(output_pdf)

    cmd = [
        edge_path,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={abs_pdf}",
        "--no-pdf-header-footer",
        abs_html
    ]

    print("Generating enhanced PDF with logo and hosted URL...")
    res = subprocess.run(cmd, capture_output=True, text=True)

    if os.path.exists(temp_html):
        os.remove(temp_html)

    if os.path.exists(abs_pdf) and os.path.getsize(abs_pdf) > 0:
        print(f"SUCCESS: PDF generated at: {abs_pdf} ({os.path.getsize(abs_pdf):,} bytes)")
        
        # Copy to root
        root_pdf = os.path.join(base_dir, "YenCare_Live_Testing_Guide.pdf")
        shutil.copyfile(abs_pdf, root_pdf)
        print(f"SUCCESS: Copied PDF to root: {root_pdf}")
        return True
    else:
        print(f"FAILED: {res.stderr}")
        return False

if __name__ == "__main__":
    generate_pdf()
