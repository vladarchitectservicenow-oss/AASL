// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * test_prerequisite_checker.js
 * Node.js unit tests for AASLPrerequisiteChecker.js using SN mocks.
 */

const fs = require('fs');
const assert = require('assert');

// === Mock ServiceNow Runtime ===
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
}
MockGR.prototype.addQuery = function(field, val) { this._filters[field] = val; };
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() {
  this._idx = -1;
  // Apply simple AND filters
  this._filtered = this._rows.filter(function(r) {
    for (var k in this._filters) {
      if (String(r[k] || "") !== String(this._filters[k])) return false;
    }
    return true;
  }.bind(this));
};
MockGR.prototype.next = function() {
  this._idx++;
  if (this._limit && this._idx >= this._limit) return false;
  return this._idx < this._filtered.length;
};
MockGR.prototype.hasNext = function() {
  return (this._idx + 1) < this._filtered.length;
};
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
eval(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js', 'utf8'));
eval(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLBYOKValidator.js', 'utf8'));
eval(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLRoleProvisioner.js', 'utf8'));
eval(fs.readFileSync('/home/crixus/agentic-loop/output/AASL/src/AASLReportGenerator.js', 'utf8'));

// === Test Helpers ===
function makeGR(table, rows) { return new MockGR(table, rows); }

function overrideGR(rowsMap) {
  global.GlideRecord = function(table) {
    if (rowsMap[table]) return new MockGR(table, rowsMap[table]);
    return new MockGR(table);
  };
}

function restoreDefaultGR() {
  global.GlideRecord = function(table) { return new MockGR(table); };
}

// ============================================================================
// TESTS
// ============================================================================

function testPluginPassAndFail() {
  restoreDefaultGR();
  overrideGR({
    "v_plugin": [
      { id: "com.snc.ai.agent.studio", active: "1" },
      { id: "com.snc.ai.control.tower", active: "0" }
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
      { user: "u1", role: "r2" }
    ],
    "sn_ai_control_tower_config": [
      { enabled: "1" }
    ]
  });
  var checker = new AASLPrerequisiteChecker();
  var results = checker.runFullScan();
  // 6 plugins + 5 roles + 3 properties + 1 AI control tower = 15
  assert.strictEqual(results.length, 15, "Expected 15 checks, got " + results.length);
  var plugins = results.filter(r => r.category === "PLUGIN");
  assert.strictEqual(plugins[0].status, "PASS");  // ai.agent.studio active
  assert.strictEqual(plugins[1].status, "FAIL");  // ai.control.tower inactive
  assert(plugins.slice(2).every(p => p.status === "FAIL"), "Remaining plugins should FAIL");
  console.log("  testPluginPassAndFail PASSED");
}

function testRoleWarnUnassigned() {
  restoreDefaultGR();
  overrideGR({
    "sys_user_role": [
      { name: "ai_agent_admin", sys_id: "r1" },
      { name: "ai_agent_developer", sys_id: "r2" },
      { name: "ai_control_tower_admin", sys_id: "r3" },
      { name: "now_assist_admin", sys_id: "r4" },
      { name: "workflow_studio_admin", sys_id: "r5" }
    ],
    "sys_user_has_role": [], // no assignments
    "sn_ai_control_tower_config": [{ enabled: "1" }]
  });
  global.gs.props = {};
  var checker = new AASLPrerequisiteChecker();
  var results = checker.runFullScan();
  var roles = results.filter(r => r.category === "ROLE");
  assert.strictEqual(roles[0].status, "WARN", "ai_agent_admin should WARN (needs assignee, none)");
  assert.strictEqual(roles[1].status, "WARN", "ai_agent_developer should WARN");
  // ai_control_tower_admin needs assignee → WARN
  assert.strictEqual(roles[2].status, "WARN");
  // now_assist_admin and workflow_studio_admin needAssignee=false → PASS
  assert.strictEqual(roles[3].status, "PASS");
  assert.strictEqual(roles[4].status, "PASS");
  console.log("  testRoleWarnUnassigned PASSED");
}

function testPropertyMandatoryFail() {
  global.gs.props = {
    "glide.ai.agent.studio.enabled": "false",
    "glide.now.assist.enabled": "NOT_SET",
    "glide.generative.ai.controller.enabled": "NOT_SET"
  };
  restoreDefaultGR();
  overrideGR({
    "sn_ai_control_tower_config": [{ enabled: "1" }]
  });
  var checker = new AASLPrerequisiteChecker();
  var results = checker.runFullScan();
  var props = results.filter(r => r.category === "PROPERTY");
  assert.strictEqual(props[0].status, "FAIL", "mandatory false → FAIL");
  assert.strictEqual(props[1].status, "WARN", "optional NOT_SET → WARN");
  assert.strictEqual(props[2].status, "FAIL", "mandatory NOT_SET → FAIL");
  console.log("  testPropertyMandatoryFail PASSED");
}

function testBYOKAllMissing() {
  restoreDefaultGR();
  overrideGR({
    "sn_generative_ai_cfg_provider": []
  });
  var validator = new AASLBYOKValidator();
  var providers = validator.scanProviders();
  assert.strictEqual(providers.length, 4);
  assert(providers.every(p => p.status === "FAIL"), "All should FAIL");
  assert(providers.every(p => p.test_result === "NOT_CONFIGURED"), "All NOT_CONFIGURED");
  console.log("  testBYOKAllMissing PASSED");
}

function testBYOKOnePass() {
  restoreDefaultGR();
  overrideGR({
    "sn_generative_ai_cfg_provider": [
      { provider_name: "azure_openai", endpoint_url: "https://oai.azure.com", model_family: "gpt-4o", test_result: "SUCCESS" }
    ]
  });
  var validator = new AASLBYOKValidator();
  var providers = validator.scanProviders();
  var azure = providers.find(p => p.provider_name === "azure_openai");
  assert.strictEqual(azure.status, "PASS");
  assert.strictEqual(azure.is_configured, true);
  assert(providers.filter(p => p.provider_name !== "azure_openai").every(p => p.status === "FAIL"));
  console.log("  testBYOKOnePass PASSED");
}

function testRoleProvisionerIdempotent() {
  restoreDefaultGR();
  overrideGR({
    "sys_user_role": [{ name: "ai_agent_admin", sys_id: "r1" }],
    "sys_user_has_role": [{ user: "u1", role: "r1" }]
  });
  var rp = new AASLRoleProvisioner();
  var result = rp.grantRole("u1", "ai_agent_admin");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.alreadyHad, true);
  console.log("  testRoleProvisionerIdempotent PASSED");
}

function testRoleProvisionerGrantNew() {
  restoreDefaultGR();
  overrideGR({
    "sys_user_role": [{ name: "ai_agent_admin", sys_id: "r1" }],
    "sys_user_has_role": []
  });
  var rp = new AASLRoleProvisioner();
  var result = rp.grantRole("u1", "ai_agent_admin");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.alreadyHad, false);
  console.log("  testRoleProvisionerGrantNew PASSED");
}

function testReportGeneratorJSON() {
  var gen = new AASLReportGenerator();
  function FakeRun(vals) { this._vals = vals; }
  FakeRun.prototype.getValue = function(f) { return String(this._vals[f] || ""); };
  FakeRun.prototype.getDisplayValue = function(f) { return this.getValue(f); };
  var run = new FakeRun({ instance_name: "dev362840", overall_score: 75, total_checks: 15,
                          pass_count: 10, warn_count: 3, fail_count: 2,
                          estimated_hours_to_ready: 16, release_target: "Australia" });
  var jsonStr = gen.generateJSON(run, [], [], []);
  var data = JSON.parse(jsonStr);
  assert.strictEqual(data.score, 75);
  assert.strictEqual(data.instance, "dev362840");
  assert.strictEqual(data.version, "1.0.0");
  console.log("  testReportGeneratorJSON PASSED");
}

function testReportGeneratorCSVEscape() {
  var gen = new AASLReportGenerator();
  var prereqs = [{ category: "PLUGIN", name: 'Bad"Quote', expected_state: "ACTIVE", actual_state: "MISSING",
                   status: "FAIL", remediation_hint: 'Use "System Plugins"' }];
  var csv = gen.generateCSV(prereqs, []);
  assert(csv.includes('""'), "CSV should escape quotes");
  console.log("  testReportGeneratorCSVEscape PASSED");
}

// === RUN ALL ===
console.log("Running AASL unit tests...\n");
testPluginPassAndFail();
testRoleWarnUnassigned();
testPropertyMandatoryFail();
testBYOKAllMissing();
testBYOKOnePass();
testRoleProvisionerIdempotent();
testRoleProvisionerGrantNew();
testReportGeneratorJSON();
testReportGeneratorCSVEscape();
console.log("\nAll 9 unit tests PASSED");
