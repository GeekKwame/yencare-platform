import os
import sys
import subprocess
import shutil
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# --- DOCX HELPERS ---
def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D8DCD9", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def make_callout_box(doc, title, text_paragraphs, border_color="087F6C", bg_color="E7F5F1"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=130, bottom=130, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:color="{border_color}"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(title)
    run_title.bold = True
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(10)
    run_title.font.color.rgb = RGBColor(8, 127, 108) if border_color == "087F6C" else RGBColor(197, 48, 48)
    
    for tp in text_paragraphs:
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(2)
        r = p2.add_run(tp)
        r.font.name = 'Calibri'
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(17, 17, 17)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(3)
    p_after.paragraph_format.space_after = Pt(4)

# --- DATA FOR WEEK 4 ---
TASKS = [
    {
        "code": "[QA-01] PR #20 Clinical Verification & Manual Testing Runbook",
        "status": "In Progress (High Priority)",
        "week": "Week 4 (Hardening & QA)",
        "assignee": "Sterling Awuley (QA Lead)",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "PR #20 has been merged into main; all 9 real-world clinical test scenarios must be validated by hand on a live database.",
        "proto_ref": "S02 (Today Operations Dashboard), S03 (Appointments Roster), S04 (Student Record), S05 (Live Queue), P18 (Live Queue Status).",
        "description": "Execute the 9-item manual testing checklist from Section 10 of the review report against a real local/staging MongoDB instance. Validate that reception and patient check-in rules reject future bookings, arrival window (60m early / 15m late) triggers correctly, reception override allows late check-ins, and no-shows properly free time slots.",
        "dependencies": "Blocked by: None (PR #20 merged into main) • Blocks: Final presentation clinical readiness.",
        "deadline": "Wednesday, 23 Sep 2026, 5:00 PM",
        "ac": [
            "Execute and log results for all 9 scenarios in the Manual Testing Checklist.",
            "Verify that 'now serving' room marker clears on QueueCounter when marked as no-show.",
            "Verify that TimeSlot is marked isBooked: false and appointmentId: null on real database after no-show.",
            "Document any UI/UX anomalies observed during reception check-in."
        ]
    },
    {
        "code": "[BE-QA] Doctor-Scoped Booking Filter & Past Slot Prevention (Issues E & Problem 6)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & QA)",
        "assignee": "Sterling Awuley (Backend Assistant)",
        "mentor": "Able Kafu Azanda",
        "rationale": "Resolves reported issue where bookings showed under every doctor, and prevents bookings for slots that already started earlier today.",
        "proto_ref": "S05 (Doctor Live Queue Board / Room Consultation), P04/P05 (Choose Date & Time Picker).",
        "description": "1. Investigate and fix doctor consultation filtering so appointments are strictly scoped to the clinician assigned to the room. 2. Integrate assertSlotNotInPast(slot) into the appointment booking endpoint (POST /api/appointments) so patients cannot book slots earlier today that have already passed.",
        "dependencies": "Blocked by: None • Blocks: Doctor consultation workflow.",
        "deadline": "Thursday, 24 Sep 2026, 5:00 PM",
        "ac": [
            "Doctor view displays only patients booked for their assigned clinicianId and roomId.",
            "POST /api/appointments rejects slots earlier today with 'That time slot has already started'.",
            "Automated tests added asserting doctor-scoped filtering and past-slot booking rejection."
        ]
    },
    {
        "code": "[SEC-BE] Public Arrival Endpoint Rate-Limiting & Anti-Brute-Force Guard (Issue D)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Security)",
        "assignee": "Sterling Awuley + Blessing Dogbe",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "Prevents malicious brute-forcing of 4-digit reference codes (YC-XXXX) via the public /arrive endpoint.",
        "proto_ref": "P09 (Find Appointment), P11 (Appointment Details), P18 (Queue Status).",
        "description": "Extend the public endpoint rate limiter (rateLimit.js) to cover POST /api/appointments/arrive and POST /api/appointments/:reference/arrive. Enforce maximum 5 check-in attempts per IP/reference per 15-minute window, returning HTTP 429 when exceeded.",
        "dependencies": "Blocked by: None • Blocks: Public API security.",
        "deadline": "Wednesday, 23 Sep 2026, 5:00 PM",
        "ac": [
            "Rate limiter active on POST /api/appointments/arrive.",
            "Returns 429 Too Many Requests with retry-after header after 5 failed attempts.",
            "Automated test added in rateLimit.test.js verifying arrival endpoint threshold."
        ]
    },
    {
        "code": "[BE-AUDIT] Comprehensive Cancellation & Reschedule Audit Logging (Issue A)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Audit)",
        "assignee": "Able Kafu Azanda (Backend Lead)",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "Clinical compliance requires an immutable audit trail of who modified bookings and when.",
        "proto_ref": "P12/P13 (Cancel Flow), P14-P17 (Reschedule Flow), S04/S08 (Staff Change Appointment).",
        "description": "Enhance AuditLog recordings in appointmentOps.js during cancel and reschedule actions. Explicitly record actorType ('PATIENT' vs 'STAFF'), actingUserId (staff ID or patient phone/studentIndex), oldDate, oldTime, newDate, newTime, and changeReason. Fix acting user resolution from auth tokens.",
        "dependencies": "Blocked by: None • Blocks: Regulatory audit compliance.",
        "deadline": "Thursday, 24 Sep 2026, 5:00 PM",
        "ac": [
            "AuditLog schema captures actorType, actorId, oldDate, oldTime, newDate, newTime, and reason.",
            "Cancellation logs whether executed by patient via self-service or desk staff via portal.",
            "Reschedule logs previous and new date/time coordinates.",
            "Automated tests verify audit record creation upon cancellation and reschedule."
        ]
    },
    {
        "code": "[BE-POLICY] Student Booking Cap Enforcement & Double-Booking Guard (Issue B)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Business Logic)",
        "assignee": "Able Kafu Azanda (Backend Lead)",
        "mentor": "Sterling Awuley",
        "rationale": "Prevents individual students from monopolizing clinic consultation slots.",
        "proto_ref": "P02 (Your Details), P06 (Review Booking), P08 (Slot Taken Clash).",
        "description": "Implement an active booking policy in bookAppointment.js: count existing active appointments (BOOKED, CHECKED_IN, WAITING) for the studentIndex on future dates. Cap active bookings at 2 per student. Reject additional bookings with a clear clinical policy message.",
        "dependencies": "Blocked by: None • Blocks: Fair campus access.",
        "deadline": "Thursday, 24 Sep 2026, 5:00 PM",
        "ac": [
            "Counts active non-completed, non-cancelled bookings per studentIndex.",
            "Rejects booking request with HTTP 409 if student already has 2 active upcoming bookings.",
            "Clear error message: 'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.'",
            "Automated unit test asserting cap rejection."
        ]
    },
    {
        "code": "[SEC-SMS] Cancellation/Reschedule SMS OTP Verification & Lookup Privacy (Issue C)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Security)",
        "assignee": "Emmanuella Lodonu (Backend & Security)",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "Prevents unauthorized cancellation of a student's appointment by someone who only knows their phone number.",
        "proto_ref": "P09 (Find Appointment / Lookup), P12 (Cancel Confirm), P16 (Reschedule Review).",
        "description": "1. Modify GET /api/appointments/lookup so it masks or omits the full patient phone number in public responses. 2. Implement an SMS OTP verification flow: before executing cancellation or reschedule, send a 4-digit code to the registered phone and require it in the PATCH payload.",
        "dependencies": "Blocked by: None • Blocks: Patient security.",
        "deadline": "Friday, 25 Sep 2026, 5:00 PM",
        "ac": [
            "Public lookup API returns masked phone (e.g. +233 24 **** 567).",
            "POST /api/appointments/:id/request-cancel-otp sends 4-digit SMS OTP.",
            "PATCH /api/appointments/:id/cancel requires valid otpCode unless initiated by authenticated staff.",
            "Automated tests verify OTP generation, verification, and expiration."
        ]
    },
    {
        "code": "[SEC-DATA] Patient Data Privacy, Phone Masking & Security Audit",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Security)",
        "assignee": "Emmanuella Lodonu (Backend & Security)",
        "mentor": "Sterling Awuley",
        "rationale": "Ensures Ghana Data Protection Act (Act 843) compliance on waiting room display boards.",
        "proto_ref": "S10 (Public Display Board), P18 (Queue Status), S05 (Corridor TV).",
        "description": "Audit all public screens, queue activity endpoints (GET /api/queue/activity), and display boards to ensure student names and phone numbers are never broadcast in plaintext. Sanitize all string inputs against NoSQL operators ($gt, $regex).",
        "dependencies": "Blocked by: None • Blocks: Compliance sign-off.",
        "deadline": "Friday, 25 Sep 2026, 5:00 PM",
        "ac": [
            "Public queue endpoints return masked identifiers (e.g. Token A-02, Index 2061****).",
            "Input validator strips MongoDB operator keys from request queries and bodies.",
            "Security audit checklist documented in docs/security/security-and-compliance.md."
        ]
    },
    {
        "code": "[FS-UX] Staff Workstation Experience, Login Toast & Offline Banners (Section 7)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & UX)",
        "assignee": "Raymond B. Afrani (Frontend Lead)",
        "mentor": "Harry “Ephraim” Nartey (Fullstack)",
        "rationale": "Addresses reception usability issues identified in Section 7 of the clinical testing review. Assigned to Raymond B. Afrani for frontend implementation.",
        "proto_ref": "• S01: Staff Sign In (ui/wireframe/s01_sign_in_desktop_staff, ui/prototype/src/components/staff/S01SignIn.tsx)\n• S02: Today Operations Dashboard (ui/wireframe/s02_today_desktop_staff, ui/prototype/src/components/staff/S02Today.tsx)\n• S03: Appointments Roster (ui/wireframe/s03_appointments_desktop_staff, ui/prototype/src/components/staff/S03Appointments.tsx & frontend/src/components/staff/StaffRoster.jsx)\n• G01: Network Error & Offline Edge State (ui/wireframe/g01_network_error_mobile, frontend/src/components/ConnectivityBanner.jsx)",
        "description": "1. Display short 'Signed in as Receptionist' (or Doctor/Admin) confirmation toast upon login (frontend/src/pages/StaffLogin.jsx).\n2. Prevent accidental navigation back to public landing page via browser back button when logged in (frontend/src/components/RequireStaffAuth.jsx popstate lock).\n3. Upgrade offline error display to 'Could not load appointment roster. [Retry]' with interactive retry button (frontend/src/hooks/useClinicRoster.js, StaffPortal.jsx, & DoctorWorkstation.jsx).\n4. Align prototype simulator behavior in ui/prototype/src/components/staff/S01SignIn.tsx and S03Appointments.tsx.",
        "dependencies": "Blocked by: None • Blocks: Staff UX polish.",
        "deadline": "Thursday, 24 Sep 2026, 5:00 PM",
        "ac": [
            "Toast appears on successful staff authentication and auto-dismisses in 3 seconds ('Signed in as Receptionist').",
            "Browser back button stays within authenticated staff portal view instead of jumping back to public landing page.",
            "Offline/network failure displays 'Could not load appointment roster. [Retry]' button that re-triggers fetch.",
            "Tested on Chrome, Safari, and mobile viewports."
        ]
    },
    {
        "code": "[FE-A11Y] Guard-Aware Disabled Action States & Mobile Viewport Audit (Section 7 & WCAG)",
        "status": "In Progress",
        "week": "Week 4 (Hardening & Frontend)",
        "assignee": "Raymond B. Afrani (Frontend Lead)",
        "mentor": "Sterling Awuley",
        "rationale": "Staff must clearly see why an action is blocked instead of encountering silent failures or confusing alerts.",
        "proto_ref": "S02 (Today), S03 (Appointments), S04 (Patient Detail) (Disabled Check In / No-Show buttons with tooltips), All Mobile Screens P01-P18 (320px viewport).",
        "description": "1. Grey out 'Check In' and 'Mark No-Show' buttons when visitDayGuard rules block them, displaying an informative tooltip/badge (e.g. 'Check-in opens on visit date', 'No-show available after 09:15'). 2. Complete cross-device responsive testing ensuring all screens render cleanly down to 320px width with 44px+ touch targets.",
        "dependencies": "Blocked by: None • Blocks: Reception & patient UX.",
        "deadline": "Friday, 25 Sep 2026, 5:00 PM",
        "ac": [
            "Check-in button disabled on future/past bookings with tooltip explaining visit day restriction.",
            "No-show button disabled during grace period with countdown/time message.",
            "All patient and staff interfaces pass mobile responsive check (320px viewport).",
            "Touch targets satisfy WCAG AA 44x44px standard."
        ]
    },
    {
        "code": "[DEVOPS-CORE] Startup Environment Validator, Role Permissions & Documentation",
        "status": "In Progress",
        "week": "Week 4 (Official Gate 4 Milestone)",
        "assignee": "Blessing Edmund Kwame Dogbe (Lead)",
        "mentor": "AmaliTech Evaluators",
        "rationale": "Implements Section 8 suggestions: fail-fast startup config verification and centralized RBAC permissions.",
        "proto_ref": "System-wide architecture, Environment Config, RBAC matrix, documentation runbooks.",
        "description": "1. Author a startup configuration validator (config/env.js) checking all required env vars (PORT, MONGO_URI, JWT_SECRET, MNOTIFY_KEY) with clear diagnostic errors. 2. Centralize role permissions into an RBAC matrix instead of ad-hoc role checks. 3. Update all docs/ guides in preparation for Gate 5 evaluation.",
        "dependencies": "Blocked by: None • Blocks: Gate 4 submission & Gate 5 defence.",
        "deadline": "Friday, 25 Sep 2026, 5:00 PM",
        "ac": [
            "Server startup halts with formatted error if critical environment settings are missing.",
            "Centralized hasPermission(user, 'APPOINTMENTS_CHECKIN') helper in staffAuth.js.",
            "docs/ documentation updated: API catalog, database-ops.md, testing-guide.md.",
            "Gate 4 Submission form and project retrospective drafted."
        ]
    }
]

def render_task_card(doc, task):
    t_box = doc.add_table(rows=8, cols=2)
    t_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_box.autofit = False
    set_table_borders(t_box, color="D8DCD9", sz="4")

    col_w = [Inches(1.8), Inches(4.9)]
    
    hdr = t_box.rows[0]
    c_hdr = hdr.cells[0]
    c_hdr.merge(hdr.cells[1])
    set_cell_background(c_hdr, "087F6C")
    set_cell_margins(c_hdr, 90, 90, 110, 110)
    p = c_hdr.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(task["code"])
    r.bold = True
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(255, 255, 255)

    fields = [
        ("Status & Milestone", f"{task['status']} | {task['week']}"),
        ("Assignee & Support", f"Primary: {task['assignee']} • Support: {task['mentor']}"),
        ("Assigned Prototype & Wireframe Reference", task["proto_ref"]),
        ("Assignment Rationale", task["rationale"]),
        ("Scope & Technical Goal", task["description"]),
        ("Dependencies & Deadline", f"{task['dependencies']} • Target: {task['deadline']}"),
        ("Acceptance Criteria", "\n".join([f"• {ac}" for ac in task["ac"]]))
    ]

    for idx, (label, val) in enumerate(fields):
        row = t_box.rows[idx + 1]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_w[0], col_w[1]
        set_cell_background(c0, "F7F8F7")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 50, 50, 70, 70)
        set_cell_margins(c1, 50, 50, 70, 70)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.size = Pt(8)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.size = Pt(8)
        if label == "Status & Milestone" and "In Progress" in val:
            r1.bold = True
            r1.font.color.rgb = RGBColor(217, 119, 6)
        elif label == "Assigned Prototype & Wireframe Reference":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(5)

def build_week4_docx(output_path):
    doc = Document()
    
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
        footer = s.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("YɛnCare • Week 4 Task Assignments & Master Sprint Plan • Confidential")
        f_run.font.name = 'Calibri'
        f_run.font.size = Pt(8)
        f_run.font.color.rgb = RGBColor(140, 140, 140)

    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(9.5)
    normal_style.font.color.rgb = RGBColor(17, 17, 17)
    
    # Title Block
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(6)
    title_p.paragraph_format.space_after = Pt(2)
    t_run = title_p.add_run("YɛnCare Health Platform")
    t_run.bold = True
    t_run.font.size = Pt(24)
    t_run.font.color.rgb = RGBColor(8, 127, 108)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(10)
    sub_run = sub_p.add_run("Week 4 Task Assignments & QA Review Action Plan (Sprint Before Final Presentation)")
    sub_run.bold = True
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = RGBColor(102, 112, 107)

    # Context Table
    tbl_ctx = doc.add_table(rows=7, cols=2)
    tbl_ctx.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_ctx.autofit = False
    set_table_borders(tbl_ctx, color="D8DCD9", sz="4")
    col_w_ctx = [Inches(1.8), Inches(4.9)]

    ctx_data = [
        ("Programme / Context", "AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)"),
        ("Active Sprint State", "Gate 3 Feature-Complete Verified • Week 4 Hardening, Security, Manual QA & Polish"),
        ("Current Execution Date", "Wednesday, 23 September 2026 (Week 4 Execution / Final Sprint Before Gate 5)"),
        ("Sprint Goal", "Close out PR #20 manual clinical verification runbook, enforce security & privacy (OTP, masking, rate limits), polish receptionist workstation experience (login toast, back button guard, offline banners, disabled action states), and prepare architecture documentation for Gate 5 presentation."),
        ("Automated Test Health", "275 Passing Tests across 64 Test Suites (0 Failures, 100% Clean native Node test runner)"),
        ("Production Build Status", "100% Clean Vite Production Bundles for both frontend and ui/prototype"),
        ("Lead Author & Role", "Blessing Edmund Kwame Dogbe (Backend & DevOps Lead / Product Coordinator)")
    ]

    for idx, (label, val) in enumerate(ctx_data):
        row = tbl_ctx.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_w_ctx[0], col_w_ctx[1]
        set_cell_background(c0, "F7F8F7")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 50, 50, 70, 70)
        set_cell_margins(c1, 50, 50, 70, 70)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.size = Pt(8.5)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.size = Pt(8.5)
        if label == "Active Sprint State":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)
        elif label == "Automated Test Health":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Team Roster
    h1 = doc.add_heading(level=2)
    h1_run = h1.add_run("1. Team Roster & Competency Allocation (6 Members)")
    h1_run.font.color.rgb = RGBColor(8, 127, 108)

    p_team_intro = doc.add_paragraph("We welcome Sterling Awuley as our Quality Assurance (QA) and Testing Lead, who will also assist with backend tasks. Engineering allocations for Week 4 align with core engineering strengths:")
    p_team_intro.paragraph_format.space_after = Pt(6)

    tbl_team = doc.add_table(rows=7, cols=4)
    tbl_team.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_team.autofit = False
    set_table_borders(tbl_team)

    th_team = ["Team Member", "Discipline / Focus", "Key Delivered Artifacts & Specialization", "Week 4 Sprint Responsibilities"]
    tw_team = [Inches(1.5), Inches(1.2), Inches(2.2), Inches(1.8)]

    for j, h in enumerate(th_team):
        c = tbl_team.cell(0, j)
        c.width = tw_team[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    team_members = [
        ("Blessing Edmund Kwame Dogbe", "DevOps / Backend Lead", "Render cloud staging, GitHub Actions CI automation, PR review/approval/merge governance (PR #19 & #20), test scaling to 275 passing, seed virtualization.", "Sprint governance, startup env validator, RBAC permissions, architecture docs & runbooks."),
        ("Able Kafu Azanda", "Backend Lead Architect", "Virtual Queue Engine (PR #13), atomic daily sequence tokens (A-01, B-04), Cancellation & Reschedule API (PR #14), slot release & state machine.", "Comprehensive audit logging (actor type, old/new times), student booking cap policy (2-3 max)."),
        ("Sterling Awuley (NEW MEMBER)", "QA & Testing Lead / Backend Assistant", "Authored PR #19 (queue sequence partialFilterExpression) and PR #20 (visit-day guards in visitDayGuard.js). Expert in clinical workflow validation.", "PR #20 manual clinical testing runbook (9 cases), investigate doctor-scoped booking visibility, past slot check."),
        ("Emmanuella Lodonu", "Backend & Security", "mNotify SMS sandbox wrapper, single-recipient validation safeguards, Call-Patient SMS trigger (PR #15), patient registration & lookup API.", "Cancellation/reschedule SMS OTP verification, lookup privacy (hide phones), public phone masking."),
        ("Raymond B. Afrani", "Frontend Lead", "Complete patient intake wizard (P01-P07), speakable reference code (YC-XXXX), Patient Lookup, Details, and Cancellation/Rescheduling UI (Task P11-P17, PR #17), Virtual Queue Live Status screen (P18).", "Staff login toast confirmation, prevent accidental back-button landing redirects, offline error UX banner, guard-aware disabled action button states, mobile responsiveness audit (320px+)."),
        ("Harry “Ephraim” Nartey", "Fullstack Foundations", "Frontend HTTP API client integration, Fast-Track Walk-In Intake modal (Task S01/S02, PR #16), Staff Multi-Room Consultation & Call-Next workflow (Task S04/S05, PR #18).", "Fullstack assistance on staff workstation workflows, doctor-scoped consultation filter assistance, cross-device testing support.")
    ]

    for i, row_data in enumerate(team_members):
        row = tbl_team.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_team[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 60, 60, 70, 70)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Review Findings & Fix Status Summary
    h2 = doc.add_heading(level=2)
    h2_run = h2.add_run("2. Review Findings & Fix Status Summary (From Clinical Testing)")
    h2_run.font.color.rgb = RGBColor(8, 127, 108)

    p_rev = doc.add_paragraph("While testing the platform from a receptionist's perspective, a comprehensive set of operational issues and reviews was cataloged. Below is the official status and triage breakdown:")
    p_rev.paragraph_format.space_after = Pt(6)

    tbl_rev = doc.add_table(rows=7, cols=3)
    tbl_rev.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_rev.autofit = False
    set_table_borders(tbl_rev)

    th_rev = ["Category / Triage Area", "Count", "Current Resolution / Planned Assignment"]
    tw_rev = [Inches(2.5), Inches(0.8), Inches(3.4)]

    for j, h in enumerate(th_rev):
        c = tbl_rev.cell(0, j)
        c.width = tw_rev[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    rev_data = [
        ("Fixed and Confirmed on Real DB", "2", "Fresh DB seed crash (PR #19) & Queue cleanup no-show status update (PR #20)."),
        ("Fixed in Code, Awaiting Manual QA", "4", "PR #20 Visit-Day Guards: day check-in, 60/15m arrival window, no past reschedule, no-show grace."),
        ("Review Comments on PR #20 (Resolved)", "5", "Slot leak on no-show fixed, now-serving cleared, required fields validated, dynamic seed dates, test suite."),
        ("Found, Not Started (Backend & Security)", "5", "Assigned for Week 4: Audit log (Able), Booking cap (Able/Sterling), SMS OTP (Emmanuella), Rate limit (Sterling), Past slot booking (Sterling)."),
        ("Screen & Experience Issues (Frontend)", "5", "Assigned for Week 4: Login toast (Raymond), Back-button handling (Raymond), Offline error (Raymond), Disabled buttons (Raymond), Admin controls (Blessing)."),
        ("New Problem Under Investigation", "1", "Bookings show under every doctor — Assigned to Sterling Awuley & Harry Nartey for clinician filtering fix.")
    ]

    for i, row_data in enumerate(rev_data):
        row = tbl_rev.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_rev[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 60, 60, 70, 70)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True
            elif j == 1:
                r.bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Callout Box
    make_callout_box(
        doc,
        "Week 4 Focus: Complete Hardening Ahead of Gate 5 Final Presentation!",
        [
            "• Week 4 is our final engineering sprint before the Presentation Week (Gate 5). All code must be hardened, tested by hand, and documented.",
            "• Sterling Awuley will drive the manual clinical QA checklist across real MongoDB instances, verifying patient arrival windows, reception overrides, and slot release behaviors.",
            "• Able Kafu Azanda and Emmanuella Lodonu will resolve the remaining backend security tasks (AuditLog actor tracking, student booking caps, and SMS OTP verification).",
            "• Raymond Afrani will lead the staff and patient frontend screens, adding the login confirmation toast, back-button guard, offline roster error banner with retry, and disabled action buttons with tooltips."
        ]
    )

    # 3. Week 4 Assigned Tasks
    h3 = doc.add_heading(level=2)
    h3_run = h3.add_run("3. Week 4 Assigned Tasks & Engineering Cards (Sprint Before Presenting)")
    h3_run.font.color.rgb = RGBColor(8, 127, 108)

    p_tasks_intro = doc.add_paragraph("Below are the 10 detailed engineering task cards assigned across the 6 team members for Week 4, complete with Assigned Prototype Numbers & Wireframe References for clear cross-team traceability:")
    p_tasks_intro.paragraph_format.space_after = Pt(8)

    for task in TASKS:
        render_task_card(doc, task)

    # 4. Manual QA Runbook
    h4 = doc.add_heading(level=2)
    h4_run = h4.add_run("4. Sterling Awuley's QA & Manual Testing Runbook (PR #20 9-Item Checklist)")
    h4_run.font.color.rgb = RGBColor(8, 127, 108)

    p_qa = doc.add_paragraph("Sterling Awuley will execute and verify the following 9 test cases on live staging and local MongoDB before the Gate 5 rehearsal:")
    p_qa.paragraph_format.space_after = Pt(6)

    tbl_qa = doc.add_table(rows=10, cols=4)
    tbl_qa.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_qa.autofit = False
    set_table_borders(tbl_qa)

    th_qa = ["#", "Action / Scenario", "Target Role & Test Payload", "Expected Result"]
    tw_qa = [Inches(0.4), Inches(2.2), Inches(2.2), Inches(1.9)]

    for j, h in enumerate(th_qa):
        c = tbl_qa.cell(0, j)
        c.width = tw_qa[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    qa_cases = [
        ("1", "Check in future-dated booking", "Reception desk checking booking dated tomorrow", "Refused: 'This appointment is for [date]. Check-in opens on the day of the visit.'"),
        ("2", "Patient 'I've arrived' on future date", "Patient self-check-in on booking dated next week", "Refused with the same visit-day restriction message."),
        ("3", "Patient arrives > 60m early", "Patient tapping 'I've arrived' 75m before slot time", "Refused: 'Check-in opens 60 minutes before your appointment time.'"),
        ("4", "Patient arrives within window", "Patient tapping 'I've arrived' 30m before slot time", "Allowed: Status updates to CHECKED_IN."),
        ("5", "Patient arrives > 15m late", "Patient self-check-in 20m after scheduled slot", "Refused: 'You are past your appointment time. Please see reception.'"),
        ("6", "Reception check-in for late patient", "Reception desk checking in the patient from Case 5", "Allowed: Reception override permits check-in on the appointment day."),
        ("7", "Reschedule to slot earlier today", "Rescheduling appointment to slot that already started", "Refused: 'That time slot has already started. Please choose a later slot.'"),
        ("8", "Mark future booking as no-show", "Reception marking future-dated booking as no-show", "Refused: 'Cannot be marked as a no-show before the day of the visit.'"),
        ("9", "Mark awaiting patient as no-show", "Marking WAITING or BOOKED (post-grace) patient", "Allowed: Status transitions to NO_SHOW; time slot is freed; QueueCounter active pointer cleared.")
    ]

    for i, row_data in enumerate(qa_cases):
        row = tbl_qa.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_qa[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 50, 50, 60, 60)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r.bold = True
            elif j == 1:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 5. Architectural Decisions
    h5 = doc.add_heading(level=2)
    h5_run = h5.add_run("5. Architectural Decisions & Consensus (From Review Section 9)")
    h5_run.font.color.rgb = RGBColor(8, 127, 108)

    tbl_arch = doc.add_table(rows=7, cols=2)
    tbl_arch.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_arch.autofit = False
    set_table_borders(tbl_arch)

    th_arch = ["Review Question / Decision Point", "Agreed Team Architecture Decision"]
    tw_arch = [Inches(2.5), Inches(4.2)]

    for j, h in enumerate(th_arch):
        c = tbl_arch.cell(0, j)
        c.width = tw_arch[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    arch_data = [
        ("1. Arrival window (60m early / 15m late)?", "Confirmed. Matches KNUST Students' Clinic OPD guidelines. Centralized in visitDayGuard.js (EARLY_WINDOW_MINUTES = 60, LATE_GRACE_MINUTES = 15)."),
        ("2. No-show grace period (slot + 15m)?", "Confirmed. A patient who could still arrive cannot be declared a no-show while their self-arrival window remains open. Arrived patients can be marked on the day."),
        ("3. Booking limit per student?", "Confirmed. Cap active future bookings at 2 per student to prevent slot hoarding across departments."),
        ("4. Cancellation/reschedule SMS OTP?", "Confirmed for patient self-service. Authenticated desk staff can cancel/reschedule with an audit reason without OTP."),
        ("5. Staff account credential management?", "Managed centrally by administrator. Seed accounts provided for staging demonstration."),
        ("6. Doctor-scoped visibility & booking notifications?", "Doctors strictly view their assigned room/consultation queue. SMS notifications reserved for patients to manage SMS operational costs.")
    ]

    for i, row_data in enumerate(arch_data):
        row = tbl_arch.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_arch[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 50, 50, 70, 70)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 6. Forward Roadmap
    h6 = doc.add_heading(level=2)
    h6_run = h6.add_run("6. Forward Roadmap: Gate 5 Final Presentation (Fri 2 Oct 2026)")
    h6_run.font.color.rgb = RGBColor(8, 127, 108)

    p_fwd = doc.add_paragraph("Final capstone deliverables and presentation schedule for the concluding week:")
    p_fwd.paragraph_format.space_after = Pt(6)

    tbl_fwd = doc.add_table(rows=5, cols=3)
    tbl_fwd.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_fwd.autofit = False
    set_table_borders(tbl_fwd)

    th_fwd = ["Presentation Deliverable", "Primary Owner", "Scope & Done Criteria"]
    tw_fwd = [Inches(2.5), Inches(1.5), Inches(2.7)]

    for j, h in enumerate(th_fwd):
        c = tbl_fwd.cell(0, j)
        c.width = tw_fwd[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    fwd_data = [
        ("[DEMO] End-to-End Clinical Simulation Rehearsal", "Sterling Awuley & All Team", "Conduct multi-role rehearsals simulating full clinic morning: 5 bookings, 2 walk-ins, receptionist check-in, doctor triage, live SMS texts."),
        ("[DATA] Clinical Impact Analysis & Wait-Time Modeling", "Able & Emmanuella", "Model simulated throughput improvements: quantify how virtual queuing reduces peak waiting room congestion by 65% at KNUST clinic."),
        ("[SLIDES] Executive Stakeholder Pitch Deck & Demo Video", "Raymond & Harry", "Produce final presentation slide deck, architecture diagrams, and 3-minute high-definition product walkthrough video."),
        ("[LEAD] Final Capstone Defence & AmaliTech Handover", "Blessing Dogbe", "Lead final presentation to AmaliTech CSR evaluators and KNUST clinical stakeholders. Deliver final repository bundle.")
    ]

    for i, row_data in enumerate(fwd_data):
        row = tbl_fwd.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_fwd[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 50, 50, 70, 70)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True

    doc.save(output_path)
    print(f"DOCX successfully generated at: {output_path}")

# --- HTML GENERATOR FOR PDF ---
def generate_week4_html():
    tasks_html = ""
    for t in TASKS:
        ac_items = "".join([f"<li>{ac}</li>" for ac in t["ac"]])
        proto_html = f"<tr><td class=\"label\">Assigned Prototype</td><td style=\"color: #087F6C; font-weight: 600;\">{t['proto_ref'].replace(chr(10), '<br>')}</td></tr>"
        desc_html = t['description'].replace(chr(10), '<br>')
        
        tasks_html += f"""
<div class="card">
  <div class="card-header">{t['code']}</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Status &amp; Milestone</td><td><span class="badge badge-progress">{t['status']}</span> | {t['week']}</td></tr>
      <tr><td class="label">Assignee &amp; Support</td><td><strong>Primary: {t['assignee']}</strong> • Support: {t['mentor']}</td></tr>
      {proto_html}
      <tr><td class="label">Rationale</td><td>{t['rationale']}</td></tr>
      <tr><td class="label">Scope &amp; Goals</td><td>{desc_html}</td></tr>
      <tr><td class="label">Dependencies</td><td>{t['dependencies']} • Target: {t['deadline']}</td></tr>
      <tr><td class="label">Acceptance Criteria</td><td><ul>{ac_items}</ul></td></tr>
    </table>
  </div>
</div>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>YɛnCare — Week 4 Task Assignments & QA Review Action Plan</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
    @bottom-right {{
      content: "YɛnCare • Week 4 Task Assignments • Confidential";
      font-size: 7pt;
      color: #888;
    }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #111111;
    line-height: 1.35;
    font-size: 8.5pt;
    margin: 0;
    padding: 0;
  }}
  .header {{
    margin-bottom: 14px;
    border-bottom: 2px solid #087F6C;
    padding-bottom: 8px;
  }}
  h1 {{
    color: #087F6C;
    font-size: 19pt;
    font-weight: 800;
    margin: 0 0 4px 0;
    letter-spacing: -0.5px;
  }}
  .subtitle {{
    color: #66706B;
    font-size: 10.5pt;
    font-weight: 600;
    margin: 0;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 8pt;
  }}
  th, td {{
    border: 1px solid #D8DCD9;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background-color: #E7F5F1;
    color: #087F6C;
    font-weight: 700;
  }}
  tr.alt td {{
    background-color: #FBFBFB;
  }}
  h2 {{
    color: #087F6C;
    font-size: 11pt;
    margin: 14px 0 6px 0;
    border-bottom: 1px solid #E7F5F1;
    padding-bottom: 3px;
    page-break-after: avoid;
  }}
  .callout {{
    background-color: #E7F5F1;
    border-left: 4px solid #087F6C;
    padding: 8px 12px;
    margin: 10px 0;
    border-radius: 0 4px 4px 0;
    page-break-inside: avoid;
  }}
  .callout-title {{
    font-weight: 700;
    color: #087F6C;
    font-size: 9pt;
    margin-bottom: 3px;
  }}
  .callout p {{
    margin: 3px 0;
    font-size: 8pt;
    color: #222;
  }}
  .card {{
    border: 1px solid #D8DCD9;
    border-radius: 4px;
    margin-bottom: 10px;
    page-break-inside: avoid;
    overflow: hidden;
  }}
  .card-header {{
    background-color: #087F6C;
    color: #FFFFFF;
    padding: 6px 10px;
    font-weight: 700;
    font-size: 8.5pt;
  }}
  .card-body table {{
    margin: 0;
    border: none;
  }}
  .card-body td {{
    border: none;
    border-bottom: 1px solid #EDEDED;
    padding: 4px 8px;
  }}
  .card-body td.label {{
    width: 25%;
    font-weight: 700;
    background-color: #F7F8F7;
    color: #444;
  }}
  .badge {{
    display: inline-block;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
  }}
  .badge-progress {{ background: #FEF3C7; color: #92400E; }}
  ul {{ margin: 2px 0 2px 14px; padding: 0; }}
  li {{ margin-bottom: 2px; font-size: 8pt; }}
  .footer-note {{
    font-size: 7pt;
    color: #888;
    text-align: right;
    margin-top: 14px;
    border-top: 1px solid #EEE;
    padding-top: 4px;
  }}
</style>
</head>
<body>

<div class="header">
  <h1>YɛnCare Health Platform</h1>
  <div class="subtitle">Week 4 Task Assignments &amp; QA Review Action Plan (Sprint Before Final Presentation)</div>
</div>

<table>
  <tr>
    <td style="width: 28%; font-weight: bold; background: #F7F8F7;">Programme / Context</td>
    <td>AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Active Sprint State</td>
    <td><strong>Gate 3 Feature-Complete Verified</strong> • Week 4 Hardening, Security, Manual QA &amp; Polish</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Current Execution Date</td>
    <td><strong>Wednesday, 23 September 2026</strong> (Week 4 Execution / Final Sprint Before Gate 5)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Sprint Goal</td>
    <td>Close out PR #20 manual clinical verification runbook, enforce security &amp; privacy (OTP, masking, rate limits), polish receptionist workstation experience (login toast, back button guard, offline banners, disabled action states), and prepare architecture documentation for Gate 5 presentation.</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Automated Test Health</td>
    <td><strong style="color: #087F6C;">275 Passing Tests across 64 Suites</strong> (0 Failures, 100% Clean native Node Test Runner)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Lead Author &amp; Role</td>
    <td>Blessing Edmund Kwame Dogbe (Backend &amp; DevOps Lead / Product Coordinator)</td>
  </tr>
</table>

<h2>1. Team Roster &amp; Competency Allocation (6 Members)</h2>
<p>We welcome Sterling Awuley as our Quality Assurance (QA) and Testing Lead, who will also assist with backend tasks. Engineering allocations for Week 4 align with core engineering strengths:</p>

<table>
  <thead>
    <tr>
      <th style="width: 22%;">Team Member</th>
      <th style="width: 18%;">Discipline</th>
      <th style="width: 32%;">Key Delivered Artifacts</th>
      <th style="width: 28%;">Week 4 Sprint Responsibilities</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Blessing Edmund Kwame Dogbe</strong></td>
      <td>DevOps / Backend Lead</td>
      <td>Render cloud staging, GitHub Actions CI automation, PR review/approval/merge governance, test scaling to 275 passing.</td>
      <td>Sprint governance, startup env validator, RBAC permissions, architecture docs &amp; runbooks.</td>
    </tr>
    <tr class="alt">
      <td><strong>Able Kafu Azanda</strong></td>
      <td>Backend Lead Architect</td>
      <td>Virtual Queue Engine (PR #13), atomic daily tokens (A-01, B-04), Cancellation &amp; Reschedule API (PR #14), slot release.</td>
      <td>Comprehensive audit logging (actor type, old/new times), student booking cap policy (2-3 max).</td>
    </tr>
    <tr>
      <td><strong>Sterling Awuley (NEW MEMBER)</strong></td>
      <td>QA &amp; Testing Lead</td>
      <td>Authored PR #19 (queue sequence index) and PR #20 (visit-day guards in visitDayGuard.js). Clinical testing expert.</td>
      <td>PR #20 manual clinical testing runbook (9 cases), investigate doctor-scoped booking visibility, past slot check.</td>
    </tr>
    <tr class="alt">
      <td><strong>Emmanuella Lodonu</strong></td>
      <td>Backend &amp; Security</td>
      <td>mNotify SMS sandbox wrapper, single-recipient safeguards, Call-Patient SMS trigger (PR #15), patient lookup API.</td>
      <td>Cancellation/reschedule SMS OTP verification, lookup privacy (hide phones), public phone masking.</td>
    </tr>
    <tr>
      <td><strong>Raymond B. Afrani</strong></td>
      <td>Frontend Lead</td>
      <td>Complete patient intake wizard (P01-P07), speakable YC reference, details/cancel UI (P11-P17), Queue Status (P18).</td>
      <td>Staff login toast confirmation, prevent accidental back-button landing redirects, offline error UX banner, guard-aware disabled action button states, mobile responsiveness audit (320px+).</td>
    </tr>
    <tr class="alt">
      <td><strong>Harry “Ephraim” Nartey</strong></td>
      <td>Fullstack Foundations</td>
      <td>Frontend HTTP API client integration, Fast-Track Walk-In Intake modal (Task S01/S02, PR #16), Multi-Room consultation (PR #18).</td>
      <td>Fullstack assistance on staff workstation workflows, doctor-scoped consultation filter assistance, cross-device testing support.</td>
    </tr>
  </tbody>
</table>

<h2>2. Review Findings &amp; Fix Status Summary (From Clinical Testing)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 35%;">Category / Triage Area</th>
      <th style="width: 10%;">Count</th>
      <th style="width: 55%;">Current Resolution / Planned Assignment</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Fixed and Confirmed on Real DB</td><td style="text-align:center;"><strong>2</strong></td><td>Fresh DB seed crash (PR #19) &amp; Queue cleanup no-show status update (PR #20).</td></tr>
    <tr class="alt"><td>Fixed in Code, Awaiting Manual QA</td><td style="text-align:center;"><strong>4</strong></td><td>PR #20 Visit-Day Guards: day check-in, 60/15m arrival window, no past reschedule, no-show grace.</td></tr>
    <tr><td>Review Comments on PR #20 (Resolved)</td><td style="text-align:center;"><strong>5</strong></td><td>Slot leak on no-show fixed, now-serving cleared, required fields validated, dynamic seed dates, test suite.</td></tr>
    <tr class="alt"><td>Found, Not Started (Backend &amp; Security)</td><td style="text-align:center;"><strong>5</strong></td><td>Assigned for Week 4: Audit log (Able), Booking cap (Able/Sterling), SMS OTP (Emmanuella), Rate limit (Sterling), Past slot booking (Sterling).</td></tr>
    <tr><td>Screen &amp; Experience Issues (Frontend)</td><td style="text-align:center;"><strong>5</strong></td><td>Assigned for Week 4: Login toast (Raymond), Back-button handling (Raymond), Offline error (Raymond), Disabled buttons (Raymond), Admin controls (Blessing).</td></tr>
    <tr class="alt"><td>New Problem Under Investigation</td><td style="text-align:center;"><strong>1</strong></td><td>Bookings show under every doctor — Assigned to Sterling Awuley &amp; Harry Nartey for clinician filtering fix.</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Week 4 Focus: Complete Hardening Ahead of Gate 5 Final Presentation!</div>
  <p>• Week 4 is our final engineering sprint before the Presentation Week (Gate 5). All code must be hardened, tested by hand, and documented.</p>
  <p>• Sterling Awuley will drive the manual clinical QA checklist across real MongoDB instances, verifying patient arrival windows, reception overrides, and slot release behaviors.</p>
  <p>• Able Kafu Azanda and Emmanuella Lodonu will resolve the remaining backend security tasks (AuditLog actor tracking, student booking caps, and SMS OTP verification).</p>
  <p>• Raymond Afrani will lead the staff and patient frontend screens, adding the login confirmation toast, back-button guard, offline roster error banner with retry, and disabled action buttons with tooltips.</p>
</div>

<h2>3. Week 4 Assigned Tasks &amp; Engineering Cards (With Assigned Prototype References)</h2>
{tasks_html}

<h2>4. Sterling Awuley's QA &amp; Manual Testing Runbook (PR #20 9-Item Checklist)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 5%;">#</th>
      <th style="width: 30%;">Action / Scenario</th>
      <th style="width: 35%;">Target Role &amp; Test Payload</th>
      <th style="width: 30%;">Expected Result</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="text-align:center;"><strong>1</strong></td><td><strong>Check in future-dated booking</strong></td><td>Reception desk checking booking dated tomorrow</td><td>Refused: 'This appointment is for [date]. Check-in opens on the day of the visit.'</td></tr>
    <tr class="alt"><td style="text-align:center;"><strong>2</strong></td><td><strong>Patient 'I've arrived' on future date</strong></td><td>Patient self-check-in on booking dated next week</td><td>Refused with the same visit-day restriction message.</td></tr>
    <tr><td style="text-align:center;"><strong>3</strong></td><td><strong>Patient arrives &gt; 60m early</strong></td><td>Patient tapping 'I've arrived' 75m before slot time</td><td>Refused: 'Check-in opens 60 minutes before your appointment time.'</td></tr>
    <tr class="alt"><td style="text-align:center;"><strong>4</strong></td><td><strong>Patient arrives within window</strong></td><td>Patient tapping 'I've arrived' 30m before slot time</td><td>Allowed: Status updates to CHECKED_IN.</td></tr>
    <tr><td style="text-align:center;"><strong>5</strong></td><td><strong>Patient arrives &gt; 15m late</strong></td><td>Patient self-check-in 20m after scheduled slot</td><td>Refused: 'You are past your appointment time. Please see reception.'</td></tr>
    <tr class="alt"><td style="text-align:center;"><strong>6</strong></td><td><strong>Reception check-in for late patient</strong></td><td>Reception desk checking in the patient from Case 5</td><td>Allowed: Reception override permits check-in on the appointment day.</td></tr>
    <tr><td style="text-align:center;"><strong>7</strong></td><td><strong>Reschedule to slot earlier today</strong></td><td>Rescheduling appointment to slot that already started</td><td>Refused: 'That time slot has already started. Please choose a later slot.'</td></tr>
    <tr class="alt"><td style="text-align:center;"><strong>8</strong></td><td><strong>Mark future booking as no-show</strong></td><td>Reception marking future-dated booking as no-show</td><td>Refused: 'Cannot be marked as a no-show before the day of the visit.'</td></tr>
    <tr><td style="text-align:center;"><strong>9</strong></td><td><strong>Mark awaiting patient as no-show</strong></td><td>Marking WAITING or BOOKED (post-grace) patient</td><td>Allowed: Status transitions to NO_SHOW; time slot is freed; QueueCounter active pointer cleared.</td></tr>
  </tbody>
</table>

<h2>5. Architectural Decisions &amp; Consensus (From Review Section 9)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 35%;">Review Question / Decision Point</th>
      <th style="width: 65%;">Agreed Team Architecture Decision</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>1. Arrival window (60m early / 15m late)?</strong></td><td>Confirmed. Matches KNUST Students' Clinic OPD guidelines. Centralized in visitDayGuard.js (EARLY_WINDOW_MINUTES = 60, LATE_GRACE_MINUTES = 15).</td></tr>
    <tr class="alt"><td><strong>2. No-show grace period (slot + 15m)?</strong></td><td>Confirmed. A patient who could still arrive cannot be declared a no-show while their self-arrival window remains open. Arrived patients can be marked on the day.</td></tr>
    <tr><td><strong>3. Booking limit per student?</strong></td><td>Confirmed. Cap active future bookings at 2 per student to prevent slot hoarding across departments.</td></tr>
    <tr class="alt"><td><strong>4. Cancellation/reschedule SMS OTP?</strong></td><td>Confirmed for patient self-service. Authenticated desk staff can cancel/reschedule with an audit reason without OTP.</td></tr>
    <tr><td><strong>5. Staff account credential management?</strong></td><td>Managed centrally by administrator. Seed accounts provided for staging demonstration.</td></tr>
    <tr class="alt"><td><strong>6. Doctor-scoped visibility &amp; notifications?</strong></td><td>Doctors strictly view their assigned room/consultation queue. SMS notifications reserved for patients to manage SMS operational costs.</td></tr>
  </tbody>
</table>

<h2>6. Forward Roadmap: Gate 5 Final Presentation (Fri 2 Oct 2026)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 30%;">Presentation Deliverable</th>
      <th style="width: 20%;">Primary Owner</th>
      <th style="width: 50%;">Scope &amp; Done Criteria</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>[DEMO] End-to-End Simulation Rehearsal</strong></td><td>Sterling Awuley &amp; All Team</td><td>Conduct multi-role rehearsals simulating full clinic morning: 5 bookings, 2 walk-ins, receptionist check-in, doctor triage, live SMS texts.</td></tr>
    <tr class="alt"><td><strong>[DATA] Clinical Impact Wait-Time Modeling</strong></td><td>Able &amp; Emmanuella</td><td>Model simulated throughput improvements: quantify how virtual queuing reduces peak waiting room congestion by 65% at KNUST clinic.</td></tr>
    <tr><td><strong>[SLIDES] Executive Pitch Deck &amp; Video</strong></td><td>Raymond &amp; Harry</td><td>Produce final presentation slide deck, architecture diagrams, and 3-minute high-definition product walkthrough video.</td></tr>
    <tr class="alt"><td><strong>[LEAD] Final Capstone Defence &amp; Handover</strong></td><td>Blessing Dogbe</td><td>Lead final presentation to AmaliTech CSR evaluators and KNUST clinical stakeholders. Deliver final repository bundle.</td></tr>
  </tbody>
</table>

<div class="footer-note">
  YɛnCare Health Platform • AmaliTech CSR Capstone Internship Programme • Product 4 (KNUST Health Services) • Confidential
</div>

</body>
</html>"""

def convert_html_to_pdf(html_path, pdf_path):
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    abs_html = os.path.abspath(html_path)
    abs_pdf = os.path.abspath(pdf_path)
    cmd = [
        edge_path,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={abs_pdf}",
        "--no-pdf-header-footer",
        abs_html
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(abs_pdf) and os.path.getsize(abs_pdf) > 0:
        print(f"PDF successfully generated at: {abs_pdf} ({os.path.getsize(abs_pdf):,} bytes)")
        return True
    else:
        print(f"PDF generation failed! {res.stderr}")
        return False

if __name__ == "__main__":
    base_dir = os.getcwd()
    
    # 1. Output Week 4 DOCX
    docx_file = os.path.join(base_dir, "YenCare-Week4-Task-Assignments.docx")
    build_week4_docx(docx_file)
    
    # Also place a copy of DOCX in docs/
    docs_docx = os.path.join(base_dir, "docs", "YenCare-Week4-Task-Assignments.docx")
    shutil.copyfile(docx_file, docs_docx)
    print(f"Copied DOCX to docs/: {docs_docx}")

    # 2. Output Week 4 HTML -> PDF
    html_file = os.path.join(base_dir, "week4_report_temp.html")
    pdf_file = os.path.join(base_dir, "YenCare-Week4-Task-Assignments.pdf")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_week4_html())
    
    success = convert_html_to_pdf(html_file, pdf_file)
    
    # Clean up temp html
    if os.path.exists(html_file):
        os.remove(html_file)
        
    # Also place a copy of the PDF into docs/ for easy reference
    docs_pdf = os.path.join(base_dir, "docs", "YenCare-Week4-Task-Assignments.pdf")
    if os.path.exists(pdf_file):
        shutil.copyfile(pdf_file, docs_pdf)
        print(f"Copied PDF to docs/ folder: {docs_pdf}")
