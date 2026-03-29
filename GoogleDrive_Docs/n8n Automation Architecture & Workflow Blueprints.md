# **CompliHub360 – n8n Automation Architecture & Workflow Blueprints**

Dieses Dokument enthält die grundlegende Automation-Architektur für CompliHub360 sowie importierbare Blueprint-Workflows für n8n.

---

# **1\. Gesamt-Automation Architektur**

Systemstruktur:

User UI

↓

Backend API

↓

Event Queue / Webhooks

↓

n8n Automation Layer

Innerhalb von n8n laufen folgende Systeme:

* Engagement System  
* Privacy / AI Gate  
* Marketplace Governance  
* Analytics  
* Notifications  
* Platform Maintenance

External Services:

* AI APIs (OpenAI / Claude)  
* Email Provider  
* Redaction Service  
* Database  
* Object Storage

---

# **2\. Engagement Watchdog Workflow**

Zweck:

Überwacht SLA-Reaktionszeiten von Providern.

Trigger Endpoint:

POST /n8n/engagement-created

Payload Beispiel:

{  
  "engagement\_id": "uuid",  
  "provider\_email": "provider@mail.com",  
  "user\_email": "user@mail.com",  
  "sla\_confirm\_hours": 24,  
  "sla\_reply\_hours": 48  
}

Blueprint JSON:

{  
  "name": "Engagement Watchdog",  
  "nodes": \[  
    {  
      "parameters": {  
        "path": "engagement-created",  
        "httpMethod": "POST"  
      },  
      "name": "Webhook Trigger",  
      "type": "n8n-nodes-base.webhook",  
      "typeVersion": 1  
    },  
    {  
      "parameters": {  
        "amount": 24,  
        "unit": "hours"  
      },  
      "name": "Wait SLA Confirm",  
      "type": "n8n-nodes-base.wait"  
    },  
    {  
      "parameters": {  
        "url": "https://api.complihub360.com/engagement/check-confirm",  
        "method": "POST",  
        "jsonParameters": true  
      },  
      "name": "Check Provider Confirmation",  
      "type": "n8n-nodes-base.httpRequest"  
    },  
    {  
      "parameters": {  
        "conditions": {  
          "boolean": \[  
            {  
              "value1": "={{$json.confirmed}}",  
              "operation": "isTrue"  
            }  
          \]  
        }  
      },  
      "name": "Confirmed?",  
      "type": "n8n-nodes-base.if"  
    },  
    {  
      "parameters": {  
        "url": "https://api.complihub360.com/notifications/provider-reminder",  
        "method": "POST"  
      },  
      "name": "Send Reminder",  
      "type": "n8n-nodes-base.httpRequest"  
    }  
  \]  
}  
---

# **3\. AI Processing Gate Workflow**

Zweck:

Verhindert, dass nicht anonymisierte Daten an KI-Services gesendet werden.

Trigger Endpoint:

POST /n8n/ai-request

Payload Beispiel:

{  
  "document\_id": "doc\_123",  
  "sanitized\_ready": true,  
  "ai\_allowed": true,  
  "classification": "normal"  
}

Logik:

AI wird nur ausgeführt wenn

* sanitized\_ready \== true  
* ai\_allowed \== true  
* classification \!= restricted

Blueprint JSON:

{  
  "name": "AI Processing Gate",  
  "nodes": \[  
    {  
      "parameters": {  
        "path": "ai-request",  
        "httpMethod": "POST"  
      },  
      "name": "Webhook",  
      "type": "n8n-nodes-base.webhook"  
    },  
    {  
      "parameters": {  
        "conditions": {  
          "boolean": \[  
            {  
              "value1": "={{$json.sanitized\_ready}}",  
              "operation": "isTrue"  
            }  
          \]  
        }  
      },  
      "name": "Sanitized Check",  
      "type": "n8n-nodes-base.if"  
    },  
    {  
      "parameters": {  
        "url": "https://api.openai.com/v1/responses",  
        "method": "POST"  
      },  
      "name": "Forward to AI",  
      "type": "n8n-nodes-base.httpRequest"  
    }  
  \]  
}  
---

# **4\. Document Anonymization Workflow**

Zweck:

Anonymisiert Dokumente automatisch vor AI-Verarbeitung.

Trigger Endpoint:

POST /n8n/document-upload

Payload Beispiel:

{  
  "document\_id": "doc\_001",  
  "file\_url": "https://storage/doc.pdf",  
  "country": "DE"  
}

Pipeline:

Download File

↓

Extract Text

↓

PII Detection

↓

Redaction

↓

Store Sanitized Document

Blueprint JSON:

{  
  "name": "Document Anonymization Pipeline",  
  "nodes": \[  
    {  
      "parameters": {  
        "path": "document-upload",  
        "httpMethod": "POST"  
      },  
      "name": "Webhook",  
      "type": "n8n-nodes-base.webhook"  
    },  
    {  
      "parameters": {  
        "url": "={{$json.file\_url}}",  
        "method": "GET"  
      },  
      "name": "Download File",  
      "type": "n8n-nodes-base.httpRequest"  
    },  
    {  
      "parameters": {  
        "functionCode": "const text \= $json.content;\\nconst redacted \= text.replace(/\\\\b\[A-Z0-9.\_%+-\]+@\[A-Z0-9.-\]+\\\\.\[A-Z\]{2,}\\\\b/i,'\[EMAIL\]').replace(/\\\\+?\[0-9\]{7,}/g,'\[PHONE\]').replace(/\[A-Z\]\[a-z\]+\\\\s\[A-Z\]\[a-z\]+/g,'\[NAME\]');\\nreturn \[{json:{sanitized\_text:redacted}}\];"  
      },  
      "name": "PII Redaction",  
      "type": "n8n-nodes-base.function"  
    },  
    {  
      "parameters": {  
        "url": "https://api.complihub360.com/document/save-sanitized",  
        "method": "POST"  
      },  
      "name": "Store Sanitized Document",  
      "type": "n8n-nodes-base.httpRequest"  
    }  
  \]  
}  
---

# **5\. Backend APIs die implementiert werden müssen**

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

---

# **6\. Datenmodell (Document Entity)**

{  
  "id": "uuid",  
  "owner\_id": "user\_id",  
  "raw\_path": "s3://raw/file.pdf",  
  "sanitized\_path": "s3://sanitized/file.pdf",  
  "sanitized\_ready": true,  
  "ai\_allowed": true,  
  "classification": "normal"  
}  
---

# **7\. Security Regeln**

AI darf nur ausgeführt werden wenn:

sanitized\_ready \= true

und

consent\_flags.ai\_processing \= true

---

# **8\. Dokumenttypen die anonymisiert werden sollten**

* Verträge  
* Emails  
* Interview Transkripte  
* Case Studies  
* Rechnungen  
* CRM Daten  
* PDFs  
* Word Dokumente

---

# **9\. Empfohlene Tools für PII Detection**

Microsoft Presidio

AWS Comprehend PII

Google DLP

---

# **10\. Minimaler Tech Stack**

n8n

Postgres

Object Storage (S3)

OpenAI oder Claude

Presidio

Sendgrid

---

Dieses Dokument dient als Grundlage für die Automation-Schicht von CompliHub360.