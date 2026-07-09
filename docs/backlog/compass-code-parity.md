# Compass ↔ Code — Parity Audit

> Verified against LIVE Compass metadata 2026-06-06 (file a4BeKbsBGoHkcudhKXUJTl, active Figma tab).
> This is the authoritative Phase-2 reconciliation worklist. Two-part audit (A = Accordion…Cards, B = Tooltip…Logo).

# Compass ↔ Code Design-System Parity Audit (Batch A)

Reconciliation worklist comparing the **Compass** Figma design system (file key `a4BeKbsBGoHkcudhKXUJTl`) against the React code DS at
`apps/vs1-demo/ui/src/components/ui/*.tsx`.

Audited pages: Accordion, Alert, AppShell, Avatar, Badge, Button, Divider, Forms, Icon, Progress, Tabbar.
Each Compass **component set** is one Figma `<frame>` whose `<symbol>` children encode the variant matrix. Verdicts: ✅ exact · ⚠️ partial · ❌ missing in code.

Source of truth for Figma node-ids: `get_metadata` on each page (see Node-id map at the bottom). Code props read directly from the `.tsx` files.

---

## Parity Table

| Component (Compass) | Component-set node-id | Compass variant matrix | Code component | Verdict | Gaps |
|---|---|---|---|---|---|
| **Accordion** | `573:2` | Size (SM·MD·LG) × Style (Default·Filled·Ghost) × State (Collapsed·Expanded·Hover·Disabled) = 36; + props Title, Content, Icon Left (bool) | `Accordion.tsx` (`AccordionStyle` default/filled/ghost, `AccordionSize` sm/md/lg) | ⚠️ partial | States are interaction-driven in code (open/hover via CSS) not props — acceptable. Missing explicit **Icon Left** prop (Figma has `Icon Left` boolean for category icons). `styleVariant` naming diverges from Figma `Style`. |
| **Alert** | `445:2` | Status (Info·Success·Warning·Error) × Surface (Light·Medium·Strong·Solid) = 16; + Title, Show Title, Description, Show Description, Show Icon, Show Close | `Banner.tsx` + `Toast.tsx` | ⚠️ partial | No dedicated `Alert` component. `Banner` has Status (info/success/warning/error ✅) but only `variant` card/strip — **missing the 4-level `Surface` axis** (Light/Medium/Strong/Solid). `Toast` covers transient case. Close (`onClose`) ✅, icon ✅. Surface intensities are the main gap. |
| **AppShell** | (composite, not single set) — atoms: `Nav Item` `974:1223`, `Domain Tab` `984:56`, `Risk Dot` `983:48`, `Partner Status Badge` `1014:285`, `Availability Pill` `1014:294`, `Sidebar Group Header` `986:60`; layout symbols `Domain Bar` `991:84`, `Sidebar` `994:151`, `Sidebar — Provider` `1007:152`, `Topbar — Provider` `1010:284` | NavItem (Active), DomainTab (Active), Risk Dot (High·Med·Low·None), Partner Status Badge (Verified·Pending), Availability Pill (Available·Off) | `AppShell.tsx` (`AppShell`, `Sidebar`, `SidebarGroup`, `NavItem`, `DomainBar`, `DomainTab`) | ⚠️ partial | Core shell + NavItem + DomainTab present (active state ✅, NavItem `count`, DomainTab `dot`). **Missing: Risk Dot** (4 levels), **Partner Status Badge** (Verified/Pending), **Availability Pill** (Available/Off), and the **Provider** variants of Sidebar/Topbar. SidebarGroup ≈ Sidebar Group Header ✅. |
| **Avatar** | `482:2` | Size (XS·SM·MD·LG·XL) × Type (Image·Initials·Icon·Placeholder) × Status (None·Online·Away·Offline) = 80 | `Avatar.tsx` (`AvatarSize` xs–xl, `AvatarStatus` none/online/away/offline) | ⚠️ partial | Sizes ✅, Status ✅. **Type is implicit** (resolved by which prop is set: src→image, initials→initials, icon→icon, else placeholder) rather than an explicit `type` variant — functionally complete but not a named axis. No avatar-stack component (Figma shows it as a pattern, not a variant — OK). |
| **Badge** | `519:2` | Size (SM·MD·LG) × Style (Filled·Subtle·Outline) × Color (Brand·Neutral·Success·Warning·Error·Info) × State (Default·Disabled) = 108 | `Badge.tsx` (`BadgeSize` sm/md/lg, `BadgeAppearance` solid/soft/outline, `BadgeTone` neutral/brand/accent/success/warning/error/info) | ⚠️ partial | Size ✅. Style/appearance maps: Filled→`solid`, Subtle→`soft`, Outline→`outline` (✅ but renamed). Colors ✅ (code adds extra `accent`). **No explicit `Disabled` state** in code Badge. Naming drift: `Style`→`appearance`, `Color`→`tone`. |
| **Button** | `311:434` (Primary/Secondary/Ghost) extends into `421:x` (Success/Error/Info) — single set | Style (Primary·Secondary·Ghost·Success·Error·Info) × Size (Small·Medium·Large) × State (Default·Hover·Pressed·Focus·Disabled·Loading); + Label, Icon Left, Icon Right, Icon Only | `Button.tsx` (`ButtonVariant` primary/secondary/ghost/outline/danger, `ButtonSize` sm/md/lg) | ⚠️ partial | Sizes ✅. **Style mismatch:** code has primary/secondary/ghost/**outline**/**danger**; Figma has primary/secondary/ghost/**success**/**error**/**info**. Code `danger`≈Figma `error`; code is **missing Success & Info** styles and has an extra `outline`. **No `loading` state / Icon-Left/Right/Icon-Only props** in code Button (states like hover/focus/pressed are CSS — OK). |
| **Divider** | `531:2` | Direction (Horizontal·Vertical) × Variant (Solid·Dashed·Dotted) × Color (Default·Subtle·Strong·Brand) × Label (None·Label) = 48; + Show Label, Label Text | `Divider.tsx` (orientation horizontal/vertical, variant solid/dashed, label) | ⚠️ partial | Direction ✅, label ✅. **Missing `dotted` variant** (code only solid/dashed). **Missing the `Color` axis** entirely (Default/Subtle/Strong/Brand) — code hardcodes `border-stroke`. |
| **Forms / Text Input** | `597:2` | Size (SM·MD·LG) × Style (Outlined·Filled-BG) × State (Default·Hover·Focused·Filled·Error·Disabled) = 36; + Value, Icon Left, Icon Right | `Input.tsx` (`InputSize` sm/md/lg, `InputVariant` outlined/filled, `error`, icon slots) | ✅ exact | States are CSS/prop-driven (focus, error, disabled). Style outlined/filled ✅, sizes ✅, icon slots present. |
| **Forms / Textarea** | `598:38` | Size (SM·MD·LG) × State (Default·Hover·Focused·Filled·Error·Disabled) = 18; + Value | `Textarea.tsx` (`TextareaSize` sm/md/lg, `error`) | ✅ exact | Note: code adds an `outlined/filled` variant not in Figma (extra, harmless). |
| **Forms / Select** | `599:182`; dropdown-open `638:524`; option item `637:401` | Select: Size × Style (Outlined·Filled-BG) × State = 36. Dropdown Open: Size × Style = 6. Option Item: Size × State (Default·Hover·Selected·Disabled) = 12 | `Select.tsx` (native) + `SelectMenu.tsx` (custom listbox) | ✅ exact | Native `Select` covers the closed trigger; `SelectMenu` covers Dropdown-Open + Option-Item (states default/hover/selected/disabled). Both sizes/styles present. |
| **Forms / Checkbox** | `600:137` | Size (SM·MD·LG) × Type (Without Label·With Label) × State (Unchecked·Checked·Indeterminate·Error·Disabled) = 30 | `Checkbox.tsx` (`CheckboxSize` sm/md/lg, label, indeterminate, error) | ✅ exact | With/Without Label = label prop optional. Indeterminate ✅, error ✅. |
| **Forms / Radio** | `602:137` | Size × Type (Without/With Label) × State (Unselected·Selected·Hover·Error·Disabled) = 30 | `Radio.tsx` (`RadioSize` sm/md/lg, label, error) | ✅ exact | States hover via CSS. |
| **Forms / Toggle** | `603:155` | Size × Type (Without/With Label) × State (Off·On·Hover·Error·Disabled) = 30 | `Toggle.tsx` (`ToggleSize` sm/md/lg, label, error) | ✅ exact | |
| **Forms / Form Label** | `604:80` | Size (SM·MD·LG) × Type (Default·Required·Optional·Disabled) = 12 | `FormField.tsx → FormLabel` (`size`, `required`, `optional`, `disabled`) | ✅ exact | |
| **Forms / Form Field** | `605:419` | Size (SM·MD·LG) × Type (Text·Select) × State (Default·Focused·Filled·Error·Disabled) = 30; + Label, Value, Helper Text | `FormField.tsx → FormField` (`size`, label, helper/error) | ✅ exact | Composes Label+control+helper. Text/Select handled by the child control passed in. |
| **Icon** | `357:2` | Name (69 named glyphs: chevrons, arrows, x, menu, check, shield, file, user, chart-*, …) × Color (Default·Brand·Accent·Success·Warning·Error·Info·Inverse·Disabled) | `Icon.tsx` (wraps any lucide glyph; `IconSize` xs/sm/md/lg, `IconTone` default/secondary/tertiary/brand) | ⚠️ partial | Code is a generic lucide wrapper (any glyph allowed — superset of the 69 names ✅). **Color axis mismatch:** Figma tones = default/brand/accent/success/warning/error/info/inverse/disabled (9); code `IconTone` = default/secondary/tertiary/brand (4) — **missing success/warning/error/info/inverse/accent/disabled tones**. Figma component set has no Size axis; code adds sizes (extra). |
| **Progress / Progress Bar** | `538:2` | Size (SM·MD·LG) × Color (Brand·Success·Warning·Error·Info) × State (Default·Indeterminate) = 30 | `Progress.tsx → ProgressBar` (`value`, `size` sm/md/lg) | ⚠️ partial | Sizes ✅. **Missing `Color` axis** (only brand rendered) and **no Indeterminate state**. |
| **Progress / Slider** | `539:110` | Size (SM·MD·LG) × State (Default·Hover·Focused·Disabled) × Type (Single·Range) = 24 | — | ❌ missing | No `Slider.tsx` in code at all. |
| **Progress / Step Horizontal** | `541:130` | Size (XS·SM·MD·LG) × StepState (Completed·Active·Upcoming·Error·Disabled) = 20 | `Stepper.tsx` (orientation horizontal) | ⚠️ partial | Maps Completed/Active/Upcoming. **Missing `Error` and `Disabled` step states**; **no Size axis** (single size); XS not supported. |
| **Progress / Step Vertical** | `543:178` | Size (XS·SM·MD·LG) × StepState (Completed·Active·Upcoming·Error·Disabled) = 20; + Show Description, Show Connector | `Stepper.tsx` (orientation vertical) | ⚠️ partial | Same gaps as horizontal: missing Error/Disabled states, no Size axis, no `description` slot prop. |
| **Progress / Loading (Spinner)** | `544:78` | Size (SM·MD·LG·XL) × Color (Brand·Success·Warning·Error·Info) = 20 | `Progress.tsx → Spinner` (`size` as px number) | ⚠️ partial | Free-form px size (covers SM–XL). **No `Color` axis** (currentColor only — caller must style). |
| **Progress / Circle Progress** | `545:138` | Size (SM·MD·LG·XL) × Color (Brand·Success·Warning·Error·Info) = 20; + Value, sub-label | `Progress.tsx → CircleProgress` (`value`, `size`, `stroke`, `label`) | ⚠️ partial | Value + label ✅, free-form size ✅. **No `Color` axis** (single color). |
| **Progress / Pagination** | `561:310`; item `558:184` | Pagination: Size (SM·MD·LG) × Type (Numbers·Dots·Simple) = 9. Pagination Item: Size × State (Default·Active·Hover·Disabled) = 12 | `Pagination.tsx` (`page`, `totalPages`, `siblings`) | ⚠️ partial | Numbers type with ellipsis ✅, item states ✅ via CSS. **Missing `Dots` and `Simple` types**; **no Size axis**. |
| **Tabbar / Desktop Tab Item** | `609:2` | Size (SM·MD·LG) × Style (Underline·Filled·Boxed) × State (Default·Active·Hover·Disabled) = 36 | `Tabs.tsx → Tab` | ✅ exact (item-level) | States via CSS/active prop. |
| **Tabbar / Desktop Tabbar (container)** | `612:344` | Size (SM·MD·LG) × Style (Underline·Filled·Boxed) = 9 | `Tabs.tsx` (`TabsVariant` underline/filled/boxed, `TabsSize` sm/md/lg) | ✅ exact | Variant + size axes match exactly. |
| **Tabbar / Mobile Bottom Tab Item** | `622:286` | Type (Icon Only·Icon+Label·Icon+Label+Badge) × State (Default·Active·Disabled) = 9 | `BottomTabBar.tsx` | ⚠️ partial | Code component exists (`BottomTabBar.tsx`, not in Tabs.tsx). Verify it supports all 3 types incl. **Badge dot**; states active/disabled. Not deeply re-read here — flagged for prop-level check. |
| **Tabbar / Mobile Bottom Tabbar (container)** | `623:335` | Type (Icon Only·Icon+Label·Icon+Label+Badge) = 3 | `BottomTabBar.tsx` | ⚠️ partial | See above. |
| **Tabbar / Mobile Slidable Tab Item** | `613:212` | Type (Label Only·Icon+Label) × State (Default·Active·Disabled) = 6 | — | ❌ missing | No dedicated horizontally-scrollable mobile tab/filter-pill component found. (`Tabs` desktop component is not the slidable mobile pattern.) |
| **Tabbar / Mobile Slidable Tabbar (container)** | `614:261` | Type (Label Only·Icon+Label) = 2 | — | ❌ missing | Same as above. |

---

## Node-id map (component sets → node-id)

Use these to correct the `*.figma.tsx` Code Connect mappings.

```
# Accordion (page 570:2)
Accordion                     → 573:2

# Alert (page 439:2)
Alert                         → 445:2

# AppShell (page 974:2)
AppShell / Nav Item           → 974:1223
AppShell / Domain Tab         → 984:56
AppShell / Risk Dot           → 983:48
AppShell / Partner Status Badge → 1014:285
AppShell / Availability Pill  → 1014:294
AppShell / Sidebar Group Header → 986:60
AppShell / Domain Bar         → 991:84
AppShell / Sidebar            → 994:151
AppShell / Sidebar — Provider → 1007:152
AppShell / Topbar — Provider  → 1010:284

# Avatar (page 472:2)
Avatar                        → 482:2

# Badge (page 516:2)
Badge                         → 519:2

# Button (page 308:3)
Button                        → 311:434   (Success/Error/Info symbols live under 421:x in the same set)

# Divider (page 528:2)
Divider                       → 531:2

# Forms (page 595:2)
Text Input                    → 597:2
Textarea                      → 598:38
Select                        → 599:182
Select Option Item            → 637:401
Select Dropdown Open          → 638:524
Checkbox                      → 600:137
Radio Button                  → 602:137
Toggle                        → 603:155
Form Label                    → 604:80
Form Field                    → 605:419

# Icon (page 352:2)
Icon                          → 357:2

# Progress (page 536:2)
Progress Bar                  → 538:2
Slider                        → 539:110
Step Horizontal               → 541:130
Step Vertical                 → 543:178
Loading                       → 544:78
Circle Progress               → 545:138
Pagination Item               → 558:184
Pagination                    → 561:310

# Tabbar (page 607:2)
Desktop Tab Item              → 609:2
Desktop Tabbar                → 612:344
Mobile Slidable Tab Item      → 613:212
Mobile Slidable Tabbar        → 614:261
Mobile Bottom Tab Item        → 622:286
Mobile Bottom Tabbar          → 623:335
```

---

## Highest-priority gaps (action list)

1. **❌ Slider** (`539:110`) — no code component. Build (Single + Range, 3 sizes).
2. **❌ Mobile Slidable Tabbar / Tab Item** (`614:261` / `613:212`) — no scrollable filter-pill tabbar in code.
3. **⚠️ Button styles** (`311:434`) — add `success` & `info`; reconcile `danger`↔`error`, decide fate of extra `outline`.
4. **⚠️ Divider** (`531:2`) — add `dotted` variant + the 4-level `Color` axis (default/subtle/strong/brand).
5. **⚠️ Alert Surface axis** (`445:2`) — `Banner` lacks Light/Medium/Strong/Solid intensities.
6. **⚠️ Progress color axes** — ProgressBar/Spinner/CircleProgress (`538:2`/`544:78`/`545:138`) lack the 5-color status axis; ProgressBar lacks Indeterminate.
7. **⚠️ Stepper states** (`541:130`/`543:178`) — add `error` & `disabled` step states; vertical `description` slot.
8. **⚠️ Icon tones** (`357:2`) — extend `IconTone` to the 9 Compass colors (add success/warning/error/info/inverse/accent/disabled).
9. **⚠️ Pagination types** (`561:310`) — add `Dots` and `Simple` types.
10. **⚠️ AppShell atoms** (`983:48`, `1014:285`, `1014:294`) — Risk Dot, Partner Status Badge, Availability Pill, + Provider Sidebar/Topbar variants.
11. **Naming drift to reconcile in `.figma.tsx`:** Badge `Style→appearance` / `Color→tone`; Accordion `Style→styleVariant`; Input/Select/Textarea `inputSize→Size`, `variant→Style (Filled-BG)`.

_Audit basis: Figma `get_metadata` on all 11 pages (variant matrices parsed from symbol names); code props read from the listed `.tsx` files. Interaction states (hover/focus/pressed) that are CSS-driven in code rather than discrete props are treated as parity-OK, not gaps._

---

# Compass ↔ Code Design-System Parity Audit (Batch B)

Audit of parity between the **Compass** Figma design system (file key `a4BeKbsBGoHkcudhKXUJTl`) and the React code design system at `apps/vs1-demo/ui/src/components/`. Each row records the Compass component set, its node-id, the full variant matrix parsed from the symbol names, the matching code component, a verdict, and specific gaps.

Legend: ✅ exact · ⚠️ partial (gaps listed) · ❌ missing in code.

| Component | Node-id | Compass variants | Code component | Verdict | Gaps |
|---|---|---|---|---|---|
| **Tooltip** | `685:2` | Direction (Top·Right·Bottom·Left) × Size (SM·MD·LG) × Type (Default·With Title·Rich) = 36 | `Tooltip.tsx` | ⚠️ partial | Has `side` (4 dirs) ✅. Missing `Size` prop (SM/MD/LG — single fixed 12px size). Missing `Type` variants: no Title support, no Rich (title+body) — `content` is a single node only. Hover/focus only (Figma is presentational). |
| **Bento Tile** | `690:2` | Span (1x1·2x1·1x2·2x2) × Type (KPI·Stat·Visual·CTA) × State (Default·Hover) = 32 | `Bento.tsx` (`BentoTile`) | ⚠️ partial | Generic tile only. Has `colSpan`/`rowSpan` (covers spans) + `interactive` (covers Hover). Missing the 4 semantic `Type` presets (KPI/Stat/Visual/CTA) — no built-in KPI/Stat/CTA content scaffolds; CTA's inverse-bg treatment absent. |
| **Bento Grid** | `692:321` | Layout (Hero·Symmetric·Showcase·Cluster·Editorial) = 5 | `Bento.tsx` (`BentoGrid`) | ⚠️ partial | Plain CSS grid with `columns` prop + manual spans. Missing the 5 named composition templates (Hero/Symmetric/Showcase/Cluster/Editorial) — author must hand-assemble. |
| **Breadcrumb Item** | `700:2` | State (Default·Hover·Current·Disabled) × Icon (None·Leading·Home) × Size (SM·MD) = 24 | `Breadcrumb.tsx` (item rendered inline) | ⚠️ partial | No standalone item component. States: Default/Hover/Current ✅ (hover via CSS, current via last-item); **Disabled state not supported**. Icon None/Leading ✅ via `icon` prop; **no dedicated Home variant**. |
| **Breadcrumb** | `701:102` | Size (SM·MD) × Truncation (Full·Collapsed) = 4 | `Breadcrumb.tsx` (`Breadcrumb`) | ⚠️ partial | Size SM/MD ✅. **Truncation/Collapsed ("…" middle-collapse) not implemented** — always renders all items. |
| **Header (Marketing Desktop)** | `881:1063` | State (Default·Scrolled) × Theme (Light·Inverse) = 4 | `MarketingHeader.tsx` | ✅ exact | All 4 covered: scroll-spy + `scrolled` state, `theme` light/inverse. Anchor-nav (no mega-menu) matches doctrine. |
| **Header (Marketing Provider)** | `1036:1165` | State (Default·Scrolled) × Theme (Light·Inverse) = 4 | `MarketingHeader.tsx` (`audience="provider"`) | ✅ exact | Provider audience preset (anchors, CTA, cross-link) implemented; same state/theme matrix. |
| **Header Marketing Mobile** | `1057:1314` | State (Closed·Open) = 2 | `MarketingHeader.tsx` (mobile branch) | ✅ exact | Closed (logo+globe+hamburger) + Open (button row → scrollable anchor pills). Matches pill-panel doctrine. |
| **Header Marketing Provider Mobile** | `893:1161` | State (Closed·Open) = 2 | `MarketingHeader.tsx` (`audience="provider"`) | ✅ exact | Same mobile branch, provider preset. |
| **Off-Canvas Marketing** | `894:1155` (symbol) | single (Entrepreneur) | `MarketingHeader.tsx` | ❌ missing | Code uses the **pill-panel** mobile pattern only. The full-screen off-canvas alternative (section list + chevrons + bottom CTA) is **not built** (intentional per memory: pill is FINAL, off-canvas kept as Figma option). |
| **Off-Canvas Marketing Provider** | `1045:1306` (symbol) | single (Provider) | — | ❌ missing | Same — off-canvas variant not in code. |
| **Nav Item (atom)** | (in Header page; `.Nav Item` instances) | State (Default·Hover·Active·Open) × Has Dropdown (T/F) = 8 | inline `<a>` in `MarketingHeader.tsx` / `GlobalNav.tsx` | ⚠️ partial | No standalone NavItem component. Default/Hover/Active ✅ inline. **Open + Has-Dropdown (chevron) states not present** in marketing header (flat anchor nav, no dropdown). |
| **Risk Badge** ★ | `728:2` | Risk (Low·Medium·High·Critical) × Style (Solid·Soft·Outline·Dot) × Size (SM·MD·LG) = 48 | `RiskBadge.tsx` (`RiskBadge`) | ✅ exact | Full 4×4×3 matrix via `level`/`styleVariant`/`size`. Petrol-never-red doctrine honoured through `risk-*` tokens. |
| **Risk Dot** ★ | `733:10` | Risk (Low·Medium·High·Critical) = 4 | `RiskBadge.tsx` (`RiskDot`) | ✅ exact | All 4 levels; Critical gets petrol halo ring. |
| **Modal Surface** | `739:2` | Size (SM·MD·LG) × Type (Default·Confirm·Destructive·Form) × Has Header (T·F) = 24 | `Modal.tsx` | ⚠️ partial | Size SM/MD/LG ✅; Has-Header ✅ (title/desc optional). **No `Type` prop** — Default/Confirm/Form achievable by composing footer/children, but **Destructive type lacks the built-in Critical Risk-Badge header** the doctrine mandates (must be added manually). |
| **Modal Composition** | `741:773` | Size (SM·MD·LG) × Type (Default·Confirm·Destructive·Form) = 12 | `Modal.tsx` (backdrop built-in) | ⚠️ partial | Modal already includes backdrop (`bg-black/50` + blur) + centered surface, so composition is folded into one component. Type matrix gap same as Surface. Backdrop opacity ~50% vs spec 60%. |
| **Drawer Surface** | `948:449` | Size (SM·MD·Mobile) × Type (Detail·Edit·Picker·SubWizard) = 12 | `Drawer.tsx` | ⚠️ partial | Size SM/MD ✅ (+LG bonus); **Mobile size not a named variant** (responsive width only). **No `Type` prop** (Detail/Edit/Picker/SubWizard) — generic header/body/footer slots, content hand-built. Adds `side` (left/right) beyond Figma. |
| **Wizard Surface** | `751:903` | Layout (Vertical Stepper·Horizontal Stepper) × Step (1–4 of 4) = 8 | `WizardSurface.tsx` | ⚠️ partial | `stepperOrientation` vertical/horizontal ✅; step position via `current` ✅. **Petrol-Layer doctrine not implemented**: code uses light `bg-surface` shell + `surface-secondary` rail, NOT the Outer-Petrol (`bg/inverse`) → inner-white-card three-layer pattern. Title is `text-[22px]` sans, not Plex-Serif display. Error-step state depends on the Stepper primitive. |
| **Wizard Surface Mobile** | `762:1592` | Step (1–4 of 4) = 4 | — | ❌ missing | No dedicated mobile wizard (gold linear progress bar on petrol + stacked full-width buttons). `WizardSurface` only collapses its grid responsively. |
| **Empty State** | `777:2` | Type (No Data·No Results·Error·Loading·Permission Denied·Onboarding) × Size (Compact·Default) = 12 | `EmptyState.tsx` | ⚠️ partial | Size compact/default ✅. Generic icon+title+desc+action slots cover all 6 types **by composition**, but **no `type` prop / presets** — no built-in per-type icon containers (e.g. Onboarding gold accent, Error petrol-critical container, Loading refresh). |
| **Table Cell** | `788:2` | Type (Text·Bold·Number·Date·Risk·Avatar+Text·Status·Actions) × Size (Compact·Default) = 16 | `Table.tsx` (`TD`) | ⚠️ partial | `TD` supports `numeric` (Number/Date right-align + tabular) and `bold` (Bold), density via context (Compact/Default) ✅. Risk/Avatar+Text/Status/Actions are **content composed by the caller**, not cell-type presets. |
| **Table Header Cell** | `794:2` | State (Default·Sortable·Sorted ASC·Sorted DESC) × Size (Compact·Default) = 8 | `Table.tsx` (`TH`) | ✅ exact | `sort` undefined/false/'asc'/'desc' maps to all 4 states with petrol-accent sort icon; density via context. `aria-sort` set. |
| **Table Row** | `796:2` | State (Default·Hover·Selected·Disabled) × Density (Compact·Default) = 8 | `Table.tsx` (`TR`) | ⚠️ partial | Default/Hover/Selected ✅ (`selected` → brand-light). Density via context ✅. **Disabled row state (50% opacity) not exposed** as a prop. |
| **Table** | `801:648` | Layout (Standard·Striped·Card-wrapped) = 3 | `Table.tsx` (`Table`) | ⚠️ partial | Standard + Striped ✅ (`striped` prop). **Card-wrapped is effectively the default** (always wrapped in `rounded-lg border`); there is no plain "Standard (no border)" vs Card-wrapped distinction — the three layouts collapse to two behaviours. |
| **Table Mobile Card** | `804:504` | State (Default·Selected) = 2 | — | ❌ missing | Mobile stacked-card strategy (label/value pairs per row) not implemented. Code Table relies on `overflow-x-auto` horizontal scroll on mobile — contradicts the Compass doctrine ("Mobile gibt es nicht als Tabelle"). |
| **Mobile Sort Bar** | `805:508` | Active (Name·Risk·Owner·Due) = 4 | — | ❌ missing | No mobile sort-bar control. |
| **Stat** | `1112:2` | Size (SM·MD·LG) × Trend (Up·Down·Neutral) = 9 | `Stat.tsx` | ⚠️ partial | Size SM/MD/LG ✅; Trend up/down/neutral ✅. **Doctrine drift**: trend uses green/red (`success-700` / `error-700`) — fine for a neutral KPI, but note Stat is explicitly NOT risk; acceptable. Eyebrow+value+trend anatomy matches. Minor: value sizes are code-author chosen, not token-locked. |
| **Logo** | `712:266` | Lockup (Horizontal·Stacked·Symbol-Only) × Color (On Light·On Petrol·Mono White·Mono Black) = 12 | `Logo.tsx` | ✅ exact | All 3 lockups (`horizontal`/`stacked`/`mark`) × all 4 tones (`on-light`/`on-petrol`/`mono-white`/`mono-black`). Exact exported vector geometry; Inter Bold 16 wordmark + Inter Regular 10 gold tagline per spec. |

## Summary by verdict

- ✅ **exact (9):** Marketing Desktop/Provider/Mobile/Provider-Mobile Headers, Risk Badge, Risk Dot, Table Header Cell, Logo.
- ⚠️ **partial (14):** Tooltip, Bento Tile, Bento Grid, Breadcrumb Item, Breadcrumb, Nav Item, Modal Surface, Modal Composition, Drawer Surface, Wizard Surface, Empty State, Table Cell, Table Row, Table, Stat.
- ❌ **missing (6):** Off-Canvas Marketing (×2), Wizard Surface Mobile, Table Mobile Card, Mobile Sort Bar; Nav-Item dropdown/open states.

### Highest-impact gaps
1. **Wizard Petrol-Layer doctrine** — the code WizardSurface is a light card, not the brand-defining three-layer petrol pattern; plus no mobile variant.
2. **Mobile Table strategy** — code falls back to horizontal scroll; Compass mandates stacked cards + sort bar (entirely missing).
3. **Semantic "Type" presets missing across Modal / Drawer / Empty State / Bento Tile** — code provides generic slot components; the doctrine-encoded presets (Destructive modal with Critical Risk-Badge, Onboarding empty-state gold accent, Bento KPI/CTA) must be hand-assembled.
4. **Breadcrumb truncation** and **Table disabled row** are unimplemented states.

## Node-id map (component sets)

```
Tooltip                        → 685:2
Bento Tile                     → 690:2
Bento Grid                     → 692:321
Breadcrumb Item                → 700:2
Breadcrumb                     → 701:102
Header Marketing Desktop       → 881:1063
Header Marketing Provider      → 1036:1165
Header Marketing Mobile        → 1057:1314
Header Marketing Provider Mobile → 893:1161
Off-Canvas Marketing           → 894:1155
Off-Canvas Marketing Provider  → 1045:1306
Risk Badge                     → 728:2
Risk Dot                       → 733:10
Modal Surface                  → 739:2
Modal Composition              → 741:773
Drawer Surface                 → 948:449
Wizard Surface                 → 751:903
Wizard Surface Mobile          → 762:1592
Empty State                    → 777:2
Table Cell                     → 788:2
Table Header Cell              → 794:2
Table Row                      → 796:2
Table                          → 801:648
Table Mobile Card              → 804:504
Mobile Sort Bar                → 805:508
Stat                           → 1112:2
Logo                           → 712:266
```

### Page node-ids (audited)

```
💬 Tooltip      → 683:2
🍱 Bento        → 688:2
🍞 Breadcrumb   → 698:2
🎩 Header       → 704:2
⚠️ Risk Badge   → 726:2
🪟 Modal        → 737:2
🪟 Drawer       → 948:2
🧙 Wizard       → 744:2
🫥 Empty State  → 775:2
📊 Table        → 786:2
📈 Stat         → 1100:2
🪪 Logo         → 242:199
```

_Audited 2026-06-06. No code or Figma was modified._

---

## Reconciliation status — 2026-06-06 (Phase 2 execution)

**Done:**
- ✅ **All 10 ❌-missing components built** (light+dark, Storybook, screenshot-verified): Slider, KPI Circle Card, Search Result Card, Mobile Slidable Tabbar, Table Mobile Card, Mobile Sort Bar — plus earlier Phase 3/4: Skeleton, Icon, Toast, DataTable, Charts, DatePicker, Combobox, FileUpload, Recommended/Alternative cards, EngagementTimeline, DashboardSection, RiskMap, VerifiedPartnerBadge.
- ✅ **~26 ⚠️ variant-axes extended (additive)**: Button success/info/loading/icons · Divider dotted+color · Tooltip size+title · Icon 9 tones · Pagination dots/simple · Banner Surface(Light/Medium/Strong/Solid) · ProgressBar color+indeterminate · Stepper error/disabled+size · Card styleVariant(outlined/filled/elevated)+disabled · KPICard loading · EntityCard unread · Bento cta-tone + hero/symmetric layouts · Accordion iconLeft.
- ✅ **Wizard Petrol-Layer doctrine** implemented (dark petrol shell + topbar + stepper rail → light inner card w/ Plex-Serif headline) + responsive mobile (gold progress + stacked full-width buttons).
- ✅ **All 31 *.figma.tsx reconciled** to real Compass node-ids + variant property names; all `TODO(node-id)` removed; `figma connect parse` exit 0 (36 docs).
- ✅ Taxonomy unified (Foundations/Atoms/Molecules/Organisms); 62 components / 65 stories; tsc green (apart from 2 pre-existing unrelated errors).

**Remaining (gated / large follow-ons):**
- ⛔ `figma connect publish` — CLI v1.4.2 present but **FIGMA_ACCESS_TOKEN not set**; publishing also needs explicit go-ahead (modifies the Figma file). User/CI step.
- ⛔ **Compass dark-mode variants in Figma** — code ships light+dark; building the dark variants *inside* the Compass Figma file is a separate large Figma-write effort.
- ◻️ **Code Connect for the ~20 new components** (Slider, KPICircleCard, …) — not yet created (existing 31 done first).
- ◻️ **tokens.json** doc-mirror sync (non-blocking).
