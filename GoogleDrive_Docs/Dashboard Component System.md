# **CompliHub360 — Dashboard Component System (Registered Mode)**

Version: 1.0

Audience: Product, UX, UI, Frontend

---

# **1\. Zweck**

Das Dashboard ist der **Retention- und Monetarisierungs-Kern**.

Hier passieren:

* Session-Speicherung (Wizard Answers \+ Results Snapshot)  
* Editieren der Wizard-Antworten (Dashboard-only)  
* Lead/Request Tracking (Primary CTA Funnel)  
* Monitoring (Provider Confirmation \+ Reminders)  
* Exports (PDF / später CSV)

Public/Unregistered:

* keine Edit-Funktion  
* optional: PDF Export (wie von dir gewünscht)

---

# **2\. Dashboard IA**

Primary Navigation:

* Dashboard Home  
* Sessions  
* Requests (Lead Center)  
* Providers (optional später)  
* Settings

---

# **3\. Core Layout Components**

## **3.1 DashboardShell**

Slots:

* TopNav  
* SideNav  
* Main  
* RightRail (optional)

States:

* loading  
* error  
* empty

---

## **3.2 TopNav**

Elements:

* Logo  
* Search (optional)  
* Notification bell  
* Account menu

---

## **3.3 SideNav**

Items:

* Home  
* Sessions  
* Requests  
* Settings

Rules:

* show active item  
* support collapsing (future)

---

## **3.4 RightRail (optional)**

Use cases:

* Featured Providers  
* Active request status  
* Tips / next best action

---

# **4\. Data Objects**

## **4.1 Session**

Fields:

* id  
* title  
* country  
* markets\[\]  
* category  
* answers (SearchProfile)  
* results\_snapshot  
* created\_at  
* updated\_at  
* version

## **4.2 Request**

Fields:

* id  
* session\_id  
* provider\_id  
* user\_message  
* status  
* created\_at  
* confirmed\_at  
* reminders\[\]

---

# **5\. Dashboard Home — Deep Dive**

## **Sections**

1. **Resume Panel**  
* zeigt letzte Session  
* CTAs: Resume / View Results / Export  
2. **Active Requests Panel**  
* listet offene Requests  
* Status: awaiting confirmation / confirmed / overdue  
3. **Saved Sessions Grid**  
* Cards mit: Country \+ Category \+ Updated

## **States**

* Empty: „No saved sessions yet“ \+ CTA „Start a new search“  
* Loading  
* Error

---

# **6\. Sessions List — Deep Dive**

## **Features**

* Sort: Last Updated  
* Filter: Country  
* Filter: Category  
* Search: session title

## **SessionCard / Row**

* Category  
* Country  
* Markets count  
* Last updated  
* Risk summary (text)

Actions:

* Open  
* Export PDF  
* Duplicate  
* Delete

---

# **7\. Session Detail — Deep Dive**

## **Layout**

Top:

* SessionHeader

Left:

* SessionSummaryPanel  
* SessionTimeline (versions \+ changes)

Main:

* Results Tabs (same as Step 4\)  
* Activity / actions log

RightRail (optional):

* Featured Providers  
* Requests linked to this session

---

## **7.1 SessionHeader**

Fields:

* Title (auto generated, editable later)  
* Status: Draft / Completed / Updated  
* Last Updated timestamp

Actions:

* Export PDF  
* Duplicate  
* Delete

---

## **7.2 SessionSummaryPanel**

Shows:

* Country \+ Markets  
* Category  
* Business type  
* Key risk signals

Primary Action:

* **Edit Answers** (Dashboard-only)

Public fallback:

* „Register to edit answers“ CTA

---

## **7.3 Results Tabs (persisted snapshot)**

Tabs:

* Overview  
* Providers  
* Laws  
* Guides  
* Tutorials  
* Tools

Rule:

* Dashboard shows stored snapshot  
* After edit, regenerate snapshot as new version

---

# **8\. Wizard Edit Engine (Dashboard-only)**

## **Purpose**

User kann Antworten anpassen, ohne alles neu zu starten.

## **Entry**

* Edit Answers button in SessionSummaryPanel

## **UX**

* Full-screen modal (WizardEditModal)  
* Pre-filled answers

## **Save Behavior**

On Save:

* create new version (v+1)  
* regenerate results snapshot  
* append change to SessionTimeline

Version Model:

Session v1 → v2 → v3

* latest version is default  
* old versions remain accessible

---

# **9\. Requests / Lead Center — Deep Dive**

## **Purpose**

Zentrales Tracking aller Provider-Anfragen.

## **Request Lifecycle**

1. Draft  
2. Submitted  
3. Provider Viewed  
4. Provider Confirmed  
5. Provider Responded  
6. Closed / Expired

---

## **9.1 Request List (Table)**

Columns:

* Provider  
* Session  
* Category  
* Created  
* Status

Actions:

* View details  
* Send reminder  
* Mark closed

---

## **9.2 Request Detail**

Sections:

* Provider summary  
* User message  
* Status timeline  
* Confirmation details  
* Reminder log

---

# **10\. Provider Confirmation Monitoring**

## **Magic Link Confirmation**

Provider bestätigt via Magic Link.

System stores:

* confirmed\_at  
* provider\_id  
* request\_id

## **SLA Monitoring**

Timers:

* T+24h: reminder \#1  
* T+48h: reminder \#2  
* T+72h: optional partner downgrade (if enabled)

Edge:

* provider responds after SLA → still updates status

---

# **11\. Export System**

## **Export types**

* PDF Session Export  
* PDF Request Export

Export includes:

* session summary  
* answers  
* results summary  
* sources/links (laws, guides)  
* provider shortlist

Public:

* results PDF only

Dashboard:

* full session PDF incl. versions

---

# **12\. Notifications**

## **Types**

* Provider confirmed  
* Provider overdue  
* Export ready  
* Session updated

Channels:

* In-app bell \+ drawer  
* Email optional

---

# **13\. Settings**

* language  
* markets defaults  
* notification preferences  
* export history  
* delete account

---

# **14\. Analytics Events**

* dashboard\_opened  
* session\_opened  
* session\_exported  
* answers\_edit\_started  
* answers\_edit\_saved  
* request\_created  
* provider\_confirmed  
* provider\_overdue

---

# **15\. Edge Cases**

1. User registers mid-flow  
* attach anonymous session to account  
* preserve answers \+ results  
2. User edits answers  
* regenerate results  
* keep old versions  
3. Delete session with active requests  
* warn \+ require confirm  
4. Provider confirmation without matching request  
* error \+ support path  
5. No providers available  
* show content tabs  
* suggest adjacent category or Full Support

---

# **16\. Acceptance Criteria**

Dashboard is ready if:

* sessions list \+ detail works  
* edit engine creates versions \+ regenerates snapshot  
* requests center lifecycle \+ reminders works  
* exports work  
* notifications exist  
  n  
  (End of Dashboard Component System)