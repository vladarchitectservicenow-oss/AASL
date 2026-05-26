# AASL Test Suite — Standard Operating Procedure

## Overview

This document defines the complete test suite for AI Agent Studio Launchpad (AASL). All scenarios MUST pass before any git push. Tests use Node.js mocks for ServiceNow APIs (GlideRecord, GlideDateTime, gs, Class.create).

## Prerequisites

```bash
node --version    # >= 18.x
node tests/test_prerequisite_checker.js
node tests/test_launchpad_e2e.js
```

## Test Scenarios

### Scenario 1: Full Plugin Scan — All Active (PASS)

**Given:** All 6 required plugins are active in `v_plugin`  
**When:** `AASLPrerequisiteChecker.runFullScan()` is invoked  
**Then:** All 6 plugin results have status "PASS"  
**Expected Output:** `[{category: "PLUGIN", status: "PASS", ...}, x6]`

### Scenario 2: Plugin Scan — One Missing (FAIL)

**Given:** `com.snc.mcp.server.console` is NOT in `v_plugin`  
**When:** `runFullScan()` is invoked  
**Then:** MCP Server Console plugin has status "FAIL", remediation hint includes "Install plugin"  
**Expected Output:** 5 PASS + 1 FAIL for missing plugin

### Scenario 3: Role Scan — All Present and Assigned (PASS)

**Given:** All 5 roles exist in `sys_user_role` and have at least 1 assignee in `sys_user_has_role`  
**When:** `runFullScan()` is invoked  
**Then:** All 5 role results have status "PASS"

### Scenario 4: Role Scan — Role Exists But Unassigned (WARN)

**Given:** `ai_agent_admin` role exists but has zero assignees  
**When:** `runFullScan()` is invoked  
**Then:** ai_agent_admin has status "WARN", auto_fixable is true

### Scenario 5: Role Scan — Role Does Not Exist (FAIL)

**Given:** `ai_agent_admin` role is not in `sys_user_role` table  
**When:** `runFullScan()` is invoked  
**Then:** ai_agent_admin has status "FAIL", auto_fixable is false

### Scenario 6: System Property Scan — All Correct (PASS)

**Given:** All 3 properties are set to expected values (`glide.ai.agent.studio.enabled=true`, `glide.generative.ai.controller.enabled=true`, `glide.now.assist.enabled=true`)  
**When:** `runFullScan()` is invoked  
**Then:** All 3 property results have status "PASS"

### Scenario 7: System Property Scan — Mandatory Property Missing (FAIL)

**Given:** `glide.ai.agent.studio.enabled` returns "NOT_SET"  
**When:** `runFullScan()` is invoked  
**Then:** Property has status "FAIL" (mandatory=true), auto_fixable is true

### Scenario 8: AI Control Tower — Enabled (PASS)

**Given:** `sn_ai_control_tower_config` table exists and has a record with `enabled=true`  
**When:** `runFullScan()` is invoked  
**Then:** AI Control Tower result has status "PASS"

### Scenario 9: AI Control Tower — Table Missing (FAIL)

**Given:** `sn_ai_control_tower_config` table does not exist (plugin not active)  
**When:** `runFullScan()` is invoked  
**Then:** AI Control Tower result has status "FAIL", remediation hint includes "Install com.snc.ai.control.tower"

### Scenario 10: AI Control Tower — Exists But Disabled (FAIL)

**Given:** Table exists, record found, but `enabled=false`  
**When:** `runFullScan()` is invoked  
**Then:** Status "FAIL", actual_state="DISABLED"

### Scenario 11: BYOK Validator — All Providers Configured and Tested (PASS)

**Given:** `sn_generative_ai_cfg_provider` has 4 records (azure_openai, bedrock, vertex_ai, watsonx) all with endpoint_url, model_family, and test_result=SUCCESS  
**When:** `AASLBYOKValidator.scanProviders()` is invoked  
**Then:** All 4 providers have status "PASS"

### Scenario 12: BYOK Validator — Table Missing (FAIL across all)

**Given:** `sn_generative_ai_cfg_provider` table does not exist  
**When:** `scanProviders()` is invoked  
**Then:** All 4 providers have status "FAIL", remediation hints mention "Configure ... in Generative AI Controller"

### Scenario 13: BYOK Validator — Configured But Last Test Failed (WARN)

**Given:** Azure OpenAI has endpoint_url and model_family, but test_result="FAIL"  
**When:** `scanProviders()` is invoked  
**Then:** Azure OpenAI has status "WARN", hint mentions "last test failed"

### Scenario 14: Full Engine Run — Scoring with BYOK Missing

**Given:** All plugins PASS, all roles PASS, all properties PASS, AI Control Tower PASS, but zero BYOK providers configured  
**When:** `AASLLaunchpadEngine.runFullScan()` is invoked  
**Then:** overall_score is calculated but CAPPED at 60 (BYOK missing), estimated_hours includes +16 for BYOK

### Scenario 15: Full Engine Run — Perfect Score

**Given:** All checks PASS including at least one BYOK provider  
**When:** `runFullScan()` is invoked  
**Then:** overall_score = 100, pass_count = total_checks, fail_count = 0, estimated_hours = 0

### Scenario 16: Role Provisioner — Idempotent Grant

**Given:** User sys_id exists, `ai_agent_admin` role exists, user already has role assigned  
**When:** `AASLRoleProvisioner.grantRole(userSysId, "ai_agent_admin")` is invoked  
**Then:** Returns `{success: true, alreadyHad: true}` — no duplicate insert

### Scenario 17: Role Provisioner — Role Does Not Exist

**Given:** Role "nonexistent_role" not in `sys_user_role`  
**When:** `grantRole(userSysId, "nonexistent_role")` is invoked  
**Then:** Returns `{success: false, message: "Role 'nonexistent_role' does not exist."}`

### Scenario 18: REST API — POST Scan (201)

**Given:** Valid REST API request with authenticated user  
**When:** POST /api/x_aasl/launchpad/scan is invoked  
**Then:** Status 201, JSON body contains {run_id, overall_score, total_checks, ...}

### Scenario 19: REST API — GET Latest (200)

**Given:** At least one x_aasl_launchpad_run record exists  
**When:** GET /api/x_aasl/launchpad/latest is invoked  
**Then:** Status 200, JSON body contains {run_id, instance, score, total, pass, warn, fail, estimated_hours, report_json}

### Scenario 20: REST API — Invalid Action (400)

**Given:** REST API request with unsupported method/action combo  
**When:** GET /api/x_aasl/launchpad/scan is invoked  
**Then:** Status 400, error message "Invalid action"

## Execution Record

| Date | Run ID | Scenarios Passed | Scenarios Failed | Notes |
|------|--------|-----------------|-----------------|-------|
| | | | | |
