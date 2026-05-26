# AASL Dependency Report

## ServiceNow Platform Dependencies

### Required Plugins

| Plugin ID | Display Name | Min Version | Dependency Order |
|-----------|-------------|-------------|-----------------|
| com.snc.ai.agent.studio | AI Agent Studio | 1.0 | 1st — no dependencies |
| com.snc.ai.control.tower | AI Control Tower | 1.0 | 2nd — requires agent.studio |
| com.snc.generative.ai.controller | Generative AI Controller | 1.0 | 3rd — requires now.assist |
| com.snc.now.assist | Now Assist Platform | 1.0 | 4th — base platform |
| com.snc.workflow.studio | Workflow Studio | 1.0 | 5th — requires agent.studio |
| com.snc.mcp.server.console | MCP Server Console | 1.0 | 6th — requires agent.studio |

**Activation Order:** agent.studio → control.tower → now.assist → generative.ai.controller → workflow.studio → mcp.server.console

### Required Roles

| Role Name | Display Name | Requires Assignee | Auto-Fixable |
|-----------|-------------|------------------|-------------|
| ai_agent_admin | AI Agent Admin | Yes | Yes (Role Provisioner) |
| ai_agent_developer | AI Agent Developer | Yes | Yes |
| ai_control_tower_admin | AI Control Tower Admin | Yes | Yes |
| now_assist_admin | Now Assist Admin | No | Yes |
| workflow_studio_admin | Workflow Studio Admin | No | Yes |

### Required System Properties

| Property Name | Expected Value | Mandatory |
|--------------|---------------|-----------|
| glide.ai.agent.studio.enabled | true | Yes |
| glide.generative.ai.controller.enabled | true | Yes |
| glide.now.assist.enabled | true | No |

## Platform Table Dependencies

| Table | Purpose | Access Pattern |
|-------|---------|---------------|
| v_plugin | Plugin state query | Read-only |
| sys_user_role | Role existence check | Read-only |
| sys_user_has_role | Role assignment CRUD | Read + Insert (provisioner) |
| sys_properties | System configuration | Read via gs.getProperty() |
| sn_ai_control_tower_config | Control Tower configuration | Read-only |
| sn_generative_ai_cfg_provider | BYOK provider config | Read-only |
| sys_user | User lookup for provisioning | Read-only |

## Custom Tables (Created by AASL)

| Table | Extends | Indexed Fields |
|-------|---------|---------------|
| x_aasl_prerequisite | Task | run_id, category, status |
| x_aasl_launchpad_run | sys_metadata | overall_score, sys_created_on |
| x_aasl_recommendation | sys_metadata | run_id, severity |
| x_aasl_byok_provider | sys_metadata | provider_name, test_result |

## External Dependencies

### BYOK Providers (Optional)

| Provider | Required Config | API Endpoint Pattern |
|----------|----------------|---------------------|
| Azure OpenAI | endpoint_url, model_family, API key | https://{resource}.openai.azure.com |
| AWS Bedrock | endpoint_url, model_family, AWS credentials | https://bedrock.{region}.amazonaws.com |
| Google Vertex AI | endpoint_url, model_family, GCP credentials | https://{region}-aiplatform.googleapis.com |
| IBM watsonx | endpoint_url, model_family, IBM Cloud credentials | https://{region}.ml.cloud.ibm.com |

## Cross-Product Dependencies

| Product | Relationship | Impact |
|---------|-------------|--------|
| ADIS (API Deprecation Impact Scanner) | Inbound | If ADIS detects deprecated APIs, AASL skips Agent Studio activation to prevent API breakage |
| CFMS (Cloud Financial Management Suite) | None | Independent |
| UIMVT (UI Migration Velocity Tracker) | None | Independent |

## Upgrade Path

- **Utah → Vancouver:** No breaking changes. All 6 plugins available.
- **Vancouver → Washington DC:** plugin IDs unchanged. Now Assist admin role renamed from `sn_now_assist.admin`.
- **Washington DC → Xanadu:** Generative AI Controller replaces Now Intelligence. BYOK table moves from `sn_now_intelligence_cfg_provider` to `sn_generative_ai_cfg_provider`.
- **Xanadu → Yokohama:** AI Control Tower promoted to platform component. Role `ai_control_tower_admin` becomes OOB.
- **Yokohama → Zurich:** MCP Server Console plugin added.
- **Zurich → Australia (TARGET):** All 6 plugins, 5 roles, 3 properties validated. BYOK for 4 providers.
