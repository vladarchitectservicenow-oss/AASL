# AASL Edge Cases

## Input Boundary Cases

1. **Empty Instance (No Plugins)** — Instance has zero plugins in `v_plugin`. ALL 6 plugin checks return FAIL. Scoring: 0/6 = 0. Estimated hours = 6*4 + 5*2 + 3*4 + ... = high. Expected: engine completes without error.
2. **Zero Roles in sys_user_role** — Fresh instance before role activation. All 5 roles return FAIL. Expected: engine reports all as missing, recommends plugin activation.
3. **BYOK Table Exists But Empty** — `sn_generative_ai_cfg_provider` table exists with zero rows. Expected: all 4 providers show NOT_CONFIGURED, not TABLE_MISSING.
4. **Single BYOK Provider Partially Configured** — Azure has endpoint_url but no model_family. Expected: `is_configured=false`, status=FAIL.
5. **AI Control Tower Table Exists But Has 0 Records** — Table present, query returns empty. Expected: status=WARN (not FAIL), actual_state=NO_RECORDS.
6. **Concurrent Scan Runs** — Two users trigger POST /scan simultaneously. Expected: each gets independent run_id, no data corruption.
7. **Very Long Instance Name** — Instance name exceeds 255 characters. Expected: truncated or accepted (field is String, not String(255) in ServiceNow).
8. **Unicode in Error Logs** — BYOK provider error_log contains CJK characters. Expected: JSON report encodes correctly.

## Failure Mode Cases

9. **REST API Called By Unauthenticated User** — Public user hits endpoint. Expected: 401 or role-based rejection.
10. **REST API GET /latest With Zero Runs** — No x_aasl_launchpad_run records exist. Expected: 404 with `{error: "No runs found."}`.
11. **Role Provisioner With Non-Existent User** — User sys_id doesn't match any sys_user record. Expected: insertion fails silently (sys_user_has_role has no FK constraint on user), but should log warning.
12. **Scheduled Job Runs During Instance Maintenance** — Instance is read-only during upgrade. Expected: engine catches exception, logs error, does not corrupt data.
13. **Transaction Rollback** — Mid-scan, a GlideRecord insert fails. Expected: previously inserted prerequisite records for this run may persist (no transaction wrapping). Documented limitation.
14. **Plugin ID Changes Between Releases** — If ServiceNow renames a plugin ID between releases, the hardcoded list in PLUGINS_REQUIRED will miss it. Expected: new plugin shows as NOT_INSTALLED with remediation hint.
