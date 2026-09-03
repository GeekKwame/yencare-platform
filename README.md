# YɛnCare — Production Healthcare Platform

> **Healthcare access, wherever you are. Ghana.**  
> Outpatient clinic appointment scheduling and live virtual queue management.

---

## Overview

**YɛnCare** is an outpatient healthcare platform designed for partner clinics and regional healthcare facilities in Ghana. It replaces crowded, unpredictable hospital waiting rooms with structured appointment scheduling, speakable booking references (`YC-4821`), and real-time live queue tracking.

### Core Value Propositions
- **No Password Barrier**: Patients book with just their Full Name and Ghana phone number (`+233`), and manage bookings via phone + speakable reference code.
- **Speakable Reference Codes**: Easy-to-read, memorable reference codes (`YC-4821`) designed for oral communication at reception desks.
- **Live Queue Visibility**: Patients see their live queue position (`#4`), estimated wait time (`25–35 min`), and a transparent 5-stage lifecycle tracker (`Booked` &rarr; `Checked in` &rarr; `Waiting` &rarr; `Called` &rarr; `Completed`).
- **Unified Clinical Operations**: Reception check-in, doctor consultation management, and waiting corridor queue management in a single operational dashboard.
- **Clinical Brutalism Identity**: High-contrast, structured editorial minimalism featuring a calm healthcare palette (`#111111`, `#F7F8F7`, `#087F6C`, `#E7F5F1`), crisp typography, and accessible design.

---

## Repository Structure

```
yencare-platform/
├── package.json              # Root proxy scripts (npm run dev, npm run build)
├── README.md                 # Project executive overview & developer guide
│
├── docs/                     # Product, UX, and Architecture specifications
│   ├── ARCHITECTURE.md       # Full technical architecture & state machine specification
│   ├── STITCH_DESIGN_LOCK.md # Product lock & canonical wireframe decisions
│   ├── YENCARE_UX_ARCHITECTURE_SPEC.md # Full UX journey specifications
│   ├── FIGMA_AGENT_MASTER_PROMPT.md    # Design system instructions
│   ├── YenCare_Product4_ScopeSheet_Gate1.docx
│   └── YenCare_Week1_Pitch.pdf
│
├── figma-code/               # Active React 19 + TypeScript + Vite Web Application
│   ├── package.json          # Web app dependencies & build scripts
│   ├── README.md             # Web client developer documentation
│   ├── vite.config.ts        # Vite + Tailwind v4 configuration
│   ├── tsconfig.json         # TypeScript compiler configuration
│   ├── index.html            # HTML entry point (Hanken Grotesk & Material Symbols)
│   └── src/
│       ├── App.tsx           # Shell router (Patient Web vs Staff Portal)
│       ├── index.css         # Clinical Brutalism design system tokens & theme
│       ├── main.tsx          # Application mount
│       ├── context/          # Global state machine (ClinicContext)
│       ├── types/            # TypeScript data models & enums
│       └── components/
│           ├── common/       # Common design system components (Button, Badge, etc.)
│           ├── patient/      # Patient experience screens (P01–P18)
│           ├── staff/        # Staff clinical operations portal (S01–S07)
│           └── edge/         # Edge recovery screens (G01 Network Error)
│
└── ui/                       # Stitch raw UI export reference frames (HTML & PNGs)
    └── README.md             # Wireframe reference guide
```

---

## Quickstart Guide

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Running the Application

You can start the web client directly from the repository root:

```bash
# 1. Install dependencies
cd figma-code
npm install
cd ..

# 2. Start the local development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### Available Root Commands

| Command | Action |
|---|---|
| `npm run dev` | Launch local Vite dev server with Hot Module Replacement |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run preview`| Preview the production build locally |
| `npm run format` | Format code using `oxfmt` |

---

## Application Architecture

YɛnCare is organized into two primary user shells:

### 1. Patient Web Experience (`Shell 1`)
- **P01 Home Dashboard**: Clean healthcare landing container with primary CTAs (*Book appointment*, *Find appointment*) and dedicated queue status card.
- **P02 Your Details**: Simple two-field form (Full Name + Ghana Phone Number with `+233` tag).
- **P03 Choose Doctor**: Attending clinician selection (`Dr. Kwame Boateng · General Clinic`).
- **P04/P05 Date & Time**: Combined date calendar and 30-minute consultation slot selector.
- **P06 Review Booking**: Key-value summary table and SMS advisory before submission.
- **P07 Booking Confirmed**: Reassuring confirmation state with speakable reference code **`YC-4821`** and copy feedback.
- **P08 Slot Taken**: Conflict recovery screen suggesting alternative available slots.
- **P09 Find Appointment**: Lookup appointment by phone number and reference code.
- **P11 Appointment Details**: Patient management hub with status badge and actions to reschedule or cancel.
- **P12/P13 Cancel Flow**: Confirmation dialog and cancellation confirmation view.
- **P14–P17 Reschedule Flow**: 3-step date & time selection, comparison review, and updated confirmation.
- **P18 Live Queue Status**: 5-stage lifecycle stepper (`Booked` &rarr; `Checked in` &rarr; `Waiting` &rarr; `Called` &rarr; `Completed`), prominent `#4` queue token, and estimated wait time guide.

### 2. Staff Clinical Operations Portal (`Shell 2`)
- **S01 Sign In**: Clinic workstation login with instant 1-click demo role switching (`Receptionist`, `Doctor`, `Admin`).
- **S02 Today Operations**: Real-time operational dashboard with metrics (Total Booked, Waiting, In Consultation, Completed) and patient overview.
- **S03 Appointments Roster**: Searchable table with status filters and distinct teal **Check In** buttons.
- **S04 Patient Detail**: Clinical check-in record and patient dossier.
- **S05 Live Queue**: Split-view queue board showing currently called patient in Room 3 and waiting corridor table with one-click **Call** buttons.
- **S05 Empty Queue**: Clean empty state when no patients are in the waiting corridor.
- **S07 Session Expired**: Security timeout dialog with re-authentication.

---

## Interactive Prototype Scenario Simulator

To assist evaluators, clinics, and investors, the application includes a non-intrusive floating **Prototype Scenario Simulator** docked at the bottom-right corner of the screen:

- **Quick Progression**: Advance the canonical patient (**Ama Mensah · `YC-4821`**) through the complete clinical journey in 1 click:
  - `Check In Ama (#4)` &rarr; moves Ama to `WAITING` queue position #4.
  - `Call Ama (Room 3)` &rarr; triggers active call notification to Room 3.
  - `Complete Visit` &rarr; concludes the consultation.
- **All Screens Drawer**: Instant access to jump to any patient screen (P01–P18), staff screen (S01–S07), or edge state.
- **Edge Scenario Toggles**:
  - `G01 Network Error`: Test offline connection loss & retry recovery.
  - `P08 Slot Conflict`: Test slot clash recovery when another patient takes the selected time.
  - `S07 Session Expired`: Test clinical security timeout.
- **Role Switcher**: Switch active staff profile between Receptionist (`Abena Osei`), Doctor (`Dr. Kwame Boateng`), and Admin (`Kojo Mensah`).
- **Reset Demo**: Reset all mock data to the default clinic state anytime.

---

## Design System & Tokens

YɛnCare follows **Clinical Brutalism & High-Contrast Minimalism**:

### Palette
- **Primary / Action Text**: `#111111`
- **Healthcare Background**: `#F7F8F7`
- **Surface**: `#FFFFFF`
- **Secondary Surface**: `#F0F2F1`
- **Borders**: `#D8DCD9` (1px for cards/inputs, 2px for featured containers)
- **Healthcare Accent**: `#087F6C` (Clinical teal)
- **Soft Accent**: `#E7F5F1` (Used for active navigation, confirmation states, and status badges)
- **Warning**: `#B7791F` / `#FEF7ED`
- **Error**: `#C53030` / `#FDF2F2`

### Typography
- **Primary Font**: `Hanken Grotesk` (via Google Fonts)
- **Scale**: Display (`44–64px` mono for tokens/codes), Page Heading (`28–32px`), Section Heading (`20–22px`), Body (`15–16px`), Labels/Badges (`11–12px` uppercase).

---

## Documentation Links

- Detailed technical architecture: [`docs/ARCHITECTURE.md`](file:///c:/Users/eddie/OneDrive/Documents/projects/yencare-platform/docs/ARCHITECTURE.md)
- Product design lock decisions: [`docs/STITCH_DESIGN_LOCK.md`](file:///c:/Users/eddie/OneDrive/Documents/projects/yencare-platform/docs/STITCH_DESIGN_LOCK.md)
- UX architecture specifications: [`docs/YENCARE_UX_ARCHITECTURE_SPEC.md`](file:///c:/Users/eddie/OneDrive/Documents/projects/yencare-platform/docs/YENCARE_UX_ARCHITECTURE_SPEC.md)
- Frontend client guide: [`figma-code/README.md`](file:///c:/Users/eddie/OneDrive/Documents/projects/yencare-platform/figma-code/README.md)