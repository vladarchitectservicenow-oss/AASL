/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLBYOKValidator — Detects Generative AI Controller BYOK provider setup.
 * Checks sn_generative_ai_cfg_provider for Azure OpenAI, Bedrock, Vertex AI, watsonx.
 * Scope: x_aasl
 */
var AASLBYOKValidator = Class.create();
AASLBYOKValidator.prototype = {
    initialize: function() {
        this.PROVIDER_MAP = {
            azure_openai: "Azure OpenAI",
            bedrock:      "AWS Bedrock",
            vertex_ai:    "Google Vertex AI",
            watsonx:      "IBM watsonx"
        };
    },

    /**
     * Scan BYOK providers and return snapshot objects.
     * @return {Array} provider status objects
     */
    scanProviders: function() {
        var out = [];
        var tableName = "sn_generative_ai_cfg_provider";
        if (!this._tableExists(tableName)) {
            for (var key in this.PROVIDER_MAP) {
                out.push(this._makeProviderRecord(key, null, "NOT_CONFIGURED"));
            }
            return out;
        }
        var foundProviders = {};
        var gr = new GlideRecord(tableName);
        gr.query();
        while (gr.next()) {
            var name = String(gr.getValue("provider_name") || "").toLowerCase();
            if (!name) continue;
            foundProviders[name] = {
                endpoint_url: gr.getValue("endpoint_url") || "",
                model_family: gr.getValue("model_family") || "",
                last_tested: gr.getValue("last_tested"),
                test_result: gr.getValue("test_result") || "NOT_TESTED",
                error_log: gr.getValue("error_log") || ""
            };
        }
        for (var pKey in this.PROVIDER_MAP) {
            if (foundProviders[pKey]) {
                out.push(this._evaluateProviderRecord(pKey, foundProviders[pKey]));
            } else {
                out.push(this._makeProviderRecord(pKey, null, "NOT_CONFIGURED"));
            }
        }
        return out;
    },

    _tableExists: function(tableName) {
        try {
            var td = GlideTableDescriptor.get(tableName);
            return td !== null && td.isValid();
        } catch (e) {
            return false;
        }
    },

    _evaluateProviderRecord: function(key, data) {
        var endpoint = data.endpoint_url || "";
        var modelFamily = data.model_family || "";
        var isConfigured = !!endpoint && !!modelFamily;
        var lastTested = data.last_tested;
        var testResult = data.test_result || "NOT_TESTED";
        var errorLog = data.error_log || "";
        var status = isConfigured ? (testResult === "SUCCESS" ? "PASS" : "WARN") : "FAIL";
        var hint = isConfigured
            ? (testResult === "SUCCESS"
                ? "Provider configured and tested successfully."
                : "Provider configured but last test failed. Check error log.")
            : "Provider missing endpoint_url or model_family. Complete BYOK setup.";
        return {
            provider_name: key,
            endpoint_url: endpoint,
            model_family: modelFamily,
            is_configured: isConfigured,
            last_tested: lastTested,
            test_result: testResult,
            error_log: errorLog,
            status: status,
            remediation_hint: hint
        };
    },

    _makeProviderRecord: function(key, data, reason) {
        return {
            provider_name: key,
            endpoint_url: "",
            model_family: "",
            is_configured: false,
            last_tested: null,
            test_result: reason,
            error_log: "",
            status: "FAIL",
            remediation_hint: "Configure " + this.PROVIDER_MAP[key] + " in Generative AI Controller > Providers."
        };
    },

    /**
     * Count how many providers are in PASS state.
     */
    getPassCount: function(providers) {
        var count = 0;
        for (var i = 0; i < providers.length; i++) {
            if (providers[i].status === "PASS") count++;
        }
        return count;
    },

    type: "AASLBYOKValidator"
};
