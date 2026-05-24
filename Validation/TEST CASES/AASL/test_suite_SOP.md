# Test Suite SOP — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Version:** v1.0.0  
**Date:** 2026-05-24  
**Document Version:** 1.0

---

## Overview

This SOP defines the complete test suite for AASL. All tests use the **Node.js mock runtime** pattern (see `servicenow-product-development` skill). The mock runtime simulates ServiceNow GlideRecord, GlideSystem, and sys_properties behavior.

---

## Test Environment Setup

```bash
# 1. Navigate to test directory
cd /home/crixus/agentic-loop/output/AASL/tests

# 2. Verify Node.js
node --version  # Requires v16+

# 3. Run all tests
node test_prerequisite_checker.js
node test_launchpad_e2e.js
```

---

## Test Scenarios

### Scenario 1: Full Scan — All Pass (READY)

**ID:** TC-AASL-001  
**Priority:** P0 (Critical)  
**Precondition:** All 6 plugins active, 5 roles assigned, 3 properties true, AI Control Tower enabled, 1 BYOK provider configured  
**Steps:**
1. Initialize `AASLLaunchpadEngine`
2. Call `engine.runFullScan()`
3. Validate result.overall_score

**Expected:** `score = 100`, `tier = "READY"`, `estimated_hours = 1`

---

### Scenario 2: No BYOK Provider — Score Capped

**ID:** TC-AASL-002  
**Priority:** P0 (Critical)  
**Precondition:** All plugins/roles/properties pass, but ZERO BYOK providers configured  
**Steps:**
1. Initialize engine with BYOK=empty state
2. Call `engine.runFullScan()`
3. Validate score cap

**Expected:** `score ≤ 60`, `tier = "PARTIAL"` or lower

---

### Scenario 3: All Fail (NOT READY)

**ID:** TC-AASL-003  
**Priority:** P0 (Critical)  
**Precondition:** No plugins, no roles, no properties, no BYOK  
**Steps:**
1. Initialize with empty state
2. Run scan
3. Check score and tier

**Expected:** `score ≤ 39`, `tier = "NOT READY"`, recommendations generated for every failure

---

### Scenario 4: Partial — Plugins Missing

**ID:** TC-AASL-004  
**Priority:** P1 (High)  
**Precondition:** AI Agent Studio plugin inactive; all else PASS  
**Steps:**
1. Set `com.snc.ai_agent_studio` to inactive
2. Run scan
3. Verify plugin check returns FAIL

**Expected:** Plugin check = FAIL, score deducted by 5 points (30% / 6), recommendation generated with plugin name

---

### Scenario 5: TABLE_MISSING Graceful Handling

**ID:** TC-AASL-005  
**Priority:** P0 (Critical)  
**Precondition:** `sn_generative_ai_cfg_provider` table does not exist  
**Steps:**
1. Remove BYOK table from mock DB
2. Run `AASLBYOKValidator`
3. Check return value

**Expected:** Returns `NOT_CONFIGURED` with `severity: "INFO"`, not error/exception. Score unaffected (BYOK check excluded from total).

---

### Scenario 6: Idempotent Role Provisioning

**ID:** TC-AASL-006  
**Priority:** P1 (High)  
**Precondition:** User already has role `ai_agent_admin`  
**Steps:**
1. Run `AASLRoleProvisioner.assignRoles(userId)`
2. Run same call again
3. Verify no duplicate role assignments

**Expected:** Role count = 2 (original + 1 new, no duplicate). Second call changes nothing.

---

### Scenario 7: REST API — POST Scan

**ID:** TC-AASL-007  
**Priority:** P1 (High)  
**Precondition:** API endpoint registered  
**Steps:**
1. POST `/api/x_aasl/launchpad/scan` with valid auth
2. Read response

**Expected:** HTTP 200, JSON with `run_id`, `score`, `tier`, `estimated_hours`, `checks[]`

---

### Scenario 8: REST API — GET Latest

**ID:** TC-AASL-008  
**Priority:** P1 (High)  
**Precondition:** At least one scan completed  
**Steps:**
1. GET `/api/x_aasl/launchpad/latest`
2. Validate response schema

**Expected:** HTTP 200, matches last scan result

---

### Scenario 9: REST API — Unauthorized Access

**ID:** TC-AASL-009  
**Priority:** P1 (High)  
**Precondition:** User lacks `x_aasl.admin` role  
**Steps:**
1. POST `/api/x_aasl/launchpad/scan` with non-admin user
2. Read response

**Expected:** HTTP 403 or 401. No scan executed.

---

### Scenario 10: Export — JSON Format

**ID:** TC-AASL-010  
**Priority:** P2 (Medium)  
**Precondition:** Scan completed  
**Steps:**
1. GET `/api/x_aasl/launchpad/export?format=json`
2. Validate JSON structure

**Expected:** HTTP 200, valid JSON, no credential data in output

---

### Scenario 11: Export — CSV Format

**ID:** TC-AASL-011  
**Priority:** P2 (Medium)  
**Precondition:** Scan completed  
**Steps:**
1. GET `/api/x_aasl/launchpad/export?format=csv`
2. Validate CSV structure

**Expected:** HTTP 200, Content-Type: text/csv, proper headers

---

### Scenario 12: BYOK Provider — Azure OpenAI Configured

**ID:** TC-AASL-012  
**Priority:** P2 (Medium)  
**Precondition:** Azure OpenAI configured in `sn_generative_ai_cfg_provider`  
**Steps:**
1. Run BYOK validator
2. Check Azure OpenAI status

**Expected:** `configured = true, tested = true` (if test available)

---

### Scenario 13: BYOK Provider — Credential Masking in Export

**ID:** TC-AASL-013  
**Priority:** P0 (Critical)  
**Precondition:** BYOK provider with API key configured  
**Steps:**
1. Run scan
2. Export report to JSON
3. Search for API key string in output

**Expected:** No credential values present in export. Endpoint shown as `https://***` or similar masking.

---

## Test Execution Protocol

1. Run scenarios in priority order: P0 → P1 → P2
2. Any P0 failure = BLOCKED (stop testing, fix immediately)
3. P1 failures = document + continue (fix in next sprint)
4. P2 failures = log as known issue
5. All results recorded in `test_results_YYYY-MM-DD.json`

---

## Test Data

| Mock Table | Rows Used | Notes |
|-----------|-----------|-------|
| `sys_plugins` | 6 | Plugin activation state |
| `sys_user_has_role` | 5 | Role assignments |
| `sys_properties` | 3 | System properties |
| `sn_generative_ai_cfg_provider` | 0-4 | BYOK providers |
| `x_aasl_launchpad_run` | Variable | Scan records |

---

## Pass/Fail Criteria

| Status | Criteria |
|--------|----------|
| PASS | Actual result matches expected exactly |
| PARTIAL_PASS | Core functionality works; minor discrepancy |
| FAIL | Core functionality broken or returns wrong result |
| SKIP | Test cannot be executed (e.g., requires PDI) |

---

*Test Suite SOP — AASL v1.0.0*
