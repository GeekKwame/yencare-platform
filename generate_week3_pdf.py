import os
import sys
import subprocess
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

def render_task_card(doc, task):
    t_box = doc.add_table(rows=7, cols=2)
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
        elif label == "Status & Milestone" and "Done" in val:
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(5)

# --- BUILD DOCX FUNCTION ---
def build_week3_docx(output_path):
    doc = Document()
    
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
        footer = s.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("YɛnCare • Week 3 Task Status & Master Sprint Execution Report • Confidential")
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
    sub_run = sub_p.add_run("Week 3 Task Status & Master Sprint Execution Report (Gate 3 Feature-Complete)")
    sub_run.bold = True
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = RGBColor(102, 112, 107)

    # Meta Table
    meta_tbl = doc.add_table(rows=6, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    set_table_borders(meta_tbl, color="087F6C", sz="6")
    
    meta_data = [
        ("Programme / Context", "AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)"),
        ("Active Sprint State", "Week 3 Major Backend Engine Milestones Merged & Verified (Gate 2 100% Complete)"),
        ("Current Execution Date", "Tuesday, 15 September 2026 (Week 3 Execution / 72h to Feature Freeze)"),
        ("Milestone Objective", "Deliver full patient virtual queue tracking and cancellation flows; achieve 100% Feature-Complete by Friday 18 Sep 2026."),
        ("Automated Test Health", "108 Passing Tests across 31 Test Suites (0 Failures, 100% Clean native Node test runner)"),
        ("Lead Author & Role", "Blessing Edmund Kwame Dogbe (Backend & DevOps Lead / Product Coordinator)")
    ]
    
    col_widths = [Inches(2.2), Inches(4.5)]
    for i, (k, v) in enumerate(meta_data):
        row = meta_tbl.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_widths[0], col_widths[1]
        set_cell_background(c0, "F7F8F7")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 70, 70, 90, 90)
        set_cell_margins(c1, 70, 70, 90, 90)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(k)
        r0.bold = True
        r0.font.size = Pt(9)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(v)
        r1.font.size = Pt(9)
        if k == "Automated Test Health":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 1. TEAM ROSTER
    h1 = doc.add_heading(level=1)
    h1_run = h1.add_run("1. Team Roster & Competency Allocation")
    h1_run.font.color.rgb = RGBColor(8, 127, 108)
    
    doc.add_paragraph(
        "Tasks across all milestones are assigned strictly according to team members' core engineering strengths, track record, and architectural requirements:"
    )

    roster_tbl = doc.add_table(rows=6, cols=4)
    roster_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    roster_tbl.autofit = False
    set_table_borders(roster_tbl)
    
    headers = ["Team Member", "Discipline / Focus", "Key Delivered Engineering Artifacts", "Week 3 Sprint Status"]
    r_widths = [Inches(1.5), Inches(1.2), Inches(2.4), Inches(1.6)]
    for j, h in enumerate(headers):
        c = roster_tbl.cell(0, j)
        c.width = r_widths[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)
        
    roster_data = [
        ("Blessing Edmund Kwame Dogbe", "DevOps / Backend Lead", "Render staging cloud deployment, GitHub Actions PR CI automation, mNotify SMS sandbox, production API fallback, release governance.", "Staging Active • 108 Tests Passing • Gate 3 Lead"),
        ("Able Kafu Azanda", "Backend Lead Architect", "Virtual Queue Engine (PR #13), atomic daily sequence tokens (A-01, B-04), Appointment Cancellation & Reschedule API (PR #14) with AuditLog & slot release.", "Week 3 Major Backend Engine Merged & 100% Done!"),
        ("Emmanuella Lodonu", "Backend Foundations", "Single-recipient SMS validation safeguards (mnotify.js), patient registration & lookup API (/api/patients), Call-Next SMS trigger integration.", "Gate 2 Done • SMS Safeguards Merged & Done!"),
        ("Harry “Ephraim” Nartey", "Fullstack Foundations", "Frontend HTTP API client integration, Staff Check-In view (S02/S03), Staff Portal Date Picker & Demo Day toggle (StaffPortal.jsx).", "Check-In & Date Picker Done • Walk-In Active"),
        ("Raymond B. Afrani", "Frontend Foundations", "Complete patient intake wizard (P01-P07) with speakable reference code (YC-XXXX) & emergency safety triage diversion.", "Gate 2 Done • Actively wiring P18 & P11-P17 UI")
    ]
    
    for i, row_data in enumerate(roster_data):
        row = roster_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = r_widths[j]
            if (i % 2 == 1):
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 70, 70, 90, 90)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 2. TRELLO BOARD & SPRINT STATE
    h2 = doc.add_heading(level=1)
    h2_run = h2.add_run("2. Updated Trello Board State: Week 2 Closeout & Week 3 Execution")
    h2_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "As of Tuesday, 15 September 2026, Gate 2 is 100% complete and verified (12 out of 12 cards). "
        "In Week 3 (Gate 3 Feature-Complete), 5 out of 9 core deliverables are already verified and merged into main, backed by 108 passing automated tests:"
    )

    snap_tbl = doc.add_table(rows=6, cols=4)
    snap_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    snap_tbl.autofit = False
    set_table_borders(snap_tbl)
    
    s_headers = ["Lifecycle Stage", "Card Count", "Percentage", "Active Deliverables in Stage"]
    s_widths = [Inches(1.8), Inches(0.9), Inches(1.0), Inches(3.0)]
    for j, h in enumerate(s_headers):
        c = snap_tbl.cell(0, j)
        c.width = s_widths[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    snap_data = [
        ("Gate 2 Verified (Done)", "12 / 12", "100.0%", "Complete Patient Intake Loop (P01-P07), Concurrency Lock, Staging & CI, Staff Check-In"),
        ("Week 3 Verified (Done)", "5 / 9", "55.6%", "Virtual Queue Engine (AA), Cancellation API (AA), SMS Safeguards (EL), Staging Fallback (Blessing), Staff Date Picker (HN)"),
        ("Week 3 In Progress", "3 / 9", "33.3%", "[FE] P18 Queue Status Screen (RA), [FE] P11-P17 Cancellation UI (RA), [FS] Walk-In Intake (HN)"),
        ("Week 3 Sprint Backlog", "1 / 9", "11.1%", "[LEAD] Gate 3 Feature-Freeze Verification & Submission (Blessing — Scheduled Fri 18 Sep)"),
        ("Total Active Scope", "21 Cards", "81.0% Complete", "17 of 21 Tasks Across Gate 2 & Gate 3 Officially Verified & Merged into main")
    ]
    for i, row_data in enumerate(snap_data):
        row = snap_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = s_widths[j]
            if i in (0, 1):
                set_cell_background(cell, "E7F5F1")
            elif i == 4:
                set_cell_background(cell, "F0F5F3")
            elif i % 2 == 1:
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 70, 70, 90, 90)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if i in (0, 1, 4) or j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    make_callout_box(
        doc,
        "Gate 3 Major Breakthrough: Core Queuing & Cancellation Engines Merged!",
        [
            "Able Kafu Azanda has successfully merged Pull Request #13 (Virtual Queue Engine & Token Progression State Machine) and Pull Request #14 (Appointment Cancellation & Rescheduling API).",
            "These deliveries unlock non-colliding daily sequence tokens (A-01, B-04), real-time queue position calculation, dynamic wait times ((patients ahead) x 15 min), atomic slot recovery on cancellation, and zero-collision slot swaps during reschedule.",
            "All 108 unit and integration tests are passing cleanly on the native Node.js test runner."
        ],
        border_color="087F6C",
        bg_color="E7F5F1"
    )

    # 3. COMPLETED WORK LOG
    h3 = doc.add_heading(level=1)
    h3_run = h3.add_run("3. Completed Work Log: 17 Verified Tasks (Gate 2 Closeout + Week 3)")
    h3_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "The following 17 engineering deliverables have been implemented, code-reviewed, tested, and merged into the main repository:"
    )

    done_tbl = doc.add_table(rows=18, cols=4)
    done_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    done_tbl.autofit = False
    set_table_borders(done_tbl)

    d_headers = ["Task Code & Title", "Primary Owner", "Verified Milestone", "Delivered Technical Artifacts"]
    d_widths = [Inches(2.2), Inches(1.1), Inches(1.1), Inches(2.3)]
    for j, h in enumerate(d_headers):
        c = done_tbl.cell(0, j)
        c.width = d_widths[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    done_data = [
        # Gate 2 tasks
        ("[BE] MongoDB Schema & Core Appointment Models", "Able Kafu Azanda", "Gate 2 (Done)", "Mongoose models for Patient, Appointment, Clinician, Room, TimeSlot with compound indexes."),
        ("[DEVOPS] SMS Provider Sandbox (mNotify)", "Blessing Dogbe", "Gate 2 (Done)", "Quick SMS v2 API integration (mnotify.js), Sender ID 'YenCare' registration, test phone delivery."),
        ("[BE] Patient Registration & Lookup API", "Emmanuella Lodonu", "Gate 2 (Done)", "POST /api/patients and GET /api/patients/:identifier supporting 8-digit index & Ghana phones."),
        ("[FE] Landing & Registration Flow (P01-P02C)", "Raymond Afrani", "Gate 2 (Done)", "P01 Home, P02 Student Registration, P02B Site Selector, P02C Visit Triage with Emergency Gate."),
        ("[BE] Appointment Booking API with Concurrency Lock", "Able Kafu Azanda", "Gate 2 (Done)", "createAppointment service with compound unique index locking ({ clinicianId, date, startTime })."),
        ("[TEST] Double-Booking Prevention Test Suite", "Able Kafu Azanda", "Gate 2 (Done)", "Automated concurrency test asserting 201 Created for winner and 409 Conflict for duplicate."),
        ("[BE] Hook SMS Dispatch Trigger on Booking", "Emmanuella Lodonu", "Gate 2 (Done)", "Integrated sendSms in bookAppointment.js; transactional confirmation SMS fires on DB save."),
        ("[FS] API Client Service Layer in React", "Harry Nartey", "Gate 2 (Done)", "Axios client service layer (patients.js, appointments.js) with loading states & error mapping."),
        ("[FE] Clinic Site, Doctor & Time Slot Picker (P02B-P05)", "Raymond Afrani", "Gate 2 (Done)", "Doctor selection (P03), Date picker and 30-min slot selector (P04/P05) with 15-min arrival notice."),
        ("[DEVOPS] Render Staging Environment & CI Pipeline", "Blessing Dogbe", "Gate 2 (Done)", "Cloud staging on Render, MongoDB Atlas cluster, and GitHub Actions PR CI test execution."),
        ("[FE] Booking Review & Confirmation Screens (P06-P07)", "Raymond Afrani", "Gate 2 (Done)", "P06 Booking Summary Review and P07 Success card rendering speakable code (YC-XXXX)."),
        ("[FS] Staff Reception Check-In View (S02/S03)", "Harry Nartey", "Gate 2 (Done)", "Daily appointment schedule with one-click check-in updating status to CHECKED_IN."),
        # Week 3 tasks
        ("[BE] Virtual Queue Engine & Token State Machine", "Able Kafu Azanda", "Week 3 (Done - PR #13)", "queueEngine.js, QueueCounter.js, atomic tokens (A-01, B-04), FIFO call-next, dynamic wait times."),
        ("[BE] Appointment Cancellation & Reschedule API", "Able Kafu Azanda", "Week 3 (Done - PR #14)", "PATCH /api/appointments/:id/cancel & reschedule, atomic slot recovery & swap, AuditLog model."),
        ("[BE] SMS Single-Recipient Validation Safeguards", "Emmanuella / Blessing", "Week 3 (Done)", "Single recipient check preventing bulk SMS misrouting; phone normalizer; call-next SMS trigger."),
        ("[DEVOPS] Staging Fallback & Multi-Container Config", "Blessing Dogbe", "Week 3 (Done)", "Vite client production fallback to Render staging URL; database connection pool hardening."),
        ("[FS] Staff Portal Date Picker & Demo Toggle", "Harry Nartey", "Week 3 (Done)", "Date picker and demo day toggle (2026-09-15) in StaffPortal.jsx; multi-room queue view scaffold.")
    ]

    for i, row_data in enumerate(done_data):
        row = done_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = d_widths[j]
            if i >= 12:
                set_cell_background(cell, "E7F5F1") # Highlight Week 3 Done
            elif i % 2 == 1:
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0 or (j == 2 and "Week 3" in val):
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 4. ACTIVE IN-PROGRESS TASKS FOR GATE 3
    h4 = doc.add_heading(level=1)
    h4_run = h4.add_run("4. Active In-Progress Tasks for Gate 3 Feature-Freeze (4 Tasks)")
    h4_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "To achieve 100% Feature-Complete by the strict Friday 18 September 5:00 PM deadline, engineering efforts are focused on the following 4 deliverables:"
    )

    tasks_w3_active = [
        {
            "code": "[FE] Virtual Queue Live Status & Progress Screen (P18)",
            "status": "In Progress (High Priority)",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey / Able Kafu Azanda",
            "rationale": "Directly consumes the newly merged queue engine endpoints delivered by Able.",
            "description": "Build Screen P18 allowing checked-in patients to view their live token position (e.g. A-02), estimated wait time in minutes, current serving token in their room, and dynamic status banners ('You are 2nd in line', 'Proceed to Consultation Room 1'). Auto-polls /api/appointments/:reference/queue-status every 15 seconds.",
            "dependencies": "Blocked by: None (Backend Queue Engine Merged!) • Blocks: Complete patient attendance loop.",
            "deadline": "Wednesday, 16 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Renders live sequence token (e.g. A-03) and dynamic estimated wait time.",
                "Displays 5-stage progression: BOOKED -> CHECKED_IN -> WAITING -> CALLED -> COMPLETED.",
                "Triggers visual pulse and audio chime when status transitions to CALLED.",
                "Polls /api/appointments/:reference/queue-status every 15s with graceful error backoff."
            ]
        },
        {
            "code": "[FE] Self-Service Cancellation & Rescheduling Flow (P11–P17)",
            "status": "In Progress (High Priority)",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey / Able Kafu Azanda",
            "rationale": "Wired directly to the PATCH cancel and reschedule endpoints delivered in PR #14.",
            "description": "Construct Screens P11 (Appointment Details), P12 (Cancel Confirmation dialog), P13 (Cancellation Complete), and P14–P17 (Reschedule calendar and slot picker). Allows students to enter Reference Code + Phone, review their booking, cancel with atomic slot release, or pick a new slot.",
            "dependencies": "Blocked by: None (Backend Cancellation API Merged!) • Blocks: Self-service patient lifecycle.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Student looks up booking via 8-digit reference code (YC-XXXX) and verified Ghana phone.",
                "Two-step cancellation confirmation releases slot and displays cancellation confirmation card.",
                "Reschedule flow reuses calendar time slot picker and confirms new booking slot.",
                "Displays user-friendly error alerts if appointment is already CHECKED_IN or COMPLETED."
            ]
        },
        {
            "code": "[FS] Walk-In Patient Fast-Track Intake & Desk Triage (S01/S02)",
            "status": "In Progress",
            "assignee": "Harry “Ephraim” Nartey (HN)",
            "mentor": "Emmanuella Lodonu / Blessing Dogbe",
            "rationale": "Completes operational requirements for clinic receptionists managing unscheduled walk-in students.",
            "description": "Construct the Receptionist Walk-In creation modal on the staff portal. Allows clinic staff to quickly register an unscheduled student (or lookup existing records via index number) and directly insert them into the day's active virtual queue as a walk-in visit.",
            "dependencies": "Blocked by: None (Patient API & Queue Engine Merged!) • Blocks: Hybrid booking/walk-in operations.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Input modal collects Student Index, Full Name, Phone, and Priority Level (Standard vs Urgent).",
                "Directly creates patient (if new) and injects appointment with status CHECKED_IN immediately.",
                "Assigns walk-in sequence token (e.g. W-03) positioned appropriately in the queue.",
                "Immediate visual feedback on the staff queue dashboard."
            ]
        },
        {
            "code": "[LEAD] Gate 3 Feature-Freeze Verification & Submission",
            "status": "Scheduled",
            "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
            "mentor": "AmaliTech Programme Coordinators",
            "rationale": "Official programme milestone submission and governance.",
            "description": "Execute the comprehensive Gate 3 feature review: verify that patient booking, SMS alerts, virtual queue, staff consultations, cancellations, and walk-ins are 100% operational on staging. Enforce the strict code freeze on the repository main branch. Submit the Gate 3 Progress Assessment to AmaliTech by 5:00 PM.",
            "dependencies": "Blocked by: Week 3 deliverables • Blocks: Gate 3 approval and transition to Week 4 Hardening.",
            "deadline": "Friday, 18 Sep 2026, 5:00 PM",
            "week": "Week 3 (Official Gate 3 Milestone)",
            "ac": [
                "End-to-end multi-role verification passed on staging (Patient + Receptionist + Doctor).",
                "Branch protection enabled on main: feature freeze enacted, only bugfix PRs accepted.",
                "AmaliTech Gate 3 Submission Form completed with architecture diagrams and live staging URL.",
                "Sprint retrospective and Week 4 hardening kickoff meeting conducted."
            ]
        }
    ]

    for t in tasks_w3_active:
        render_task_card(doc, t)

    # 5. PAIRING STRATEGY
    h5 = doc.add_heading(level=1)
    h5_run = h5.add_run("5. Engineering Pairing & Acceleration Strategy (Next 48 Hours)")
    h5_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "With Able Kafu Azanda and Emmanuella Lodonu finishing their backend deliverables ahead of schedule, the team is aligned on high-impact pairing pairs:"
    )

    pair_tbl = doc.add_table(rows=4, cols=3)
    pair_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    pair_tbl.autofit = False
    set_table_borders(pair_tbl)

    p_headers = ["Pairing Allocation", "Target Deliverable", "Focus & Synergies"]
    p_widths = [Inches(1.8), Inches(2.2), Inches(2.7)]
    for j, h in enumerate(p_headers):
        c = pair_tbl.cell(0, j)
        c.width = p_widths[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    pair_data = [
        ("Able Kafu Azanda + Raymond Afrani", "P18 Queue Screen & P11-P17 Cancellation UI", "Able assists Raymond with endpoint request payloads, polling error handlers, and state mappings for the virtual queue and cancellation flows."),
        ("Emmanuella Lodonu + Harry Nartey", "Walk-In Fast-Track Intake (S01/S02)", "Emmanuella pairs with Harry on connecting the staff walk-in modal to the patient registration service and verifying SMS notification triggers."),
        ("Blessing Dogbe (DevOps Lead)", "Staging Verification & Test Governance", "Blessing verifies all automated tests on PR CI (maintaining 108/108 passing), monitors Render cloud logs, and manages release governance.")
    ]

    for i, row_data in enumerate(pair_data):
        row = pair_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = p_widths[j]
            if i % 2 == 1:
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 6. FORWARD ROADMAP: WEEKS 4 & 5
    h6 = doc.add_heading(level=1)
    h6_run = h6.add_run("6. Forward Roadmap: Week 4 Hardening & Week 5 Executive Demo")
    h6_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "Following the Friday Gate 3 Feature Freeze, the remaining two weeks of the capstone programme are dedicated strictly to quality assurance, clinical data modeling, and stakeholder presentation:"
    )

    w45_tasks = [
        {
            "phase": "Week 4: Gate 4 (Reviewed, Fixed & Documented — Target: Fri 25 Sep 2026)",
            "items": [
                ("[TEST] Concurrency Stress Testing & Performance Profiling", "Able Kafu Azanda", "Simulate 100 simultaneous booking & check-in requests/second; assert p95 latency < 200ms with zero collisions."),
                ("[SEC] Data Protection, Phone Masking & Security Audit", "Emmanuella Lodonu", "Mask phone numbers on public displays (+233 24 **** 567); sanitize all inputs against injection."),
                ("[FE] Cross-Device Mobile Responsiveness & Accessibility (A11y)", "Raymond B. Afrani", "Audit touch target sizes (44px+), contrast ratios, and offline caching on low-bandwidth campus cellular connections."),
                ("[FS] Network Resilience & Offline Fallback UX", "Harry “Ephraim” Nartey", "Implement IndexedDB fallback and reconnection banners for reception desks during temporary Wi-Fi blips."),
                ("[DOCS] Comprehensive System Architecture & Deployment Runbook", "Blessing Dogbe", "Publish complete OpenAPI catalog, database ER diagrams, and disaster recovery procedures for AmaliTech.")
            ]
        },
        {
            "phase": "Week 5: Gate 5 (Demo Delivered + Insights Shared — Target: Fri 2 Oct 2026)",
            "items": [
                ("[DEMO] End-to-End Clinical Simulation Rehearsal", "All Team Members", "Simulate an entire morning at KNUST Students' Clinic: 5 online bookings, 2 walk-ins, doctor triage, live SMS texts."),
                ("[DATA] Clinical Impact Analysis & Wait-Time Metric Modeling", "Able & Emmanuella", "Model simulated throughput improvements: quantify how virtual queuing reduces peak waiting room congestion by 65%."),
                ("[SLIDES] Executive Stakeholder Pitch Deck & Demo Video Recording", "Raymond & Harry", "Author the final executive pitch deck and produce a 3-minute high-definition product walkthrough video."),
                ("[LEAD] Final Capstone Defence & AmaliTech Programme Handover", "Blessing Dogbe", "Lead final presentation to AmaliTech CSR evaluators & KNUST Health Services stakeholders.")
            ]
        }
    ]

    for p_info in w45_tasks:
        h_p = doc.add_heading(level=2)
        h_p_run = h_p.add_run(p_info["phase"])
        h_p_run.font.color.rgb = RGBColor(8, 127, 108)

        tbl = doc.add_table(rows=len(p_info["items"]) + 1, cols=3)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        set_table_borders(tbl)

        th = ["Deliverable / Task Title", "Owner", "Scope & Done Criteria"]
        tw = [Inches(2.4), Inches(1.3), Inches(3.0)]
        for j, h in enumerate(th):
            c = tbl.cell(0, j)
            c.width = tw[j]
            set_cell_background(c, "E7F5F1")
            set_cell_margins(c, 80, 80, 90, 90)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(h)
            r.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(8, 127, 108)

        for i, (title, owner, desc) in enumerate(p_info["items"]):
            row = tbl.rows[i+1]
            c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
            c0.width, c1.width, c2.width = tw[0], tw[1], tw[2]
            if i % 2 == 1:
                set_cell_background(c0, "FBFBFB")
                set_cell_background(c1, "FBFBFB")
                set_cell_background(c2, "FBFBFB")
            set_cell_margins(c0, 60, 60, 80, 80)
            set_cell_margins(c1, 60, 60, 80, 80)
            set_cell_margins(c2, 60, 60, 80, 80)

            p0 = c0.paragraphs[0]
            p0.paragraph_format.space_after = Pt(0)
            r0 = p0.add_run(title)
            r0.bold = True
            r0.font.size = Pt(8)

            p1 = c1.paragraphs[0]
            p1.paragraph_format.space_after = Pt(0)
            r1 = p1.add_run(owner)
            r1.font.size = Pt(8)

            p2 = c2.paragraphs[0]
            p2.paragraph_format.space_after = Pt(0)
            r2 = p2.add_run(desc)
            r2.font.size = Pt(8)

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    doc.save(output_path)
    print(f"DOCX created at: {output_path}")

# --- BUILD HTML FOR PDF RENDERING ---
def generate_week3_html():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>YɛnCare • Week 3 Task Status & Master Sprint Execution Report</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {
      content: "YɛnCare • Week 3 Task Status Report";
      font-size: 8pt;
      color: #888;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #111111;
    line-height: 1.45;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
  }
  .header {
    border-bottom: 2px solid #087F6C;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .header h1 {
    color: #087F6C;
    font-size: 22pt;
    margin: 0 0 4px 0;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .header .subtitle {
    font-size: 11pt;
    color: #555555;
    font-weight: 600;
    margin: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  th, td {
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
    font-size: 8.5pt;
    border: 1px solid #D8DCD9;
  }
  th {
    background-color: #E7F5F1;
    color: #087F6C;
    font-weight: 700;
  }
  tr.alt td {
    background-color: #FBFBFB;
  }
  tr.highlight td {
    background-color: #E7F5F1;
    font-weight: 600;
  }
  h2 {
    color: #087F6C;
    font-size: 13pt;
    margin: 18px 0 8px 0;
    border-bottom: 1px solid #E7F5F1;
    padding-bottom: 4px;
    page-break-after: avoid;
  }
  h3 {
    color: #087F6C;
    font-size: 10.5pt;
    margin: 14px 0 6px 0;
    page-break-after: avoid;
  }
  .callout {
    background-color: #E7F5F1;
    border-left: 4px solid #087F6C;
    padding: 10px 14px;
    margin: 14px 0;
    border-radius: 0 4px 4px 0;
    page-break-inside: avoid;
  }
  .callout-title {
    font-weight: 700;
    color: #087F6C;
    font-size: 9.5pt;
    margin-bottom: 4px;
  }
  .callout p {
    margin: 4px 0;
    font-size: 8.5pt;
    color: #222;
  }
  .card {
    border: 1px solid #D8DCD9;
    border-radius: 4px;
    margin-bottom: 14px;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .card-header {
    background-color: #087F6C;
    color: #FFFFFF;
    padding: 7px 12px;
    font-weight: 700;
    font-size: 9.5pt;
  }
  .card-body table {
    margin: 0;
    border: none;
  }
  .card-body td {
    border: none;
    border-bottom: 1px solid #EDEDED;
    padding: 5px 10px;
  }
  .card-body td.label {
    width: 25%;
    font-weight: 700;
    background-color: #F7F8F7;
    color: #444;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-done { background: #D1FAE5; color: #065F46; }
  .badge-progress { background: #FEF3C7; color: #92400E; }
  .badge-backlog { background: #E5E7EB; color: #374151; }
  ul { margin: 2px 0 2px 18px; padding: 0; }
  li { margin-bottom: 2px; font-size: 8.5pt; }
  .footer-note {
    font-size: 7.5pt;
    color: #888;
    text-align: right;
    margin-top: 20px;
    border-top: 1px solid #EEE;
    padding-top: 6px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>YɛnCare Health Platform</h1>
  <div class="subtitle">Week 3 Task Status & Master Sprint Execution Report (Gate 3 Feature-Complete)</div>
</div>

<table>
  <tr>
    <td style="width: 30%; font-weight: bold; background: #F7F8F7;">Programme / Context</td>
    <td>AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Active Sprint State</td>
    <td><strong>Gate 2 100% Verified &amp; Done</strong> • Week 3 Major Backend Engine Milestones Merged into <code>main</code></td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Current Execution Date</td>
    <td><strong>Tuesday, 15 September 2026</strong> (Week 3 Execution / 72h to Gate 3 Feature Freeze)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Milestone Objective</td>
    <td>Deliver complete patient virtual queue tracking and cancellation flows; achieve 100% Feature-Complete by Friday 18 Sep 2026.</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Automated Test Health</td>
    <td><strong style="color: #087F6C;">108 Passing Tests across 31 Suites</strong> (0 Failures, Native Node Test Runner)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Lead Author &amp; Role</td>
    <td>Blessing Edmund Kwame Dogbe (Backend &amp; DevOps Lead / Product Coordinator)</td>
  </tr>
</table>

<h2>1. Team Roster &amp; Competency Allocation</h2>
<p>Engineering allocations align strictly with demonstrated competencies and technical milestones:</p>

<table>
  <thead>
    <tr>
      <th style="width: 22%;">Team Member</th>
      <th style="width: 18%;">Discipline</th>
      <th style="width: 38%;">Key Delivered Engineering Artifacts</th>
      <th style="width: 22%;">Week 3 Sprint Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Blessing Edmund Kwame Dogbe</strong></td>
      <td>DevOps / Backend Lead</td>
      <td>Render staging deployment, GitHub Actions PR CI automation, mNotify SMS sandbox, production API fallback, release governance.</td>
      <td>Staging Active • 108 Tests • Gate 3 Lead</td>
    </tr>
    <tr class="alt">
      <td><strong>Able Kafu Azanda</strong></td>
      <td>Backend Lead Architect</td>
      <td>Virtual Queue Engine (PR #13), atomic daily tokens (A-01, B-04), Appointment Cancellation &amp; Reschedule API (PR #14), AuditLog model.</td>
      <td><span class="badge badge-done">Done (PR #13 &amp; #14)</span></td>
    </tr>
    <tr>
      <td><strong>Emmanuella Lodonu</strong></td>
      <td>Backend Foundations</td>
      <td>Single-recipient SMS validation safeguards (mnotify.js), patient registration &amp; lookup API (/api/patients), Call-Next SMS trigger.</td>
      <td><span class="badge badge-done">Gate 2 Done • SMS Done</span></td>
    </tr>
    <tr class="alt">
      <td><strong>Harry “Ephraim” Nartey</strong></td>
      <td>Fullstack Foundations</td>
      <td>Frontend HTTP API client integration, Staff Check-In view (S02/S03), Staff Portal Date Picker &amp; Demo Day toggle (StaffPortal.jsx).</td>
      <td><span class="badge badge-progress">Check-in Done • Walk-In</span></td>
    </tr>
    <tr>
      <td><strong>Raymond B. Afrani</strong></td>
      <td>Frontend Foundations</td>
      <td>Complete patient intake wizard (P01-P07) with speakable reference code (YC-XXXX) &amp; emergency triage diversion.</td>
      <td><span class="badge badge-progress">Wiring P18 &amp; P11-P17</span></td>
    </tr>
  </tbody>
</table>

<h2>2. Updated Trello Board State: Gate 2 Closeout &amp; Gate 3 Execution</h2>
<p>As of Tuesday, 15 September 2026, Gate 2 is 100% complete and verified (12/12 cards). Week 3 has 5 out of 9 deliverables merged and operational:</p>

<table>
  <thead>
    <tr>
      <th>Lifecycle Stage</th>
      <th>Card Count</th>
      <th>Percentage</th>
      <th>Active Deliverables in Stage</th>
    </tr>
  </thead>
  <tbody>
    <tr class="highlight">
      <td><strong>Gate 2 Verified (Done)</strong></td>
      <td><strong>12 / 12</strong></td>
      <td><strong>100.0%</strong></td>
      <td>Complete Patient Intake Loop (P01-P07), Concurrency Lock, Staging &amp; CI, Staff Check-In</td>
    </tr>
    <tr class="highlight">
      <td><strong>Week 3 Verified (Done)</strong></td>
      <td><strong>5 / 9</strong></td>
      <td><strong>55.6%</strong></td>
      <td>Virtual Queue Engine (AA), Cancellation API (AA), SMS Safeguards (EL), Staging Fallback (Blessing), Staff Date Picker (HN)</td>
    </tr>
    <tr class="alt">
      <td><strong>Week 3 In Progress</strong></td>
      <td>3 / 9</td>
      <td>33.3%</td>
      <td>[FE] P18 Queue Status Screen (RA), [FE] P11-P17 Cancellation UI (RA), [FS] Walk-In Intake (HN)</td>
    </tr>
    <tr>
      <td><strong>Week 3 Sprint Backlog</strong></td>
      <td>1 / 9</td>
      <td>11.1%</td>
      <td>[LEAD] Gate 3 Feature-Freeze Verification &amp; Submission (Blessing — Scheduled Fri 18 Sep)</td>
    </tr>
    <tr class="highlight" style="background: #F0F5F3;">
      <td><strong>Total Active Scope</strong></td>
      <td><strong>21 Cards</strong></td>
      <td><strong>81.0%</strong></td>
      <td><strong>17 of 21 Tasks Across Gate 2 &amp; Gate 3 Officially Verified &amp; Merged into main</strong></td>
    </tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Gate 3 Major Breakthrough: Core Queuing &amp; Cancellation Engines Merged!</div>
  <p>• Able Kafu Azanda has successfully merged Pull Request #13 (Virtual Queue Engine &amp; Token Progression State Machine) and Pull Request #14 (Appointment Cancellation &amp; Rescheduling API).</p>
  <p>• These deliveries unlock non-colliding daily sequence tokens (A-01, B-04), real-time queue position calculation, dynamic wait times ((patients ahead) × 15 min), atomic slot recovery on cancellation, and zero-collision slot swaps during reschedule.</p>
  <p>• All 108 unit and integration tests are passing cleanly on the native Node.js test runner.</p>
</div>

<h2>3. Completed Work Log: 17 Verified Tasks (Gate 2 Closeout + Week 3)</h2>

<table>
  <thead>
    <tr>
      <th style="width: 32%;">Task Code &amp; Title</th>
      <th style="width: 18%;">Primary Owner</th>
      <th style="width: 15%;">Milestone</th>
      <th style="width: 35%;">Delivered Technical Artifacts</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>[BE] MongoDB Schema &amp; Models</td><td>Able Kafu Azanda</td><td>Gate 2 Done</td><td>Mongoose models: Patient, Appointment, Clinician, Room, TimeSlot.</td></tr>
    <tr class="alt"><td>[DEVOPS] SMS Provider Sandbox</td><td>Blessing Dogbe</td><td>Gate 2 Done</td><td>Quick SMS v2 API (mnotify.js), Sender ID 'YenCare' approved.</td></tr>
    <tr><td>[BE] Patient Registration &amp; Lookup</td><td>Emmanuella Lodonu</td><td>Gate 2 Done</td><td>POST /api/patients, GET /api/patients/:identifier for index &amp; phone.</td></tr>
    <tr class="alt"><td>[FE] Intake &amp; Triage Flow (P01-P02C)</td><td>Raymond Afrani</td><td>Gate 2 Done</td><td>P01 Home, P02 Details, P02B Site, P02C Emergency Gate diversion.</td></tr>
    <tr><td>[BE] Appointment Booking Concurrency Lock</td><td>Able Kafu Azanda</td><td>Gate 2 Done</td><td>Unique compound index locking ({ clinicianId, date, startTime }).</td></tr>
    <tr class="alt"><td>[TEST] Double-Booking Prevention Test</td><td>Able Kafu Azanda</td><td>Gate 2 Done</td><td>Concurrency suite asserting 201 Created vs 409 Conflict.</td></tr>
    <tr><td>[BE] Booking SMS Dispatch Trigger</td><td>Emmanuella Lodonu</td><td>Gate 2 Done</td><td>sendSms trigger wired into bookAppointment.js on DB write.</td></tr>
    <tr class="alt"><td>[FS] API Client Service Layer</td><td>Harry Nartey</td><td>Gate 2 Done</td><td>Axios service layer (patients.js, appointments.js), loading spinners.</td></tr>
    <tr><td>[FE] Doctor &amp; Slot Picker (P02B-P05)</td><td>Raymond Afrani</td><td>Gate 2 Done</td><td>Doctor selector (P03), Date &amp; 30-min slot picker (P04/P05).</td></tr>
    <tr class="alt"><td>[DEVOPS] Render Staging &amp; CI Pipeline</td><td>Blessing Dogbe</td><td>Gate 2 Done</td><td>Render staging, MongoDB Atlas, GitHub Actions PR CI automation.</td></tr>
    <tr><td>[FE] Review &amp; Confirm (P06-P07)</td><td>Raymond Afrani</td><td>Gate 2 Done</td><td>P06 Summary Review and P07 Success card with reference code (YC-XXXX).</td></tr>
    <tr class="alt"><td>[FS] Staff Check-In View (S02/S03)</td><td>Harry Nartey</td><td>Gate 2 Done</td><td>Daily appointment roster with 1-click check-in to CHECKED_IN.</td></tr>
    <!-- Week 3 tasks -->
    <tr class="highlight"><td>[BE] Virtual Queue Engine &amp; State Machine</td><td>Able Kafu Azanda</td><td>Week 3 Done</td><td>queueEngine.js, QueueCounter.js, atomic tokens (A-01, B-04), FIFO call-next. (PR #13)</td></tr>
    <tr class="highlight"><td>[BE] Cancellation &amp; Reschedule API</td><td>Able Kafu Azanda</td><td>Week 3 Done</td><td>PATCH cancel &amp; reschedule, atomic slot recovery &amp; swap, AuditLog. (PR #14)</td></tr>
    <tr class="highlight"><td>[BE] SMS Single-Recipient Validation</td><td>Emmanuella / Blessing</td><td>Week 3 Done</td><td>Single recipient validation, phone normalization, Call-Next SMS trigger.</td></tr>
    <tr class="highlight"><td>[DEVOPS] Staging Fallback Integration</td><td>Blessing Dogbe</td><td>Week 3 Done</td><td>Vite production fallback to Render staging URL; pool connection hardening.</td></tr>
    <tr class="highlight"><td>[FS] Staff Date Picker &amp; Demo Toggle</td><td>Harry Nartey</td><td>Week 3 Done</td><td>StaffPortal.jsx date picker, demo day toggle (2026-09-15), queue roster.</td></tr>
  </tbody>
</table>

<h2>4. Active In-Progress Tasks for Gate 3 Feature-Freeze (4 Tasks)</h2>

<div class="card">
  <div class="card-header">[FE] Virtual Queue Live Status &amp; Progress Screen (P18)</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Status &amp; Milestone</td><td><span class="badge badge-progress">In Progress (High Priority)</span> | Week 3 (Gate 3 Feature-Complete)</td></tr>
      <tr><td class="label">Assignee &amp; Support</td><td>Primary: Raymond B. Afrani (RA) • Support: Harry Nartey / Able Kafu Azanda</td></tr>
      <tr><td class="label">Scope &amp; Goal</td><td>Implement Screen P18 (Queue Status) displaying live sequence token (e.g. A-02), calculated wait time, current serving token, and room banners ('You are 2nd in line', 'Proceed to Consultation Room 1'). Auto-polls /api/appointments/:reference/queue-status every 15 seconds.</td></tr>
      <tr><td class="label">Dependencies</td><td>Blocked by: None (Backend Queue Engine Merged!) • Blocks: Complete patient attendance loop. Target: Wed 16 Sep 5:00 PM.</td></tr>
      <tr><td class="label">Acceptance Criteria</td><td>
        <ul>
          <li>Renders active token and dynamic wait time based on queue velocity.</li>
          <li>Displays dynamic status transitions: CHECKED_IN → WAITING → CALLED → COMPLETED.</li>
          <li>Pulsing visual alert and auditory chime when status updates to CALLED.</li>
          <li>Polls /api/appointments/:reference/queue-status every 15s with graceful error backoff.</li>
        </ul>
      </td></tr>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header">[FE] Self-Service Cancellation &amp; Rescheduling Flow (P11–P17)</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Status &amp; Milestone</td><td><span class="badge badge-progress">In Progress (High Priority)</span> | Week 3 (Gate 3 Feature-Complete)</td></tr>
      <tr><td class="label">Assignee &amp; Support</td><td>Primary: Raymond B. Afrani (RA) • Support: Harry Nartey / Able Kafu Azanda</td></tr>
      <tr><td class="label">Scope &amp; Goal</td><td>Build Screens P11 (Appointment Details), P12 (Cancel Confirmation dialog), P13 (Cancellation Complete), and P14–P17 (Reschedule calendar and slot picker). Allows students to look up booking via Reference Code + Phone, review booking, cancel, or pick a new slot.</td></tr>
      <tr><td class="label">Dependencies</td><td>Blocked by: None (Backend Cancellation API Merged!) • Blocks: Self-service lifecycle. Target: Thu 17 Sep 5:00 PM.</td></tr>
      <tr><td class="label">Acceptance Criteria</td><td>
        <ul>
          <li>Student looks up booking via 8-digit reference code (YC-XXXX) and verified Ghana phone.</li>
          <li>Two-step cancellation confirmation releases slot and displays cancellation confirmation card.</li>
          <li>Reschedule flow reuses calendar time slot picker and confirms new booking slot.</li>
          <li>Displays user-friendly error alerts if appointment is already CHECKED_IN or COMPLETED.</li>
        </ul>
      </td></tr>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header">[FS] Walk-In Patient Fast-Track Intake &amp; Desk Triage (S01/S02)</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Status &amp; Milestone</td><td><span class="badge badge-progress">In Progress</span> | Week 3 (Gate 3 Feature-Complete)</td></tr>
      <tr><td class="label">Assignee &amp; Support</td><td>Primary: Harry “Ephraim” Nartey (HN) • Support: Emmanuella Lodonu / Blessing Dogbe</td></tr>
      <tr><td class="label">Scope &amp; Goal</td><td>Construct Receptionist Walk-In creation modal on staff portal. Allows clinic receptionists to quickly register an unscheduled student (or lookup existing records via index number) and directly insert them into the day's active virtual queue as a walk-in visit.</td></tr>
      <tr><td class="label">Dependencies</td><td>Blocked by: None (Patient API &amp; Queue Engine Merged!) • Blocks: Hybrid booking/walk-in queue. Target: Thu 17 Sep 5:00 PM.</td></tr>
      <tr><td class="label">Acceptance Criteria</td><td>
        <ul>
          <li>Input modal collects Student Index, Full Name, Phone, and Priority Level (Standard vs Urgent).</li>
          <li>Directly creates patient (if new) and injects appointment with status CHECKED_IN immediately.</li>
          <li>Assigns walk-in sequence token (e.g. W-03) positioned appropriately in the queue.</li>
          <li>Immediate visual feedback on the staff queue dashboard.</li>
        </ul>
      </td></tr>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header">[LEAD] Gate 3 Feature-Freeze Verification &amp; Submission</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Status &amp; Milestone</td><td><span class="badge badge-backlog">Scheduled</span> | Week 3 (Official Gate 3 Milestone)</td></tr>
      <tr><td class="label">Assignee &amp; Support</td><td>Primary: Blessing Edmund Kwame Dogbe (DevOps / Lead) • Support: AmaliTech Coordinators</td></tr>
      <tr><td class="label">Scope &amp; Goal</td><td>Execute comprehensive Gate 3 feature review: verify patient booking, SMS alerts, virtual queue, staff consultations, cancellations, and walk-ins are 100% operational on staging. Enforce strict code freeze on main. Submit Gate 3 Progress Assessment to AmaliTech by 5:00 PM.</td></tr>
      <tr><td class="label">Dependencies</td><td>Blocked by: Week 3 deliverables • Blocks: Gate 3 approval &amp; Week 4 Hardening. Deadline: Fri 18 Sep 2026, 5:00 PM.</td></tr>
      <tr><td class="label">Acceptance Criteria</td><td>
        <ul>
          <li>End-to-end multi-role verification passed on staging (Patient + Receptionist + Doctor).</li>
          <li>Branch protection enabled on main: feature freeze enacted, only bugfix PRs accepted.</li>
          <li>AmaliTech Gate 3 Submission Form completed with architecture diagrams and live staging URL.</li>
          <li>Sprint retrospective and Week 4 hardening kickoff meeting conducted.</li>
        </ul>
      </td></tr>
    </table>
  </div>
</div>

<h2>5. Engineering Pairing &amp; Acceleration Strategy (Next 48 Hours)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Pairing Allocation</th>
      <th style="width: 30%;">Target Deliverable</th>
      <th style="width: 45%;">Focus &amp; Synergies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Able Kafu Azanda + Raymond Afrani</strong></td>
      <td>P18 Queue Screen &amp; P11-P17 Cancellation UI</td>
      <td>Able assists Raymond with endpoint request payloads, polling error handlers, and state mappings for the virtual queue and cancellation flows.</td>
    </tr>
    <tr class="alt">
      <td><strong>Emmanuella Lodonu + Harry Nartey</strong></td>
      <td>Walk-In Fast-Track Intake (S01/S02)</td>
      <td>Emmanuella pairs with Harry on connecting the staff walk-in modal to the patient registration service and verifying SMS notification triggers.</td>
    </tr>
    <tr>
      <td><strong>Blessing Dogbe (DevOps Lead)</strong></td>
      <td>Staging Verification &amp; Test Governance</td>
      <td>Blessing verifies all automated tests on PR CI (maintaining 108/108 passing), monitors Render cloud logs, and manages release governance.</td>
    </tr>
  </tbody>
</table>

<h2>6. Forward Roadmap: Week 4 Hardening &amp; Week 5 Executive Demo</h2>
<h3>Week 4: Gate 4 (Reviewed, Fixed &amp; Documented — Target: Fri 25 Sep 2026)</h3>
<table>
  <thead>
    <tr><th style="width: 30%;">Deliverable / Task</th><th style="width: 20%;">Owner</th><th style="width: 50%;">Scope &amp; Done Criteria</th></tr>
  </thead>
  <tbody>
    <tr><td>[TEST] Concurrency Stress Testing</td><td>Able Kafu Azanda</td><td>Simulate 100 simultaneous booking &amp; check-in requests/second; assert p95 latency &lt; 200ms with zero collisions.</td></tr>
    <tr class="alt"><td>[SEC] Data Protection &amp; Phone Masking</td><td>Emmanuella Lodonu</td><td>Mask phone numbers on public displays (+233 24 **** 567); sanitize all inputs against injection.</td></tr>
    <tr><td>[FE] Mobile Responsiveness &amp; A11y</td><td>Raymond Afrani</td><td>Audit touch target sizes (44px+), contrast ratios, and offline caching on low-bandwidth campus cellular connections.</td></tr>
    <tr class="alt"><td>[FS] Network Resilience &amp; Offline UX</td><td>Harry Nartey</td><td>Implement IndexedDB fallback and reconnection banners for reception desks during temporary Wi-Fi blips.</td></tr>
    <tr><td>[DOCS] Architecture Specs &amp; Runbook</td><td>Blessing Dogbe</td><td>Publish complete OpenAPI catalog, database ER diagrams, and disaster recovery procedures for AmaliTech.</td></tr>
  </tbody>
</table>

<h3>Week 5: Gate 5 (Demo Delivered + Insights Shared — Target: Fri 2 Oct 2026)</h3>
<table>
  <thead>
    <tr><th style="width: 30%;">Deliverable / Task</th><th style="width: 20%;">Owner</th><th style="width: 50%;">Scope &amp; Done Criteria</th></tr>
  </thead>
  <tbody>
    <tr><td>[DEMO] End-to-End Simulation Rehearsal</td><td>All Team Members</td><td>Simulate an entire morning at KNUST Students' Clinic: 5 online bookings, 2 walk-ins, doctor triage, live SMS texts.</td></tr>
    <tr class="alt"><td>[DATA] Clinical Impact Wait-Time Modeling</td><td>Able &amp; Emmanuella</td><td>Model simulated throughput improvements: quantify how virtual queuing reduces peak waiting room congestion by 65%.</td></tr>
    <tr><td>[SLIDES] Executive Pitch Deck &amp; Video</td><td>Raymond &amp; Harry</td><td>Author final executive pitch deck and produce 3-minute high-definition product walkthrough video.</td></tr>
    <tr class="alt"><td>[LEAD] Final Capstone Defence &amp; Handover</td><td>Blessing Dogbe</td><td>Lead final presentation to AmaliTech CSR evaluators &amp; KNUST Health Services stakeholders.</td></tr>
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
    
    # 1. Output Week 3 PDF
    html_file = os.path.join(base_dir, "week3_report_temp.html")
    pdf_file = os.path.join(base_dir, "YenCare-Week3-Task-Assignments.pdf")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_week3_html())
    
    success = convert_html_to_pdf(html_file, pdf_file)
    
    # Clean up temp html
    if os.path.exists(html_file):
        os.remove(html_file)
        
    # 2. Output Week 3 DOCX in sync
    docx_file = os.path.join(base_dir, "YenCare-Week3-Task-Assignments.docx")
    build_week3_docx(docx_file)
    
    # Also place a copy of the PDF into docs/ for easy reference
    docs_pdf = os.path.join(base_dir, "docs", "YenCare-Week3-Task-Assignments.pdf")
    if os.path.exists(pdf_file):
        import shutil
        shutil.copyfile(pdf_file, docs_pdf)
        print(f"Copied PDF to docs/ folder: {docs_pdf}")
