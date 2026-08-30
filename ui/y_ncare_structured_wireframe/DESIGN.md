---
name: YɛnCare Structured Wireframe
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
  surface-border: '#000000'
  surface-low: '#F2F2F2'
  surface-high: '#FFFFFF'
  error-text: '#000000'
  placeholder: '#999999'
typography:
  queue-hero:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  reference-code:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.1em
spacing:
  base: 8px
  gutter-mobile: 16px
  gutter-desktop: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  max-width-form: 560px
---

## Brand & Style
The design system for the product is built on a **Clinical Minimalism** philosophy. It prioritizes information architecture and structural hierarchy over decorative elements, catering to a diverse user base in Ghana with varying technical comfort and connectivity levels.

The style is intentionally low-fidelity and grayscale to ensure focus remains on the "one job per screen" principle. It evokes a sense of calm, reliability, and efficiency through:
- **High Contrast:** Ensuring legibility in high-glare environments.
- **Structural Brutalism:** Utilizing clear borders and distinct containers to separate the "Appointment Reference" from secondary actions.
- **Utilitarian Aesthetic:** Avoiding stock photography or complex gradients in favor of clear status labels and systematic spacing.

The emotional response should be one of "clarity under pressure"—the patient knows exactly where they are in the queue, and the staff can process check-ins with minimal cognitive load.

## Colors
The palette is strictly monochromatic to maintain a wireframe-first approach.
- **Primary:** Pure black is used for text, primary CTAs, and structural borders to ensure maximum contrast (WCAG 2.2 AA).
- **Secondary:** Mid-grays are reserved for secondary information and supporting text like the "rough guide" wait time disclaimers.
- **Neutral:** White and light grays define the surface tiers. 

**Status Communication:** Since this is a clinical UI, status is communicated through a combination of **text labels + icons/shapes** rather than color alone. For example, a "Cancelled" status uses a strike-through or a specific icon alongside the text.

## Typography
**Hanken Grotesk** is selected for its sharp, contemporary, and highly legible characteristics. It provides a professional, "modern-clinical" feel that remains readable on low-resolution mobile screens.

- **Queue Hero:** Specifically for the patient's queue position. It must be the largest element on the page, answering "Where am I?" instantly.
- **Reference Code:** Uses increased letter spacing to ensure the appointment ID is easy to read when showing the phone to a receptionist.
- **Labels:** Used for form field headers and status badges. All form labels must remain visible at all times (no placeholder-only labels).

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model:
- **Patient Mobile:** A single-column fluid layout with 20px side margins. Buttons are full-width to provide a large touch target (min 44px).
- **Staff Desktop:** A fixed sidebar (240px) with a fluid content area. Data tables reflow into cards when the viewport drops below 768px.
- **Form Containers:** On desktop, patient-facing forms are restricted to a max-width of 560px to prevent eye strain and maintain a clinical focus.

Spacing follows an 8px rhythm. Larger gaps (32px-48px) are used to isolate the "Appointment Reference" and "Queue Number" as the most important visual objects on their respective screens.

## Elevation & Depth
This system avoids shadows and blurs to maintain a "wireframe" feel and ensure high performance on low-end devices. 
- **Bold Borders:** All structural containers, buttons, and input fields use a solid 1px or 2px black border.
- **Tonal Layers:** Depth is achieved through "Surface Tiers." The background is white (`#FFFFFF`), while secondary containers (like doctor cards or table headers) use a light gray (`#F2F2F2`) to create separation without needing drop shadows.
- **Focus States:** High-contrast 2px borders are used to indicate active inputs or keyboard navigation focus.

## Shapes
The shape language is strictly **Sharp (0px)**. 
Using square corners reinforces the clinical, structured nature of a medical appointment system and aligns with a "wireframe-first" aesthetic. It emphasizes the "no-nonsense" functional requirement of the MVP. All components—from primary CTAs to status badges—will utilize these hard edges.

## Components

### Buttons
- **Primary:** Solid black background with white text. High-impact.
- **Secondary:** White background with a 1px black border.
- **Destructive:** White background with a 2px black border and a leading "X" icon.
- **Loading State:** Replace text with "Booking..." or "Searching..." and disable interaction. No complex spinners; use simple text-based indicators.

### Input Fields
- **Default:** 1px black border with a visible label above the field.
- **Error:** 2px black border with supporting error text directly below the field.
- **Phone Input:** Includes a fixed prefix (+233) to streamline the Ghana-specific phone entry.

### Status Badges
- **Style:** Rectangular boxes with 1px borders.
- **Indicators:** Must include an icon (e.g., Checkmark for Checked In, Clock for Waiting) to ensure accessibility for users with color-vision deficiencies.

### Appointment & Queue Cards
- **Patient View:** The queue position is a centered, oversized number. 
- **Staff View:** Compact horizontal rows for tables, emphasizing the "Check-in" or "Call" action as the primary click target.

### Feedback & Alerts
- **Toasts:** Simple black bars at the bottom of the screen for confirmations (e.g., "Ama Mensah is checked in").
- **Empty States:** Clear, centered text (e.g., "No patients in the queue") to prevent user confusion during low-activity periods.