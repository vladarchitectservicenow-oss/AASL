# AASL Regression Test Cases

## Purpose
Ensure changes to AASL do not break existing functionality. These cases must pass on every release.

## Cases

1. **Plugin Scan Returns Exactly 6 Results** — Regression: Adding/removing plugins silently changes scan scope. Verify `runFullScan()` produces exactly 6 PLUGIN-category prerequisites regardless of code changes.
2. **Role Scan Returns Exactly 5 Results** — Regression: Role name changes between releases. Verify 5 ROLE-category results with correct naming.
3. **Property Scan Returns Exactly 3 Results** — Regression: Property list must not drift. Verify 3 PROPERTY-category results.
4. **Scoring Formula Stable** — Score = (pass*1.0 + warn*0.5 + fail*0.0)/total*100. Verify with known inputs: 10 pass, 5 warn, 5 fail → (10+2.5+0)/20*100 = 62.5.
5. **BYOK Cap at 60 Active** — If 0 BYOK providers configured, max score ≤ 60 even if all other checks pass.
6. **Critical Cap at 70 Active** — If any Critical recommendation exists, max score ≤ 70.
7. **Auto-Fixable Flag Correct** — Properties always auto_fixable=true. Roles with exists&&!assigned: auto_fixable=true. Roles not exists: auto_fixable=false. Plugins: always auto_fixable=false.
8. **Idempotent Role Grant** — Calling grantRole twice for same user+role returns alreadyHad=true on second call, no duplicate sys_user_has_role row.
9. **Report Generator HTML Contains All Sections** — HTML output must contain: score badge, pass/warn/fail counts, prerequisite table, recommendation list, BYOK status.
10. **Report Generator JSON Valid** — JSON output must parse successfully with JSON.parse() and contain all expected keys.
11. **REST API Response Times Under Threshold** — GET /latest < 500ms, POST /scan < 5s.
12. **No Credential Leakage in Reports** — BYOK report sections must NOT contain raw API keys or endpoint URLs (scrubbed).
