---
id: TKT-UI-20
title: Stitch Wizard Screens — Alle Wizard-Flows als Stitch-Designs erstellt
status: done
priority: high
created: 2026-03-10
agent: Task-Master → UI-Master
---

## Objective

Alle Wizard-Screens aller Kategorien in Stitch erstellen. Als Design- und Layout-Referenz dient der bestehende Stitch-Screen „Wizard Step 1: Market Scope" (ID: `70f7dc530cf04a6e9b624cdfe53f5138`). Der globale Header und Footer soll — im Gegensatz zur Referenz — auf allen Screens immer sichtbar sein.

## Acceptance Criteria

- [x] Data Privacy & GDPR — 4 Steps erstellt
- [x] EPR & Product Obligations — 4 Steps erstellt
- [x] Tax & VAT — 4 Steps erstellt
- [x] Marketing & Advertising — 4 Steps erstellt
- [x] Corporate Structure — 4 Steps erstellt
- [x] Full Compliance Support — 4 Steps erstellt
- [x] Globaler Header immer sichtbar (CompliHub360 Logo + Nav)
- [x] Globaler Footer immer sichtbar
- [x] Design-System konsistent: dark navy `#0f172a`, Cyan `#06b6d4`, Inter, Glassmorphism
- [x] Zwei-Spalten-Layout: linke Sidebar (Kategorie-Titel + Vertical Stepper) + rechter Content
- [x] Kontextuelle Alerts: grün (Erfolg), blau (Info), amber (Warnung), rot (Kritisch)
- [x] Navigations-Pattern: Back | Skip | Next Step → (finale Steps: „See Results →")

## Technical Details

- **Stitch Projekt:** CompliHub360 (ID: `16328417227383005102`)
- **Design-Referenz:** `projects/16328417227383005102/screens/70f7dc530cf04a6e9b624cdfe53f5138`
- **Basis-Code:** `apps/vs1-demo/ui/src/pages/wizard/flows/*.tsx`
- **Gesamt:** 27 Screens (26 neue + 1 Referenz)

## Agent Result / Execution

### Generierte Screens

#### 🔒 Data Privacy & GDPR
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `4cc6ef42d0d34b0a99606240d69bef1d` | EU Customers (Yes/No Toggle) |
| 2/4 | `ff9e095e05114d9791f656710b9cc87a` | Data Categories (Multi-Select Chips) |
| 3/4 | `7c2d9f463d25411690308f0447db650e` | Tracking & Tools (Multi-Select Chips) |
| 4/4 | `7b8400e525174ee19dd7c9680e333d9a` | Consent & Processing (Two-Section Cards) |

#### 📦 EPR & Product Obligations
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `04370ed460e24b69b3cc33f13ee32853` | Physical Products? (Yes/No Toggle) |
| 2/4 | `1ea639bb81844f3097560b7c7ce5754f` | Product Categories (Multi-Select Chips) |
| 3/4 | `946b01d82c6e466781d0fa0f0527e10c` | Your Role (Single-Select Cards) |
| 4/4 | `23b8a52d04f44010aa88f66a734770a4` | EPR Status (Single-Select Cards) |

#### 💶 Tax & VAT
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `ac3aa74924ea44728ea1e86e27808e81` | Sales Model (Single-Select Cards) |
| 2/4 | `e9607f937096496fb0db637e8b78c53d` | Target Markets (Country Flag Multi-Select) |
| 3/4 | `a10b74870e494c76befa5955b83b5a5f` | Annual Revenue (Horizontal Band Selector) |
| 4/4 | `5a900ecd186d4e96a44e738d79bba467` | Product Type (Cards + Optional Chips) |

#### 📣 Marketing & Advertising
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `3324c97c9dfe446d92aaedc2889d56ea` | Industry (6-Card 2-Column Grid) |
| 2/4 | `656a36b4b04d4d8ab009261a634ede04` | Ad Claims (Multi-Select Chips) |
| 3/4 | `e84754406a284e92a7ac95f4c1b269be` | Marketing Channels (Chips + Influencer Toggle) |
| 4/4 | `457b66baf96f4a1798f09693c9252dca` | Cookie Compliance (Single-Select Cards) |

#### 🏢 Corporate Structure
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `426d214909334b8c8ba1e10aacd32837` | Current Structure (6-Card 2-Column Grid) |
| 2/4 | `aaae81199ae2401caf6e0a3665de2d9a` | Expansion Goals (Multi-Select + Country Sub-Select) |
| 3/4 | `7d47ba8cf6894bf8987a1f5b04df8c3b` | Acute Issue? (Yes/No Toggle) |
| 4/4 | `67ea79a827d94dc8b77195679d9eecd1` | Timeline (4 Urgency Cards) |

#### 🤝 Full Compliance Support
| Step | Screen ID | Titel |
|------|-----------|-------|
| 1/4 | `161378049f4c4448a3c419ebd43073be` | Team Size (Horizontal Band Selector) |
| 2/4 | `1f0e6cac95b4476b8542a041dd67b9aa` | Compliance Maturity (Single-Select Cards) |
| 3/4 | `c9c2515807ac4d7783a1899b7476be33` | Priority Areas (8-Card Multi-Select Grid) |
| 4/4 | `5fb5ef06b1ef4a90a4f6745dcf6b149a` | Support Type (Single-Select Cards) |

## Agent Audit Log

- [2026-03-10T01:17:00+01:00] **Task-Master**: Ticket erstellt, Anforderungen definiert, UI-Master beauftragt (Status: PLANNED)
- [2026-03-10T01:17:00+01:00] **UI-Master**: Referenz-Screen aus Stitch geladen, alle 6 Wizard-Flows aus Codebase analysiert (Status: IN PROGRESS)
- [2026-03-10T01:17:00+01:00] **UI-Master**: 27 Stitch-Screens generiert — 6 Flows × 4 Steps, Design-System konsistent, Header/Footer immer sichtbar (Status: DONE)
