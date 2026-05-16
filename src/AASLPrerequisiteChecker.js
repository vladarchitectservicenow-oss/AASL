/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLPrerequisiteChecker — Validates AI Agent Studio prerequisites:
 *   plugins, roles, sys_properties, AI Control Tower config.
 * Scope: x_aasl
 */
var AASLPrerequisiteChecker = Class.create();
AASLPrerequisiteChecker.prototype = {
    initialize: function() {
        this.PLUGINS_REQUIRED = [
            { id: "com.snc.ai.agent.studio",   label: "AI Agent Studio",         minVersion: "1.0" },
            { id: "com.snc.ai.control.tower", label: "AI Control Tower",        minVersion: "1.0" },
            { id: "com.snc.generative.ai.controller", label: "Generative AI Controller", minVersion: "1.0" },
            { id: "com.snc.now.assist",       label: "Now Assist Platform",     minVersion: "1.0" },
            { id: "com.snc.workflow.studio", label: "Workflow Studio",         minVersion: "1.0" },
            { id: "com.snc.mcp.server.console", label: "MCP Server Console",   minVersion: "1.0" }
        ];
        this.ROLES_REQUIRED = [
            { name: "ai_agent_admin",         label: "AI Agent Admin",         needsAssignee: true },
            { name: "ai_agent_developer",     label: "AI Agent Developer",     needsAssignee: true },
            { name: "ai_control_tower_admin", label: "AI Control Tower Admin", needsAssignee: true },
            { name: "now_assist_admin",       label: "Now Assist Admin",       needsAssignee: false },
            { name: "workflow_studio_admin",  label: "Workflow Studio Admin",  needsAssignee: false }
        ];
        this.PROPERTIES_REQUIRED = [
            { name: "glide.ai.agent.studio.enabled", expected: "true", mandatory: true },
            { name: "glide.now.assist.enabled",        expected: "true", mandatory: false },
            { name: "glide.generative.ai.controller.enabled", expected: "true", mandatory: true }
        ];
    },

    /**
     * Run full prerequisite scan.
     * @return {Array} prerequisite objects for insertion into x_aasl_prerequisite
     */
    runFullScan: function() {
        var findings = [];
        findings = findings.concat(this._checkPlugins());
        findings = findings.concat(this._checkRoles());
        findings = findings.concat(this._checkProperties());
        findings = findings.concat(this._checkAIControlTower());
        return findings;
    },

    _checkPlugins: function() {
        var out = [];
        for (var i = 0; i < this.PLUGINS_REQUIRED.length; i++) {
            var req = this.PLUGINS_REQUIRED[i];
            var gr = new GlideRecord("v_plugin");
            gr.addQuery("id", req.id);
            gr.query();
            var actual = "NOT_INSTALLED";
            var status = "FAIL";
            var hint = "Install plugin " + req.id + " via System Plugins.";
            if (gr.next()) {
                actual = gr.getValue("active") === "1" ? "ACTIVE" : "INACTIVE";
                if (actual === "ACTIVE") {
                    status = "PASS";
                    hint = "Plugin is active.";
                } else {
                    status = "FAIL";
                    hint = "Plugin installed but inactive. Activate via All > System Definition > Plugins.";
                }
            }
            out.push({
                category: "PLUGIN",
                name: req.label + " (" + req.id + ")",
                expected_state: "ACTIVE",
                actual_state: actual,
                status: status,
                remediation_hint: hint,
                auto_fixable: false
            });
        }
        return out;
    },

    _checkRoles: function() {
        var out = [];
        for (var i = 0; i < this.ROLES_REQUIRED.length; i++) {
            var req = this.ROLES_REQUIRED[i];
            var exists = false;
            var assigned = false;
            var r = new GlideRecord("sys_user_role");
            r.addQuery("name", req.name);
            r.query();
            if (r.next()) {
                exists = true;
                var ug = new GlideRecord("sys_user_has_role");
                ug.addQuery("role", r.getUniqueValue());
                ug.query();
                assigned = ug.hasNext();
            }
            var actual = exists ? (assigned ? "EXISTS_ASSIGNED" : "EXISTS_UNASSIGNED") : "MISSING";
            var status = "PASS";
            var hint = "Role is present and assigned.";
            if (!exists) {
                status = "FAIL";
                hint = "Role " + req.name + " does not exist. Activate prerequisite plugin.";
            } else if (req.needsAssignee && !assigned) {
                status = "WARN";
                hint = "Role exists but has no assignees. Use AASL Role Provisioner.";
            }
            out.push({
                category: "ROLE",
                name: req.label + " (" + req.name + ")",
                expected_state: "EXISTS_ASSIGNED",
                actual_state: actual,
                status: status,
                remediation_hint: hint,
                auto_fixable: (exists && !assigned)
            });
        }
        return out;
    },

    _checkProperties: function() {
        var out = [];
        for (var i = 0; i < this.PROPERTIES_REQUIRED.length; i++) {
            var req = this.PROPERTIES_REQUIRED[i];
            var val = gs.getProperty(req.name, "NOT_SET");
            var status = (val === req.expected) ? "PASS" : (req.mandatory ? "FAIL" : "WARN");
            var hint = (status === "PASS")
                ? "Property set correctly."
                : "Set " + req.name + " = " + req.expected + " via sys_properties.";
            out.push({
                category: "PROPERTY",
                name: req.name,
                expected_state: req.expected,
                actual_state: val,
                status: status,
                remediation_hint: hint,
                auto_fixable: true
            });
        }
        return out;
    },

    _checkAIControlTower: function() {
        var out = [];
        var tableExists = GlideTableDescriptor.get("sn_ai_control_tower_config") !== null;
        var status = "FAIL";
        var actual = "TABLE_MISSING";
        var hint = "AI Control Tower plugin not active. Install com.snc.ai.control.tower.";
        if (tableExists) {
            var gr = new GlideRecord("sn_ai_control_tower_config");
            gr.setLimit(1);
            gr.query();
            if (gr.next()) {
                actual = gr.getValue("enabled") === "1" ? "ENABLED" : "DISABLED";
                status = actual === "ENABLED" ? "PASS" : "FAIL";
                hint = actual === "ENABLED"
                    ? "AI Control Tower is enabled."
                    : "Enable AI Control Tower in AI Control Tower > Configuration.";
            } else {
                actual = "NO_RECORDS";
                status = "WARN";
                hint = "AI Control Tower table exists but no configuration records found.";
            }
        }
        out.push({
            category: "AI_CONTROL_TOWER",
            name: "AI Control Tower Configuration",
            expected_state: "ENABLED",
            actual_state: actual,
            status: status,
            remediation_hint: hint,
            auto_fixable: false
        });
        return out;
    },

    type: "AASLPrerequisiteChecker"
};
