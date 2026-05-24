# Edge Cases — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Version:** v1.0.0  
**Date:** 2026-05-24

---

## Purpose

Document edge cases that are not covered by standard test scenarios. These represent boundary conditions, rare states, and pathological inputs.

---

## Edge Cases by Component

### EC-01: Zero Plugins Installed
- **Condition:** Instance has no Australia plugins whatsoever
- **Expected:** Prerequisite checker returns FAIL for all 6 plugins. Score = 0 for plugin component. Does not crash.
- **Risk:** If code assumes at least one plugin exists → `undefined` errors
- **Test:** Mock `sys_plugins` as empty array

### EC-02: Plugin Partially Active (Zombie State)
- **Condition:** Plugin `com.snc.ai_agent_studio` has `active = false` but `com.snc.ai_agent_studio.core` has `active = true`
- **Expected:** AI Agent Studio check = FAIL. Core check = PASS. Score reflects both states independently.
- **Risk:** Dependencies aren't validated → user sees green "core ready" but parent plugin missing

### EC-03: BYOK Table Exists but Empty
- **Condition:** `sn_generative_ai_cfg_provider` table exists with 0 rows
- **Expected:** BYOK check = NOT_CONFIGURED. Score cap = 60. No error.
- **Risk:** Distinction between TABLE_MISSING and TABLE_EMPTY

### EC-04: BYOK Table Has Corrupt Row
- **Condition:** `sn_generative_ai_cfg_provider` has a row with null provider name and missing endpoint
- **Expected:** Validator skips corrupt row; counts only valid providers. Does not crash.
- **Risk:** `getValue()` on null field returns `null` → string operation throws TypeError

### EC-05: Concurrent Scans
- **Condition:** Two `POST /launchpad/scan` calls arrive simultaneously
- **Expected:** Both succeed; each creates its own `x_aasl_launchpad_run` record. No locking needed (read-only checks).
- **Risk:** Deadlock if engine writes to shared state

### EC-06: API Call with Malformed JSON Body
- **Condition:** `POST /launchpad/scan` with `Content-Type: application/json` but body is `{malformed`
- **Expected:** HTTP 400. No scan executed. Error logged.
- **Risk:** JSON parse error crashes the request processor

### EC-07: API Call with Missing Auth Header
- **Condition:** `GET /launchpad/latest` without Authorization header
- **Expected:** HTTP 401. Response body does not leak instance information.
- **Risk:** Unauthenticated response reveals table names or structure

### EC-08: Export When No Scan Has Run
- **Condition:** `GET /launchpad/latest` called before any scan exists
- **Expected:** HTTP 200 (or 404) with message "No scans found". Not 500.
- **Risk:** `getValue('sys_id')` on empty GlideRecord returns null → TypeError

### EC-09: Export Format Not Supported
- **Condition:** `GET /launchpad/export?format=xml`
- **Expected:** HTTP 400 with message "Unsupported format. Use json or csv."
- **Risk:** Falls through to default → tries to generate XML → crashes

### EC-10: Score = Exactly 60 (BYOK Gate Boundary)
- **Condition:** Non-BOK components = 60/85 possible. BYOK = 0/15. Total = 60/100.
- **Expected:** Score = 60. Tier = "ALMOST" (not "PARTIAL").
- **Risk:** Off-by-one: score 60 should be ALMOST (≥60), not PARTIAL (<60)

### EC-11: Score = Exactly 80 (READY Boundary)
- **Condition:** Score = 80 exactly
- **Expected:** Tier = READY
- **Risk:** Off-by-one: READY should be ≥80, not >80

### EC-12: Score = Exactly 40 (PARTIAL Boundary)
- **Condition:** Score = 40 exactly
- **Expected:** Tier = PARTIAL
- **Risk:** Off-by-one: PARTIAL should be 40-59

### EC-13: User Has No Roles at All
- **Condition:** User passed to `AASLRoleProvisioner` has zero existing roles
- **Expected:** Role provisioner assigns requested roles. No error from empty `sys_user_has_role` query.
- **Risk:** `gr.next()` returns false immediately → code assumes at least one row exists

### EC-14: Recommendation for All-FAIL Scan
- **Condition:** Every single check returns FAIL
- **Expected:** 18+ recommendations generated (one per check). No duplicates. No null recommendations.
- **Risk:** Array overflow or duplicate recommendations

### EC-15: Instance Version Returns Unexpected String
- **Condition:** `gs.getProperty('instance_version')` returns `tokyo` or `null`
- **Expected:** Version check falls into UNSUPPORTED path. Does not crash.
- **Risk:** String comparison on null → crash

---

## Edge Case Priority

| Priority | Count | Action |
|----------|-------|--------|
| P0 (Critical) | EC-01, EC-04, EC-08, EC-10, EC-11, EC-12 | Must pass before release |
| P1 (High) | EC-02, EC-06, EC-07, EC-13, EC-15 | Should pass; fix in sprint |
| P2 (Medium) | EC-03, EC-05, EC-09, EC-14 | Nice to have |

---

*Edge Cases — AASL v1.0.0*
