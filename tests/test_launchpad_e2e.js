// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * test_launchpad_e2e.js
 * End-to-end integration test for AASLLaunchpadEngine.
 * Self-contained mocks — does NOT require test_prerequisite_checker.js
 */

const fs = require('fs');
const assert = require('assert');

// === Mock ServiceNow Runtime (duplicated from unit test for isolation) ===
global.Class = {
  create: function() {
    var cls = function() {
      if (this.initialize) this.initialize.apply(this, arguments);
    };
    return cls;
  }
};

function MockGR(table, rows) {
  this.table = table;
  this._rows = rows || [];
  this._idx = -1;
  this._filters = {};
  this._limit = null;
  this._inserted = [];
  this._filtered = [];
}
MockGR.prototype.addQuery = function(field, val) { this._filters[field] = val; };
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() {
  this._idx = -1;
  this._filtered = this._rows.filter((r) => {
    for (var k in this._filters) {
      if (String(r[k] || "") !== String(this._filters[k])) return false;
    }
    return true;
  });
};
MockGR.prototype.next = function() {
  this._idx++;
  if (this._limit && this._idx >= this._limit) return false;
  return this._idx < this._filtered.length;
};
MockGR.prototype.hasNext = function() { return (this._idx + 1) < this._filtered.length; };
MockGR.prototype.getValue = function(field) {
  if (this._idx >= 0 && this._idx < this._filtered.length) {
    return String(this._filtered[this._idx][field] || "");
  }
  return "";
};
MockGR.prototype.getUniqueValue = function() {
  if (this._idx >= 0 && this._idx < this._filtered.length) {
    return this._filtered[this._idx]["sys_id"] || "mock-id";
  }
  return "mock-id";
};
MockGR.prototype.initialize = function() { this._current = {}; };
MockGR.prototype.setValue = function(f, v) { this._current[f] = v; };
MockGR.prototype.insert = function() {
  var sid = "mock-" + this._inserted.length;
  this._current["sys_id"] = sid;
  this._inserted.push(this._current);
  return sid;
};
MockGR.prototype.get = function(sid) {
  for (var i = 0; i < this._rows.length; i++) {
    if (this._rows[i]["sys_id"] === sid) { this._idx = i; return true; }
  }
  return false;
};
MockGR.prototype.update = function() {};
MockGR.prototype.deleteRecord = function() {};
MockGR.prototype.getDisplayValue = function(f) { return this.getValue(f); };

global.GlideRecord = function(table) { return new MockGR(table); };

global.gs = {
  props: {},
  getProperty: function(n, d) { return global.gs.props[n] || d; }
};

var MockTD = {
    tables: {
        "sn_ai_control_tower_config": { isValid: function() { return true; } },
        "sn_generative_ai_cfg_provider": { isValid: function() { return true; } }
    }
};
function GlideTableDescriptor() {}
GlideTableDescriptor.get = function(t) { return MockTD.tables[t] || null; };
global.GlideTableDescriptor = GlideTableDescriptor;

// === Load modules ===
function stripHeader(code) { return code.replace(/^\/\*.*?\*\//s, ''); }
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLBYOKValidator.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLRoleProvisioner.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLReportGenerator.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLLaunchpadEngine.js', 'utf8')));

// === Test Helper ===
function overrideGR(rowsMap) {
  global.GlideRecord = function(table) {
    if (rowsMap[table]) return new MockGR(table, rowsMap[table]);
    return new MockGR(table);
  };
}

// ============================================================================
// E2E TESTS
// ============================================================================

function testEndToEndFullScan() {
  global.gs.props = {
    "glide.ai.agent.studio.enabled": "true",
    "glide.now.assist.enabled": "true",
    "glide.generative.ai.controller.enabled": "true"
  };
  overrideGR({
    "v_plugin": [
      { id: "com.snc.ai.agent.studio", active: "1" },
      { id: "com.snc.ai.control.tower", active: "1" },
      { id: "com.snc.generative.ai.controller", active: "1" },
      { id: "com.snc.now.assist", active: "1" },
      { id: "com.snc.workflow.studio", active: "1" },
      { id: "com.snc.mcp.server.console", active: "1" }
    ],
    "sys_user_role": [
      { name: "ai_agent_admin", sys_id: "r1" },
      { name: "ai_agent_developer", sys_id: "r2" },
      { name: "ai_control_tower_admin", sys_id: "r3" },
      { name: "now_assist_admin", sys_id: "r4" },
      { name: "workflow_studio_admin", sys_id: "r5" }
    ],
    "sys_user_has_role": [
      { user: "u1", role: "r1" },
      { user: "u1", role: "r2" },
      { user: "u1", role: "r3" },
      { user: "u1", role: "r4" },
      { user: "u1", role: "r5" }
    ],
    "sn_ai_control_tower_config": [{ enabled: "1" }],
    "sn_generative_ai_cfg_provider": [
      { provider_name: "azure_openai", endpoint_url: "https://oai.azure.com", model_family: "gpt-4o", test_result: "SUCCESS" },
      { provider_name: "bedrock", endpoint_url: "https://bedrock.aws", model_family: "claude-3", test_result: "SUCCESS" },
      { provider_name: "vertex_ai", endpoint_url: "https://vertex.ai", model_family: "gemini", test_result: "SUCCESS" },
      { provider_name: "watsonx", endpoint_url: "https://watsonx.ai", model_family: "granite", test_result: "SUCCESS" }
    ],
    "x_aasl_launchpad_run": [],
    "x_aasl_prerequisite": [],
    "x_aasl_recommendation": []
  });

  var engine = new AASLLaunchpadEngine();
  var result = engine.runFullScan();

  // 6 plugins + 5 roles + 3 props + 1 tower + 4 byok = 19 checks
  assert.strictEqual(result.total_checks, 19, "Expected 19 checks, got " + result.total_checks);
  assert.strictEqual(result.fail_count, 0, "Nothing should fail in golden path");
  assert(result.overall_score >= 95, "Golden path score should be >=95, got " + result.overall_score);
  assert.strictEqual(result.estimated_hours, 0, "Golden path should need 0 hours");
  console.log("  testEndToEndFullScan PASSED (score=" + result.overall_score + ")");
}

function testScoreCapWhenBYOKMissing() {
  global.gs.props = {
    "glide.ai.agent.studio.enabled": "true",
    "glide.now.assist.enabled": "true",
    "glide.generative.ai.controller.enabled": "true"
  };
  overrideGR({
    "v_plugin": [
      { id: "com.snc.ai.agent.studio", active: "1" },
      { id: "com.snc.ai.control.tower", active: "1" },
      { id: "com.snc.generative.ai.controller", active: "1" },
      { id: "com.snc.now.assist", active: "1" },
      { id: "com.snc.workflow.studio", active: "1" },
      { id: "com.snc.mcp.server.console", active: "1" }
    ],
    "sys_user_role": [
      { name: "ai_agent_admin", sys_id: "r1" },
      { name: "ai_agent_developer", sys_id: "r2" },
      { name: "ai_control_tower_admin", sys_id: "r3" },
      { name: "now_assist_admin", sys_id: "r4" },
      { name: "workflow_studio_admin", sys_id: "r5" }
    ],
    "sys_user_has_role": [
      { user: "u1", role: "r1" },
      { user: "u1", role: "r2" },
      { user: "u1", role: "r3" },
      { user: "u1", role: "r4" },
      { user: "u1", role: "r5" }
    ],
    "sn_ai_control_tower_config": [{ enabled: "1" }],
    "sn_generative_ai_cfg_provider": [], // ALL BYOK missing
    "x_aasl_launchpad_run": [],
    "x_aasl_prerequisite": [],
    "x_aasl_recommendation": []
  });

  var engine = new AASLLaunchpadEngine();
  var result = engine.runFullScan();
  assert(result.overall_score <= 60, "Score should be capped at 60 when BYOK missing, got " + result.overall_score);
  assert(result.estimated_hours >= 16, "Should add 16h for BYOK setup");
  console.log("  testScoreCapWhenBYOKMissing PASSED (score=" + result.overall_score + ")");
}

function testRecommendationsGenerated() {
  global.gs.props = {};
  overrideGR({
    "v_plugin": [],
    "sys_user_role": [],
    "sys_user_has_role": [],
    "sn_ai_control_tower_config": [],
    "sn_generative_ai_cfg_provider": [],
    "x_aasl_launchpad_run": [],
    "x_aasl_prerequisite": [],
    "x_aasl_recommendation": []
  });

  var engine = new AASLLaunchpadEngine();
  var result = engine.runFullScan();
  assert(result.fail_count > 0, "Should have failures");
  console.log("  testRecommendationsGenerated PASSED (fails=" + result.fail_count + ")");
}

function testReportHTMLContainsScore() {
  global.gs.props = {
    "glide.ai.agent.studio.enabled": "true",
    "glide.now.assist.enabled": "true",
    "glide.generative.ai.controller.enabled": "true"
  };
  overrideGR({
    "v_plugin": [
      { id: "com.snc.ai.agent.studio", active: "1" },
      { id: "com.snc.ai.control.tower", active: "1" },
      { id: "com.snc.generative.ai.controller", active: "1" },
      { id: "com.snc.now.assist", active: "1" },
      { id: "com.snc.workflow.studio", active: "1" },
      { id: "com.snc.mcp.server.console", active: "1" }
    ],
    "sys_user_role": [
      { name: "ai_agent_admin", sys_id: "r1" },
      { name: "ai_agent_developer", sys_id: "r2" },
      { name: "ai_control_tower_admin", sys_id: "r3" },
      { name: "now_assist_admin", sys_id: "r4" },
      { name: "workflow_studio_admin", sys_id: "r5" }
    ],
    "sys_user_has_role": [
      { user: "u1", role: "r1" },
      { user: "u1", role: "r2" },
      { user: "u1", role: "r3" },
      { user: "u1", role: "r4" },
      { user: "u1", role: "r5" }
    ],
    "sn_ai_control_tower_config": [{ enabled: "1" }],
    "sn_generative_ai_cfg_provider": [
      { provider_name: "azure_openai", endpoint_url: "https://oai.azure.com", model_family: "gpt-4o", test_result: "SUCCESS" },
      { provider_name: "bedrock", endpoint_url: "https://bedrock.aws", model_family: "claude-3", test_result: "SUCCESS" },
      { provider_name: "vertex_ai", endpoint_url: "https://vertex.ai", model_family: "gemini", test_result: "SUCCESS" },
      { provider_name: "watsonx", endpoint_url: "https://watsonx.ai", model_family: "granite", test_result: "SUCCESS" }
    ],
    "x_aasl_launchpad_run": [],
    "x_aasl_prerequisite": [],
    "x_aasl_recommendation": []
  });

  var engine = new AASLLaunchpadEngine();
  var result = engine.runFullScan();
  assert(result.overall_score >= 80, "Score should be high, got " + result.overall_score);
  console.log("  testReportHTMLContainsScore PASSED (score=" + result.overall_score + ")");
}

// === RUN ALL ===
console.log("Running AASL E2E tests...\n");
testEndToEndFullScan();
testScoreCapWhenBYOKMissing();
testRecommendationsGenerated();
testReportHTMLContainsScore();
console.log("\nAll 4 E2E tests PASSED");
