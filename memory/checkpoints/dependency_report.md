# Dependency Report — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Release:** ServiceNow Australia (2026)  
**Date:** 2026-05-24  
**Status:** Phase 1

---

## 1. ServiceNow Platform Dependencies

### Required Plugins (Australia Release)

| Plugin ID | Plugin Name | Mandatory | Auto-Activate | Notes |
|-----------|-------------|-----------|---------------|-------|
| `com.snc.ai_agent_studio` | AI Agent Studio | ✅ Yes | ❌ No | Core AI agent builder; requires admin activation |
| `com.snc.ai_agent_studio.core` | AI Agent Studio Core | ✅ Yes | ❌ No | Runtime engine for AI agents |
| `com.snc.generative_ai_controller` | Generative AI Controller | ✅ Yes | ❌ No | BYOK management and model routing |
| `com.snc.now_assist` | Now Assist | ✅ Yes | ❌ No | Enables AI skills catalog |
| `com.snc.workflow_studio` | Workflow Studio | ✅ Yes | ❌ No | Flows + AI integration runtime |
| `com.snc.mcp_server_console` | MCP Server Console | ⚠️ Optional | ❌ No | External MCP server management |

**Total required: 5 mandatory + 1 optional**

### Required System Properties

| Property | Expected Value | Impact if Missing |
|----------|---------------|-------------------|
| `glide.ai_agent_studio.enabled` | `true` | AI Agent Studio UI not available |
| `glide.generative_ai_controller.enabled` | `true` | BYOK provider configuration blocked |
| `glide.now_assist.enabled` | `true` | Skills catalog unavailable |

### Required Roles

| Role | Purpose | Provisioning |
|------|---------|-------------|
| `ai_agent_admin` | Manage AI Agent configurations | Manual |
| `ai_agent_developer` | Build and test AI agents | Manual |
| `ai_control_tower_admin` | AI Control Tower management | Manual |
| `now_assist_admin` | Now Assist skill configuration | Manual |
| `workflow_studio_admin` | Flow and workflow management | Manual |

### Required Tables (External)

| Table | Read/Write | Purpose |
|-------|-----------|---------|
| `sn_generative_ai_cfg_provider` | Read | BYOK provider status |
| `sys_plugins` | Read | Plugin activation state |
| `sys_user_has_role` | Read/Write | Role assignment audit |
| `sys_properties` | Read | System property values |
| `sys_choice` | Read | Choice set integrity |

**Note:** `sn_generative_ai_cfg_provider` may be absent on vanilla PDIs without Australia plugins installed. When absent, return `NOT_CONFIGURED` with `severity: INFO` — this is expected, not a failure.

---

## 2. External Dependencies

### CI/CD & Development

| Dependency | Version | Purpose | Criticality |
|-----------|---------|---------|-------------|
| Git | 2.x+ | Version control | Medium (deferred push acceptable) |
| GitHub (`vladarchitectservicenow-oss`) | — | Repository hosting | Medium |
| Python 3 (for export tooling) | 3.9+ | Report generation scripts | Low (optional) |

### Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Primary target; Next Experience certified |
| Firefox | 88+ | Supported |
| Edge | 90+ | Chromium-based; full support |
| Safari | 14+ | Limited testing; UI16 only |

### REST API Dependencies

| External API | Protocol | Auth | Rate Limit | Failure Mode |
|-------------|----------|------|-----------|--------------|
| GitHub API | REST/HTTPS | PAT (classic) | 5000/hr | Degraded (reports stored locally) |
| PDI (dev362840) | SOAP/REST v2 | Basic Auth | None | App non-functional without target instance |

---

## 3. AASL Internal Dependency Graph

```
AASLLaunchpadEngine
├── AASLPrerequisiteChecker
│   ├── sys_plugins (Read)
│   ├── sys_user_has_role (Read)
│   ├── sys_properties (Read)
│   └── sys_choice (Read)
├── AASLBYOKValidator
│   └── sn_generative_ai_cfg_provider (Read)
├── AASLRoleProvisioner
│   └── sys_user_has_role (Write)
└── AASLReportGenerator
    ├── x_aasl_launchpad_run (Read)
    ├── x_aasl_prerequisite (Read)
    └── x_aasl_recommendation (Read)

AASLRESTAPI
├── AASLLaunchpadEngine (Invoke)
│   ├── POST /api/x_aasl/launchpad/scan
│   └── GET /api/x_aasl/launchpad/{latest,id}
└── AASLReportGenerator (Invoke)
    └── GET /api/x_aasl/launchpad/export
```

---

## 4. Cross-Scope Access Requirements

| Source Scope | Target Table | Operation | Permission Needed |
|-------------|-------------|-----------|-------------------|
| `x_aasl` | `sys_plugins` (global) | Read | Default allowed |
| `x_aasl` | `sys_user_has_role` (global) | Read/Write | Cross-scope access grant required |
| `x_aasl` | `sys_properties` (global) | Read | Default allowed |
| `x_aasl` | `sn_generative_ai_cfg_provider` | Read | Cross-scope access grant required |

**Risk:** Without cross-scope access grants, `sys_user_has_role` writes will silently fail. This must be tested explicitly.

---

## 5. Version Compatibility Matrix

| ServiceNow Release | AASL Support | Notes |
|-------------------|-------------|-------|
| Australia (2026) | ✅ Full | Primary target |
| Zurich (2025) | ⚠️ Partial | Missing Agent Studio, Generative AI Controller |
| Yokohama (2025) | ❌ Unsupported | Missing core plugins |
| Vancouver | ❌ Unsupported | Pre-AI Agent Studio era |

**Minimum release:** Zurich (for AI Control Tower access). Full functionality requires Australia.

---

## 6. Dependency Risk Assessment

| Dependency | Risk Level | Rationale | Mitigation |
|-----------|-----------|-----------|------------|
| `sn_generative_ai_cfg_provider` | **HIGH** | Table missing on vanilla PDIs | Graceful NOT_CONFIGURED handling |
| Cross-scope access grants | **HIGH** | Silent failures if missing | Explicit test in CI; document manual steps |
| Plugin activation (6 plugins) | **MEDIUM** | Admin-only; no API for programmatic activation | Clear manual instructions in checklist |
| `sys_user_has_role` writes | **MEDIUM** | Requires cross-scope privileges | Idempotent design; never fails destructive |
| AI Control Tower | **MEDIUM** | May be absent on older instances | Score gracefully degrades |
| GitHub API for export | **LOW** | Optional; reports stored locally as fallback | Local storage always available |

---

## 7. Dependency Update Cadence

| Dependency | Update Frequency | Monitoring Signal |
|-----------|-----------------|-------------------|
| ServiceNow plugins | Per-release (6 months) | Instance scan on each run |
| System properties | Per-release | Live property read |
| Cross-scope grants | Once, at install | Check on first run; alert if revoked |
| External APIs | Continuous | HTTP status codes on each call |

---

## 8. Bootstrapping Sequence (Installation Order)

1. Activate required plugins (order matters — now_assist before ai_agent_studio)
2. Grant cross-scope access (`x_aasl` → global tables)
3. Install AASL scoped app (`sys_app.xml` + tables)
4. Assign `x_aasl.admin` role to administrators
5. Run first scan — verify no "TABLE_MISSING" errors
6. Verify REST endpoints respond with 200

---

*Phase 1 dependency report — AASL v1.0.0*
