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

# --- DATA FOR FINAL WEEK (GATE 5) ---
FINAL_TASKS = [
    {
        "code": "[SEC-NOSQL] Defense-in-Depth Generic NoSQL Operator Sanitizer",
        "priority": "Priority 1 (Security)",
        "week": "Final Week (Gate 5)",
        "assignee": "Emmanuella Lodonu (Backend & Security)",
        "mentor": "Able Kafu Azanda (Backend Lead)",
        "rationale": "Augments existing route-level parameter validation with global defense-in-depth protection against nested NoSQL query operator injections.",
        "proto_ref": "System-wide HTTP API Security Layer (backend/src/http/security.js, app.js)",
        "description": "Mount generic recursive Express middleware in app.js that sanitizes all incoming request bodies, query strings, and URL parameters by stripping or escaping keys beginning with '$' or containing '.', preventing NoSQL operator injection attempts.",
        "dependencies": "Blocked by: None • Blocks: Production security compliance sign-off.",
        "deadline": "Monday, 28 Sep 2026, 5:00 PM",
        "ac": [
            "Express middleware mounted before all application route handlers.",
            "Sanitizes or rejects payloads containing keys like '$gt', '$ne', '$regex', or dotted properties.",
            "Automated unit tests added in backend/test/ verifying operator stripping.",
            "Zero regressions across the existing 391 passing backend tests."
        ]
    },
    {
        "code": "[FE-LINT] Frontend Code Hygiene & React 19 ESLint Clean-Up",
        "priority": "Priority 2 (Quality & Hygiene)",
        "week": "Final Week (Gate 5)",
        "assignee": "Raymond B. Afrani (Frontend Lead)",
        "mentor": "Harry “Ephraim” Nartey (Fullstack)",
        "rationale": "Resolves 12 ESLint problems (8 errors, 4 warnings) identified in audit and integrates linting into the CI pipeline.",
        "proto_ref": "frontend/src/pages/ (ClinicActivity, StaffPortal), frontend/src/components/ (ReviewBooking, WelcomeForm, ElapsedTimer)",
        "description": "1. Remove unused Button import in ReviewBooking.jsx. 2. Refactor synchronous setState inside useEffect bodies in WelcomeForm.jsx, ElapsedTimer.jsx, useClinicRoster.js, and ClinicActivity.jsx. 3. Separate helper exports from component files in StaffAuthContext.jsx and ElapsedTimer.jsx. 4. Add frontend linting step to .github/workflows/pr-ci.yml.",
        "dependencies": "Blocked by: None • Blocks: Pristine CI gate enforcement.",
        "deadline": "Tuesday, 29 Sep 2026, 5:00 PM",
        "ac": [
            "npm --prefix frontend run lint completes with 0 errors and 0 warnings.",
            "All components render and state transitions remain functional.",
            "GitHub Actions PR CI workflow runs frontend lint step on every push."
        ]
    },
    {
        "code": "[OPS-HOST] Render Staging Backend Verification & Cloud DNS Uptime",
        "priority": "Priority 3 (DevOps & Staging)",
        "week": "Final Week (Gate 5)",
        "assignee": "Blessing Edmund Kwame Dogbe (DevOps / Lead)",
        "mentor": "AmaliTech Cloud Infrastructure Support",
        "rationale": "Ensures cloud staging environment is active, reachable, and correctly paired with MongoDB Atlas and the live Vercel frontend.",
        "proto_ref": "Production Cloud Infrastructure (Render yencare-api-staging, Vercel yencare-platform, MongoDB Atlas)",
        "description": "Verify and un-pause the Render web service for yencare-api-staging.onrender.com. Ensure MONGODB_URI, JWT_SECRET, and MNOTIFY_API_KEY environment variables match production requirements. Verify public GET /health responds with 200 OK and test cross-origin requests from Vercel.",
        "dependencies": "Blocked by: Render dashboard access • Blocks: Live clinical rehearsal on cloud.",
        "deadline": "Tuesday, 29 Sep 2026, 5:00 PM",
        "ac": [
            "GET https://yencare-api-staging.onrender.com/health returns 200 OK with db: 'connected'.",
            "CORS allows cross-origin requests from https://yencare-platform.vercel.app.",
            "End-to-end booking from live Vercel app writes to MongoDB Atlas and dispatches SMS."
        ]
    },
    {
        "code": "[QA-SIM] Live Multi-Role Clinical Simulation & Rehearsal",
        "priority": "Priority 4 (Clinical QA)",
        "week": "Final Week (Gate 5)",
        "assignee": "Sterling Awuley (QA Lead) + All Team Members",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "Validates seamless multi-role handoff between student mobile client, receptionist desk, doctor workstation, and corridor display.",
        "proto_ref": "P01-P07 (Intake), P09-P17 (Self-Service), S01-S03 (Reception Roster), S04-S05 (Doctor Room), P18/S10 (Corridor Display)",
        "description": "Execute the comprehensive 5-journey testing runbook from docs/testing/LIVE_TESTING_GUIDE.md: 1. Student online booking. 2. Patient self-service OTP reschedule. 3. Arrival check-in within window. 4. Receptionist roster check-in & walk-in triage. 5. Doctor workstation room isolation and consultation completion. 6. Corridor live queue screen updates.",
        "dependencies": "Blocked by: [OPS-HOST] staging backend verification • Blocks: Final presentation demonstration.",
        "deadline": "Wednesday, 30 Sep 2026, 5:00 PM",
        "ac": [
            "All 5 clinical journeys completed without uncaught exceptions or UI dead-ends.",
            "Doctor room isolation verified (Dr. Kwame in Room 1 never sees Dr. Ama's patients in Room 2).",
            "Real SMS delivered to Ghana phone numbers or logged in staging logs.",
            "Complete manual runbook execution logged with evidence."
        ]
    },
    {
        "code": "[SLIDES-DEMO] Stakeholder Pitch Deck, Impact Modeling & Demo Video",
        "priority": "Priority 5 (Presentation)",
        "week": "Final Week (Gate 5)",
        "assignee": "Raymond B. Afrani & Harry “Ephraim” Nartey",
        "mentor": "Blessing Edmund Kwame Dogbe",
        "rationale": "Delivers a compelling, data-backed 15-minute presentation and offline contingency video for the AmaliTech Evaluation Board.",
        "proto_ref": "Executive Presentation Materials, System Architecture Diagrams, Clinical Impact Analytics",
        "description": "1. Build a 15-minute presentation slide deck covering the KNUST healthcare problem, YenCare solution, architecture, security, and live demo. 2. Model simulated clinic throughput showing up to 65% reduction in waiting room peak congestion. 3. Record a 3-minute 1080p offline demo video showcasing the complete clinical flow as a backup for network outages.",
        "dependencies": "Blocked by: [QA-SIM] simulation completion • Blocks: Gate 5 presentation.",
        "deadline": "Thursday, 1 Oct 2026, 5:00 PM",
        "ac": [
            "Final pitch deck approved by team lead and mentors.",
            "3-minute high-definition video walkthrough recorded and archived locally.",
            "Timed rehearsal completed within the 15-minute presentation window."
        ]
    },
    {
        "code": "[HANDOVER] Final Repository Bundling, Documentation & Stakeholder Handover",
        "priority": "Priority 6 (Handover)",
        "week": "Final Week (Gate 5)",
        "assignee": "Blessing Edmund Kwame Dogbe (Lead)",
        "mentor": "Able Kafu Azanda (Backend Lead)",
        "rationale": "Ensures the YenCare platform is cleanly packaged, documented, and archived for long-term deployment by KNUST Health Services.",
        "proto_ref": "docs/ Runbooks (api, architecture, operations, security, testing), .env.example, GitHub Release v1.0.0",
        "description": "1. Synchronize all environment templates and documentation in docs/. 2. Verify clean git clone, seed, and build from scratch. 3. Tag GitHub release v1.0.0 with comprehensive changelog and release notes. 4. Prepare administrative handover dossier with credentials, maintenance commands, and architecture overview.",
        "dependencies": "Blocked by: All preceding tasks • Blocks: Final internship capstone sign-off.",
        "deadline": "Friday, 2 Oct 2026, 12:00 PM (Defense at 2:00 PM)",
        "ac": [
            "Clean installation verified from a fresh clone.",
            "GitHub release v1.0.0 tagged on main with release notes.",
            "All documentation runbooks updated and exported as PDFs.",
            "Formal handover dossier signed off and delivered to evaluators."
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
        ("Priority & Milestone", f"{task['priority']} | {task['week']}"),
        ("Assignee & Support", f"Primary: {task['assignee']} • Support: {task['mentor']}"),
        ("Assigned Scope Reference", task["proto_ref"]),
        ("Assignment Rationale", task["rationale"]),
        ("Scope & Technical Goal", task["description"]),
        ("Dependencies & Target", f"{task['dependencies']} • Target: {task['deadline']}"),
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
        if label == "Priority & Milestone":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)
        elif label == "Assigned Scope Reference":
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(5)

def build_final_week_docx(output_path):
    doc = Document()
    
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
        footer = s.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("YɛnCare • Final Week Master Plan & Capstone Handover • Confidential")
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
    sub_run = sub_p.add_run("Final Week Master Sprint Plan & Capstone Defense Roadmap (Gate 5)")
    sub_run.bold = True
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = RGBColor(102, 112, 107)

    # Context Table
    tbl_ctx = doc.add_table(rows=8, cols=2)
    tbl_ctx.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_ctx.autofit = False
    set_table_borders(tbl_ctx, color="D8DCD9", sz="4")
    col_w_ctx = [Inches(1.8), Inches(4.9)]

    ctx_data = [
        ("Programme / Context", "AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)"),
        ("Active Sprint State", "Gate 4 Hardening Verified • Final Week Gate 5 Capstone Defense & Handover"),
        ("Sprint Execution Period", "Monday, 28 September 2026 – Friday, 2 October 2026 (Final Capstone Week)"),
        ("Final Week Objective", "Close code hygiene gaps (ESLint, NoSQL sanitizer), verify cloud staging host, execute live multi-role simulation rehearsal, deliver 15-minute capstone defense, and package repository bundle v1.0.0."),
        ("Automated Test Baseline", "391 Passing Tests across 94 Suites (100% Clean native Node test runner)"),
        ("End-to-End Test Baseline", "37 Passing, 11 Skipped, 0 Failing via Playwright in CI"),
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
        elif label in ("Automated Test Baseline", "End-to-End Test Baseline"):
            r1.bold = True
            r1.font.color.rgb = RGBColor(8, 127, 108)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Executive Strategy
    h1 = doc.add_heading(level=2)
    h1_run = h1.add_run("1. Final Week Strategic Approach & Readiness")
    h1_run.font.color.rgb = RGBColor(8, 127, 108)

    p_strat = doc.add_paragraph("With all core clinical features, security policies, and reception workflows hardened and verified in Week 4, the engineering team enters the final week with zero blocking engineering defects. Work is organized into three sequential phases:")
    p_strat.paragraph_format.space_after = Pt(6)

    tbl_phase = doc.add_table(rows=4, cols=3)
    tbl_phase.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_phase.autofit = False
    set_table_borders(tbl_phase)

    th_phase = ["Phase & Timeframe", "Target Focus", "Core Deliverables & Outcomes"]
    tw_phase = [Inches(1.8), Inches(2.0), Inches(2.9)]

    for j, h in enumerate(th_phase):
        c = tbl_phase.cell(0, j)
        c.width = tw_phase[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    phase_data = [
        ("Phase 1 (Mon – Tue)", "Code Hygiene & Cloud Verification", "Resolve 12 frontend ESLint issues, mount NoSQL operator sanitizer, verify Render cloud staging backend and MongoDB Atlas connectivity."),
        ("Phase 2 (Wed – Thu)", "Clinical Simulation & Presentation Prep", "Conduct multi-role live simulation rehearsal (P01-S10), model clinic throughput impact (65% congestion reduction), record 3-min 1080p demo video, build pitch deck."),
        ("Phase 3 (Friday)", "Final Capstone Defense & Handover", "Deliver 15-minute presentation to AmaliTech evaluation board, conduct live demonstration, tag v1.0.0 release, and deliver handover package.")
    ]

    for i, row_data in enumerate(phase_data):
        row = tbl_phase.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_phase[j]
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

    # Callout Box
    make_callout_box(
        doc,
        "Gate 5 Milestone: Capstone Defense & Long-Term Institutional Value",
        [
            "• YɛnCare directly addresses outpatient overcrowding and lost student academic hours at KNUST Health Services.",
            "• The final week ensures that technical excellence (391 tests, zero security bypasses, fail-fast env validation) is paired with flawless stakeholder presentation and turn-key operational handover.",
            "• All team members have defined ownership across presentation delivery, live demonstration roles, and technical documentation."
        ]
    )

    # 2. Remaining Engineering Cards
    h2 = doc.add_heading(level=2)
    h2_run = h2.add_run("2. Prioritized Remaining Tasks & Engineering Cards")
    h2_run.font.color.rgb = RGBColor(8, 127, 108)

    p_cards = doc.add_paragraph("Below are the 6 prioritized tasks that constitute the complete remaining scope for the final week:")
    p_cards.paragraph_format.space_after = Pt(8)

    for task in FINAL_TASKS:
        render_task_card(doc, task)

    # 3. Final Quality Verification Gates
    h3 = doc.add_heading(level=2)
    h3_run = h3.add_run("3. Final Quality Verification Gates & Test Standards")
    h3_run.font.color.rgb = RGBColor(8, 127, 108)

    tbl_gates = doc.add_table(rows=7, cols=4)
    tbl_gates.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_gates.autofit = False
    set_table_borders(tbl_gates)

    th_gates = ["Verification Layer", "Tooling & Command", "Target Threshold", "Current Status"]
    tw_gates = [Inches(1.8), Inches(2.0), Inches(1.5), Inches(1.4)]

    for j, h in enumerate(th_gates):
        c = tbl_gates.cell(0, j)
        c.width = tw_gates[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    gates_data = [
        ("Backend Unit & Integration", "npm run test:backend", "391+ tests, 0 failures", "✅ 391 Passing (100%)"),
        ("End-to-End Automation", "npm run test:e2e", "37+ passing, 0 failures", "✅ 37 Passing in CI"),
        ("Production Client Build", "npm run build:frontend", "0 bundle errors", "✅ Built in 16.4s"),
        ("Prototype Client Build", "npm run build", "0 bundle errors", "✅ Built in 1.1s"),
        ("Frontend Code Hygiene", "npm run lint", "0 errors, 0 warnings", "🔄 12 issues to fix"),
        ("Staging Cloud Health", "GET /health", "200 OK (db: 'connected')", "🔄 Render verification")
    ]

    for i, row_data in enumerate(gates_data):
        row = tbl_gates.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_gates[j]
            if i % 2 == 1:
                set_cell_background(c, "FBFBFB")
            set_cell_margins(c, 50, 50, 70, 70)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8)
            if j == 0:
                r.bold = True
            elif j == 3:
                r.bold = True
                if "✅" in val:
                    r.font.color.rgb = RGBColor(8, 127, 108)
                else:
                    r.font.color.rgb = RGBColor(217, 119, 6)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 4. Presentation Roadmap & Roles
    h4 = doc.add_heading(level=2)
    h4_run = h4.add_run("4. Gate 5 Defense Presentation Roadmap & Team Roles")
    h4_run.font.color.rgb = RGBColor(8, 127, 108)

    tbl_pres = doc.add_table(rows=6, cols=3)
    tbl_pres.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_pres.autofit = False
    set_table_borders(tbl_pres)

    th_pres = ["Presentation Segment", "Speaker / Lead", "Key Content & Live Demonstration Focus"]
    tw_pres = [Inches(2.0), Inches(1.8), Inches(2.9)]

    for j, h in enumerate(th_pres):
        c = tbl_pres.cell(0, j)
        c.width = tw_pres[j]
        set_cell_background(c, "E7F5F1")
        set_cell_margins(c, 80, 80, 90, 90)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(8, 127, 108)

    pres_data = [
        ("1. Problem & Context (2m)", "Blessing Edmund Kwame Dogbe", "KNUST OPD overcrowding, manual triage bottlenecks, paper scheduling delays."),
        ("2. Solution & Product (3m)", "Raymond B. Afrani", "Dual-facility online booking, automated arrival windows, live corridor queue display."),
        ("3. Live Demonstration (6m)", "Sterling Awuley & Harry Nartey", "End-to-end flow: Mobile student booking, instant SMS, receptionist triage, corridor token, doctor room consultation."),
        ("4. Architecture & Security (2m)", "Able Kafu Azanda & Emmanuella", "Centralized RBAC matrix, student 2-booking cap, SMS OTP verification, fail-fast env validator, 391 tests."),
        ("5. Impact & Handover (2m)", "Blessing Edmund Kwame Dogbe", "65% peak congestion reduction, deployment runbooks, repository release v1.0.0, evaluator Q&A.")
    ]

    for i, row_data in enumerate(pres_data):
        row = tbl_pres.rows[i+1]
        for j, val in enumerate(row_data):
            c = row.cells[j]
            c.width = tw_pres[j]
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

    # 5. Definition of Done Checklist
    h5 = doc.add_heading(level=2)
    h5_run = h5.add_run("5. Definition of Done (DoD) Sign-Off Checklist")
    h5_run.font.color.rgb = RGBColor(8, 127, 108)

    dod_items = [
        "1. Clinical Domain Logic: Dual-facility booking, student 2-booking cap, atomic slot claim, past-slot rejection, arrival window, no-show slot release, SMS OTP cancellation.",
        "2. Security & Reliability: Fail-fast startup env validator (env.js), centralized RBAC matrix (staffAuth.js), multi-tier rate limiting, phone masking, NoSQL operator sanitizer.",
        "3. Automated Quality: 391 passing backend tests, 37 passing Playwright E2E browser tests, 0 build errors across frontend & prototype, clean ESLint.",
        "4. Deployment & Infrastructure: Active Vercel frontend, active Render backend, MongoDB Atlas replica set with connection pooling (min 10 / max 50), mNotify SMS balance.",
        "5. Handover & Defense: 15-minute slide deck rehearsed, 3-minute 1080p demo video archived, complete docs/ runbooks, GitHub release v1.0.0 tagged, AmaliTech defense presented."
    ]

    for item in dod_items:
        p_dod = doc.add_paragraph()
        p_dod.paragraph_format.space_before = Pt(2)
        p_dod.paragraph_format.space_after = Pt(2)
        r = p_dod.add_run(f"• {item}")
        r.font.size = Pt(8.5)

    doc.save(output_path)
    print(f"Final Week DOCX successfully generated at: {output_path}")

# --- HTML GENERATOR FOR FINAL WEEK PDF ---
def generate_final_week_html():
    tasks_html = ""
    for t in FINAL_TASKS:
        ac_items = "".join([f"<li>{ac}</li>" for ac in t["ac"]])
        proto_html = f"<tr><td class=\"label\">Assigned Scope</td><td style=\"color: #087F6C; font-weight: 600;\">{t['proto_ref']}</td></tr>"
        desc_html = t['description']
        
        tasks_html += f"""
<div class="card">
  <div class="card-header">{t['code']}</div>
  <div class="card-body">
    <table>
      <tr><td class="label">Priority &amp; Milestone</td><td><span class="badge badge-priority">{t['priority']}</span> | {t['week']}</td></tr>
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
<title>YɛnCare — Final Week Master Plan & Capstone Handover</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
    @bottom-right {{
      content: "YɛnCare • Final Week Master Plan • Confidential";
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
  .badge-priority {{ background: #E0E7FF; color: #3730A3; }}
  .badge-status {{ background: #D1FAE5; color: #065F46; }}
  ul {{ margin: 2px 0 2px 14px; padding: 0; }}
  li {{ margin-bottom: 2px; font-size: 8pt; }}
</style>
</head>
<body>

<div class="header">
  <h1>YɛnCare Health Platform</h1>
  <div class="subtitle">Final Week Master Sprint Plan &amp; Capstone Defense Roadmap (Gate 5)</div>
</div>

<table>
  <tr>
    <td style="width: 28%; font-weight: bold; background: #F7F8F7;">Programme / Context</td>
    <td>AmaliTech CSR Capstone Internship Programme — Product 4 (KNUST Health Services)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Active Sprint State</td>
    <td><strong>Gate 4 Hardening Verified</strong> • Final Week Gate 5 Capstone Defense &amp; Handover</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Sprint Execution Period</td>
    <td><strong>Monday, 28 September 2026 – Friday, 2 October 2026</strong> (Final Capstone Week)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Final Week Objective</td>
    <td>Close code hygiene gaps (ESLint, NoSQL sanitizer), verify cloud staging host, execute live multi-role simulation rehearsal, deliver 15-minute capstone defense, and package repository bundle v1.0.0.</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Automated Test Baseline</td>
    <td><strong style="color: #087F6C;">391 Passing Tests across 94 Suites</strong> (100% Clean native Node Test Runner)</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">End-to-End Test Baseline</td>
    <td><strong style="color: #087F6C;">37 Passing, 11 Skipped, 0 Failing</strong> via Playwright in CI</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Production Build Status</td>
    <td><strong style="color: #087F6C;">100% Clean Vite Production Bundles</strong> for both frontend and ui/prototype</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background: #F7F8F7;">Lead Author &amp; Role</td>
    <td>Blessing Edmund Kwame Dogbe (Backend &amp; DevOps Lead / Product Coordinator)</td>
  </tr>
</table>

<h2>1. Final Week Strategic Approach &amp; Phase Roadmap</h2>
<p>With all core clinical features, security policies, and reception workflows hardened and verified in Week 4, the engineering team enters the final week with zero blocking engineering defects. Work is organized into three sequential phases:</p>

<table>
  <thead>
    <tr>
      <th style="width: 25%;">Phase &amp; Timeframe</th>
      <th style="width: 30%;">Target Focus</th>
      <th style="width: 45%;">Core Deliverables &amp; Outcomes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1 (Mon – Tue)</strong></td>
      <td>Code Hygiene &amp; Cloud Staging</td>
      <td>Resolve 12 frontend ESLint issues, mount NoSQL operator sanitizer, verify Render cloud staging backend and MongoDB Atlas connectivity.</td>
    </tr>
    <tr class="alt">
      <td><strong>Phase 2 (Wed – Thu)</strong></td>
      <td>Simulation &amp; Presentation Prep</td>
      <td>Conduct multi-role live simulation rehearsal (P01-S10), model clinic throughput impact (65% congestion reduction), record 3-min 1080p demo video, build pitch deck.</td>
    </tr>
    <tr>
      <td><strong>Phase 3 (Friday)</strong></td>
      <td>Capstone Defense &amp; Handover</td>
      <td>Deliver 15-minute presentation to AmaliTech evaluation board, conduct live demonstration, tag v1.0.0 release, and deliver handover package.</td>
    </tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Gate 5 Milestone: Capstone Defense &amp; Long-Term Institutional Value</div>
  <p>• YɛnCare directly addresses outpatient overcrowding and lost student academic hours at KNUST Health Services.</p>
  <p>• The final week ensures that technical excellence (391 tests, zero security bypasses, fail-fast env validation) is paired with flawless stakeholder presentation and turn-key operational handover.</p>
  <p>• All team members have defined ownership across presentation delivery, live demonstration roles, and technical documentation.</p>
</div>

<h2>2. Prioritized Remaining Tasks &amp; Engineering Cards</h2>
{tasks_html}

<h2>3. Final Quality Verification Gates &amp; Test Standards</h2>
<table>
  <thead>
    <tr>
      <th style="width: 30%;">Verification Layer</th>
      <th style="width: 30%;">Tooling &amp; Command</th>
      <th style="width: 20%;">Target Threshold</th>
      <th style="width: 20%;">Current Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Backend Unit &amp; Integration</strong></td>
      <td>npm run test:backend</td>
      <td>391+ tests, 0 failures</td>
      <td><span style="color:#087F6C; font-weight:bold;">391 Passing (100%)</span></td>
    </tr>
    <tr class="alt">
      <td><strong>End-to-End Automation</strong></td>
      <td>npm run test:e2e</td>
      <td>37+ passing, 0 failures</td>
      <td><span style="color:#087F6C; font-weight:bold;">37 Passing in CI</span></td>
    </tr>
    <tr>
      <td><strong>Production Client Build</strong></td>
      <td>npm run build:frontend</td>
      <td>0 bundle errors</td>
      <td><span style="color:#087F6C; font-weight:bold;">Built in 16.4s</span></td>
    </tr>
    <tr class="alt">
      <td><strong>Prototype Client Build</strong></td>
      <td>npm run build</td>
      <td>0 bundle errors</td>
      <td><span style="color:#087F6C; font-weight:bold;">Built in 1.1s</span></td>
    </tr>
    <tr>
      <td><strong>Frontend Code Hygiene</strong></td>
      <td>npm run lint</td>
      <td>0 errors, 0 warnings</td>
      <td><span style="color:#D97706; font-weight:bold;">12 issues to fix</span></td>
    </tr>
    <tr class="alt">
      <td><strong>Staging Cloud Health</strong></td>
      <td>GET /health</td>
      <td>200 OK (db: 'connected')</td>
      <td><span style="color:#D97706; font-weight:bold;">Render verification</span></td>
    </tr>
  </tbody>
</table>

<h2>4. Gate 5 Defense Presentation Roadmap &amp; Team Roles</h2>
<table>
  <thead>
    <tr>
      <th style="width: 28%;">Presentation Segment</th>
      <th style="width: 28%;">Speaker / Lead</th>
      <th style="width: 44%;">Key Content &amp; Demonstration Focus</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Problem &amp; Context (2m)</strong></td>
      <td>Blessing Edmund Kwame Dogbe</td>
      <td>KNUST OPD overcrowding, manual triage bottlenecks, paper scheduling delays.</td>
    </tr>
    <tr class="alt">
      <td><strong>2. Solution &amp; Product (3m)</strong></td>
      <td>Raymond B. Afrani</td>
      <td>Dual-facility online booking, automated arrival windows, live corridor queue display.</td>
    </tr>
    <tr>
      <td><strong>3. Live Demonstration (6m)</strong></td>
      <td>Sterling Awuley &amp; Harry Nartey</td>
      <td>End-to-end flow: Mobile student booking, instant SMS, receptionist triage, corridor token, doctor room consultation.</td>
    </tr>
    <tr class="alt">
      <td><strong>4. Architecture &amp; Security (2m)</strong></td>
      <td>Able Kafu Azanda &amp; Emmanuella</td>
      <td>Centralized RBAC matrix, student 2-booking cap, SMS OTP verification, fail-fast env validator, 391 tests.</td>
    </tr>
    <tr>
      <td><strong>5. Impact &amp; Handover (2m)</strong></td>
      <td>Blessing Edmund Kwame Dogbe</td>
      <td>65% peak congestion reduction, deployment runbooks, repository release v1.0.0, evaluator Q&amp;A.</td>
    </tr>
  </tbody>
</table>

<h2>5. Definition of Done (DoD) Sign-Off Checklist</h2>
<ul>
  <li><strong>Clinical Domain Logic</strong>: Dual-facility booking, student 2-booking cap, atomic slot claim, past-slot rejection, arrival window, no-show slot release, SMS OTP cancellation.</li>
  <li><strong>Security &amp; Reliability</strong>: Fail-fast startup env validator (env.js), centralized RBAC matrix (staffAuth.js), multi-tier rate limiting, phone masking, NoSQL operator sanitizer.</li>
  <li><strong>Automated Quality</strong>: 391 passing backend tests, 37 passing Playwright E2E browser tests, 0 build errors across frontend &amp; prototype, clean ESLint.</li>
  <li><strong>Deployment &amp; Infrastructure</strong>: Active Vercel frontend, active Render backend, MongoDB Atlas replica set with connection pooling (min 10 / max 50), mNotify SMS balance.</li>
  <li><strong>Handover &amp; Defense</strong>: 15-minute slide deck rehearsed, 3-minute 1080p demo video archived, complete docs/ runbooks, GitHub release v1.0.0 tagged, AmaliTech defense presented.</li>
</ul>

</body>
</html>
"""

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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == "scripts" else script_dir
    docs_dir = os.path.join(base_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    
    # 1. Output Final Week DOCX directly in docs/
    docs_docx = os.path.join(docs_dir, "YenCare-Final-Week-Plan.docx")
    build_final_week_docx(docs_docx)
    print(f"DOCX successfully generated at: {docs_docx}")

    # 2. Output Final Week HTML -> PDF directly in docs/
    html_file = os.path.join(docs_dir, "final_week_report_temp.html")
    docs_pdf = os.path.join(docs_dir, "YenCare-Final-Week-Plan.pdf")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_final_week_html())
    
    success = convert_html_to_pdf(html_file, docs_pdf)
    
    # Clean up temp html
    if os.path.exists(html_file):
        os.remove(html_file)
    print(f"PDF successfully generated at: {docs_pdf}")
