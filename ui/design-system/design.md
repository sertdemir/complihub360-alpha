# CompliHub360 Design System (for Stitch Generation)

> **Role & Context for Stitch:**
> Whenever you (Stitch) are asked to generate screens or components for the "CompliHub360" project, read and strictly apply the design primitives mapped out in this document. 

## 1. Design Philosophy
- **Aesthetic:** "Premium Compliance OS" - clean lines, structured grids, high contrast. Confident, modern, and highly professional.
- **Vibe:** Trustworthy, precise, global, authoritative but not alarmist.
- **Structure:** Function over decoration. Use layout and spacing to create hierarchy, not just colors.

## 2. Typography
- **Primary Font Family:** `Inter` (sans-serif)
- **Hierarchy & Scale:**
  - **H1 (Hero):** 48px - 64px, Bold, tracking-tight.
  - **H2 (Section):** 36px, Semi-bold.
  - **H3 (Card Title):** 24px, Semi-bold.
  - **Body Large:** 18px, Regular (for subtitles/lead text).
  - **Body Default:** 16px, Regular.
  - **Caption/Labels:** 12px, Medium, uppercase tracking-wide (for structural tags/metadata).

## 3. Color Palette
### Primary (Brand & Structure)
- **Deep Forest Green (`#004D40`):** Use for primary headers, hero backgrounds, sticky sidebars, footer, and main structural dividers.
- **Text on Primary:** Pure White (`#FFFFFF`).

### Accent & Action
- **Gold (`#D4AF37`):** Use **strictly** for primary conversion elements (Primary CTAs, "Book appointment", "Select Plan") and highly interactive step highlights.
- **Gold Hover:** `#BCA033`.
- **Text on Accent:** Deep Forest Green (`#004D40`) or Slate 900 (`#0F172A`).

### Surface & Backgrounds
- **App Canvas:** Pure White (`#FFFFFF`) or ultra-light gray (`#F8FAFC`).
- **Card/Feature Surface:** Pastel Green (`#E8F5E9`). Used to distinguish cards, feature blocks, and secondary content areas without heavy borders.
- **Dark Mode Surface:** If rendering a dark widget (like the Risk Snapshot), use Deep Forest Green (`#004D40`) as the background.

### Text (Foreground)
- **Primary Text:** Dark Slate (`#0F172A`) for max contrast on light backgrounds.
- **Secondary Text:** Medium Slate (`#475569`) for descriptions and sub-bullets.
- **Muted/Placeholder Text:** Light Slate (`#94A3B8`).

### Semantic / Feedback
Use sparingly for compliance statuses:
- **Success / Clear:** `#10B981` (Emerald)
- **Warning / Review:** `#F59E0B` (Amber)
- **Error / High Risk:** `#EF4444` (Rose)

## 4. Spacing, Layout & Grid
- **Base Unit:** 4px
- **Scale:** `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px), `2xl` (48px), `3xl` (64px).
- **Layout Grid:** 12-column web grid. Container max-width usually 1280px or 1440px. 
- **Internal Padding:** Use generous internal padding on cards (e.g., 24px or 32px) to let content breathe.

## 5. Borders & Corner Radius
- **Border Radius (Main):** `8px` (`ROUND_EIGHT`) for buttons, standard cards, and input fields to keep it sharp but modern.
- **Border Radius (Large Panels):** `12px` or `16px` for massive structural blocks (e.g., the Stepper section background).
- **Border Width:** 1px for structural borders.
- **Border Colors:** 
  - Standard Light Mode: `#E5E7EB` (Gray 200).
  - Interactive/Brand Cards: `#A5D6A7` (Soft Green).
  - Dark Mode (on Forest Green): `rgba(255, 255, 255, 0.15)`.

## 6. Shadows & Elevation
- **Card Default (Rest):** Flat. Rely on the Pastel Green surface (`#E8F5E9`) or a 1px border (`#E5E7EB`) to separate from the canvas. Do not use generic, heavy drop shadows.
- **Hover/Interactive Elevation:** Crisp, subtle shadow to indicate clickability: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`.
- **Modals / Sticky Widgets (High Elevation):** Floating shadow `0 10px 15px -3px rgba(0, 0, 0, 0.1)`.

## 7. Component Blueprints
- **Primary Button:** Background Gold (`#D4AF37`), Text Forest Green/Black. Radius 8px. Font-weight: Semi-bold. Padding: `12px` top/bottom, `24px` left/right.
- **Secondary Button:** Outline only. Border 1px Forest Green (`#004D40`), Text Forest Green. Background transparent.
- **Tags/Badges:** Small, radius 4px, height 24px. Used to tag domains ("VAT", "GDPR"). Background `#E8F5E9`, Text Deep Forest Green (`#004D40`).
- **Inputs:** White background, 1px border `#E5E7EB`, focus ring Gold (`#D4AF37`) or Forest Green (`#004D40`).
- **Data Visualizations:** Progress bars and gauges should use Gold or Emerald green to indicate completion/status against the Deep Forest Green backgrounds.
