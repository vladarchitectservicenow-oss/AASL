# AASL Dependency Report

**Product:** AI Agent Studio Launchpad (AASL)
**Author:** Vladimir Kapustin
**License:** AGPL-3.0-only

---

## 1. ServiceNow Plugin Dependencies

| Plugin ID | Label | Minimum | Criticality |
|-----------|-------|---------|-------------|
| `com.snc.ai.agent.studio` | AI Agent Studio | 1.0 | Critical |
| `com.snc.ai.control.tower` | AI Control Tower | 1.0 | Critical |
| `com.snc.generative.ai.controller` | Generative AI Controller | 1.0 | Critical |
| `com.snc.now.assist` | Now Assist Platform | 1.0 | High |
| `com.snc.workflow.studio` | Workflow Studio | 1.0 | High |
| `com.snc.mcp.server.console` | MCP Server Console | 1.0 | Medium |

These six plugins are enumerated in `AASLPrerequisiteChecker.PLUGINS_REQUIRED`.
Missing plugins degrade the readiness score but do not break application startup —
the checker reports each as FAIL with a remediation hint.

## 2. Role Dependencies

| Role | Label | Requires Assignee |
|------|-------|-------------------|
| `ai_agent_admin` | AI Agent Admin | Yes |
| `ai_agent_developer` | AI Agent Developer | Yes |
| `ai_control_tower_admin` | AI Control Tower Admin | Yes |
| `now_assist_admin` | Now Assist Admin | No |
| `workflow_studio_admin` | Workflow Studio Admin | No |

`AASLRoleProvisioner` grants these roles idempotently, checking
`sys_user_has_role` for existing assignments before inserting.

## 3. System Properties

| Property | Expected | Mandatory |
|----------|----------|-----------|
| `glide.ai.agent.studio.enabled` | `true` | Yes |
| `glide.generative.ai.controller.enabled` | `true` | Yes |
| `glide.now.assist.enabled` | `true` | No |

## 4. Data Tables (Cross-Scope Read)

| Table | Access Mode | Purpose |
|-------|-------------|---------|
| `sn_generative_ai_cfg_provider` | Read | BYOK provider detection |
| `sys_user_has_role` | Read/Write | Role assignment + idempotency check |
| `sys_user_role` | Read | Role sys_id resolution |
| `sys_user` | Read | Assignee target |

Cross-scope access to `sn_generative_ai_cfg_provider` requires a cross-scope
privilege grant from the Generative AI Controller application. Without it,
`GlideRecord` queries silently return zero rows (see Pitfalls).

## 5. External Dependencies

- **BYOK backends (runtime):** Azure OpenAI, AWS Bedrock, Google Vertex AI,
  IBM watsonx. Validated for presence/configuration only — AASL never stores
  or transmits provider credentials.
- **REST API consumers (CI/CD):** any HTTPS client capable of Basic/Bearer auth
  against the instance.

## 6. Test Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 16+ | Script Include mock-runtime tests (`tests/*.js`) |
| Python | 3.10+ | Python prerequisite tests (`tests/*.py`) |
| pytest | 8+ | Python test runner |

## 7. Build/Deploy Dependencies

- `src/sys_app.xml` — scoped application definition (import via Studio).
- `src/tables.xml` — custom table definitions for the `x_aasl_*` data model.

## 8. Risk of Missing Dependencies

- Missing **Generative AI Controller** → BYOK validation returns NOT_CONFIGURED
  for all providers; score capped at 60.
- Missing **AI Agent Studio** → core launchpad functionality is inoperable;
  scan still completes but readiness is scored FAIL.
- Missing **cross-scope grant** → BYOK table query returns empty (silent).
