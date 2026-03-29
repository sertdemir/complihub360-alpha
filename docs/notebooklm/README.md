# NotebookLM Sync Directory

This directory contains the Markdown exports of all reference documents from the CompliHub360 NotebookLM project.

## Sync Policy

- **Source of Truth for Agents:** When subagents develop features, they MUST treat these files as the authoritative requirements.
- **Bi-Directional Sync:**
  - If a file is updated in NotebookLM, the `sync_notebooklm.py` script at the root should be run to pull the latest changes here.
  - If an agent updates documentation here (e.g. to reflect new architectural decisions or API contracts), the updated content MUST be pasted back into the respective NotebookLM document to ensure the Notebook's grounding AI has the latest context.
- **Tracking:** Every markdown file contains a `<!-- SOURCE_ID: <uuid> -->` comment at the top to map it directly to its NotebookLM source entity.

## How to Pull Latest

1. Ensure the NotebookLM MCP is running and connected (or `mcp_config.json` is configured).
2. Run the sync script from the project root:

   ```bash
   python3 sync_notebooklm.py
   ```

3. Commit the updated files to Git to maintain a historical audit trail of requirement changes.
