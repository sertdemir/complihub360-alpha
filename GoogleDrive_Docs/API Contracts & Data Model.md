# **CompliHub360 — API Contracts & Data Model**

Version: 1.0

Status: Contract Definition Draft

Audience: Backend Engineering, Frontend Engineering, QA, Security

---

# **1\. Principles**

* Contracts are explicit and versioned.  
* No implicit AI-generated schema changes.  
* All entities are traceable via audit logs.  
* Deterministic fields are separated from AI-enriched fields.

---

# **2\. Core Entities**

## **2.1 User**

Fields:

* id (uuid)  
* email  
* role (guest | registered | admin)  
* country\_context  
* consent\_flags  
* created\_at  
* updated\_at

---

## **2.2 Provider**

Fields:

* provider\_key (global unique)  
* name  
* website\_url  
* partner\_status (active | inactive | downgraded)  
* countries\_supported\[\]  
* languages\[\]  
* categories\[\]  
* sla\_target\_confirm\_hours  
* sla\_target\_reply\_hours  
* breach\_count  
* created\_at  
* updated\_at

---

## **2.3 EngagementRequest**

Fields:

* id (uuid)  
* user\_id  
* provider\_key  
* country  
* category  
* structured\_answers (json)  
* message  
* status (created | delivered | confirmed | replied | declined | expired)  
* sla\_confirm\_deadline  
* sla\_reply\_deadline  
* created\_at  
* updated\_at

---

## **2.4 Proposal (Optional)**

Fields:

* id  
* engagement\_id  
* price\_range  
* timeline  
* deliverables  
* attachment\_url  
* created\_at

---

## **2.5 Document**

Fields:

* id  
* owner\_id  
* classification  
* country\_policy  
* raw\_path  
* sanitized\_path  
* sanitized\_ready (boolean)  
* ai\_allowed (boolean)  
* created\_at

---

# **3\. API Endpoints (v1)**

All routes prefixed with /api/v1

---

## **3.1 Search & Wizard**

POST /search

Request:

{

country,

query,

structured\_answers?

}

Response:

{

overview\_summary,

providers\[\],

laws\[\],

tutorials\[\],

articles\[\],

tips\[\]

}

---

## **3.2 Provider Engagement**

POST /engagement

Request:

{

provider\_key,

message,

structured\_answers,

country

}

Response:

{

engagement\_id,

status

}

---

GET /engagement/:id

Response:

{

status,

provider\_response?,

proposal?

}

---

## **3.3 Provider Magic Link**

GET /provider/magic/:token

POST /provider/confirm

POST /provider/reply

POST /provider/decline

---

## **3.4 Document Upload & AI Gate**

POST /document/upload

POST /document/request-ai

AI request fails if:

* sanitized\_ready \!= true  
* ai\_allowed \!= true

---

# **4\. Event Model**

Events are stored in an event log table.

Example events:

* search\_submitted  
* wizard\_run\_clicked  
* primary\_clicked  
* primary\_request\_submitted  
* provider\_confirmed  
* provider\_replied  
* sla\_breached

Each event contains:

* id  
* type  
* actor\_id  
* payload  
* timestamp

---

# **5\. Deterministic vs AI Fields**

Deterministic:

* SLA deadlines  
* partner\_status  
* breach\_count  
* ranking order

AI-Enriched:

* overview\_summary  
* risk\_labels  
* tips

AI fields must always include:

* source\_references\[\]

---

# **6\. Versioning Strategy**

* All APIs versioned (/v1)  
* Breaking changes require new version (/v2)  
* Event schema must remain backward compatible

---

# **7\. Security Requirements**

* JWT authentication for registered users  
* Signed, time-bound provider magic links  
* Rate limiting on search  
* CSRF protection on POST

---

# **8\. Summary**

This document defines the stable API surface and data model required for:

* wizard execution  
* unified results page  
* engagement lifecycle  
* SLA monitoring  
* document privacy automation

It acts as the technical contract between frontend, backend, Antigravity agents, and n8n automation.