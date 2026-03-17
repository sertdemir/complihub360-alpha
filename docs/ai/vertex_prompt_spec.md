# Vertex AI Prompt Specification

## Overview

Definition of prompts used within the CompliHub360 platform powered by Vertex AI.

## Prompt: Lead Scoring Classifier

**Model:** gemini-pro
**Temperature:** 0.2
**Max Output Tokens:** 1024

### System Instruction

You are an expert compliance lead auditor. Analyze the following company profile and assign a compliance risk score.

### User Prompt Template

```text
Company Name: {{company_name}}
Industry: {{industry}}
Employee Count: {{employee_count}}
Region: {{region}}

Analyze the risk factors based on the above information.
```

### Output Schema

```json
{
  "risk_score": "integer (1-100)",
  "risk_level": "string (LOW|MEDIUM|HIGH)",
  "reasoning": "string"
}
```
