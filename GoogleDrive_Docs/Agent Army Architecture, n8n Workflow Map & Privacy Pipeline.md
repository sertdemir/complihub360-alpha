# **CompliHub360 – Agent Army Architecture, n8n Workflow Map & Privacy Pipeline**

Dieses Dokument beschreibt die vollständige technische Architektur der Plattform:

1. Agent‑Army Architektur  
2. n8n Automation Map  
3. Workflow Library  
4. Privacy‑first AI Pipeline  
5. Agent Orchestration Architektur  
6. Infrastruktur‑Schnittstellen

Ziel: Eine skalierbare Compliance‑Plattform mit deterministischen Automationen, kontrollierter AI Nutzung und einem orchestrierten Agent‑System.

---

# **1\. Gesamtplattform Architektur**

High Level Systemstruktur

User Interface

↓

Frontend (Web App)

↓

Backend API Layer

↓

Event Layer

↓

n8n Automation Layer

↓

Agent Orchestrator

↓

AI Services / Data Services

↓

Storage / Database

Systembereiche

Frontend

• Landing

• Wizard

• Results

• Dashboard

Backend

• API Services

• Search Engine

• Provider Matching

• Policy Engine

Automation

• n8n Workflow Engine

Agent Layer

• Task Orchestrator

• Repo Engineer

• UI Builder

• QA Sentinel

• Knowledge Librarian

Data Layer

• Postgres

• Object Storage

• Event Store

External Services

• AI APIs

• Email

• Redaction

---

# **2\. Agent Army Architektur**

Die Plattform nutzt spezialisierte Agenten.

Diese Agenten arbeiten nicht direkt miteinander, sondern werden durch einen zentralen Orchestrator gesteuert.

Agent Struktur

Task Orchestrator

↓

Repo Engineer

↓

UI Builder

↓

QA Sentinel

↓

Knowledge Librarian

Task Orchestrator

Zweck

Koordiniert Aufgaben zwischen allen Agenten.

Verantwortung

• Workflow Start

• Agent Routing

• Task Priorisierung

Repo Engineer

Zweck

Verwaltet Code Artefakte.

Funktionen

• Code Generierung

• Repository Updates

• Infrastruktur Scripts

UI Builder

Zweck

Erstellt UI Komponenten.

Funktionen

• Screens

• Components

• Design System Mapping

QA Sentinel

Zweck

Überwacht Qualität.

Funktionen

• Testfälle generieren

• Testläufe

• Fehleranalyse

Knowledge Librarian

Zweck

Wissensmanagement.

Funktionen

• Dokumentation

• Retrieval

• Kontext Management

---

# **3\. n8n Automation Map**

n8n übernimmt deterministische Systemlogik.

Automation Domains

Engagement Automation

Privacy Automation

Marketplace Governance

Analytics

Notifications

Maintenance

Automation Struktur

Events

↓

Webhook

↓

Workflow

↓

API Calls

↓

Database Updates

---

# **4\. n8n Workflow Library**

Core Workflows

1 Engagement Created

Startet Lead Lifecycle

Trigger

POST /n8n/engagement-created

2 Engagement Watchdog

Überwacht Provider SLA

3 Provider Response Handler

Verarbeitet Antworten

4 Provider SLA Monitor

Erkennt SLA Verletzungen

5 Provider Performance Audit

Wöchentliche Qualitätsprüfung

6 Event Collector

Speichert Plattform Events

7 Daily KPI Aggregation

Aggregiert Conversion Daten

8 Email Dispatcher

Versendet System Emails

9 Notification Router

Verteilt Alerts

10 Health Monitor

Überwacht Plattform

11 Data Cleanup

Archiviert alte Daten

12 Document Upload Gate

Startet Privacy Pipeline

13 AI Processing Gate

Kontrolliert AI Nutzung

14 Document Redaction Pipeline

Anonymisiert Daten

15 AI Request Router

Leitet AI Requests

16 Provider Ranking Update

Aktualisiert Rankings

17 Marketplace Integrity Monitor

Erkennt Missbrauch

18 Search Analytics Aggregation

Analyse Suchverhalten

19 Country Launch Automation

Automatisiert neue Märkte

20 Compliance Alert System

Regulatorische Updates

---

# **5\. Privacy‑First AI Pipeline**

Die Plattform verarbeitet sensible Daten.

Deshalb existiert eine verpflichtende Privacy Pipeline.

Pipeline Struktur

Upload

↓

Document Classification

↓

PII Detection

↓

Redaction

↓

Sanitized Storage

↓

AI Eligibility Check

↓

AI Processing

Schritt 1

Document Upload

Trigger

POST /document/upload

Schritt 2

Document Classification

Dokumenttyp erkennen

• Vertrag

• Email

• Bericht

• Rechnung

Schritt 3

PII Detection

Erkennung sensibler Daten

• Namen

• Emails

• Telefonnummern

• Adressen

Schritt 4

Redaction

Beispiele

NAME → \[NAME\]

EMAIL → \[EMAIL\]

PHONE → \[PHONE\]

Schritt 5

Sanitized Storage

Dateien werden getrennt gespeichert

raw storage

sanitized storage

Schritt 6

AI Eligibility Check

Bedingungen

sanitized\_ready \= true

ai\_allowed \= true

classification \!= restricted

Schritt 7

AI Processing

Dokument darf verarbeitet werden

---

# **6\. Beispiel n8n Redaction Workflow**

Webhook Trigger

POST /n8n/document-upload

Workflow Schritte

Download File

↓

Extract Text

↓

Detect PII

↓

Redact PII

↓

Store Sanitized

Beispiel Redaction Logik

const redacted \= text

.replace(emailRegex,’\[EMAIL\]’)

.replace(phoneRegex,’\[PHONE\]’)

.replace(nameRegex,’\[NAME\]’)

---

# **7\. Backend API Schnittstellen**

Engagement

POST /engagement/create

POST /engagement/check-confirm

POST /engagement/mark-breach

Provider

POST /provider/reminder

POST /provider/confirm

POST /provider/reply

Documents

POST /document/upload

POST /document/save-sanitized

POST /document/request-ai

Notifications

POST /notifications/email

POST /notifications/provider-reminder

Analytics

POST /events/log

GET /analytics/daily

---

# **8\. Datenmodell**

Document

id

owner\_id

raw\_path

sanitized\_path

sanitized\_ready

ai\_allowed

classification

created\_at

EngagementRequest

id

user\_id

provider\_key

country

category

message

status

sla\_confirm\_deadline

sla\_reply\_deadline

created\_at

Provider

provider\_key

name

countries\_supported

languages

categories

partner\_status

sla\_target\_confirm\_hours

sla\_target\_reply\_hours

breach\_count

---

# **9\. Infrastruktur Stack**

Empfohlener Stack

Frontend

Next.js

Backend

Node.js / Python API

Automation

n8n

Database

Postgres

Object Storage

S3 kompatibel

AI

OpenAI

Claude

Privacy

Microsoft Presidio

Email

Sendgrid

Monitoring

Grafana

Prometheus

---

# **10\. Plattform Sicherheitsprinzipien**

Privacy by Design

AI darf niemals Rohdaten sehen

Deterministische Automationen

n8n steuert kritische Prozesse

Audit Logging

Alle Aktionen werden geloggt

Provider Governance

Partnerqualität wird überwacht

---

# **11\. Architektur Zusammenfassung**

Die Plattform besteht aus vier zentralen Systemen.

Interface Layer

Frontend \+ UI

Execution Layer

Backend Services

Automation Layer

n8n Workflows

Intelligence Layer

AI \+ Agent Army

Diese Architektur ermöglicht

skalierbare Compliance Beratung

AI‑gestützte Recherche

Provider Matching

Compliance Monitoring

# **12\. Visual System Architecture (C4 Level 1 – System Context)**

User

↓

Web App (Frontend)

↓

API Gateway

↓

Application Services

Application Services interagieren mit:

• Search Engine

• Provider Matching Service

• Policy Engine

• Document Processing Service

Automation & Intelligence Layer

API Services

↓

Event Bus

↓

n8n Automation

↓

Agent Orchestrator

↓

AI Systems

Storage Layer

• Postgres (Core Data)

• Object Storage (Documents)

• Event Store (Analytics)

# **13\. Container Architecture (C4 Level 2\)**

Frontend Container

Next.js Web App

Responsibilities

• Landing

• Wizard

• Results UI

• Dashboard

Backend Container

Application API

Responsibilities

• Search

• Provider matching

• Engagement lifecycle

• Policy enforcement

Automation Container

n8n

Responsibilities

• SLA monitoring

• Document pipeline

• Notification routing

• Analytics aggregation

Agent Container

Agent Orchestrator Service

Controls

• Task Orchestrator

• Repo Engineer

• UI Builder

• QA Sentinel

• Knowledge Librarian

AI Container

AI Processing Layer

Models

• OpenAI

• Claude

Used for

• summarization

• classification

• insight generation

Privacy Container

Privacy Pipeline

Components

• PII Detection

• Redaction Engine

• Policy Validation

# **14\. n8n Workflow Map**

Workflow Domains

User Interaction

wizard\_completed

search\_submitted

primary\_clicked

Engagement

engagement\_created

provider\_confirmed

provider\_replied

sla\_breached

Documents

document\_uploaded

sanitized\_ready

ai\_requested

Analytics

event\_logged

daily\_metrics

Maintenance

health\_check

cleanup

Workflow Graph

User Action

↓

API Event

↓

n8n Webhook

↓

Workflow Logic

↓

Database Update

↓

Notification / AI / Provider

# **15\. Extended n8n Workflow Library**

Engagement

engagement\_created

engagement\_watchdog

provider\_response\_handler

sla\_monitor

Marketplace

provider\_performance\_audit

provider\_ranking\_update

marketplace\_integrity\_monitor

Privacy

document\_upload\_gate

pii\_detection

redaction\_pipeline

ai\_processing\_gate

Analytics

event\_collector

search\_analytics

kpi\_aggregation

Notifications

email\_dispatcher

notification\_router

sla\_alert

Maintenance

health\_monitor

data\_cleanup

log\_archiver

# **16\. Example Workflow JSON Library Pattern**

Alle Workflows folgen einem Standard-Pattern.

Structure

Trigger

↓

Validation

↓

Business Logic

↓

API Interaction

↓

Logging

Example Skeleton

{

“name”: “workflow-name”,

“nodes”: \[

{

“type”: “webhook”,

“name”: “Trigger”

},

{

“type”: “if”,

“name”: “Validation”

},

{

“type”: “function”,

“name”: “Logic”

},

{

“type”: “httpRequest”,

“name”: “API”

}

\]

}

# **17\. Local Privacy Pipeline (Recommended Production Setup)**

Sensitive data should be anonymized locally before external AI use.

Pipeline

Upload

↓

Local PII detection

↓

Local redaction

↓

Sanitized document

↓

AI processing

Recommended Stack

Presidio

spaCy

OCR (Tesseract)

Example Local Redaction Flow

File

↓

OCR

↓

Text extraction

↓

Presidio analyzer

↓

Redaction

↓

Store sanitized

# **18\. Agent Automation Architecture**

Agents operate as specialized reasoning modules.

Workflow

User Task

↓

Task Orchestrator

↓

Agent Selection

↓

Execution

↓

Artifact Generation

↓

Knowledge Store

Agent Routing Logic

Design Task → UI Builder

Code Task → Repo Engineer

Quality Task → QA Sentinel

Documentation → Knowledge Librarian

# **19\. Strategic Advantage of Architecture**

Diese Architektur bietet mehrere Vorteile:

• deterministische Automationen

• sichere AI Nutzung

• skalierbare Marketplace Governance

• modulare Agent Integration

Dadurch kann CompliHub360 wachsen von

Compliance Search Plattform

zu

AI Compliance Operating System.

# **20\. CompliHub360 Complete System Map**

Diese Systemkarte zeigt den vollständigen technischen Aufbau der Plattform.

User Layer

Users

↓

Web Browser

↓

CompliHub360 Web App

Application Layer

Next.js Frontend

↓

API Gateway

↓

Application API

Services innerhalb der API

• Search Service

• Provider Matching

• Engagement Service

• Document Service

• Policy Engine

Automation Layer

Event Bus

↓

Webhook Events

↓

n8n Automation Engine

Domains

• Engagement Automation

• Privacy Automation

• Marketplace Governance

• Notifications

• Analytics

Agent Layer

Agent Orchestrator

Agents

• Task Orchestrator

• Repo Engineer

• UI Builder

• QA Sentinel

• Knowledge Librarian

AI Intelligence Layer

AI Services

• OpenAI

• Claude

Use Cases

• summarization

• compliance explanation

• document analysis

• search augmentation

Privacy Layer

Privacy Pipeline

• OCR

• PII detection

• redaction

• policy validation

Data Layer

Primary Database

Postgres

Stores

• users

• providers

• engagements

• events

Object Storage

S3 compatible

Stores

• raw documents

• sanitized documents

Analytics Store

Event Database

Stores

• user behavior

• search analytics

• conversion metrics

Monitoring Layer

Monitoring Stack

• Prometheus

• Grafana

Tracks

• API uptime

• workflow health

• SLA breaches

# **21\. Complete n8n Workflow Library (Import Candidates)**

Engagement Workflows

engagement\_created

engagement\_watchdog

provider\_response\_handler

sla\_breach\_detector

sla\_reminder

Provider Governance

provider\_performance\_audit

provider\_ranking\_update

provider\_warning

provider\_downgrade

Marketplace Operations

marketplace\_integrity\_monitor

fraud\_detection

provider\_activity\_monitor

Privacy Workflows

document\_upload\_gate

pii\_detection

redaction\_pipeline

ai\_processing\_gate

policy\_validation

Analytics Workflows

event\_collector

search\_analytics

kpi\_aggregation

conversion\_analysis

Notification Workflows

email\_dispatcher

notification\_router

sla\_alert

system\_alert

Maintenance Workflows

health\_monitor

data\_cleanup

log\_archiver

workflow\_integrity\_check

Total Workflows

25+

# **22\. Example Full Workflow JSON Template**

Alle Workflows können diesem Template folgen.

{

“name”: “workflow-template”,

“nodes”: \[

{

“name”: “Webhook Trigger”,

“type”: “n8n-nodes-base.webhook”

},

{

“name”: “Validation”,

“type”: “n8n-nodes-base.if”

},

{

“name”: “Business Logic”,

“type”: “n8n-nodes-base.function”

},

{

“name”: “API Call”,

“type”: “n8n-nodes-base.httpRequest”

},

{

“name”: “Logging”,

“type”: “n8n-nodes-base.httpRequest”

}

\]

}

# **23\. AI Compliance Architecture (EU-AI-Act Ready)**

Grundprinzip

AI darf nur mit anonymisierten Daten arbeiten.

Control Layers

User Consent Layer

↓

Privacy Pipeline

↓

AI Eligibility Gate

↓

AI Processing

Safety Controls

• consent verification

• policy validation

• data redaction

• audit logging

# **24\. Future Scaling Architecture**

Wenn die Plattform wächst.

Scaling Strategie

Region-based deployment

EU cluster

US cluster

Asia cluster

Service Scaling

API → horizontal scaling

n8n → queue workers

Data Scaling

Postgres read replicas

AI Scaling

multiple model providers

# **25\. Vision – Compliance Operating System**

Langfristig wird CompliHub360 nicht nur eine Plattform sein.

Es kann sich entwickeln zu einem

AI-gestützten Compliance Operating System.

Funktionen

• Compliance Knowledge Graph

• Automated Regulatory Monitoring

• Compliance Agents

• Automated Risk Detection

Damit kann die Plattform Unternehmen helfen

expand safely

validate regulatory risk

connect with specialists

monitor compliance continuously

Ende des Dokuments