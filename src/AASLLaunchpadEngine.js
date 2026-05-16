/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLLaunchpadEngine — Orchestrates full AI readiness scan:
 *   prerequisites → BYOK → scoring → recommendations.
 * Scope: x_aasl
 */
var AASLLaunchpadEngine = Class.create();
AASLLaunchpadEngine.prototype = {
    initialize: function() {
        this.checker   = new AASLPrerequisiteChecker();
        this.validator = new AASLBYOKValidator();
        this.maxRecs   = 5000;
    },

    /**
     * Run full launchpad scan and persist results.
     * @return {Object} run summary with sys_id of x_aasl_launchpad_run
     */
    runFullScan: function() {
        var runGR = new GlideRecord("x_aasl_launchpad_run");
        runGR.initialize();
        runGR.setValue("instance_name", gs.getProperty("instance_name", "UNKNOWN"));
        runGR.setValue("release_target", "Australia");
        var runId = runGR.insert();

        var prereqs = this.checker.runFullScan();
        var byoks   = this.validator.scanProviders();

        var passCount = 0, warnCount = 0, failCount = 0;
        var totalPrereq = 0;

        // Persist prerequisites
        for (var i = 0; i < prereqs.length && totalPrereq < this.maxRecs; i++) {
            var p = prereqs[i];
            this._insertPrerequisite(runId, p);
            if (p.status === "PASS") passCount++;
            else if (p.status === "WARN") warnCount++;
            else failCount++;
            totalPrereq++;
        }

        // Persist BYOK as pseudo-prerequisites
        var byokPass = this.validator.getPassCount(byoks);
        var byokFail = byoks.length - byokPass;
        for (var j = 0; j < byoks.length && totalPrereq < this.maxRecs; j++) {
            var b = byoks[j];
            this._insertPrerequisite(runId, {
                category: "BYOK",
                name: b.provider_name,
                expected_state: "CONFIGURED_AND_TESTED",
                actual_state: b.is_configured ? (b.test_result === "SUCCESS" ? "CONFIGURED_TESTED" : "CONFIGURED_UNTESTED") : "NOT_CONFIGURED",
                status: b.status,
                remediation_hint: b.remediation_hint,
                auto_fixable: false
            });
            totalPrereq++;
        }

        passCount += byokPass;
        failCount += byokFail;

        var total = passCount + warnCount + failCount;
        var score = total > 0 ? Math.round((passCount * 1.0 + warnCount * 0.5 + failCount * 0.0) / total * 100) : 0;

        // Cap score if critical BYOK missing
        if (byokFail > 0 && score > 60) score = 60;

        var hours = this._estimateHours(failCount, warnCount, byokFail);

        // Generate recommendations
        var recs = this._generateRecommendations(prereqs, byoks, runId);

        // Update run record
        runGR = new GlideRecord("x_aasl_launchpad_run");
        if (runGR.get(runId)) {
            runGR.setValue("overall_score", score);
            runGR.setValue("total_checks", total);
            runGR.setValue("pass_count", passCount);
            runGR.setValue("warn_count", warnCount);
            runGR.setValue("fail_count", failCount);
            runGR.setValue("byok_provider_found", byokPass + "/" + byoks.length);
            runGR.setValue("estimated_hours_to_ready", hours);
            var gen = new AASLReportGenerator();
            runGR.setValue("report_html", gen.generateHTML(runGR, prereqs, byoks, recs));
            runGR.setValue("report_json", gen.generateJSON(runGR, prereqs, byoks, recs));
            runGR.update();
        }

        return {
            run_id: runId,
            overall_score: score,
            total_checks: total,
            pass_count: passCount,
            warn_count: warnCount,
            fail_count: failCount,
            estimated_hours: hours
        };
    },

    _insertPrerequisite: function(runId, p) {
        var gr = new GlideRecord("x_aasl_prerequisite");
        gr.initialize();
        gr.setValue("run_id", runId);
        gr.setValue("category", p.category);
        gr.setValue("name", p.name);
        gr.setValue("expected_state", p.expected_state);
        gr.setValue("actual_state", p.actual_state);
        gr.setValue("status", p.status);
        gr.setValue("remediation_hint", p.remediation_hint);
        gr.setValue("auto_fixable", p.auto_fixable ? "true" : "false");
        gr.insert();
    },

    _estimateHours: function(failCount, warnCount, byokFail) {
        var base = failCount * 4 + warnCount * 1.5;
        if (byokFail > 0) base += 16;
        return Math.ceil(base);
    },

    _generateRecommendations: function(prereqs, byoks, runId) {
        var recs = [];
        for (var i = 0; i < prereqs.length; i++) {
            var p = prereqs[i];
            if (p.status !== "PASS") {
                recs.push({
                    run_id: runId,
                    severity: p.status === "FAIL" ? "Critical" : "High",
                    title: p.category + ": " + p.name,
                    description: p.remediation_hint,
                    estimated_effort_hours: p.status === "FAIL" ? 4 : 1
                });
            }
        }
        for (var j = 0; j < byoks.length; j++) {
            var b = byoks[j];
            if (b.status !== "PASS") {
                recs.push({
                    run_id: runId,
                    severity: "High",
                    title: "BYOK: " + b.provider_name,
                    description: b.remediation_hint,
                    estimated_effort_hours: 8
                });
            }
        }
        return recs;
    },

    type: "AASLLaunchpadEngine"
};
