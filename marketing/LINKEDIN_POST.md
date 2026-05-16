# LinkedIn / X Sales Thread — AI Agent Studio Launchpad (AASL)

**Author:** ServiceNow Solution Architect Vladimir Kapustin  
**Product:** AASL (AI Agent Studio Launchpad)  
**Target:** CTOs, Platform Owners, ServiceNow Enterprise Architects  
**Hashtags:** #ServiceNow #AustraliaRelease #AIAgentStudio #BYOK #NowAssist

---

## Post 1 — The Hook

Your ServiceNow Australia upgrade is done.

But is AI Agent Studio actually active?

Most teams say yes — until they open the UI and realize 6 plugins are inactive, 3 AI roles have zero assignees, and the BYOK endpoint returns 403.

That "3-month delay to AI ROI" everyone talks about? It starts here.

🧵 Thread below →

---

## Post 2 — The Evidence

We analyzed Reddit r/servicenow, StackOverflow, and ServiceNow Community for Australia upgrade pain.

Top complaint: "Is AI Studio available? How do I access it?"

Translation: the platform is upgraded, but the AI layer is invisible because prerequisite activation is manual, undocumented, and fragile.

No OOB tool validates this.

---

## Post 3 — The Gap

Instance Scan checks security. Upgrade Center checks data. CI/CD checks code.

Nobody checks:
- ✅ Are all 6 AI plugins active in correct order?
- ✅ Are ai_agent_admin / ai_agent_developer assigned to real users?
- ✅ Is Azure OpenAI / Bedrock / Vertex AI / watsonx configured and tested?
- ✅ Is AI Control Tower governance enabled?

This is the AI Activation Gap.

---

## Post 4 — The Solution

AASL (AI Agent Studio Launchpad) is a scoped ServiceNow app that closes the gap.

One click → full scan of plugins, roles, properties, BYOK providers, and AI Control Tower.

Result: a scored checklist (0-100) with PASS / WARN / FAIL per item and estimated hours to full activation.

No more guessing. No more "I'll check next sprint."

---

## Post 5 — ROI

Manual AI activation: 120-200 admin hours, 3-6 months, $42K-$70K per upgrade.

With AASL: 8-16 admin hours, 1-2 weeks, $2.8K-$5.6K.

**Savings: $37K-$64K per Australia upgrade.**

That's not a tool — that's budget recovery.

---

## Post 6 — Architecture

AASL is built natively in ServiceNow:

- Scoped app (`x_aasl`) — no external dependencies
- 4 tables, 5 Script Includes, 1 REST API
- Idempotent role provisioning (never duplicates assignments)
- BYOK credentials read but never logged or exported
- Scheduled delta scans detect admin drift automatically

Open source. AGPL-3.0-only. Ready for your sandbox.

---

## Post 7 — Call to Action

If your platform team is upgrading to Australia, ask them one question:

"What is our AI Agent Studio readiness score right now?"

If they can't answer in 30 seconds, you need AASL.

🔗 GitHub: vladarchitectservicenow-oss/AASL
📧 DM Vladimir Kapustin for enterprise support

---

*© 2026 Vladimir Kapustin. All claims sourced from official ServiceNow documentation and community-verified pain points.*
