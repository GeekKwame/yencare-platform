import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_callout(doc, text_runs, border_hex="176B5F", bg_hex="F0FDF4"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    
    # Left border only
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'<w:top w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    for text, bold, italic, color in text_runs:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        if color:
            run.font.color.rgb = color
        run.font.size = Pt(10.5)
        run.font.name = "Segoe UI"
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def generate_teleprompter_docx(output_path):
    doc = docx.Document()
    
    # Set standard margins (0.8 inch)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        # Header & Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("YɛnCare — AmaliTech Capstone Final Project Defense (Gate 5) • Speaker Teleprompter")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        hrun.font.name = "Segoe UI"
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Confidential • Prepared for AmaliTech Capstone Gate 5 Panel Evaluation")
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)
        frun.font.name = "Segoe UI"

    # Color Constants
    c_teal = RGBColor(23, 107, 95)     # #176B5F
    c_dark_teal = RGBColor(15, 75, 67) # #0F4B43
    c_amber = RGBColor(195, 125, 50)   # #C37D32
    c_slate = RGBColor(30, 41, 59)     # #1E293B
    c_muted = RGBColor(100, 116, 139)  # #64748B
    c_rose = RGBColor(225, 29, 72)     # #E11D48

    # Title Banner
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    run_badge = p_title.add_run("AMALITECH CAPSTONE INTERNSHIP • FINAL DEFENSE (GATE 5)\n")
    run_badge.font.size = Pt(10)
    run_badge.bold = True
    run_badge.font.color.rgb = c_amber
    run_badge.font.name = "Segoe UI"
    
    run_main = p_title.add_run("YɛnCare Presentation Teleprompter & Defense Guide")
    run_main.font.size = Pt(24)
    run_main.bold = True
    run_main.font.color.rgb = c_teal
    run_main.font.name = "Segoe UI"

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run(
        "Natural spoken-word teleprompter scripts, stage directions, transitions, live demo narration, "
        "and evaluator Q&A defense strategy for the 15-minute Gate 5 capstone defense."
    )
    run_sub.font.size = Pt(11)
    run_sub.font.color.rgb = c_muted
    run_sub.font.name = "Segoe UI"

    # Executive Overview Box
    add_callout(doc, [
        ("🎯 PRESENTATION PACING & ROLE DELEGATION\n", True, False, c_dark_teal),
        ("• Total Defense Duration: ", True, False, c_slate),
        ("15 Minutes (+ 5 Minutes Evaluator Q&A)\n", False, False, c_slate),
        ("• Intro Lead (Slides 1–3): ", True, False, c_slate),
        ("Emmanuella (Ella) — Problem statement, campus realities, and core solution vision (~4.5 mins)\n", False, False, c_slate),
        ("• Engineering Deep Dive (Slides 4–7): ", True, False, c_slate),
        ("Able, Sterling, Raymond & Ephraim — Architecture, clinical guardrails, security, and 391 automated tests (~5.5 mins)\n", False, False, c_slate),
        ("• Live Multi-Station Demonstration (Slide 8): ", True, False, c_slate),
        ("Blessing (Eddie) — Real-time end-to-end clinical workflow across 4 synced stations (~3.5 mins)\n", False, False, c_slate),
        ("• Quantitative Impact, Audit Retrospective & Handover (Slides 9–12): ", True, False, c_slate),
        ("Blessing (Eddie) & Ella — Measurable campus impact, 20 remediated audit issues, turn-key handover package & concluding defense (~1.5 mins)", False, False, c_slate)
    ], border_hex="176B5F", bg_hex="F0FDF4")

    # Table of Slide Allocations
    doc.add_heading("Presentation Agenda & Speaker Map", level=2)
    p_h2 = doc.paragraphs[-1]
    p_h2.runs[0].font.color.rgb = c_teal
    p_h2.runs[0].font.name = "Segoe UI"

    table = doc.add_table(rows=13, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(0.7), Inches(2.2), Inches(1.5), Inches(1.0), Inches(1.3)]
    headers = ["Slide", "Topic / Title", "Primary Speaker", "Time Target", "Key Objective"]
    
    hdr_row = table.rows[0]
    for idx, heading in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.width = col_widths[idx]
        set_cell_background(cell, "176B5F")
        set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(heading)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)
        run.font.name = "Segoe UI"

    slide_data = [
        ("1", "Title & Capstone Cover", "Ella (Emmanuella)", "0:00 - 1:30", "Welcome & team roles"),
        ("2", "Crisis at Campus Healthcare", "Ella (Emmanuella)", "1:30 - 3:00", "85k students, 3.5h wait"),
        ("3", "YɛnCare Solution Pillars", "Ella (Emmanuella)", "3:00 - 4:30", "Virtual queue & SMS"),
        ("4", "Multi-Tier Architecture", "Able & Sterling", "4:30 - 6:00", "React 19, Node 24, Mongo"),
        ("5", "Clinical Fairness Guardrails", "Able & Sterling", "6:00 - 7:30", "2-booking cap, atomic lock"),
        ("6", "Security & Anti-Abuse", "Raymond & Ephraim", "7:30 - 9:00", "Rate limit, OTP, Act 843"),
        ("7", "Quality Rigor & Automated CI", "Raymond & Ephraim", "9:00 - 10:15", "391 tests, Playwright CI"),
        ("8", "Live Multi-Station Demo", "Eddie (Blessing)", "10:15 - 12:00", "4-station live workflow"),
        ("9", "Clinical Impact & Throughput", "Eddie (Blessing)", "12:00 - 13:00", "65% congestion reduction"),
        ("10", "Sprint Audit Remediation", "Eddie (Blessing)", "13:00 - 13:45", "20/20 audit issues resolved"),
        ("11", "Roadmap & Handover", "Eddie (Blessing)", "13:45 - 14:30", "AIS SSO & v1.0.0 package"),
        ("12", "Conclusion & Evaluator Q&A", "Ella & Eddie", "14:30 - 15:00", "Closing defense & floor Q&A")
    ]

    for row_idx, data in enumerate(slide_data, start=1):
        row = table.rows[row_idx]
        bg_col = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            cell.width = col_widths[col_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(text)
            run.font.size = Pt(9.5)
            run.font.name = "Segoe UI"
            if col_idx == 0:
                run.bold = True
                run.font.color.rgb = c_teal
            elif col_idx == 2:
                run.bold = True
                run.font.color.rgb = c_slate

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Teleprompter Tips Section
    add_callout(doc, [
        ("💡 TELEPROMPTER READABILITY RULES FOR THE TEAM\n", True, False, c_amber),
        ("1. Conversational Cadence: ", True, False, c_slate),
        ("Speak at approximately 130 to 140 words per minute. Do NOT rush. Pause at commas and bullet transitions.\n", False, False, c_slate),
        ("2. Eye Contact Balance: ", True, False, c_slate),
        ("Glance at these teleprompter notes for prompt cues, but maintain steady eye contact with the evaluation panel during your punchlines.\n", False, False, c_slate),
        ("3. Stage Direction Tags: ", True, False, c_slate),
        ("Items marked in [BRACKETS] are stage directions, gestures, and slide transitions — do not speak them out loud!", False, False, c_slate)
    ], border_hex="C37D32", bg_hex="FFFBEB")

    doc.add_page_break()

    # ==========================================
    # SLIDE-BY-SLIDE TELEPROMPTER SCRIPTS
    # ==========================================
    
    def add_slide_section(num, title, speaker, time_range, visual_desc, stage_dirs, spoken_text, handoff_text):
        h = doc.add_heading(f"Slide {num}: {title}", level=2)
        h.runs[0].font.color.rgb = c_teal
        h.runs[0].font.name = "Segoe UI"
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(2)

        # Meta line
        p_meta = doc.add_paragraph()
        p_meta.paragraph_format.space_before = Pt(0)
        p_meta.paragraph_format.space_after = Pt(6)
        r_spk = p_meta.add_run(f"Primary Speaker: {speaker}   |   Pacing: {time_range}\n")
        r_spk.bold = True
        r_spk.font.color.rgb = c_amber
        r_spk.font.size = Pt(10)
        r_vis = p_meta.add_run(f"On Screen: {visual_desc}")
        r_vis.italic = True
        r_vis.font.color.rgb = c_muted
        r_vis.font.size = Pt(9.5)

        # Stage Directions Callout
        add_callout(doc, [
            ("🎬 STAGE DIRECTIONS & PHYSICAL CUES:\n", True, False, c_dark_teal),
            (stage_dirs, False, True, c_slate)
        ], border_hex="176B5F", bg_hex="F8FAFC")

        # Teleprompter Spoken Script
        p_script_label = doc.add_paragraph()
        p_script_label.paragraph_format.space_before = Pt(4)
        p_script_label.paragraph_format.space_after = Pt(2)
        r_sl = p_script_label.add_run("🎙️ EXACT SPOKEN WORDS (NATURAL TELEPROMPTER):")
        r_sl.bold = True
        r_sl.font.color.rgb = c_teal
        r_sl.font.size = Pt(11)

        p_speech = doc.add_paragraph()
        p_speech.paragraph_format.space_before = Pt(2)
        p_speech.paragraph_format.space_after = Pt(6)
        p_speech.paragraph_format.line_spacing = 1.25

        for segment in spoken_text:
            text, is_bold, is_emphasis = segment
            r = p_speech.add_run(text)
            r.font.name = "Segoe UI"
            r.font.size = Pt(11)
            r.bold = is_bold
            if is_emphasis:
                r.font.color.rgb = c_dark_teal
            else:
                r.font.color.rgb = c_slate

        # Handoff box
        if handoff_text:
            add_callout(doc, [
                ("🔄 VERBAL HANDOFF TO NEXT SPEAKER:\n", True, False, c_amber),
                (f"\"{handoff_text}\"", False, True, c_slate)
            ], border_hex="C37D32", bg_hex="FFFBEB")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ----------------------------------------------------
    # SLIDE 1
    # ----------------------------------------------------
    add_slide_section(
        1, "Title & Capstone Cover", "Ella (Emmanuella)", "0:00 - 1:30",
        "Title card featuring YɛnCare logo, Gate 5 defense badge, project subtitle, and the 3 team discipline columns.",
        "Stand tall, smile warmly at the evaluators, and establish calm authority. Do not look nervous. Take one slow breath before speaking. Glance across all panelists.",
        [
            ("Good morning, distinguished evaluators, faculty mentors, and fellow engineers. ", False, False),
            ("Welcome to our Gate 5 Final Capstone Defense. ", True, True),
            ("My name is Emmanuella, and together with my colleagues — Blessing, Able, Sterling, Raymond, and Ephraim — ", False, False),
            ("we are deeply honored to present ", False, False),
            ("YɛnCare: our smart outpatient scheduling and real-time virtual queue management platform, ", True, True),
            ("engineered specifically for the KNUST Students' Clinic and Hospital.\n\n", False, False),
            ("Over the past several weeks, our engineering team has taken this project from early conceptual wireframes into a fully hardened, audited, and production-tested healthcare system. ", False, False),
            ("In today's defense, we will share the campus crisis that drove our design, walk you through our multi-tier architecture, demonstrate our 391 passing automated tests, ", False, False),
            ("and our team lead, Eddie, will conduct a live, end-to-end demonstration across four synchronized clinic hardware stations.", True, True)
        ],
        "Let us begin by looking at the reality on the ground at KNUST."
    )

    # ----------------------------------------------------
    # SLIDE 2
    # ----------------------------------------------------
    add_slide_section(
        2, "Crisis at Campus Healthcare Facilities", "Ella (Emmanuella)", "1:30 - 3:00",
        "4 metric cards: 3.5 hrs Wait Time, 65% Peak Congestion, 100% Manual Paper Triage, 28% Ghost Slots.",
        "Shift tone to empathetic yet firm concern. Gesture toward the 4 metric cards on screen. Emphasize the human toll on students.",
        [
            ("To understand why YɛnCare is essential, consider the daily experience of a student at KNUST. ", False, False),
            ("The University Health Services serves an astonishing population of over 85,000 students and staff. ", True, True),
            ("Yet, the gateway into outpatient healthcare is still entirely manual paper triage.\n\n", False, False),
            ("Every morning at 6:30 AM, students who are battling malaria, severe headaches, or physical injuries are forced to walk across campus and stand in chaotic physical lines just to collect a handwritten paper tally card. ", False, False),
            ("Our field investigations revealed four devastating bottlenecks:\n\n", False, False),
            ("First, an average in-clinic wait time of 3.5 hours. ", True, True),
            ("Students lose entire lecture mornings and laboratory practicals simply sitting in waiting chairs.\n", False, False),
            ("Second, a 65% peak congestion surge ", True, True),
            ("between 7:00 AM and 10:00 AM. Overcrowded corridors create severe airborne cross-infection hazards.\n", False, False),
            ("Third, 100% manual paper handling. ", True, True),
            ("Physical consultation cards get misplaced, tally numbers get disputed, and receptionists bear the brunt of student frustration.\n", False, False),
            ("And finally, a 28% ghost and no-show rate. ", True, True),
            ("Because students get tired of waiting and leave without telling anyone, doctors frequently sit idle inside consulting rooms while dozens of other sick students are waiting outside with no visibility into the queue.", False, False)
        ],
        "This broken status quo is what YɛnCare was built to solve. Here is how we turned physical chaos into digital order."
    )

    # ----------------------------------------------------
    # SLIDE 3
    # ----------------------------------------------------
    add_slide_section(
        3, "YɛnCare: Outpatient Care, Dignified & Digital", "Ella (Emmanuella)", "3:00 - 4:30",
        "6 solution pillars: Dual-facility scheduling, virtual queue + SMS, arrival windows, corridor TV, doctor isolation, slot recycling.",
        "Brighten your tone. Project excitement and clarity. Use your hands to contrast 'waiting 3.5 hours in a hallway' versus 'waiting in your dorm room'.",
        [
            ("YɛnCare restores dignity and predictability to campus healthcare through six foundational pillars.\n\n", True, True),
            ("First, Dual-Facility Outpatient Booking. ", True, True),
            ("Students can reserve a 15-minute consultation at either the KNUST Students' Clinic or the main KNUST Hospital in under 60 seconds directly from their smartphones.\n", False, False),
            ("Second, Virtual Queueing with Integrated mNotify SMS. ", True, True),
            ("Instead of sitting in a crowded clinic hallway, students remain in their hostel rooms or the campus library. They receive automated SMS alerts confirming their 4-digit booking reference, reminding them one hour before their visit, and issuing arrival instructions.\n", False, False),
            ("Third, Time-Bounded Arrival Windows. ", True, True),
            ("To eliminate dawn crowd surges, self-service check-in is strictly valid only between 60 minutes before and 15 minutes after the scheduled slot time.\n", False, False),
            ("Fourth, a Public Corridor Digital TV Display. ", True, True),
            ("Mounted in waiting halls, this live high-contrast screen broadcasts called tokens and assigned room numbers with audio chimes, without ever displaying student names or sensitive phone numbers.\n", False, False),
            ("Fifth, Doctor Workstation Isolation, ", True, True),
            ("ensuring attending physicians see only their assigned patients.\n", False, False),
            ("And sixth, Fair Access & Automatic Slot Recycling, ", True, True),
            ("which reclaims unattended slots so urgent walk-in patients can be seen immediately.", False, False)
        ],
        "To explain the architectural foundation that powers this reliable flow, I now hand over to Able and Sterling from our backend and security engineering team."
    )

    # ----------------------------------------------------
    # SLIDE 4
    # ----------------------------------------------------
    add_slide_section(
        4, "Robust, Resilient Multi-Tier Tech Stack", "Able Kafu Azanda / Sterling Awuley", "4:30 - 6:00",
        "4 Architecture layers (React 19/Vite, Node 24/Express, MongoDB Atlas ReplicaSet, mNotify/Vercel/Render) & Principles card.",
        "Adopt a confident, technical engineering posture. Point to the architecture layers. Speak with authority on backend design decisions.",
        [
            ("Thank you, Ella. Distinguished evaluators, when designing YɛnCare, our primary engineering mandates were concurrency resilience, data integrity, and zero silent failures under campus peak loads.\n\n", False, False),
            ("We implemented a modern multi-tier architecture:\n\n", True, True),
            ("On the Frontend Tier, ", True, True),
            ("we built with React 19 and Vite 8.2, utilizing custom CSS design tokens to provide a responsive, mobile-first Progressive Web App that loads in under 1.2 seconds even on weak campus Wi-Fi.\n", False, False),
            ("On the API and Logic Tier, ", True, True),
            ("we run Node.js v24 with Express REST services. Crucially, we implemented a fail-fast configuration bootstrapper in config/env.js. If an environment variable, database URI, or SMS secret is missing, the server halts immediately during startup and outputs an ASCII diagnostic report, preventing corrupt production state.\n", False, False),
            ("On the Database Tier, ", True, True),
            ("we utilize a MongoDB Atlas Replica Set with automated connection pooling tuned between 10 and 50 connections to absorb the 7:00 AM check-in concurrency spike.\n", False, False),
            ("And on the Integration Tier, ", True, True),
            ("we interface with the mNotify Ghana SMS gateway for high-deliverability mobile notifications, deployed on Render for staging and Vercel for web delivery, backed by Playwright automated CI pipelines.", False, False)
        ],
        "Now, let's examine the clinical fairness guardrails that enforce medical equity on our campus."
    )

    # ----------------------------------------------------
    # SLIDE 5
    # ----------------------------------------------------
    add_slide_section(
        5, "Clinical Governance: Fair Access & Production Guardrails", "Able Kafu Azanda / Sterling Awuley", "6:00 - 7:30",
        "4 Guardrail cards: Rule 1 Anti-Hoarding Cap, Rule 2 Concurrency Lock, Rule 3 Arrival Window, Rule 4 Slot Recycling.",
        "Emphasize the business logic. Show that the system is defended against edge cases and student gaming.",
        [
            ("A healthcare platform is only as good as the fairness rules it enforces. On a campus with 85,000 students, you cannot rely on good intentions — the code must prevent abuse systematically.\n\n", False, False),
            ("We engineered four non-negotiable production business rules:\n\n", True, True),
            ("Rule 1 is our Student Anti-Hoarding Cap. ", True, True),
            ("No student index number can hold more than two active, non-completed appointments concurrently. If a student attempts to hoard multiple consultation slots during exam week, the API immediately rejects the request with HTTP 409 Conflict while gracefully preserving their legitimate existing bookings.\n\n", False, False),
            ("Rule 2 is Atomic Slot Reservation. ", True, True),
            ("In an outpatient system, a double-booking is a clinical failure. We enforce atomic MongoDB findOneAndUpdate operations paired with partial unique indexes on clinicianId, appointment date, and time slot. Two students clicking the exact same 10:30 AM slot at the exact same millisecond will NEVER result in a collision; one succeeds, and the other is instantly prompted for the next available slot.\n\n", False, False),
            ("Rule 3 is our Dynamic Check-In Guard. ", True, True),
            ("Self-service arrival check-in unlocks exactly 60 minutes before the appointment and expires 15 minutes after. Late students cannot self-check-in; they are routed to the reception desk for manual triage override.\n\n", False, False),
            ("And Rule 4 is Automated No-Show Slot Recycling. ", True, True),
            ("If a student fails to arrive within the grace period, our scheduled worker transitions the appointment to NO_SHOW. This instantly unblocks the clinician's workstation and releases the slot for emergency walk-ins.", False, False)
        ],
        "To present our enterprise security hardening, privacy compliance, and test rigor, I now hand over to Raymond and Ephraim."
    )

    # ----------------------------------------------------
    # SLIDE 6
    # ----------------------------------------------------
    add_slide_section(
        6, "Enterprise Security & Anti-Abuse Hardening", "Raymond Afrani / Ephraim Nartey", "7:30 - 9:00",
        "6 Security cards: Rate Limiting, SMS OTP, Doctor Isolation, Phone Masking (Act 843), NoSQL Sanitizer, Audit Trail.",
        "Maintain a serious, compliance-focused tone. Highlight Ghana Data Protection Act 843 compliance.",
        [
            ("Thank you, Able. In healthcare software, security and confidentiality are legal mandates. Under Ghana's Data Protection Act, Act 843, student medical information must be protected from unauthorized exposure at every layer.\n\n", False, False),
            ("We hardened YɛnCare with six defense-in-depth security measures:\n\n", True, True),
            ("First, Anti-Brute-Force Rate Limiting. ", True, True),
            ("Our 4-digit reference codes are protected by layered IP and index rate limiters: general lookups are capped at 30 requests per minute, and check-in verification is restricted to 5 attempts per 15 minutes, preventing automated enumeration attacks.\n", False, False),
            ("Second, SMS OTP Cancellation Verification. ", True, True),
            ("To prevent malicious roommates or pranksters from cancelling a classmate's clinic appointment, any cancellation or reschedule request triggers a 4-digit SMS OTP challenge sent to the verified mobile phone on record.\n", False, False),
            ("Third, Doctor Workstation Isolation. ", True, True),
            ("Attending physicians authenticate via cryptographically signed JWT tokens that scope queue queries strictly to their assigned consultation room. A doctor in Room 1 cannot inspect or manipulate Room 2's patient queue.\n", False, False),
            ("Fourth, Phone Number Masking. ", True, True),
            ("Public boards and corridor displays mask student telephone numbers — displaying for example 053-star-star-star-star-884 — so bystanders cannot harvest personal contact details.\n", False, False),
            ("Fifth, Recursive NoSQL Injection Stripping. ", True, True),
            ("Generic sanitization middleware strips malicious MongoDB operators like dollar-gt or dollar-regex before payloads reach our controller handlers.\n", False, False),
            ("And sixth, an Immutable Audit Trail. ", True, True),
            ("Every state change — from booking to reception override to doctor completion — writes an immutable audit record logging the exact timestamp, actor role, and previous status.", False, False)
        ],
        "Let us now look at our automated quality verification metrics."
    )

    # ----------------------------------------------------
    # SLIDE 7
    # ----------------------------------------------------
    add_slide_section(
        7, "Rigorous Automated Testing & Verification", "Raymond Afrani / Ephraim Nartey", "9:00 - 10:15",
        "Metric cards: 391+ Backend Tests, 37+ Playwright E2E Tests, 0 Build Errors + CI Terminal Suite Log.",
        "Show supreme confidence in software quality. Point to the terminal output showing 391 passing tests.",
        [
            ("Our team believes that true engineering confidence comes from automated, reproducible testing.\n\n", False, False),
            ("As you can see on the screen, YɛnCare is backed by ", False, False),
            ("391 automated backend unit and integration tests across 94 distinct test suites, running on native Node.js test runner with a 100% pass rate in just 37.3 seconds.\n\n", True, True),
            ("Our test suite covers everything from config bootstrapper validation and RBAC permission guards, to concurrency race conditions in bookAppointmentHardening, to date-boundary logic in visitDayGuard.\n\n", False, False),
            ("In addition, our CI pipeline executes ", False, False),
            ("37 Playwright end-to-end browser tests ", True, True),
            ("verifying real student booking journeys across Chromium, Firefox, and WebKit rendering engines. Both our production web app and interactive clinical prototypes build cleanly with zero TypeScript or lint errors on every GitHub push.\n\n", False, False),
            ("This level of test rigor guarantees that regressions cannot slip into clinical workflows undetected.", False, False)
        ],
        "And now, to show you how all of these components come alive in a synchronized clinical environment, I invite our Team Lead and DevOps Engineer, Eddie, to conduct the live demonstration!"
    )

    # ----------------------------------------------------
    # SLIDE 8: THE LIVE DEMO (EDDIE'S COMPREHENSIVE SCRIPT)
    # ----------------------------------------------------
    add_slide_section(
        8, "End-to-End Live Clinical Demonstration", "Blessing Edmund Kwame Dogbe (Eddie)", "10:15 - 12:00",
        "Slide 8 displays the 4 Synchronized Clinical Stations: 1. Student Mobile, 2. Front-Desk Reception, 3. Corridor TV, 4. Doctor Workstation.",
        "Transition smoothly to your live demonstration setup. Keep your tone energetic, confident, and conversational. Speak clearly as you perform each action on screen.",
        [
            ("Thank you, Raymond! Distinguished evaluators, it is my absolute pleasure to guide you through the live operational workflow of YɛnCare.\n\n", True, True),
            ("[ACTION: Switch display to live browser window showing the four synchronized stations / tabs].\n\n", True, False),
            ("To reflect real-world clinic operations at KNUST, we have four active stations synchronized in real time:\n", False, False),
            ("• On the left, my mobile viewport represents a student, Ray Afrani, booking on his phone.\n", False, False),
            ("• In the second window, we have the Front-Desk Reception Roster.\n", False, False),
            ("• On the third display, we have the Public Corridor Digital Board that sits on a TV in the clinic lobby.\n", False, False),
            ("• And on the fourth window, we have Dr. Boateng logged into his Doctor Consultation Workstation in Room 1.\n\n", False, False),
            ("Watch how seamlessly the lifecycle unfolds:\n\n", True, True),
            ("[STEP 1 — STUDENT BOOKING]: ", True, True),
            ("As Ray, I select KNUST Students' Clinic, choose General Outpatient, and select Dr. Boateng for today's 10:30 AM slot. I input my student index — 20494789. I tap 'Confirm Booking'. In under two seconds, the atomic lock secures the slot, and my booking is confirmed with Reference Number 7492. Notice that an SMS receipt is simultaneously dispatched via mNotify to the phone.\n\n", False, False),
            ("[STEP 2 — RECEPTION ROSTER SYNC]: ", True, True),
            ("Now look at Station 2. Without refreshing the page, Ray's appointment appears immediately on the reception roster. Notice the status badge reads 'Booked'. If Ray were delayed by a lecture, the receptionist can hover over the override button and see our accessible WCAG tooltip explaining the grace-period status.\n\n", False, False),
            ("[STEP 3 — ARRIVAL & CORRIDOR TV CHIME]: ", True, True),
            ("Ray walks into the clinic compound within his arrival window. On his phone, he taps 'I've Arrived'. The system validates his time window and assigns him Token Number C-04. Look at Station 3 on the corridor TV display: the board immediately rings its audio chime, and the high-contrast display updates: 'Now Serving: Token C-04, Proceed to Consultation Room 1'. Notice that Ray's full name and phone number remain completely private.\n\n", False, False),
            ("[STEP 4 — DOCTOR WORKSTATION]: ", True, True),
            ("Inside Consultation Room 1, Dr. Boateng sees Ray move to the top of his queue. He clicks 'Call Patient'. Dr. Boateng opens the clinical consultation modal, reviews the chief complaint, records his clinical diagnosis, and clicks 'Complete Visit'.\n\n", False, False),
            ("[STEP 5 — REAL-TIME RESOLUTION]: ", True, True),
            ("Instantly, the visit marks as COMPLETED, the corridor screen clears for the next waiting student, the slot lifecycle is archived into our immutable audit trail, and the entire cycle has executed without a single paper slip or queue dispute!", False, False)
        ],
        "Having witnessed the live clinical journey, let us examine the quantitative clinical impact and throughput metrics."
    )

    # ----------------------------------------------------
    # SLIDE 9
    # ----------------------------------------------------
    add_slide_section(
        9, "Quantified Clinical Throughput & Campus Impact", "Blessing Edmund Kwame Dogbe (Eddie)", "12:00 - 13:00",
        "4 Hero Impact Cards: 65% Congestion Cut, 72% Wait Time Reduction, +40% Clinician Throughput, 0 Collisions.",
        "Maintain momentum and enthusiasm. Present these statistics not as abstract numbers, but as real quality-of-life improvements for students and doctors.",
        [
            ("What does this digital workflow mean in tangible terms for the KNUST community?\n\n", False, False),
            ("Through empirical queuing models and stress testing, YɛnCare delivers dramatic operational improvements:\n\n", True, True),
            ("First, a 65% reduction in waiting room peak congestion. ", True, True),
            ("By virtualizing the queue, we eliminate the physical morning bottleneck. Students wait in their hostel rooms or the campus library until their window is ready.\n\n", False, False),
            ("Second, a 72% decrease in in-clinic physical wait time. ", True, True),
            ("The average time a sick student spends waiting physically in the clinic drops from over 3 hours down to just 35 minutes.\n\n", False, False),
            ("Third, a 40% increase in clinician daily throughput. ", True, True),
            ("Attending physicians no longer spend 5 to 10 minutes between consultations searching for paper folders or mediating queue disputes. Patients enter promptly when called.\n\n", False, False),
            ("And fourth, exactly ZERO booking collisions. ", True, True),
            ("Under heavy simulated concurrency load, our atomic MongoDB reservation lock achieved a 100% data integrity record with zero double-bookings.", False, False)
        ],
        "Beyond clinical throughput, our engineering journey in Week 4 focused on professional audit remediation."
    )

    # ----------------------------------------------------
    # SLIDE 10
    # ----------------------------------------------------
    add_slide_section(
        10, "Sprint Retrospective & Audit Remediation", "Blessing Edmund Kwame Dogbe (Eddie)", "13:00 - 13:45",
        "2 Cards: 20/20 Audit Findings Remediated & Production Hardening Release v1.0.0.",
        "Demonstrate professional engineering maturity. Evaluators love seeing that you took critique seriously and resolved technical debt.",
        [
            ("A true mark of engineering excellence is how a team responds to technical audits and peer review.\n\n", False, False),
            ("Following our Gate 4 review, our team received a rigorous technical audit identifying 20 technical debt and edge-case items. ", False, False),
            ("I am proud to report that we remediated all 20 out of 20 findings:\n\n", True, True),
            ("• We resolved the notorious 'Ghost Patient' queue bug, ", True, True),
            ("where patients who cancelled or were marked no-show remained locked in clinician queues. Now, slots and tokens recycle atomically.\n", False, False),
            ("• We achieved clock-drift determinism ", True, True),
            ("across our CI pipeline by pinning mock system clocks in date-sensitive tests, permanently eliminating flaky test failures during midnight calendar rollovers.\n", False, False),
            ("• We improved WCAG accessibility ", True, True),
            ("by replacing hard-disabled buttons with contextual tooltips, allowing receptionists to clearly understand why a student is in a grace period while preserving API validation guards.\n", False, False),
            ("• And on security, ", True, True),
            ("we eliminated IDOR risks, added recursive NoSQL operator stripping, and implemented browser popstate traps on staff workstations to prevent accidental back-button logouts and lost clinical consultation notes.", False, False)
        ],
        "Now let us look at our turn-key handover deliverables and Phase 2 campus roadmap."
    )

    # ----------------------------------------------------
    # SLIDE 11
    # ----------------------------------------------------
    add_slide_section(
        11, "Campus Handover & Phase 2 Expansion Roadmap", "Blessing Edmund Kwame Dogbe (Eddie)", "13:45 - 14:30",
        "2 Cards: Phase 2 Expansion (AIS SSO, e-Prescriptions, Lab Referrals) & Turn-Key Handover Deliverables (v1.0.0, Runbooks).",
        "Speak as a project leader delivering enterprise software to a real client. Show foresight and readiness.",
        [
            ("We are delivering YɛnCare as a turn-key production repository ready for adoption by KNUST IT Services and University Health Services.\n\n", True, True),
            ("Our handover package includes:\n", False, False),
            ("• Tagged Release v1.0.0 ", True, True),
            ("with complete, reproducible dependencies and automated database seeding scripts for instant staging initialization.\n", False, False),
            ("• Comprehensive Operational Runbooks ", True, True),
            ("in our repository's docs folder covering system architecture, API specifications, and disaster recovery procedures.\n", False, False),
            ("• Administrative Handover guidelines, ", True, True),
            ("including credential rotation protocols and seed staff account cheatsheets.\n", False, False),
            ("• And a containerized Offline Demo Suite ", True, True),
            ("ensuring zero-downtime demonstration resilience.\n\n", False, False),
            ("Looking ahead, our Phase 2 roadmap is structured for seamless university ecosystem integration: direct Single Sign-On integration with KNUST's Academic Information System (AIS), digital e-prescription routing to the campus pharmacy queue, and diagnostic laboratory referral tracking with automated SMS test result notifications.", False, False)
        ],
        "I now invite Ella back to close our presentation and lead us into the evaluator defense."
    )

    # ----------------------------------------------------
    # SLIDE 12
    # ----------------------------------------------------
    add_slide_section(
        12, "Conclusion & Evaluator Q&A Defense", "Ella (Emmanuella) & Eddie (Blessing)", "14:30 - 15:00",
        "Final slide with thank you banner, core motto, live deployment links (Vercel & Render), and team sign-off.",
        "Deliver the closing words with warmth, pride, and conviction. Step back together as a unified team and face the panel.",
        [
            ("[ELLA]: Distinguished evaluators, campus healthcare should never be an ordeal of exhaustion, confusion, or wasted time. ", False, False),
            ("With YɛnCare, we have proven that outpatient healthcare at KNUST can be dignified, transparent, and clinically efficient.\n\n", True, True),
            ("[EDDIE]: Our live production application is deployed on Vercel, our hardened API is active on Render, our 391 automated tests stand as our proof of quality, ", False, False),
            ("and our team stands ready to support deployment across campus.\n\n", True, True),
            ("[ELLA & EDDIE]: On behalf of Team YɛnCare — Blessing, Able, Sterling, Raymond, Ephraim, and myself — thank you for your mentorship and guidance. ", False, False),
            ("We now welcome your questions, critique, and technical defense inquiries!", True, True)
        ],
        None
    )

    doc.add_page_break()

    # ==========================================
    # EVALUATOR Q&A DEFENSE CHEAT SHEET
    # ==========================================
    h_qa = doc.add_heading("Evaluator Q&A Defense Strategy & Panel Cheat Sheet", level=2)
    h_qa.runs[0].font.color.rgb = c_teal
    h_qa.runs[0].font.name = "Segoe UI"

    p_qa_intro = doc.add_paragraph()
    p_qa_intro.paragraph_format.space_before = Pt(2)
    p_qa_intro.paragraph_format.space_after = Pt(10)
    p_qa_intro.add_run(
        "Below are the 8 most probable, critical questions the evaluation panel will ask during the 5-minute defense, "
        "complete with the designated respondent, a 30-second bulletproof spoken answer, and a technical backup point."
    ).font.color.rgb = c_muted

    qa_list = [
        (
            "Q1: What happens if a student's phone battery dies or the mNotify SMS gateway experiences latency?",
            "Eddie (Blessing) / Ella",
            "\"We designed YɛnCare with zero-dependency fallback. If a student's phone battery dies or SMS is delayed, the student simply presents their physical KNUST Student ID card to the reception desk. The receptionist searches the student's index number in the live attendance roster and performs a one-click check-in. Furthermore, the corridor TV screen broadcasts called tokens publicly, so the student can simply observe the lobby screen without needing an active phone.\"",
            "Technical Backup: SMS dispatches are asynchronous background jobs wrapped in try-catch with queue retries; a gateway failure never blocks the core booking or check-in database transaction."
        ),
        (
            "Q2: How does your atomic locking mechanism guarantee zero double-bookings in MongoDB under high concurrency?",
            "Able Kafu Azanda",
            "\"We avoid naive 'read-then-write' checks which are susceptible to race conditions. Instead, we use MongoDB's atomic findOneAndUpdate with strict conditional filtering on { clinicianId, date, timeSlot, status: 'AVAILABLE' }. MongoDB executes this update under a document-level write lock. In addition, we enforce a partial unique compound index on (clinicianId, date, timeSlot) for active appointments. If two requests arrive in the exact same millisecond, the first commits atomically, and the second fails with a duplicate key error, which our controller maps to HTTP 409 Conflict.\"",
            "Technical Backup: Verified in our bookAppointmentHardening.test.js suite using Promise.all() parallel concurrency assertions."
        ),
        (
            "Q3: What happens if a student is genuinely delayed by 20 minutes due to an academic lecture or lab exam?",
            "Raymond Afrani / Ephraim Nartey",
            "\"Self-service check-in expires 15 minutes after the scheduled slot to prevent automated queue degradation. However, we intentionally preserved human clinical discretion. When a late student arrives, they approach the front-desk reception. The receptionist can review their genuine circumstance and use the 'Reception Override' action. This checks the student in with a tagged LATE_OVERRIDE audit event, placing them in the next available triage buffer without penalizing them as a delinquent no-show.\"",
            "Technical Backup: Audited in appointmentAudit.test.js; every override logs the staff actor ID and timestamp."
        ),
        (
            "Q4: Explain the 'Ghost Patient' bug found during the Week 4 audit and how your team remediated it.",
            "Eddie (Blessing) / Able Kafu Azanda",
            "\"In early prototypes, when an appointment was marked as NO_SHOW or CANCELLED, the booking record status changed, but the associated virtual queue ticket remained in an 'IN_QUEUE' state in memory, causing clinicians to call empty tokens. We remediated this by refactoring queue state progression into a unified atomic transaction: transitioning an appointment to NO_SHOW now cascades an atomic removal from the active queue engine and immediately reclaims the clinician's calendar slot for urgent walk-ins.\"",
            "Technical Backup: Verified by our queueEngine.test.js and visitDayGuard.test.js suites with 100% pass rate."
        ),
        (
            "Q5: How does YɛnCare comply with the Ghana Data Protection Act (Act 843) regarding health privacy?",
            "Sterling Awuley / Raymond Afrani",
            "\"Under Act 843, personal health data requires privacy by design. First, our public corridor TV screens and status lookups strictly mask phone numbers as 053-star-star-star-star-884 and never broadcast student names alongside medical complaints. Second, doctor workstation queues are isolated via signed JWTs, ensuring medical staff only see patients assigned to their room. Third, any appointment modification requires an SMS OTP challenge to prevent identity tampering.\"",
            "Technical Backup: All patient telephone numbers are sanitized through our backend normalizePhone utility and masked in public DTO serializers."
        ),
        (
            "Q6: Why did you choose React 19 and Node 24 rather than a traditional monolithic framework like Django or Laravel?",
            "Eddie (Blessing) / Able Kafu Azanda",
            "\"We chose React 19 and Node 24 for two critical reasons: real-time event concurrency and cross-device hardware heterogeneity. The clinic environment requires four distinct simultaneous user interfaces: a lightweight mobile PWA for students, high-density desktop dashboards for receptionists, public TV corridor displays, and physician consultation tablets. An asynchronous Node REST API enables lightweight event polling and sub-300ms response times while decoupling client rendering entirely.\"",
            "Technical Backup: Node 24 V8 performance and connection pooling absorbs morning concurrency spikes with sub-280ms latency."
        ),
        (
            "Q7: How will KNUST University Health Services transition from physical folders without disrupting ongoing clinic operations?",
            "Ella (Emmanuella) / Eddie (Blessing)",
            "\"We designed YɛnCare for a phased, parallel-run transition. During Phase 1, YɛnCare handles outpatient appointment scheduling and virtual queuing, while physical folders remain as medical archives. Triage staff use the YɛnCare roster to pre-pull folders 30 minutes before appointment times, eliminating the morning folder retrieval bottleneck. In Phase 2, direct electronic health record and AIS integration completes the paperless transition.\"",
            "Technical Backup: Documented in docs/operations/handover_guide.md with phased rollout runbooks."
        ),
        (
            "Q8: Can students game the system by booking fake appointments or booking slots on behalf of their friends?",
            "Sterling Awuley / Able Kafu Azanda",
            "\"No. First, booking requires a verified 8-digit KNUST student index number that is validated against campus enrollment records. Second, our anti-hoarding rule caps every index at exactly two concurrent active bookings. Third, booking and arrival notifications require the student's registered mobile number, and cancellation requires an SMS OTP. If a student fails to show up twice, their index is flagged for reception-only booking.\"",
            "Technical Backup: Tested in studentVerification.test.js and bookAppointmentHardening.test.js."
        )
    ]

    for q_title, resp, answer, backup in qa_list:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(8)
        p_q.paragraph_format.space_after = Pt(2)
        r_qt = p_q.add_run(q_title)
        r_qt.bold = True
        r_qt.font.size = Pt(11)
        r_qt.font.color.rgb = c_dark_teal

        p_r = doc.add_paragraph()
        p_r.paragraph_format.space_before = Pt(0)
        p_r.paragraph_format.space_after = Pt(4)
        r_resp = p_r.add_run(f"Designated Respondent: {resp}")
        r_resp.bold = True
        r_resp.font.size = Pt(9.5)
        r_resp.font.color.rgb = c_amber

        add_callout(doc, [
            ("💬 30-SECOND BULLETPROOF ANSWER:\n", True, False, c_teal),
            (answer, False, False, c_slate),
            ("\n\n🔧 TECHNICAL BACKUP POINT: ", True, False, c_dark_teal),
            (backup, False, True, c_muted)
        ], border_hex="176B5F", bg_hex="F8FAFC")

    doc.save(output_path)
    print(f"Teleprompter Word document saved successfully to: {output_path}")

if __name__ == "__main__":
    out_dir = r"c:\Users\eddie\OneDrive\Documents\projects\yencare-platform\docs\presentation"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "YenCare_Gate5_Presentation_Teleprompter_Script.docx")
    generate_teleprompter_docx(out_file)
