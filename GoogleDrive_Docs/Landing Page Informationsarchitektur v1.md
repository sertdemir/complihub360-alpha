# **Dokumentation: Landing Page Informationsarchitektur v1.0**

**Projekt:** CompliHub360 – Compliance Orchestration Layer

**Status:** Finales IA-Konzept (Inhalt & Logik)

**Referenz-Ordner:** NotebookLM / C360 \- Version 1 (alpha)

---

## **1\. Strategische Ausrichtung & Compliance-Logik**

Die neue Landing Page transformiert die Plattform von einer passiven Suchmaske zu einem **proaktiven Advisory-System**.

* **Der Kern-Auftrag:** Wir lösen das Problem der „regulatorischen Fragmentierung“ (**Ref: Executive Product Vision, Kap. 2.1**). Die Seite dient als „intelligenter Kompass“, der Unsicherheit in strukturierte Handlungen übersetzt (**Ref: Content Advisory Page**).  
* **Fokus-Themen:** Basierend auf der Marktanalyse priorisieren wir den Einstieg über **Tax & VAT** sowie **Product & Packaging (EPR)**, da hier der höchste „High Intent Search Demand“ besteht (**Ref: Go To Market Strategy, Kap. 3 & Tax & VAT Doc, Kap. 4**).  
* **Featured Country Logic:** Wir nutzen das **Vereinigte Königreich (UK)** als primäres Beispiel im Hero-Bereich, um die Komplexität der Post-Brexit-Regulatorik als Konversions-Hebel zu nutzen (**Ref: Content Countries Page**).  
  ---

  ## **2\. Die Zonen der Informationsarchitektur (IA)**

  ### **Zone 1: Hero & Intent-Gate (The Command Center)**

Statt einer leeren Suche implementieren wir ein integriertes Modul zur Bedarfsermittlung.

* **Logik:** Der Nutzer wählt Land und Kategorie (z.B. VAT), was direkt das `SearchProfile`\-Objekt initialisiert (**Ref: Search & Ranking Logic, Kap. 3**).  
* **Anforderung:** Direkte Verlinkung zum **Adaptive Wizard**, um den Nutzer in max. 5 Schritten zu qualifizieren (**Ref: Wizard Component System, Kap. 11**).

  ### **Zone 2: Social Proof & Authority Strip**

* **Inhalt:** Ein minimalistischer Banner mit Referenzen von Unternehmen und Partnern.  
* **Zweck:** Aufbau von institutionellem Vertrauen, um die Hürde für den späteren Dokumenten-Upload zu senken (**Ref: Brand & Positioning Guide, Kap. 11**).

  ### **Zone 3: Advisory Preview (The Value Engine)**

Dies ist das Herzstück der neuen Seite. Eine interaktive Sektion visualisiert den Prozess:

1. **Input:** Unstrukturierte Daten (z.B. „Expansion nach UK“).  
2. **Privacy Pipeline:** Visualisierung der lokalen Anonymisierung von PII (Namen, E-Mails) (**Ref: n8n Automation Architecture, Kap. 4 & Security & Privacy Architecture, Kap. 4**).  
3. **Output:** Vorschau eines strukturierten Compliance-Dossiers.

   ### **Zone 4: Testimonials (User Proof)**

* **Fokus:** Wir nutzen Zitate der Primär-Personas **U1 (E-Com Founder)** und **U2 (SaaS Manager)**, die spezifische Resultate wie „Zeitgewinn“ und „Rechtssicherheit“ betonen (**Ref: Detailed Personas & User Stories**).

  ### **Zone 5: Dossier-Export & Conversion Hook**

* **Die Mechanik:** Der Nutzer sieht ein „Risk-Snapshot“ (Seite 1 des Berichts) und wird zum PDF-Export aufgefordert.  
* **Gating:** Der Export ist für Gäste möglich, aber die Speicherung und das Experten-Matching erfordern eine Registrierung (**Ref: Results Page Architecture, Kap. 11 & Dashboard Component System, Kap. 1**).  
  ---

  ## **3\. Spezifikation: Das „Teaser-Dossier“ (PDF-Vorschau)**

Um den Wert der Plattform sofort zu beweisen, zeigt das Advisory-Modul eine Vorschau des Outputs:

* **Seite 1 (Sichtbar):**  
  * **Risk Level:** Dynamische Anzeige basierend auf den Wizard-Inputs (**Ref: Marketing & Advertising Compliance, Kap. 2**).  
  * **Grounded Sources:** Kuratierte Liste von Gesetzen und Tutorials (**Ref: Search & Ranking Logic, Kap. 7**).  
* **Seite 2 (Blurred/Gated):**  
  * **Action Plan:** Konkrete Handlungsschritte.  
  * **Expert Match:** Vorschau auf verifizierte Partner (**Ref: Provider Flows, Kap. 0.1**).  
1.