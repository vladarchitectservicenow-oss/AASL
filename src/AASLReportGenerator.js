/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLReportGenerator — HTML dashboard, JSON REST, CSV export.
 * Scope: x_aasl
 */
var AASLReportGenerator = Class.create();
AASLReportGenerator.prototype = {
    initialize: function() {
        this.version = "1.0.0";
    },

    generateHTML: function(runGR, prereqs, byoks, recs) {
        var sb = [];
        sb.push("<h1>AI Agent Studio Launchpad — Readiness Report</h1>");
        sb.push("<p><strong>Instance:</strong> " + runGR.getDisplayValue("instance_name") + "</p>");
        sb.push("<p><strong>Score:</strong> " + runGR.getValue("overall_score") + "/100</p>");
        sb.push("<p><strong>Est. Hours to Ready:</strong> " + runGR.getValue("estimated_hours_to_ready") + "</p>");
        sb.push("<hr><h2>Prerequisites</h2><ul>");
        for (var i = 0; i < prereqs.length; i++) {
            var p = prereqs[i];
            var color = p.status === "PASS" ? "green" : (p.status === "WARN" ? "orange" : "red");
            sb.push("<li style='color:" + color + "'>[" + p.status + "] " + p.name + " — " + p.actual_state + "</li>");
        }
        sb.push("</ul><hr><h2>BYOK Providers</h2><ul>");
        for (var j = 0; j < byoks.length; j++) {
            var b = byoks[j];
            var color2 = b.status === "PASS" ? "green" : (b.status === "WARN" ? "orange" : "red");
            sb.push("<li style='color:" + color2 + "'>[" + b.status + "] " + b.provider_name + " — configured=" + b.is_configured + "</li>");
        }
        sb.push("</ul><hr><h2>Recommendations</h2><ol>");
        for (var k = 0; k < recs.length; k++) {
            var r = recs[k];
            sb.push("<li><strong>[" + r.severity + "]</strong> " + r.title + " (" + r.estimated_effort_hours + "h) — " + r.description + "</li>");
        }
        sb.push("</ol>");
        return sb.join("");
    },

    generateJSON: function(runGR, prereqs, byoks, recs) {
        var obj = {
            version: this.version,
            instance: runGR.getDisplayValue("instance_name"),
            release_target: runGR.getValue("release_target"),
            score: parseInt(runGR.getValue("overall_score")),
            total_checks: parseInt(runGR.getValue("total_checks")),
            pass_count: parseInt(runGR.getValue("pass_count")),
            warn_count: parseInt(runGR.getValue("warn_count")),
            fail_count: parseInt(runGR.getValue("fail_count")),
            estimated_hours_to_ready: parseInt(runGR.getValue("estimated_hours_to_ready")),
            prerequisites: prereqs,
            byok_providers: byoks,
            recommendations: recs
        };
        return JSON.stringify(obj);
    },

    generateCSV: function(prereqs, byoks) {
        var lines = [];
        lines.push("Category,Name,Expected,Actual,Status,Hint");
        for (var i = 0; i < prereqs.length; i++) {
            var p = prereqs[i];
            lines.push([
                p.category, p.name, p.expected_state, p.actual_state, p.status,
                '"' + (p.remediation_hint || "").replace(/"/g, '""') + '"'
            ].join(","));
        }
        for (var j = 0; j < byoks.length; j++) {
            var b = byoks[j];
            lines.push([
                "BYOK", b.provider_name, "CONFIGURED_AND_TESTED",
                b.is_configured ? "CONFIGURED" : "NOT_CONFIGURED",
                b.status,
                '"' + (b.remediation_hint || "").replace(/"/g, '""') + '"'
            ].join(","));
        }
        return lines.join("\n");
    },

    type: "AASLReportGenerator"
};
