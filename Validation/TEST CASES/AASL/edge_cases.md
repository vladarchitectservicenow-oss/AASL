# Edge Cases: AASL

Author: Vladimir Kapustin | License: AGPL-3.0-only

---

1. **Empty instance** — zero plugins, zero roles, zero properties, no BYOK table.
   Expected: scan completes, score = 0, no exceptions, recommendations populated
   for every missing prerequisite.

2. **>5000 findings** — a scan that would exceed the `maxRecs` cap. Expected:
   exactly 5000 rows persisted, no runaway writes, no error.

3. **Null/empty property values** — a mandatory system property exists but is
   empty string. Expected: treated as FAIL with a remediation hint, not a crash.

4. **Missing BYOK table** — `sn_generative_ai_cfg_provider` absent (vanilla PDI).
   Expected: all providers reported NOT_CONFIGURED (INFO severity), no throw.

5. **Unrecognized BYOK provider** — a configured provider whose `provider_name`
   does not match the four known keys. Expected: not counted as PASS; reported
   honestly rather than misclassified.

6. **Unicode / special characters** — instance names, provider names, or field
   values containing non-ASCII characters. Expected: persisted and rendered
   correctly in HTML/JSON/CSV without encoding corruption.

7. **Concurrent scans** — two `runFullScan()` invocations overlapping.
   Expected: each produces an independent, consistent run record (no race on
   shared state).

8. **Duplicate role assignment race** — two near-simultaneous grants for the same
   user/role. Expected: idempotency check prevents duplicate `sys_user_has_role`
   rows.

9. **Invalid user sys_id** — `grantRole()` called with a nonexistent user sys_id.
   Expected: clean failure message, no partial state.

10. **Nonexistent role name** — `grantRole()` called with an unknown role.
    Expected: returns `success: false` with a clear message, no insert.

11. **Score boundary — all WARN** — every check returns WARN. Expected:
    score = 50 (half weight), no division-by-zero.

12. **Score boundary — zero total** — total checks resolves to 0. Expected:
    score = 0 via the `total > 0` guard, no NaN/Infinity.

13. **Timeouts / oversized report** — very large HTML/JSON report blob.
    Expected: generation completes without stack overflow; blob stored intact.
