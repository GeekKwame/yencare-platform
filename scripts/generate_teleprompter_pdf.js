const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generatePdf() {
  const outputPath = path.resolve('docs/presentation/YenCare_Gate5_Presentation_Teleprompter_Script.pdf');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>YɛnCare — Gate 5 Presentation Teleprompter & Evaluator Defense Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
      @bottom-left {
        content: "YɛnCare Gate 5 Defense • Confidential";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    /* Cover / Header Section */
    .doc-header {
      border-bottom: 2px solid #176b5f;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }

    .badge-capstone {
      display: inline-block;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #c37d32;
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }

    h1.doc-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24pt;
      font-weight: 800;
      color: #176b5f;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: 6px;
    }

    .doc-subtitle {
      font-size: 10.5pt;
      color: #64748b;
      max-width: 680px;
    }

    /* Executive Callout Boxes */
    .callout {
      background: #f0fdf4;
      border-left: 4px solid #176b5f;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 18px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    .callout-amber {
      background: #fffbeb;
      border-left-color: #c37d32;
    }

    .callout-blue {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }

    .callout-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 10.5pt;
      margin-bottom: 6px;
      color: #0f4b43;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .callout-amber .callout-title {
      color: #b45309;
    }

    /* Tables */
    table.agenda-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    table.agenda-table th {
      background: #176b5f;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    table.agenda-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    table.agenda-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .slide-pill {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #176b5f;
      background: #e6f3f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
    }

    /* Slide Script Container */
    .slide-section {
      page-break-inside: avoid;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .slide-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slide-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .slide-num-tag {
      background: #176b5f;
      color: #fff;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 9pt;
      padding: 3px 8px;
      border-radius: 5px;
    }

    .slide-title-text {
      font-family: 'Outfit', sans-serif;
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
    }

    .slide-meta-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      font-weight: 600;
      color: #c37d32;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 3px 8px;
      border-radius: 999px;
    }

    .slide-body {
      padding: 14px;
    }

    .screen-desc {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 10px;
      font-style: italic;
    }

    .stage-dir {
      background: #f1f5f9;
      border-left: 3px solid #64748b;
      padding: 7px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 12px;
      font-style: italic;
    }

    .teleprompter-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 9.8pt;
      line-height: 1.55;
      color: #1e293b;
    }

    .teleprompter-box p {
      margin-bottom: 8px;
    }

    .teleprompter-box p:last-child {
      margin-bottom: 0;
    }

    .emp {
      font-weight: 700;
      color: #0f4b43;
    }

    .handoff-box {
      margin-top: 10px;
      background: #fffbeb;
      border: 1px dashed #f59e0b;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 9pt;
      color: #92400e;
    }

    /* Q&A Section */
    .qa-card {
      page-break-inside: avoid;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }

    .qa-q {
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #0f4b43;
      margin-bottom: 4px;
    }

    .qa-resp {
      font-size: 8.5pt;
      font-weight: 700;
      color: #c37d32;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .qa-ans {
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 6px;
    }

    .qa-tech {
      font-size: 8.5pt;
      color: #64748b;
      background: #f8fafc;
      border-left: 2px solid #94a3b8;
      padding: 4px 8px;
      font-style: italic;
    }

    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="doc-header">
    <div class="badge-capstone">AmaliTech Capstone Internship • Final Defense (Gate 5)</div>
    <h1 class="doc-title">YɛnCare Presentation Teleprompter & Defense Guide</h1>
    <div class="doc-subtitle">
      Natural spoken-word teleprompter scripts, stage directions, transitions, live demo narration, and evaluator Q&A defense strategy for the 15-minute Gate 5 capstone defense.
    </div>
  </div>

  <!-- Pacing & Delegation Callout -->
  <div class="callout">
    <div class="callout-title">🎯 PRESENTATION PACING & ROLE DELEGATION</div>
    <div><strong>• Total Defense Duration:</strong> 15 Minutes (+ 5 Minutes Evaluator Q&A)</div>
    <div><strong>• Intro Lead (Slides 1–3):</strong> Emmanuella (Ella) — Problem statement, campus realities, and core solution vision (~4.5 mins)</div>
    <div><strong>• Engineering Deep Dive (Slides 4–7):</strong> Able, Sterling, Raymond & Ephraim — Multi-tier architecture, clinical fairness guardrails, security, and 391 automated tests (~5.5 mins)</div>
    <div><strong>• Live Multi-Station Demonstration (Slide 8):</strong> Blessing (Eddie) — Real-time end-to-end clinical workflow across 4 synced stations (~3.5 mins)</div>
    <div><strong>• Quantitative Impact, Audit Retrospective & Handover (Slides 9–12):</strong> Blessing (Eddie) & Ella — Measurable campus impact, 20 remediated audit issues, turn-key handover package & concluding defense (~1.5 mins)</div>
  </div>

  <!-- Agenda Table -->
  <table class="agenda-table">
    <thead>
      <tr>
        <th style="width: 8%;">Slide</th>
        <th style="width: 32%;">Topic / Title</th>
        <th style="width: 25%;">Primary Speaker</th>
        <th style="width: 15%;">Time Target</th>
        <th style="width: 20%;">Key Objective</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="slide-pill">01</span></td>
        <td><strong>Title & Capstone Cover</strong></td>
        <td>Ella (Emmanuella)</td>
        <td>0:00 - 1:30</td>
        <td>Welcome & team roles</td>
      </tr>
      <tr>
        <td><span class="slide-pill">02</span></td>
        <td><strong>Crisis at Campus Healthcare</strong></td>
        <td>Ella (Emmanuella)</td>
        <td>1:30 - 3:00</td>
        <td>85k students, 3.5h wait</td>
      </tr>
      <tr>
        <td><span class="slide-pill">03</span></td>
        <td><strong>YɛnCare Solution Pillars</strong></td>
        <td>Ella (Emmanuella)</td>
        <td>3:00 - 4:30</td>
        <td>Virtual queue & SMS</td>
      </tr>
      <tr>
        <td><span class="slide-pill">04</span></td>
        <td><strong>Multi-Tier Architecture</strong></td>
        <td>Able & Sterling</td>
        <td>4:30 - 6:00</td>
        <td>React 19, Node 24, Mongo</td>
      </tr>
      <tr>
        <td><span class="slide-pill">05</span></td>
        <td><strong>Clinical Fairness Guardrails</strong></td>
        <td>Able & Sterling</td>
        <td>6:00 - 7:30</td>
        <td>2-booking cap, atomic lock</td>
      </tr>
      <tr>
        <td><span class="slide-pill">06</span></td>
        <td><strong>Security & Anti-Abuse</strong></td>
        <td>Raymond & Ephraim</td>
        <td>7:30 - 9:00</td>
        <td>Rate limit, OTP, Act 843</td>
      </tr>
      <tr>
        <td><span class="slide-pill">07</span></td>
        <td><strong>Quality Rigor & Automated CI</strong></td>
        <td>Raymond & Ephraim</td>
        <td>9:00 - 10:15</td>
        <td>391 tests, Playwright CI</td>
      </tr>
      <tr>
        <td><span class="slide-pill">08</span></td>
        <td><strong>Live Multi-Station Demo</strong></td>
        <td>Eddie (Blessing)</td>
        <td>10:15 - 12:00</td>
        <td>4-station live workflow</td>
      </tr>
      <tr>
        <td><span class="slide-pill">09</span></td>
        <td><strong>Clinical Impact & Throughput</strong></td>
        <td>Eddie (Blessing)</td>
        <td>12:00 - 13:00</td>
        <td>65% congestion reduction</td>
      </tr>
      <tr>
        <td><span class="slide-pill">10</span></td>
        <td><strong>Sprint Audit Remediation</strong></td>
        <td>Eddie (Blessing)</td>
        <td>13:00 - 13:45</td>
        <td>20/20 audit issues resolved</td>
      </tr>
      <tr>
        <td><span class="slide-pill">11</span></td>
        <td><strong>Roadmap & Handover</strong></td>
        <td>Eddie (Blessing)</td>
        <td>13:45 - 14:30</td>
        <td>AIS SSO & v1.0.0 package</td>
      </tr>
      <tr>
        <td><span class="slide-pill">12</span></td>
        <td><strong>Conclusion & Evaluator Q&A</strong></td>
        <td>Ella & Eddie</td>
        <td>14:30 - 15:00</td>
        <td>Closing defense & floor Q&A</td>
      </tr>
    </tbody>
  </table>

  <!-- Teleprompter Tips -->
  <div class="callout callout-amber">
    <div class="callout-title">💡 TELEPROMPTER READABILITY RULES FOR THE TEAM</div>
    <div><strong>1. Conversational Cadence:</strong> Speak at approximately 130 to 140 words per minute. Do NOT rush. Pause at commas and bullet transitions.</div>
    <div><strong>2. Eye Contact Balance:</strong> Glance at these teleprompter notes for prompt cues, but maintain steady eye contact with the evaluation panel during your punchlines.</div>
    <div><strong>3. Stage Direction Tags:</strong> Items marked in <em>[BRACKETS]</em> are physical actions, clicks, and transitions — do not speak them out loud!</div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 1 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 01</span>
        <span class="slide-title-text">Title & Capstone Cover</span>
      </div>
      <span class="slide-meta-badge">Speaker: Ella • 0:00 - 1:30</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: Title card featuring YɛnCare logo, Gate 5 defense badge, project subtitle, and the 3 team discipline columns.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Stand tall, smile warmly at the evaluators, and establish calm authority. Do not look nervous. Take one slow breath before speaking. Glance across all panelists.</div>
      <div class="teleprompter-box">
        <p>Good morning, distinguished evaluators, faculty mentors, and fellow engineers. <span class="emp">Welcome to our Gate 5 Final Capstone Defense.</span> My name is Emmanuella, and together with my colleagues — Blessing, Able, Sterling, Raymond, and Ephraim — we are deeply honored to present <span class="emp">YɛnCare: our smart outpatient scheduling and real-time virtual queue management platform, engineered specifically for the KNUST Students' Clinic and Hospital.</span></p>
        <p>Over the past several weeks, our engineering team has taken this project from early conceptual wireframes into a fully hardened, audited, and production-tested healthcare system. In today's defense, we will share the campus crisis that drove our design, walk you through our multi-tier architecture, demonstrate our 391 passing automated tests, <span class="emp">and our team lead, Eddie, will conduct a live, end-to-end demonstration across four synchronized clinic hardware stations.</span></p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Let us begin by looking at the reality on the ground at KNUST."</div>
    </div>
  </div>

  <!-- SLIDE 2 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 02</span>
        <span class="slide-title-text">Crisis at Campus Healthcare Facilities</span>
      </div>
      <span class="slide-meta-badge">Speaker: Ella • 1:30 - 3:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 4 metric cards: 3.5 hrs Wait Time, 65% Peak Congestion, 100% Manual Paper Triage, 28% Ghost Slots.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Shift tone to empathetic yet firm concern. Gesture toward the 4 metric cards on screen. Emphasize the human toll on students.</div>
      <div class="teleprompter-box">
        <p>To understand why YɛnCare is essential, consider the daily experience of a student at KNUST. <span class="emp">The University Health Services serves an astonishing population of over 85,000 students and staff.</span> Yet, the gateway into outpatient healthcare is still entirely manual paper triage.</p>
        <p>Every morning at 6:30 AM, students who are battling malaria, severe headaches, or physical injuries are forced to walk across campus and stand in chaotic physical lines just to collect a handwritten paper tally card. Our field investigations revealed four devastating bottlenecks:</p>
        <p>First, an <span class="emp">average in-clinic wait time of 3.5 hours.</span> Students lose entire lecture mornings and laboratory practicals simply sitting in waiting chairs.</p>
        <p>Second, a <span class="emp">65% peak congestion surge</span> between 7:00 AM and 10:00 AM. Overcrowded corridors create severe airborne cross-infection hazards.</p>
        <p>Third, <span class="emp">100% manual paper handling.</span> Physical consultation cards get misplaced, tally numbers get disputed, and receptionists bear the brunt of student frustration.</p>
        <p>And finally, a <span class="emp">28% ghost and no-show rate.</span> Because students get tired of waiting and leave without telling anyone, doctors frequently sit idle inside consulting rooms while dozens of other sick students are waiting outside with no visibility into the queue.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "This broken status quo is what YɛnCare was built to solve. Here is how we turned physical chaos into digital order."</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 3 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 03</span>
        <span class="slide-title-text">YɛnCare: Outpatient Care, Dignified & Digital</span>
      </div>
      <span class="slide-meta-badge">Speaker: Ella • 3:00 - 4:30</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 6 solution pillars: Dual-facility scheduling, virtual queue + SMS, arrival windows, corridor TV, doctor isolation, slot recycling.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Brighten your tone. Project excitement and clarity. Use your hands to contrast 'waiting 3.5 hours in a hallway' versus 'waiting in your dorm room'.</div>
      <div class="teleprompter-box">
        <p><span class="emp">YɛnCare restores dignity and predictability to campus healthcare through six foundational pillars.</span></p>
        <p>First, <span class="emp">Dual-Facility Outpatient Booking.</span> Students can reserve a 15-minute consultation at either the KNUST Students' Clinic or the main KNUST Hospital in under 60 seconds directly from their smartphones.</p>
        <p>Second, <span class="emp">Virtual Queueing with Integrated mNotify SMS.</span> Instead of sitting in a crowded clinic hallway, students remain in their hostel rooms or the campus library. They receive automated SMS alerts confirming their 4-digit booking reference, reminding them one hour before their visit, and issuing arrival instructions.</p>
        <p>Third, <span class="emp">Time-Bounded Arrival Windows.</span> To eliminate dawn crowd surges, self-service check-in is strictly valid only between 60 minutes before and 15 minutes after the scheduled slot time.</p>
        <p>Fourth, a <span class="emp">Public Corridor Digital TV Display.</span> Mounted in waiting halls, this live high-contrast screen broadcasts called tokens and assigned room numbers with audio chimes, without ever displaying student names or sensitive phone numbers.</p>
        <p>Fifth, <span class="emp">Doctor Workstation Isolation,</span> ensuring attending physicians see only their assigned patients.</p>
        <p>And sixth, <span class="emp">Fair Access & Automatic Slot Recycling,</span> which reclaims unattended slots so urgent walk-in patients can be seen immediately.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "To explain the architectural foundation that powers this reliable flow, I now hand over to Able and Sterling from our backend and security engineering team."</div>
    </div>
  </div>

  <!-- SLIDE 4 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 04</span>
        <span class="slide-title-text">Robust, Resilient Multi-Tier Tech Stack</span>
      </div>
      <span class="slide-meta-badge">Speaker: Able / Sterling • 4:30 - 6:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 4 Architecture layers (React 19/Vite, Node 24/Express, MongoDB Atlas ReplicaSet, mNotify/Vercel/Render) & Principles card.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Adopt a confident, technical engineering posture. Point to the architecture layers. Speak with authority on backend design decisions.</div>
      <div class="teleprompter-box">
        <p>Thank you, Ella. Distinguished evaluators, when designing YɛnCare, our primary engineering mandates were concurrency resilience, data integrity, and zero silent failures under campus peak loads.</p>
        <p><span class="emp">We implemented a modern multi-tier architecture:</span></p>
        <p>On the <span class="emp">Frontend Tier</span>, we built with React 19 and Vite 8.2, utilizing custom CSS design tokens to provide a responsive, mobile-first Progressive Web App that loads in under 1.2 seconds even on weak campus Wi-Fi.</p>
        <p>On the <span class="emp">API and Logic Tier</span>, we run Node.js v24 with Express REST services. Crucially, we implemented a fail-fast configuration bootstrapper in config/env.js. If an environment variable, database URI, or SMS secret is missing, the server halts immediately during startup and outputs an ASCII diagnostic report, preventing corrupt production state.</p>
        <p>On the <span class="emp">Database Tier</span>, we utilize a MongoDB Atlas Replica Set with automated connection pooling tuned between 10 and 50 connections to absorb the 7:00 AM check-in concurrency spike.</p>
        <p>And on the <span class="emp">Integration Tier</span>, we interface with the mNotify Ghana SMS gateway for high-deliverability mobile notifications, deployed on Render for staging and Vercel for web delivery, backed by Playwright automated CI pipelines.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Now, let's examine the clinical fairness guardrails that enforce medical equity on our campus."</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 5 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 05</span>
        <span class="slide-title-text">Fair Access & Production Guardrails</span>
      </div>
      <span class="slide-meta-badge">Speaker: Able / Sterling • 6:00 - 7:30</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 4 Guardrail cards: Rule 1 Anti-Hoarding Cap, Rule 2 Concurrency Lock, Rule 3 Arrival Window, Rule 4 Slot Recycling.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Emphasize the business logic. Show that the system is defended against edge cases and student gaming.</div>
      <div class="teleprompter-box">
        <p>A healthcare platform is only as good as the fairness rules it enforces. On a campus with 85,000 students, you cannot rely on good intentions — the code must prevent abuse systematically.</p>
        <p><span class="emp">We engineered four non-negotiable production business rules:</span></p>
        <p><span class="emp">Rule 1 is our Student Anti-Hoarding Cap.</span> No student index number can hold more than two active, non-completed appointments concurrently. If a student attempts to hoard multiple consultation slots during exam week, the API immediately rejects the request with HTTP 409 Conflict while gracefully preserving their legitimate existing bookings.</p>
        <p><span class="emp">Rule 2 is Atomic Slot Reservation.</span> In an outpatient system, a double-booking is a clinical failure. We enforce atomic MongoDB findOneAndUpdate operations paired with partial unique indexes on clinicianId, appointment date, and time slot. Two students clicking the exact same 10:30 AM slot at the exact same millisecond will NEVER result in a collision; one succeeds, and the other is instantly prompted for the next available slot.</p>
        <p><span class="emp">Rule 3 is our Dynamic Check-In Guard.</span> Self-service arrival check-in unlocks exactly 60 minutes before the appointment and expires 15 minutes after. Late students cannot self-check-in; they are routed to the reception desk for manual triage override.</p>
        <p>And <span class="emp">Rule 4 is Automated No-Show Slot Recycling.</span> If a student fails to arrive within the grace period, our scheduled worker transitions the appointment to NO_SHOW. This instantly unblocks the clinician's workstation and releases the slot for emergency walk-ins.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "To present our enterprise security hardening, privacy compliance, and test rigor, I now hand over to Raymond and Ephraim."</div>
    </div>
  </div>

  <!-- SLIDE 6 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 06</span>
        <span class="slide-title-text">Enterprise Security & Anti-Abuse Hardening</span>
      </div>
      <span class="slide-meta-badge">Speaker: Raymond / Ephraim • 7:30 - 9:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 6 Security cards: Rate Limiting, SMS OTP, Doctor Isolation, Phone Masking (Act 843), NoSQL Sanitizer, Audit Trail.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Maintain a serious, compliance-focused tone. Highlight Ghana Data Protection Act 843 compliance.</div>
      <div class="teleprompter-box">
        <p>Thank you, Able. In healthcare software, security and confidentiality are legal mandates. Under Ghana's Data Protection Act, Act 843, student medical information must be protected from unauthorized exposure at every layer.</p>
        <p><span class="emp">We hardened YɛnCare with six defense-in-depth security measures:</span></p>
        <p>First, <span class="emp">Anti-Brute-Force Rate Limiting.</span> Our 4-digit reference codes are protected by layered IP and index rate limiters: general lookups are capped at 30 requests per minute, and check-in verification is restricted to 5 attempts per 15 minutes, preventing automated enumeration attacks.</p>
        <p>Second, <span class="emp">SMS OTP Cancellation Verification.</span> To prevent malicious roommates or pranksters from cancelling a classmate's clinic appointment, any cancellation or reschedule request triggers a 4-digit SMS OTP challenge sent to the verified mobile phone on record.</p>
        <p>Third, <span class="emp">Doctor Workstation Isolation.</span> Attending physicians authenticate via cryptographically signed JWT tokens that scope queue queries strictly to their assigned consultation room. A doctor in Room 1 cannot inspect or manipulate Room 2's patient queue.</p>
        <p>Fourth, <span class="emp">Phone Number Masking.</span> Public boards and corridor displays mask student telephone numbers — displaying for example 053-star-star-star-star-884 — so bystanders cannot harvest personal contact details.</p>
        <p>Fifth, <span class="emp">Recursive NoSQL Injection Stripping.</span> Generic sanitization middleware strips malicious MongoDB operators like dollar-gt or dollar-regex before payloads reach our controller handlers.</p>
        <p>And sixth, an <span class="emp">Immutable Audit Trail.</span> Every state change — from booking to reception override to doctor completion — writes an immutable audit record logging the exact timestamp, actor role, and previous status.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Let us now look at our automated quality verification metrics."</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 7 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 07</span>
        <span class="slide-title-text">Rigorous Automated Testing & Verification</span>
      </div>
      <span class="slide-meta-badge">Speaker: Raymond / Ephraim • 9:00 - 10:15</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: Metric cards: 391+ Backend Tests, 37+ Playwright E2E Tests, 0 Build Errors + CI Terminal Suite Log.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Show supreme confidence in software quality. Point to the terminal output showing 391 passing tests.</div>
      <div class="teleprompter-box">
        <p>Our team believes that true engineering confidence comes from automated, reproducible testing.</p>
        <p>As you can see on the screen, YɛnCare is backed by <span class="emp">391 automated backend unit and integration tests across 94 distinct test suites, running on native Node.js test runner with a 100% pass rate in just 37.3 seconds.</span></p>
        <p>Our test suite covers everything from config bootstrapper validation and RBAC permission guards, to concurrency race conditions in bookAppointmentHardening, to date-boundary logic in visitDayGuard.</p>
        <p>In addition, our CI pipeline executes <span class="emp">37 Playwright end-to-end browser tests</span> verifying real student booking journeys across Chromium, Firefox, and WebKit rendering engines. Both our production web app and interactive clinical prototypes build cleanly with zero TypeScript or lint errors on every GitHub push.</p>
        <p>This level of test rigor guarantees that regressions cannot slip into clinical workflows undetected.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "And now, to show you how all of these components come alive in a synchronized clinical environment, I invite our Team Lead and DevOps Engineer, Eddie, to conduct the live demonstration!"</div>
    </div>
  </div>

  <!-- SLIDE 8: LIVE DEMO -->
  <div class="slide-section">
    <div class="slide-header" style="background: #e6f3f0; border-bottom: 2px solid #176b5f;">
      <div class="slide-title-group">
        <span class="slide-num-tag" style="background: #c37d32;">SLIDE 08 • LIVE DEMO</span>
        <span class="slide-title-text" style="color: #0f4b43;">End-to-End Live Clinical Demonstration</span>
      </div>
      <span class="slide-meta-badge" style="background: #176b5f; color: #fff; border-color: #176b5f;">Speaker: Eddie (Blessing) • 10:15 - 12:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 4 Synchronized Clinical Stations: 1. Student Mobile, 2. Front-Desk Reception, 3. Corridor TV Display, 4. Doctor Workstation.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Transition smoothly to your live demonstration setup. Keep your tone energetic, confident, and conversational. Speak clearly as you perform each action on screen.</div>
      <div class="teleprompter-box">
        <p>Thank you, Raymond! Distinguished evaluators, it is my absolute pleasure to guide you through the live operational workflow of YɛnCare.</p>
        <p><em>[ACTION: Switch display to live browser window showing the four synchronized stations / tabs].</em></p>
        <p>To reflect real-world clinic operations at KNUST, we have four active stations synchronized in real time:</p>
        <p>• On the left, my mobile viewport represents a student, Ray Afrani, booking on his phone.<br>
        • In the second window, we have the Front-Desk Reception Roster.<br>
        • On the third display, we have the Public Corridor Digital Board that sits on a TV in the clinic lobby.<br>
        • And on the fourth window, we have Dr. Boateng logged into his Doctor Consultation Workstation in Room 1.</p>
        <p><span class="emp">Watch how seamlessly the lifecycle unfolds:</span></p>
        <p><span class="emp">[STEP 1 — STUDENT BOOKING]:</span> As Ray, I select KNUST Students' Clinic, choose General Outpatient, and select Dr. Boateng for today's 10:30 AM slot. I input my student index — 20494789. I tap 'Confirm Booking'. In under two seconds, the atomic lock secures the slot, and my booking is confirmed with Reference Number 7492. Notice that an SMS receipt is simultaneously dispatched via mNotify to the phone.</p>
        <p><span class="emp">[STEP 2 — RECEPTION ROSTER SYNC]:</span> Now look at Station 2. Without refreshing the page, Ray's appointment appears immediately on the reception roster. Notice the status badge reads 'Booked'. If Ray were delayed by a lecture, the receptionist can hover over the override button and see our accessible WCAG tooltip explaining the grace-period status.</p>
        <p><span class="emp">[STEP 3 — ARRIVAL & CORRIDOR TV CHIME]:</span> Ray walks into the clinic compound within his arrival window. On his phone, he taps 'I've Arrived'. The system validates his time window and assigns him Token Number C-04. Look at Station 3 on the corridor TV display: the board immediately rings its audio chime, and the high-contrast display updates: 'Now Serving: Token C-04, Proceed to Consultation Room 1'. Notice that Ray's full name and phone number remain completely private.</p>
        <p><span class="emp">[STEP 4 — DOCTOR WORKSTATION]:</span> Inside Consultation Room 1, Dr. Boateng sees Ray move to the top of his queue. He clicks 'Call Patient'. Dr. Boateng opens the clinical consultation modal, reviews the chief complaint, records his clinical diagnosis, and clicks 'Complete Visit'.</p>
        <p><span class="emp">[STEP 5 — REAL-TIME RESOLUTION]:</span> Instantly, the visit marks as COMPLETED, the corridor screen clears for the next waiting student, the slot lifecycle is archived into our immutable audit trail, and the entire cycle has executed without a single paper slip or queue dispute!</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Having witnessed the live clinical journey, let us examine the quantitative clinical impact and throughput metrics."</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 9 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 09</span>
        <span class="slide-title-text">Quantified Clinical Throughput & Campus Impact</span>
      </div>
      <span class="slide-meta-badge">Speaker: Eddie (Blessing) • 12:00 - 13:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 4 Hero Impact Cards: 65% Congestion Cut, 72% Wait Time Reduction, +40% Clinician Throughput, 0 Collisions.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Maintain momentum and enthusiasm. Present these statistics not as abstract numbers, but as real quality-of-life improvements for students and doctors.</div>
      <div class="teleprompter-box">
        <p>What does this digital workflow mean in tangible terms for the KNUST community?</p>
        <p><span class="emp">Through empirical queuing models and stress testing, YɛnCare delivers dramatic operational improvements:</span></p>
        <p>First, a <span class="emp">65% reduction in waiting room peak congestion.</span> By virtualizing the queue, we eliminate the physical morning bottleneck. Students wait in their hostel rooms or the campus library until their window is ready.</p>
        <p>Second, a <span class="emp">72% decrease in in-clinic physical wait time.</span> The average time a sick student spends waiting physically in the clinic drops from over 3 hours down to just 35 minutes.</p>
        <p>Third, a <span class="emp">40% increase in clinician daily throughput.</span> Attending physicians no longer spend 5 to 10 minutes between consultations searching for paper folders or mediating queue disputes. Patients enter promptly when called.</p>
        <p>And fourth, <span class="emp">exactly ZERO booking collisions.</span> Under heavy simulated concurrency load, our atomic MongoDB reservation lock achieved a 100% data integrity record with zero double-bookings.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Beyond clinical throughput, our engineering journey in Week 4 focused on professional audit remediation."</div>
    </div>
  </div>

  <!-- SLIDE 10 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 10</span>
        <span class="slide-title-text">Sprint Retrospective & Audit Remediation</span>
      </div>
      <span class="slide-meta-badge">Speaker: Eddie (Blessing) • 13:00 - 13:45</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 2 Cards: 20/20 Audit Findings Remediated & Production Hardening Release v1.0.0.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Demonstrate professional engineering maturity. Evaluators love seeing that you took critique seriously and resolved technical debt.</div>
      <div class="teleprompter-box">
        <p>A true mark of engineering excellence is how a team responds to technical audits and peer review.</p>
        <p>Following our Gate 4 review, our team received a rigorous technical audit identifying 20 technical debt and edge-case items. <span class="emp">I am proud to report that we remediated all 20 out of 20 findings:</span></p>
        <p>• We resolved the notorious <span class="emp">'Ghost Patient' queue bug,</span> where patients who cancelled or were marked no-show remained locked in clinician queues. Now, slots and tokens recycle atomically.</p>
        <p>• We achieved <span class="emp">clock-drift determinism</span> across our CI pipeline by pinning mock system clocks in date-sensitive tests, permanently eliminating flaky test failures during midnight calendar rollovers.</p>
        <p>• We improved <span class="emp">WCAG accessibility</span> by replacing hard-disabled buttons with contextual tooltips, allowing receptionists to clearly understand why a student is in a grace period while preserving API validation guards.</p>
        <p>• And on security, we eliminated IDOR risks, added recursive NoSQL operator stripping, and implemented browser popstate traps on staff workstations to prevent accidental back-button logouts and lost clinical consultation notes.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "Now let us look at our turn-key handover deliverables and Phase 2 campus roadmap."</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SLIDE 11 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 11</span>
        <span class="slide-title-text">Campus Handover & Phase 2 Expansion Roadmap</span>
      </div>
      <span class="slide-meta-badge">Speaker: Eddie (Blessing) • 13:45 - 14:30</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: 2 Cards: Phase 2 Expansion (AIS SSO, e-Prescriptions, Lab Referrals) & Turn-Key Handover Deliverables (v1.0.0, Runbooks).</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Speak as a project leader delivering enterprise software to a real client. Show foresight and readiness.</div>
      <div class="teleprompter-box">
        <p><span class="emp">We are delivering YɛnCare as a turn-key production repository ready for adoption by KNUST IT Services and University Health Services.</span></p>
        <p>Our handover package includes:</p>
        <p>• <span class="emp">Tagged Release v1.0.0</span> with complete, reproducible dependencies and automated database seeding scripts for instant staging initialization.<br>
        • <span class="emp">Comprehensive Operational Runbooks</span> in our repository's docs folder covering system architecture, API specifications, and disaster recovery procedures.<br>
        • <span class="emp">Administrative Handover guidelines,</span> including credential rotation protocols and seed staff account cheatsheets.<br>
        • And a containerized <span class="emp">Offline Demo Suite</span> ensuring zero-downtime demonstration resilience.</p>
        <p>Looking ahead, our Phase 2 roadmap is structured for seamless university ecosystem integration: direct Single Sign-On integration with KNUST's Academic Information System (AIS), digital e-prescription routing to the campus pharmacy queue, and diagnostic laboratory referral tracking with automated SMS test result notifications.</p>
      </div>
      <div class="handoff-box">🔄 VERBAL HANDOFF: "I now invite Ella back to close our presentation and lead us into the evaluator defense."</div>
    </div>
  </div>

  <!-- SLIDE 12 -->
  <div class="slide-section">
    <div class="slide-header">
      <div class="slide-title-group">
        <span class="slide-num-tag">SLIDE 12</span>
        <span class="slide-title-text">Conclusion & Evaluator Q&A Defense</span>
      </div>
      <span class="slide-meta-badge">Speaker: Ella & Eddie • 14:30 - 15:00</span>
    </div>
    <div class="slide-body">
      <div class="screen-desc">On Screen: Final slide with thank you banner, core motto, live deployment links (Vercel & Render), and team sign-off.</div>
      <div class="stage-dir">🎬 STAGE DIRECTIONS: Deliver the closing words with warmth, pride, and conviction. Step back together as a unified team and face the panel.</div>
      <div class="teleprompter-box">
        <p><strong>[ELLA]:</strong> Distinguished evaluators, campus healthcare should never be an ordeal of exhaustion, confusion, or wasted time. <span class="emp">With YɛnCare, we have proven that outpatient healthcare at KNUST can be dignified, transparent, and clinically efficient.</span></p>
        <p><strong>[EDDIE]:</strong> Our live production application is deployed on Vercel, our hardened API is active on Render, our 391 automated tests stand as our proof of quality, <span class="emp">and our team stands ready to support deployment across campus.</span></p>
        <p><strong>[ELLA & EDDIE]:</strong> On behalf of Team YɛnCare — Blessing, Able, Sterling, Raymond, Ephraim, and myself — thank you for your mentorship and guidance. <span class="emp">We now welcome your questions, critique, and technical defense inquiries!</span></p>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- EVALUATOR Q&A CHEAT SHEET -->
  <div class="doc-header">
    <h2 style="font-family: 'Outfit', sans-serif; font-size: 18pt; color: #176b5f; margin-bottom: 4px;">
      Evaluator Q&A Defense Strategy & Panel Cheat Sheet
    </h2>
    <div style="font-size: 9.5pt; color: #64748b;">
      Anticipated high-probability panel questions, designated respondents, 30-second bulletproof answers, and technical backup points.
    </div>
  </div>

  <!-- Q1 -->
  <div class="qa-card">
    <div class="qa-q">Q1: What happens if a student's phone battery dies or the mNotify SMS gateway experiences latency?</div>
    <div class="qa-resp">Designated Respondent: Eddie (Blessing) / Ella</div>
    <div class="qa-ans">
      "We designed YɛnCare with zero-dependency fallback. If a student's phone battery dies or SMS is delayed, the student simply presents their physical KNUST Student ID card to the reception desk. The receptionist searches the student's index number in the live attendance roster and performs a one-click check-in. Furthermore, the corridor TV screen broadcasts called tokens publicly, so the student can simply observe the lobby screen without needing an active phone."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: SMS dispatches are asynchronous background jobs wrapped in try-catch with queue retries; a gateway failure never blocks the core booking or check-in database transaction.
    </div>
  </div>

  <!-- Q2 -->
  <div class="qa-card">
    <div class="qa-q">Q2: How does your atomic locking mechanism guarantee zero double-bookings in MongoDB under high concurrency?</div>
    <div class="qa-resp">Designated Respondent: Able Kafu Azanda</div>
    <div class="qa-ans">
      "We avoid naive 'read-then-write' checks which are susceptible to race conditions. Instead, we use MongoDB's atomic findOneAndUpdate with strict conditional filtering on { clinicianId, date, timeSlot, status: 'AVAILABLE' }. MongoDB executes this update under a document-level write lock. In addition, we enforce a partial unique compound index on (clinicianId, date, timeSlot) for active appointments. If two requests arrive in the exact same millisecond, the first commits atomically, and the second fails with a duplicate key error, which our controller maps to HTTP 409 Conflict."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Verified in our bookAppointmentHardening.test.js suite using Promise.all() parallel concurrency assertions.
    </div>
  </div>

  <!-- Q3 -->
  <div class="qa-card">
    <div class="qa-q">Q3: What happens if a student is genuinely delayed by 20 minutes due to an academic lecture or lab exam?</div>
    <div class="qa-resp">Designated Respondent: Raymond Afrani / Ephraim Nartey</div>
    <div class="qa-ans">
      "Self-service check-in expires 15 minutes after the scheduled slot to prevent automated queue degradation. However, we intentionally preserved human clinical discretion. When a late student arrives, they approach the front-desk reception. The receptionist can review their genuine circumstance and use the 'Reception Override' action. This checks the student in with a tagged LATE_OVERRIDE audit event, placing them in the next available triage buffer without penalizing them as a delinquent no-show."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Audited in appointmentAudit.test.js; every override logs the staff actor ID and timestamp.
    </div>
  </div>

  <!-- Q4 -->
  <div class="qa-card">
    <div class="qa-q">Q4: Explain the 'Ghost Patient' bug found during the Week 4 audit and how your team remediated it.</div>
    <div class="qa-resp">Designated Respondent: Eddie (Blessing) / Able Kafu Azanda</div>
    <div class="qa-ans">
      "In early prototypes, when an appointment was marked as NO_SHOW or CANCELLED, the booking record status changed, but the associated virtual queue ticket remained in an 'IN_QUEUE' state in memory, causing clinicians to call empty tokens. We remediated this by refactoring queue state progression into a unified atomic transaction: transitioning an appointment to NO_SHOW now cascades an atomic removal from the active queue engine and immediately reclaims the clinician's calendar slot for urgent walk-ins."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Verified by our queueEngine.test.js and visitDayGuard.test.js suites with 100% pass rate.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Q5 -->
  <div class="qa-card">
    <div class="qa-q">Q5: How does YɛnCare comply with the Ghana Data Protection Act (Act 843) regarding health privacy?</div>
    <div class="qa-resp">Designated Respondent: Sterling Awuley / Raymond Afrani</div>
    <div class="qa-ans">
      "Under Act 843, personal health data requires privacy by design. First, our public corridor TV screens and status lookups strictly mask phone numbers as 053-star-star-star-star-884 and never broadcast student names alongside medical complaints. Second, doctor workstation queues are isolated via signed JWTs, ensuring medical staff only see patients assigned to their room. Third, any appointment modification requires an SMS OTP challenge to prevent identity tampering."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: All patient telephone numbers are sanitized through our backend normalizePhone utility and masked in public DTO serializers.
    </div>
  </div>

  <!-- Q6 -->
  <div class="qa-card">
    <div class="qa-q">Q6: Why did you choose React 19 and Node 24 rather than a traditional monolithic framework like Django or Laravel?</div>
    <div class="qa-resp">Designated Respondent: Eddie (Blessing) / Able Kafu Azanda</div>
    <div class="qa-ans">
      "We chose React 19 and Node 24 for two critical reasons: real-time event concurrency and cross-device hardware heterogeneity. The clinic environment requires four distinct simultaneous user interfaces: a lightweight mobile PWA for students, high-density desktop dashboards for receptionists, public TV corridor displays, and physician consultation tablets. An asynchronous Node REST API enables lightweight event polling and sub-300ms response times while decoupling client rendering entirely."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Node 24 V8 performance and connection pooling absorbs morning concurrency spikes with sub-280ms latency.
    </div>
  </div>

  <!-- Q7 -->
  <div class="qa-card">
    <div class="qa-q">Q7: How will KNUST University Health Services transition from physical folders without disrupting ongoing clinic operations?</div>
    <div class="qa-resp">Designated Respondent: Ella (Emmanuella) / Eddie (Blessing)</div>
    <div class="qa-ans">
      "We designed YɛnCare for a phased, parallel-run transition. During Phase 1, YɛnCare handles outpatient appointment scheduling and virtual queuing, while physical folders remain as medical archives. Triage staff use the YɛnCare roster to pre-pull folders 30 minutes before appointment times, eliminating the morning folder retrieval bottleneck. In Phase 2, direct electronic health record and AIS integration completes the paperless transition."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Documented in docs/operations/handover_guide.md with phased rollout runbooks.
    </div>
  </div>

  <!-- Q8 -->
  <div class="qa-card">
    <div class="qa-q">Q8: Can students game the system by booking fake appointments or booking slots on behalf of their friends?</div>
    <div class="qa-resp">Designated Respondent: Sterling Awuley / Able Kafu Azanda</div>
    <div class="qa-ans">
      "No. First, booking requires a verified 8-digit KNUST student index number that is validated against campus enrollment records. Second, our anti-hoarding rule caps every index at exactly two concurrent active bookings. Third, booking and arrival notifications require the student's registered mobile number, and cancellation requires an SMS OTP. If a student fails to show up twice, their index is flagged for reception-only booking."
    </div>
    <div class="qa-tech">
      🔧 Technical Backup: Tested in studentVerification.test.js and bookAppointmentHardening.test.js.
    </div>
  </div>

</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm'
    }
  });
  await browser.close();
  console.log(`Teleprompter PDF saved successfully to: ${outputPath}`);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
