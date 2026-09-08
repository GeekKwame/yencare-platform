# YɛnCare UI & Design Hub

This directory contains the user interface assets, architecture specifications, design reference frames, and the working prototype for the YɛnCare platform.

---

## Directory Organization

```
ui/
├── prototype/          # Active React 19 + TypeScript + Vite interactive web application
├── wireframe/          # Stitch UI export reference frames (HTML & PNG visual guides)
└── docs/               # Product specifications, UX architecture & design tokens
```

---

## Subdirectory Details

### 1. [`prototype/`](./prototype) — Interactive Web Application
- Production-refined frontend built with **React 19**, **TypeScript**, **Vite 8**, and **TailwindCSS v4**.
- Configured specifically for **KNUST University Health Services · Students' Clinic**.
- Contains both the **Patient Web Experience** (6-step booking, appointment tracking, virtual queue) and the **Staff Clinical Operations Portal** (reception check-in, multi-room consultations, walk-in management, no-show workflows).
- Run locally with `npm run dev` from the repository root or inside `ui/prototype`.

### 2. [`wireframe/`](./wireframe) — Visual Design Reference Frames
- Stitch UI export frames and visual mocks representing initial mobile and desktop layouts.
- Includes both mobile web and desktop workstation visual references.
- Visual guide only — not for direct production deployment.

### 3. [`docs/`](./docs) — Product & Design Specifications
- **`YENCARE_UX_ARCHITECTURE_SPEC.md`**: Complete end-to-end user journeys and state machine specifications.
- **`ARCHITECTURE.md`**: Technical architecture, clinical workflow rules, and Gate 2 `/api/patients` contract. Backend details: [`../backend/README.md`](../backend/README.md).
- **`STITCH_DESIGN_LOCK.md`**: Core design tokens, typography, and Clinical Brutalism styling rules.
- **`FIGMA_AGENT_MASTER_PROMPT.md`**: Component-by-component prompt specifications.
- Presentation decks and product gate scope sheets.
