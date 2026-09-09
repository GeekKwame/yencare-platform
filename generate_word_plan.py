import sys
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    """Sets internal padding for a table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D8DCD9", sz="4", val="single"):
    """Sets clean subtle borders for a table."""
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
    """Creates a stylized alert/callout box using a single-cell table."""
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
    
    # Header row with title
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

    doc.add_paragraph().paragraph_format.space_after = Pt(5)

def build_document(output_path):
    doc = Document()
    
    # Page setup - 0.8 inch margins
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
        # Header / Footer
        footer = s.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("YɛnCare • Sprint Master Plan: Week 2 to Week 5 Delivery • Confidential")
        f_run.font.name = 'Calibri'
        f_run.font.size = Pt(8)
        f_run.font.color.rgb = RGBColor(140, 140, 140)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(9.5)
    normal_style.font.color.rgb = RGBColor(17, 17, 17)
    
    # --- COVER / TITLE BLOCK ---
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
    sub_run = sub_p.add_run("Master Sprint Plan & Forward Task Allocation: Week 2 to Week 5")
    sub_run.bold = True
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = RGBColor(102, 112, 107)

    # Meta table
    meta_tbl = doc.add_table(rows=5, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    set_table_borders(meta_tbl, color="087F6C", sz="6")
    
    meta_data = [
        ("Programme / Context", "AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)"),
        ("Active Sprint State", "Week 2 Major Milestone Achieved: 7 Cards Verified & Done (58.3% Gate 2 Scope Complete)"),
        ("Current Execution Date", "Tuesday, 8 September 2026 (Day 2 of Week 2 Execution)"),
        ("Milestone Objective", "Finalize remaining frontend wiring & staging deployment for Gate 2, while assigning unblocked engineers (Able & Emmanuella) to advance Week 3 features."),
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

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # --- SECTION 1: TEAM ROSTER ---
    h1 = doc.add_heading(level=1)
    h1_run = h1.add_run("1. Team Roster & Competency Allocation")
    h1_run.font.color.rgb = RGBColor(8, 127, 108)
    
    doc.add_paragraph(
        "Tasks across all milestones are assigned strictly according to team members' core engineering strengths, current availability, and architectural requirements:"
    )

    roster_tbl = doc.add_table(rows=6, cols=4)
    roster_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    roster_tbl.autofit = False
    set_table_borders(roster_tbl)
    
    headers = ["Team Member", "Discipline / Focus", "Demonstrated Strengths", "Current Gate 2 Status"]
    r_widths = [Inches(1.6), Inches(1.3), Inches(2.3), Inches(1.5)]
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
        ("Blessing Edmund Kwame Dogbe", "DevOps / Backend Lead", "Backend architecture, mNotify Ghana SMS integration, CI/CD pipelines (GitHub Actions), Render staging environments, release governance.", "1 Done, 2 Backlog (DevOps Staging & Lead)"),
        ("Able Kafu Azanda", "Backend Lead Architect", "MongoDB Mongoose schema design, compound indexing, transactional concurrency locking, double-booking prevention, automated load & integration testing.", "3 Done (100% Gate 2 Complete! Available for Week 3)"),
        ("Emmanuella Lodonu", "Backend Foundations", "Express.js REST APIs, patient registration & lookup (`/api/patients`), data validation schemas, transactional SMS dispatch triggers (`sendSms`).", "2 Done (100% Gate 2 Complete! Available for Week 3)"),
        ("Harry “Ephraim” Nartey", "Fullstack Foundations", "Frontend HTTP API client integration (Axios/Fetch), React state management, staff operational dashboards (check-in desk, room workflow, queue state).", "1 In Progress, 1 Backlog (Actively wiring API client)"),
        ("Raymond B. Afrani", "Frontend Foundations", "Responsive React component engineering, patient intake flow (P01-P07), form validation, multi-site selection, emergency triage gate, queue status screen.", "1 Done, 1 In Progress, 1 Backlog (P02B/P03 slot picker)")
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

    # --- SECTION 2: TRELLO BOARD STATE (LATEST SNAPSHOT: 7 DONE) ---
    h2 = doc.add_heading(level=1)
    h2_run = h2.add_run("2. Updated Trello Board State: 7 Tasks Verified & Done")
    h2_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "As of Tuesday night, 8 September 2026, 7 out of 12 Gate 2 cards have been officially verified and moved to 'Gate 2 Verified (Done)'. "
        "The entire backend core (MongoDB schemas, concurrency locking, double-booking prevention test, patient API, and SMS trigger) is 100% finished:"
    )

    snap_tbl = doc.add_table(rows=5, cols=4)
    snap_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    snap_tbl.autofit = False
    set_table_borders(snap_tbl)
    
    s_headers = ["Lifecycle Stage", "Card Count", "Percentage", "Active Cards in Stage"]
    s_widths = [Inches(1.8), Inches(1.0), Inches(1.0), Inches(2.9)]
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
        ("Gate 2 Verified (Done)", "7", "58.3%", "MongoDB Schema (AA), SMS Sandbox (Blessing), Patient API (EL), SMS Trigger (EL), P01-P02C Flow (RA), Booking API Lock (AA), Double-Booking Test (AA)"),
        ("In Progress", "2", "16.7%", "API Client & State Connection (HN), Clinic Site & Slot Picker P02B-P05 (RA)"),
        ("Gate 2 Sprint Backlog", "3", "25.0%", "Review & Confirm Screen P06-P07 (RA), Staff Check-In S02-S03 (HN), Staging & CI (Blessing), Lead Checkpoint (Blessing)"),
        ("Total Gate 2 Scope", "12", "100.0%", "Full end-to-end patient booking and notification loop")
    ]
    for i, row_data in enumerate(snap_data):
        row = snap_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = s_widths[j]
            if i == 0:
                set_cell_background(cell, "E7F5F1") # Highlight Done in green
            elif i == 3:
                set_cell_background(cell, "F0F5F3")
            elif i % 2 == 1:
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 70, 70, 90, 90)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if i in (0, 3) or j == 0:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    make_callout_box(
        doc,
        "Milestone Breakthrough: Backend Architecture Completely Unlocked!",
        [
            "With Able Kafu Azanda finishing the Appointment Booking API with Concurrency Lock and the Automated Double-Booking Test, and Emmanuella Lodonu finishing the Patient Endpoints and SMS Trigger, the entire backend write path is verified and locked.",
            "This completely clears all blockers for Harry Nartey and Raymond Afrani. Furthermore, Able and Emmanuella are now 100% free to be assigned their next tasks (Week 3 queue state machine, cancellation APIs, and staff operations endpoints)."
        ],
        border_color="087F6C",
        bg_color="E7F5F1"
    )

    # --- SECTION 3: COMPLETED WORK LOG (7 CARDS) ---
    h3 = doc.add_heading(level=1)
    h3_run = h3.add_run("3. Completed Work Log: 7 Gate 2 Verified Tasks")
    h3_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "The following 7 tasks have been completed, verified against the codebase, and officially moved to 'Gate 2 Verified (Done)':"
    )

    done_tbl = doc.add_table(rows=8, cols=4)
    done_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    done_tbl.autofit = False
    set_table_borders(done_tbl)

    d_headers = ["Card Title & Prefix", "Primary Owner", "Verified Date", "Delivered Artifacts & Technical Impact"]
    d_widths = [Inches(2.3), Inches(1.1), Inches(1.0), Inches(2.3)]
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
        ("[BE] Design MongoDB Schema & Core Appointment Models", "Able Kafu Azanda (AA)", "Mon, 7 Sep 2026", "Delivered Mongoose models for Patient, Appointment, Clinician, Room, and TimeSlot with validation rules and compound indexes."),
        ("[DEVOPS] Configure SMS Provider Sandbox (Mnotify)", "Blessing Dogbe (DevOps)", "Tue, 8 Sep 2026", "Integrated mNotify Quick SMS v2 API (`mnotify.js`). Registered Sender ID 'YenCare' with Ghana telcos, resolved keyword filters, and tested handset delivery."),
        ("[BE] Implement Patient Registration & Verification Endpoints", "Emmanuella Lodonu (EL)", "Tue, 8 Sep 2026", "Built `POST /api/patients` and `GET /api/patients/:identifier` supporting both 8-digit KNUST student index and Ghana mobile phone lookup."),
        ("[FE] Build Landing Page + Patient Registration & Triage Flow (P01-P02C)", "Raymond B. Afrani (RA)", "Tue, 8 Sep 2026", "Implemented P01 Home (live queue metrics), P02 Student Registration, P02B Clinic Site Selector, and P02C Visit Triage with Emergency Gate diversion."),
        ("[BE] Implement Appointment Booking API with Concurrency Lock", "Able Kafu Azanda (AA)", "Tue, 8 Sep 2026", "Delivered `createAppointment` service with compound unique index locking (`{ clinicianId, date, startTime }`) and generated `YC-XXXX` reference codes."),
        ("[TEST] Automated Test for Double-Booking Prevention", "Able Kafu Azanda (AA)", "Tue, 8 Sep 2026", "Validated concurrency test suite ensuring simultaneous requests return 201 Created for the winner and 409 Conflict for duplicate requests."),
        ("[BE] Hook SMS Dispatch Trigger on Successful Appointment Creation", "Emmanuella Lodonu (EL)", "Tue, 8 Sep 2026", "Integrated `sendSms` inside `bookAppointment.js`. Fires transactional confirmation SMS via mNotify immediately after MongoDB write succeeds.")
    ]

    for i, row_data in enumerate(done_data):
        row = done_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = d_widths[j]
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

    # --- SECTION 4: REMAINING OPEN TASKS FOR GATE 2 (5 CARDS) ---
    h4 = doc.add_heading(level=1)
    h4_run = h4.add_run("4. Remaining Open Tasks for Gate 2 Delivery (5 Tasks)")
    h4_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "The remaining 5 tasks required to close out Gate 2 by Friday, 11 September 2026 are actively underway:"
    )

    tasks_rem = [
        {
            "code": "[FS] Set Up API Client & State Connection In React Frontend",
            "status": "In Progress (High Priority)",
            "assignee": "Harry “Ephraim” Nartey (HN)",
            "mentor": "Able Kafu Azanda / Blessing Dogbe",
            "rationale": "Harry is the dedicated Fullstack engineer responsible for bridging backend services with React components.",
            "description": "Construct the frontend HTTP service layer using Axios/Fetch to consume the Express backend API. Connect Raymond's P02 registration form to `POST /api/patients` and prepare the appointment booking payload for `createAppointment`. Implement standardized loading spinners, error alerts, and response state persistence.",
            "dependencies": "Blocked by: None (All backend endpoints Done!) • Blocks: End-to-end booking flow.",
            "deadline": "Wednesday, 9 Sep 2026, 5:00 PM (Trello card date)",
            "week": "Week 2 (Core Gate 2 Requirement)",
            "ac": [
                "Axios/Fetch client configured with base URL (`VITE_API_BASE_URL=http://localhost:4000/api`).",
                "P02 form submission calls `POST /api/patients`, storing returning patient ID in application context.",
                "Handles HTTP 400 (validation error) and HTTP 409 (identifier conflict) with user-friendly alerts.",
                "Exposes clean hook or function `createAppointment(bookingData)` for the confirmation screen."
            ]
        },
        {
            "code": "[FE] Build Clinic Site, Clinician & Time Slot Picker (P02B, P03, P04/P05)",
            "status": "In Progress",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey",
            "rationale": "Direct continuation of Raymond's frontend patient flow delivery following P02 completion.",
            "description": "Construct the intermediate booking steps: P03 Choose Doctor/Clinician (filtering by specialty, General Practitioner vs Specialist); and P04/P05 Date and 30-minute Time Slot Picker. Ensure chosen slot is captured in draft state and slot selection displays the 'Arrive 15 minutes before your time' policy banner.",
            "dependencies": "Blocked by: None (P02 completed) • Blocks: [FE] Booking Review Screen.",
            "deadline": "Wednesday, 9 Sep 2026, 5:00 PM (Trello card date)",
            "week": "Week 2 (Core Gate 2 Requirement)",
            "ac": [
                "User can view and select available clinicians or choose 'Any available doctor'.",
                "Displays selectable 30-minute consultation slots partitioned across morning and afternoon sessions.",
                "Clearly presents 'Arrive 15 min early' arrival guidance on the time picker.",
                "Pushes chosen clinician ID, appointment date, and time slot into the draft booking state."
            ]
        },
        {
            "code": "[DEVOPS] Setup Staging Environment (Render/Railway) & CI Pipeline",
            "status": "Sprint Backlog",
            "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
            "mentor": "Team Lead Self-Directed",
            "rationale": "Blessing owns DevOps, cloud deployment architectures, and repository CI/CD pipelines.",
            "description": "Provision cloud staging infrastructure on Render or Railway hosting the Node.js Express API and connected MongoDB Atlas cluster. Configure GitHub Actions workflow to automatically execute linter checks and backend test suites on every pull request to `main`. Expose a public staging URL for team verification.",
            "dependencies": "Blocked by: None • Blocks: Staging smoke test and Gate 2 demonstration.",
            "deadline": "Wednesday, 9 Sep 2026, 5:00 PM (Trello card date)",
            "week": "Week 2 (Core Gate 2 Requirement)",
            "ac": [
                "Live public staging API endpoint responding with HTTP 200 on `GET /health`.",
                "Environment secrets (`MONGODB_URI`, `MNOTIFY_API_KEY`, `MNOTIFY_SENDER_ID`) securely configured in cloud dashboard.",
                "GitHub Actions workflow runs on PR: executes `npm test` across all backend suites.",
                "Staging URL shared with team in Slack/WhatsApp for verification."
            ]
        },
        {
            "code": "[FE] Booking Review & Confirmation Screen with Reference Code (P06 & P07)",
            "status": "Sprint Backlog",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey",
            "rationale": "Final patient-facing screens completing the booking intake loop.",
            "description": "Build P06 Review Booking summary screen (displaying patient name, student index, clinic site, clinician, date/time, and arrival instructions) and P07 Booking Confirmed screen. Connect the 'Confirm Appointment' button to Harry's API client calling `POST /api/appointments`, render the generated reference code (`YC-XXXX`), and present confirmation feedback with SMS delivery status.",
            "dependencies": "Blocked by: [FE] Slot Picker & [FS] API Client • Blocks: Friday Gate 2 demo.",
            "deadline": "Thursday, 10 Sep 2026, 5:00 PM (Trello card date)",
            "week": "Week 2 (Core Gate 2 Requirement)",
            "ac": [
                "P06 displays complete booking summary card with clear edit/change navigation links.",
                "Submitting initiates API request with active button loading state to prevent double-clicks.",
                "P07 displays generated reference code (e.g. `YC-4821`), calendar add shortcut, and notice: 'A confirmation SMS has been sent to [Phone]'.",
                "Provides direct navigation buttons: 'View Live Queue Status' or 'Return Home'."
            ]
        },
        {
            "code": "[FS] Staff Check-In View & Queue State Scaffold (S02/S03)",
            "status": "Sprint Backlog",
            "assignee": "Harry “Ephraim” Nartey (HN)",
            "mentor": "Able Kafu Azanda / Raymond Afrani",
            "rationale": "Harry's fullstack expertise enables rapid delivery of staff operational views while Raymond finishes patient screens.",
            "description": "Construct the initial staff reception desk screen displaying today's roster of scheduled patient appointments. Implement an interactive 'Check In' button that triggers an API status update changing appointment state from `BOOKED` to `CHECKED_IN`, providing visual confirmation on the queue list.",
            "dependencies": "Blocked by: [BE] Appointment Booking API (Done!) • Blocks: Full-cycle Gate 2 demonstration.",
            "deadline": "Thursday, 10 Sep 2026, 5:00 PM (Trello card date)",
            "week": "Week 2 (Core Gate 2 Requirement)",
            "ac": [
                "Displays table/card list of appointments filtered for current clinic site and today's date.",
                "Receptionist can click 'Check In' to transition appointment status to `CHECKED_IN`.",
                "UI updates status badge in real time to provide feedback to clinical staff.",
                "Operates with fallback mock state if backend is disconnected."
            ]
        },
        {
            "code": "[LEAD] Mid-Week Integration Checkpoint & Friday Progress Form Submission",
            "status": "Sprint Backlog",
            "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
            "mentor": "AmaliTech Programme Coordinators",
            "rationale": "Blessing is the designated Team Lead responsible for official stakeholder reporting and gate deliverables.",
            "description": "Facilitate the Wednesday mid-week team pairing checkpoint to resolve integration blockers between frontend and backend. Coordinate the Thursday comprehensive end-to-end dry run (Register -> Book -> DB Save -> SMS Delivery -> Staff Check-In). Collate sprint metrics and submit the official AmaliTech Friday Progress Form before deadline.",
            "dependencies": "Blocked by: All Gate 2 deliverables • Blocks: Gate 2 approval and transition to Week 3.",
            "deadline": "Friday, 11 Sep 2026, 4:00 PM (Trello card date)",
            "week": "Week 2 (Official Milestone Deadline)",
            "ac": [
                "Wednesday checkpoint completed; blockers documented and escalated.",
                "Thursday end-to-end smoke test passes without manual database manipulation.",
                "AmaliTech Friday Progress Form completed with GitHub repository link, staging URL, and video demo recording.",
                "Sprint retro scheduled for Monday kickoff."
            ]
        }
    ]

    for t in tasks_rem:
        render_task_card(doc, t)

    # --- SECTION 5: IMMEDIATE RE-ASSIGNMENT STRATEGY FOR ABLE & EMMANUELLA ---
    h5 = doc.add_heading(level=1)
    h5_run = h5.add_run("5. Immediate Task Assignment Strategy for Unblocked Engineers")
    h5_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "Because Able Kafu Azanda and Emmanuella Lodonu have achieved 100% completion on their assigned Gate 2 deliverables ahead of schedule, "
        "they are immediately available for task allocation to accelerate project momentum:"
    )

    assign_tbl = doc.add_table(rows=5, cols=4)
    assign_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    assign_tbl.autofit = False
    set_table_borders(assign_tbl)

    as_headers = ["Engineer", "Gate 2 Status", "Immediate Assignment (Next 48h)", "Week 3 Advance Ownership"]
    as_widths = [Inches(1.5), Inches(1.1), Inches(2.2), Inches(2.0)]
    for j, h in enumerate(as_headers):
        c = assign_tbl.cell(0, j)
        c.width = as_widths[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    assign_data = [
        ("Able Kafu Azanda", "3 of 3 DONE (100%)", "Pair with Harry on React API client integration; assist Raymond with time slot query logic.", "• [BE] Virtual Queue Engine & Token State Machine\n• [BE] Cancellation & Slot Release API"),
        ("Emmanuella Lodonu", "2 of 2 DONE (100%)", "Conduct end-to-end data validation testing with Harry; test edge cases on `/api/patients`.", "• [BE] Call-Next Patient SMS Notification Dispatch\n• [BE] Staff Queue Operations API"),
        ("Harry Nartey", "1 In Progress, 1 Backlog", "Finish API client service layer (`patients.js`, `appointments.js`); build staff check-in view.", "• [FS] Staff Consultation Room Workflow (S04)\n• [FS] Walk-In Fast-Track Intake (S01/S02)"),
        ("Raymond Afrani", "1 Done, 1 In Progress, 1 Backlog", "Deliver P02B Clinic Site & P03-P05 Slot Picker; finish P06/P07 Review & Confirmation.", "• [FE] Virtual Queue Live Status Screen (P18)\n• [FE] Self-Service Cancellation & Reschedule")
    ]

    for i, row_data in enumerate(assign_data):
        row = assign_tbl.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = as_widths[j]
            if i < 2:
                set_cell_background(cell, "E7F5F1") # Green highlight for unblocked engineers
            elif i % 2 == 1:
                set_cell_background(cell, "FBFBFB")
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0 or i < 2:
                r.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # --- SECTION 6: WEEK 3 DELIVERY PLAN (GATE 3 FEATURE-COMPLETE & FREEZE) ---
    h6 = doc.add_heading(level=1)
    h6_run = h6.add_run("6. Week 3 Delivery Plan — Gate 3: Feature-Complete & Strict Freeze")
    h6_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "Goal of Week 3 (14 Sep – 18 Sep 2026): Deliver all remaining operational and patient self-service features to achieve complete functional coverage, followed by a strict Feature Freeze at 5:00 PM on Friday, 18 September. Absolutely no new features will be introduced after Week 3."
    )

    tasks_w3 = [
        {
            "code": "[FE] Virtual Queue Live Status & Progress Screen (P18)",
            "status": "Assigned for Week 3",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey",
            "rationale": "Natural evolution of Raymond's patient-facing UI work into the live clinic attendance phase.",
            "description": "Implement Screen P18 (Queue Status) allowing checked-in patients to view their live token position (e.g. `YC-014`), estimated wait time in minutes, current serving token, and real-time status banners ('You are 3rd in line', 'Proceed to Consultation Room 2'). Include auto-polling every 15 seconds.",
            "dependencies": "Blocked by: [BE] Virtual Queue Engine (Able) • Blocks: End-to-end patient queue tracking.",
            "deadline": "Tuesday, 15 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Renders active patient token, queue depth, and calculated wait time based on clinic velocity.",
                "Displays dynamic status transitions: `CHECKED_IN` -> `WAITING` -> `CALLED` -> `IN_CONSULTATION`.",
                "Auditory chime / pulsing visual alert triggered when status updates to `CALLED` with room assignment.",
                "Polls `/api/appointments/:id/queue-status` every 15s with graceful error backoff."
            ]
        },
        {
            "code": "[BE] Virtual Queue Engine & Token Progression State Machine",
            "status": "Assigned for Week 3 (Can start early!)",
            "assignee": "Able Kafu Azanda (AA)",
            "mentor": "Blessing Edmund Kwame Dogbe (Lead)",
            "rationale": "Able has finished all Gate 2 backend tasks and has full ownership of state machine concurrency.",
            "description": "Build the backend queuing engine. When an appointment transitions to `CHECKED_IN`, assign an incremental daily queue token (e.g. `A-01`, `B-04`). Implement atomic status transition endpoints (`POST /api/queue/call-next`, `POST /api/queue/advance`, `POST /api/queue/no-show`) ensuring no duplicate tokens and strict FIFO ordering per clinic room.",
            "dependencies": "Blocked by: None (Week 2 Booking Engine Done!) • Blocks: [FE] Queue Screen & [FS] Staff Room View.",
            "deadline": "Tuesday, 15 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Generates non-colliding daily sequence tokens reset at 00:00 UTC.",
                "Validates state machine rules: only `WAITING` patients can be transitioned to `CALLED`.",
                "Calculates dynamic estimated wait time: (Remaining patients ahead in queue) x (average consult duration).",
                "Emits state events consumed by the SMS trigger."
            ]
        },
        {
            "code": "[FS] Staff Multi-Room Consultation & Call-Next Workflow (S04/S05)",
            "status": "Assigned for Week 3",
            "assignee": "Harry “Ephraim” Nartey (HN)",
            "mentor": "Able Kafu Azanda",
            "rationale": "Harry established the staff portal foundation in Week 2 and has fullstack mastery over operational dashboards.",
            "description": "Build the Doctor/Clinician consultation workstation view (S04). A clinician selects their active room (e.g. Room 1, Room 2), views the list of waiting patients for their specialty, clicks 'Call Next Patient', and completes the visit with clinical disposition notes (Completed, Follow-up Required, Referred).",
            "dependencies": "Blocked by: [BE] Virtual Queue Engine (Able) • Blocks: End-to-end clinical loop.",
            "deadline": "Wednesday, 16 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Clinician can bind session to specific examination room (Consulting Rooms 1–4).",
                "'Call Next Patient' button atomically locks the top waiting patient and updates UI state to `IN_CONSULTATION`.",
                "Action buttons: 'Complete Visit' (marks `COMPLETED`) and 'Mark No-Show' (returns patient to queue or archives).",
                "Includes elapsed consultation timer and summary counter of patients seen today."
            ]
        },
        {
            "code": "[BE] Call-Next Patient SMS Notification Dispatch",
            "status": "Assigned for Week 3 (Can start early!)",
            "assignee": "Emmanuella Lodonu (EL)",
            "mentor": "Blessing Edmund Kwame Dogbe (Lead)",
            "rationale": "Emmanuella owns SMS integration controllers and established the mNotify gateway integration in Week 2.",
            "description": "Hook the SMS service to the 'Call Next' queue transition event. When a clinician calls a patient, immediately send an alert SMS: 'YenCare: Token [Token] is now called to Consulting Room [RoomNumber]. Please proceed inside immediately.' Ensure rapid delivery so patients waiting outside or in campus hostels do not miss their turn.",
            "dependencies": "Blocked by: [BE] Queue Engine & [FS] Staff Room View • Blocks: Gate 3 notification loop.",
            "deadline": "Wednesday, 16 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "SMS triggers automatically upon `CALLED` event transition.",
                "Message body template approved on mNotify: concise (<120 characters) and free of fraud-filter trigger words.",
                "Logs delivery latency and SMS provider message ID.",
                "Non-blocking: SMS latency does not delay the doctor's UI response."
            ]
        },
        {
            "code": "[FE] Self-Service Cancellation & Rescheduling Flow (P11–P17)",
            "status": "Assigned for Week 3",
            "assignee": "Raymond B. Afrani (RA)",
            "mentor": "Harry “Ephraim” Nartey",
            "rationale": "Completes the patient lifecycle on the frontend matching prototype screens P11 through P17.",
            "description": "Implement Screen P11 (Appointment Details), P12 (Cancel Confirmation dialog), P13 (Cancellation Complete), and P14–P17 (Reschedule calendar and slot picker). Allow students to enter their Reference Code + Phone to pull up their booking, cancel it, or choose a new available time slot.",
            "dependencies": "Blocked by: [BE] Cancellation API (Able) • Blocks: Patient self-service completion.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Students can look up booking using 8-digit reference code (`YC-XXXX`) and verified phone number.",
                "Cancel action presents two-step confirmation preventing accidental cancellations.",
                "Reschedule flow reuses the P04/P05 calendar component, displaying only valid future slots.",
                "Confirmation screen clearly displays revised date/time and confirms SMS update."
            ]
        },
        {
            "code": "[BE] Appointment Cancellation & Slot Release API (Double-Release Prevention)",
            "status": "Assigned for Week 3 (Can start early!)",
            "assignee": "Able Kafu Azanda (AA)",
            "mentor": "Blessing Edmund Kwame Dogbe (Lead)",
            "rationale": "Ensures transactional integrity so canceled slots immediately become bookable without data corruption.",
            "description": "Develop `PATCH /api/appointments/:id/cancel` and `PATCH /api/appointments/:id/reschedule`. When an appointment is canceled, update status to `CANCELLED`, release the unique compound slot lock, and make the clinician time slot immediately visible to other students in real time.",
            "dependencies": "Blocked by: Week 2 Booking API (Done!) • Blocks: [FE] Self-Service Reschedule.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Atomic slot release: Canceling removes the uniqueness constraint lock, allowing re-booking of that exact slot.",
                "Prevents invalid state changes (cannot cancel an appointment already marked `CHECKED_IN` or `COMPLETED`).",
                "Reschedule performs an atomic swap (releases old slot and claims new slot in a single Mongoose transaction).",
                "Returns HTTP 200 with updated appointment representation."
            ]
        },
        {
            "code": "[FS] Walk-In Patient Fast-Track Intake & Desk Triage (S01/S02)",
            "status": "Assigned for Week 3",
            "assignee": "Harry “Ephraim” Nartey (HN)",
            "mentor": "Emmanuella Lodonu",
            "rationale": "Fullstack operational requirement for clinic receptionists handling unscheduled emergency/walk-in students.",
            "description": "Build the Receptionist Walk-In creation modal on the staff portal. Allows clinic staff to quickly register an unscheduled student (or lookup existing records via index number) and directly insert them into the day's active virtual queue as a walk-in visit.",
            "dependencies": "Blocked by: [BE] Patient Registration API (Done!) • Blocks: Hybrid booking/walk-in queue.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Input fields: Student Index, Full Name, Phone, and Priority Level (Standard vs Urgent Triage).",
                "Directly creates patient (if new) and injects appointment with status `CHECKED_IN` immediately.",
                "Assigns walk-in sequence token (e.g. `W-03`) positioned appropriately in the queue.",
                "Immediate visual feedback on the staff queue dashboard."
            ]
        },
        {
            "code": "[DEVOPS] Multi-Container Staging & Cloud Database Autoscaling",
            "status": "Assigned for Week 3",
            "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
            "mentor": "Team Lead Self-Directed",
            "rationale": "Blessing's DevOps domain ensures infrastructure is robust enough to handle simultaneous staff and student connections.",
            "description": "Upgrade the cloud staging environment on Render/Railway. Deploy both the frontend React client and the Express backend as connected services. Configure automated database backups on MongoDB Atlas, connection pooling (min 10, max 50 pool size), and CORS policies restricted to the staging domain.",
            "dependencies": "Blocked by: Week 2 Staging Setup • Blocks: Gate 3 multi-user testing.",
            "deadline": "Thursday, 17 Sep 2026, 5:00 PM",
            "week": "Week 3 (Gate 3 Feature-Complete)",
            "ac": [
                "Frontend and backend communicate seamlessly on public HTTPS staging URLs.",
                "MongoDB connection pooling configured to prevent socket starvation under multi-client load.",
                "Automated nightly snapshot backups enabled on MongoDB Atlas cluster.",
                "Healthcheck endpoint `/health` monitors database connection state and response latency."
            ]
        },
        {
            "code": "[LEAD] Gate 3 Feature-Freeze Verification & Submission",
            "status": "Assigned for Week 3",
            "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
            "mentor": "AmaliTech Programme Coordinators",
            "rationale": "Official programme milestone submission and governance.",
            "description": "Execute the comprehensive Gate 3 feature review: verify that patient booking, SMS alerts, virtual queue, staff consultations, and cancellations are 100% operational. Enforce the strict code freeze on the repository `main` branch. Submit the Gate 3 Progress Assessment to AmaliTech by 5:00 PM.",
            "dependencies": "Blocked by: All Week 3 deliverables • Blocks: Gate 3 approval and transition to Week 4 Hardening.",
            "deadline": "Friday, 18 Sep 2026, 5:00 PM",
            "week": "Week 3 (Official Gate 3 Milestone)",
            "ac": [
                "End-to-end multi-role verification passed on staging (Patient + Receptionist + Doctor).",
                "Branch protection enabled on `main`: feature freeze enacted, only bugfix PRs accepted.",
                "AmaliTech Gate 3 Submission Form completed with architecture diagrams and live staging URL.",
                "Sprint retrospective and Week 4 hardening kickoff meeting conducted."
            ]
        }
    ]

    for t in tasks_w3:
        render_task_card(doc, t)

    # --- SECTION 7: WEEK 4 & WEEK 5 DELIVERY PLAN ---
    h7 = doc.add_heading(level=1)
    h7_run = h7.add_run("7. Week 4 & Week 5 Delivery Plan — Hardening, Documentation & Final Demo")
    h7_run.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph(
        "Following the Gate 3 Feature Freeze, Weeks 4 and 5 are dedicated strictly to software reliability, security compliance, clinical impact documentation, and executive stakeholder presentation:"
    )

    w45_tasks = [
        {
            "phase": "Week 4: Gate 4 (Reviewed, Fixed & Documented — Target: Fri 25 Sep 2026)",
            "items": [
                ("[TEST] Concurrency Stress Testing & Performance Profiling", "Able Kafu Azanda", "Execute load testing using k6 or Autocannon simulating 100 simultaneous booking requests/second. Ensure p95 response time is under 200ms and zero double-bookings occur."),
                ("[SEC] Data Protection, Phone Masking & Security Audit", "Emmanuella Lodonu", "Audit patient data handling. Implement phone masking on public screens (`+233 24 **** 567`), sanitize all inputs against NoSQL injection, and verify environment secrets handling."),
                ("[FE] Cross-Device Mobile Responsiveness & Accessibility (A11y)", "Raymond B. Afrani", "Test all patient and staff screens across real devices (iPhone Safari, Android Chrome, low-bandwidth 3G throttled mode). Fix edge padding, tap target sizes, and contrast compliance."),
                ("[FS] Network Resilience & Offline Fallback UX", "Harry “Ephraim” Nartey", "Implement toast banners and reconnect handling when clinic Wi-Fi drops. Ensure staff queue state persists in IndexedDB/LocalStorage during temporary internet blips."),
                ("[DOCS] Comprehensive Architecture Specs & Deployment Runbook", "Blessing Dogbe", "Author complete system documentation: API endpoint catalog, database entity-relationship schema, environment setup guides, and disaster recovery runbooks for AmaliTech review.")
            ]
        },
        {
            "phase": "Week 5: Gate 5 (Demo Delivered + Insights Shared — Target: Fri 2 Oct 2026)",
            "items": [
                ("[DEMO] End-to-End Clinical Simulation Rehearsal", "All Team Members", "Conduct multi-role rehearsals simulating a full morning at KNUST Students' Clinic: 5 patients book online, 2 arrive as walk-ins, receptionist checks them in, doctors call tokens, and SMS texts fire."),
                ("[DATA] Clinical Impact Analysis & Wait-Time Metric Modeling", "Able & Emmanuella", "Calculate simulated throughput improvements: model how virtual queuing and scheduled time slots reduce peak waiting room crowding by an estimated 65% at KNUST clinic."),
                ("[SLIDES] Executive Stakeholder Pitch Deck & Demo Video Recording", "Raymond & Harry", "Produce the final presentation slide deck, architecture diagrams, and a 3-minute high-definition product walkthrough video demonstrating the live system."),
                ("[LEAD] Final Capstone Defence & AmaliTech Programme Handover", "Blessing Dogbe", "Lead the final presentation to AmaliTech CSR evaluators and KNUST clinical stakeholders. Deliver the final repository bundle and project retrospective insights.")
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

    # Save document
    doc.save(output_path)
    print(f"Master document successfully created at: {output_path}")

if __name__ == "__main__":
    out = os.path.join(os.getcwd(), "YenCare-Week2-Task-Assignments.docx")
    build_document(out)
