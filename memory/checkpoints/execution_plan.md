# AASL Execution Plan

## Build Phase Overview

| Phase | Name | Owner | Duration | Status |
|-------|------|-------|----------|--------|
| 0 | Architecture Planning | Architect | 2h | COMPLETE |
| 1 | Table Definitions + sys_app.xml | Developer | 1h | COMPLETE |
| 2 | AASLPrerequisiteChecker | Developer | 3h | COMPLETE |
| 3 | AASLBYOKValidator | Developer | 2h | COMPLETE |
| 4 | AASLRoleProvisioner | Developer | 1.5h | COMPLETE |
| 5 | AASLLaunchpadEngine | Developer | 2h | COMPLETE |
| 6 | AASLReportGenerator | Developer | 1.5h | COMPLETE |
| 7 | AASLRESTAPI | Developer | 1h | COMPLETE |
| 8 | Business Rules + Scheduled Jobs | Developer | 1h | COMPLETE |
| 9 | Unit Tests | QA | 3h | COMPLETE |
| 10 | E2E Tests | QA | 2h | COMPLETE |
| 11 | PDI Smoke Test | QA | 1h | PENDING |
| 12 | Documentation (README, Marketing) | Tech Writer | 2h | COMPLETE |
| 13 | LICENSE + Copyright Headers | Legal | 0.5h | IN PROGRESS |
| 14 | Git Push + Release | DevOps | 0.5h | PENDING |

## Detailed Build Actions

### Phase 1: Table Definitions
- Action: Create `x_aasl_launchpad_run`, `x_aasl_prerequisite`, `x_aasl_recommendation`, `x_aasl_byok_provider` tables
- Artifacts: `src/tables.xml`, `src/sys_app.xml`
- Verification: Tables accessible via REST API explorer

### Phase 2: Prerequisite Checker
- Action: Implement plugin scan (6 plugins via `v_plugin`), role scan (5 roles via `sys_user_role` + `sys_user_has_role`), property scan (3 props via `gs.getProperty()`), AI Control Tower scan (`sn_ai_control_tower_config`)
- Artifact: `src/AASLPrerequisiteChecker.js`
- Verification: Returns array of prerequisite objects with PASS/WARN/FAIL status

### Phase 3: BYOK Validator
- Action: Query `sn_generative_ai_cfg_provider` for Azure OpenAI, Bedrock, Vertex AI, watsonx
- Artifact: `src/AASLBYOKValidator.js`
- Verification: Returns provider status objects with configuration and test result data

### Phase 4: Role Provisioner
- Action: Idempotent grant/revoke of AI roles; query `sys_user_has_role` before insert
- Artifact: `src/AASLRoleProvisioner.js`
- Verification: Safe to call repeatedly; no duplicate role assignments

### Phase 5: Launchpad Engine
- Action: Orchestrate scan → score → recommendations → persist → report
- Artifact: `src/AASLLaunchpadEngine.js`
- Verification: runFullScan() returns {run_id, overall_score, counts, estimated_hours}

### Phase 6: Report Generator
- Action: Generate HTML dashboard, JSON payload, CSV export
- Artifact: `src/AASLReportGenerator.js`
- Verification: All three formats parse correctly

### Phase 7: REST API
- Action: POST /scan triggers full scan; GET /latest returns most recent run
- Artifact: `src/AASLRESTAPI.js`
- Verification: curl POST and GET return correct HTTP status and JSON

### Phase 8: Business Rules + Scheduled Jobs
- Action: Recalculate parent run score on prerequisite insert/update; auto-populate instance_name
- Action: Daily delta scan at 02:00; weekly full scan Monday 03:00
- Artifact: Business rules in sys_app.xml, scheduled jobs as sysauto_script
- Verification: Scheduled jobs appear in sysauto list

### Phase 9–10: Testing
- Action: Unit tests for all 6 Script Includes with GlideRecord mocks
- Action: E2E test for full runFullScan() → report flow
- Artifacts: `tests/test_prerequisite_checker.py`, `tests/test_launchpad_e2e.js` (Node.js mocks)
- Verification: All tests pass

### Phase 13: LICENSE
- Action: Add FULL AGPL-3.0 license text (675 lines) with copyright header
- Action: Verify all src/*.js files have copyright header
- Verification: `grep -c "Vladimir Kapustin" LICENSE` >= 2

### Phase 14: Deployment
- Action: `git add -A`, `git commit`, `git push origin main`
- Action: Verify via `raw.githubusercontent.com` README word count and LICENSE copyright
- Action: Write DONE.marker in separate commit
