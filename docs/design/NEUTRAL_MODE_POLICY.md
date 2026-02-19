# Design Policy: Neutral Mode (Phase 0)

**Status:** ACTIVE
**Enforcement:** Policy-Guard & UI-Builder

## Core Philosophy

"Structure over Style."
The UI must remain functional, accessible, and ready for future theming, but strictly devoid of brand or status colors until Phase 1.

## Rules

### 1. Color Palette

* **Allowed:**
  * `white` (and opacity variations e.g., `white/10`, `white/90`)
  * `black` / `slate-950` (APP_BACKGROUND only)
  * `transparent`
  * `currentColor`
* **Forbidden:**
  * All named colors (`red-500`, `blue-600`, `emerald-400`, etc.)
  * `gray-*` / `slate-*` (Except for background/body text base, avoid explicit grays in components, use opacity instead).

### 2. Typographic Hierarchy

* **Headings:** `text-white` (High emphasis)
* **Body:** `text-white/90` (Default reading)
* **Secondary/Meta:** `text-white/60` (Low emphasis)
* **Disabled:** `text-white/40` or `opacity-50`

### 3. Backgrounds & Surfaces

* **App Background:** `bg-slate-950` (or purely black)
* **Cards/Panels:** `bg-white/5` (Subtle depth) or `bg-transparent`
* **Interactive (Hover):** `hover:bg-white/10`
* **Gradients:** **FORBIDDEN**. Use flat fills only.

### 4. Borders & Dividers

* **Standard Border:** `border-white/10` (Subtle)
* **Active/Focus Border:** `border-white/20` (Slightly brighter)
* **Width:** 1px only (`border`, `border-b`, etc.)

### 5. Status Indication

* **Method:** Text label + Font Weight.
* **Forbidden:** Red/Green/Yellow dots or text.
* **Example:**
  * *Correct:* `font-bold text-white` (High Risk)
  * *Incorrect:* `text-red-500` (High Risk)

## Exception Process

Any deviation requires a logged exception approved by Policy-Guard.
