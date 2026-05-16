/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLRESTAPI — Scripted REST API handler for external CI/CD triggers.
 * Resource: /api/x_aasl/launchpad/scan
 * Methods: POST (trigger scan), GET (retrieve latest run)
 * Scope: x_aasl
 */

(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    var action = request.pathParams.action || "status";
    var engine = new AASLLaunchpadEngine();
    var gen    = new AASLReportGenerator();

    if (request.http.method === "POST" && action === "scan") {
        var result = engine.runFullScan();
        response.setStatus(201);
        response.setContentType("application/json");
        response.getStreamWriter().writeString(JSON.stringify(result));
        return;
    }

    if (request.http.method === "GET" && action === "latest") {
        var gr = new GlideRecord("x_aasl_launchpad_run");
        gr.orderByDesc("sys_created_on");
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            var out = {
                run_id: gr.getUniqueValue(),
                instance: gr.getDisplayValue("instance_name"),
                score: parseInt(gr.getValue("overall_score")),
                total: parseInt(gr.getValue("total_checks")),
                pass: parseInt(gr.getValue("pass_count")),
                warn: parseInt(gr.getValue("warn_count")),
                fail: parseInt(gr.getValue("fail_count")),
                estimated_hours: parseInt(gr.getValue("estimated_hours_to_ready")),
                report_json: gr.getValue("report_json")
            };
            response.setStatus(200);
            response.setContentType("application/json");
            response.getStreamWriter().writeString(JSON.stringify(out));
        } else {
            response.setStatus(404);
            response.setContentType("application/json");
            response.getStreamWriter().writeString(JSON.stringify({ error: "No runs found." }));
        }
        return;
    }

    response.setStatus(400);
    response.setContentType("application/json");
    response.getStreamWriter().writeString(JSON.stringify({ error: "Invalid action. Use POST /scan or GET /latest." }));
})(request, response);
