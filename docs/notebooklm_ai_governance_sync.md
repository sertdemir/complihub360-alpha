# AI Governance Framework - Implementation Details

## Overview
This document serves as the NotebookLM sync source for the newly implemented AI Governance Framework on **CompliHub360**, fulfilling the 6 dimensions of AI Governance: Ethics, Transparency, Organizational, Technical, Regulatory, and Risk Management.

## 1. UI & Information Architecture (Frontend)
- **Component**: `AiGovernancePage.tsx`
- **Path**: `apps/vs1-demo/ui/src/pages/AiGovernancePage.tsx`
- **Route**: `/ai-governance`
- **Description**: A premium, non-dashboard landing page for new platform users. It uses `framer-motion` for animations and clearly maps out the 6 dimensions of governance and active features (Privacy Redaction Pipeline, Intent Analysis Engine, Triple AI Gate Validator). Risk Management was specifically embedded here to map to EU AI Act High-Risk categorization.

## 2. Technical & Organizational Governance (Backend Middleware)
- **Path**: `packages/governance/src/`
- **`AIPrivacyGate`**: A middleware (`privacy/ai-privacy-gate.ts`) that enforces strict PII removal before LLM inference. It currently uses RegExp to mask emails and phone numbers, and checks for restricted prompts (jailbreak attempts).
- **`AIAuditLogger`**: An organizational transparency layer (`audit/ai-audit-logger.ts`) that logs every AI interaction (context size, user, action, gate-pass status) to Supabase. This guarantees verifiable transparency.

## 3. Regulatory Engine (EU/UK/ISO)
- **Path**: `packages/governance/src/compliance/regulatory-mapper.ts`
- **Description**: Maps platform features to jurisdictional requirements (EU AI Act, UK GDPR, ISO 42001). Forces "EU rules" as the strictest baseline globally ("Brussels Effect"). Validates if a feature is allowed in a given region based on `AIRiskLevel`.

## 4. Database Schema (Registry)
- **Path**: `supabase/migrations/20260323000000_ai_governance_registry.sql`
- **Description**: 
  - `ai_features`: Stores active AI capabilities, their system types, and assigned Risk Level.
  - `ai_compliance_frameworks`: Stores global standards.
  - `ai_audit_logs`: The target table for `AIAuditLogger`.
  - Implements Row-Level Security (RLS) policies for external visibility while locking down audit logs.
