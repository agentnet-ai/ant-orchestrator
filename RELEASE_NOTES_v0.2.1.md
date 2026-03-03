# AgentNet v0.2.1 — Search Indexing & Grounding Reliability Patch

Release Date: 2026-03-03  
Version: v0.2.1

## Summary
This patch release improves grounding reliability by aligning orchestration demo prep and indexing workflows with full-repo capsulization behavior.

## What Changed
- **Full-repo capsulization defaults:** demo prep now invokes repo capsulization without restrictive include/limit arguments.
- **Grounding reliability:** upstream indexing improvements ensure resolver lookups can ground DOCX and Markdown repository content.
- **Operator visibility:** run-level discovered/excluded/matched/processed summaries make coverage gaps easier to detect.

## Compatibility
- No schema changes
- No API contract changes
- No ANS spec changes required

## Operational Note
Re-run full repository capsulization after upgrading:

```bash
node src/tools/capsulizeRepo.js --repoPath ../agentnet
```
