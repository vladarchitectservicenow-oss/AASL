# Copyright (c) 2026 Vladimir Kapustin
# SPDX-License-Identifier: AGPL-3.0-only
"""
test_prerequisite_checker.py
Unit tests for AASLPrerequisiteChecker.
Mocks: GlideRecord, gs.getProperty, GlideTableDescriptor.get
"""
import sys, json, re
sys.path.insert(0, "/home/crixus/agentic-loop/output/AASL/src")

# --- SN Mocks ---
class MockGR:
    def __init__(self, table, rows=None):
        self.table = table
        self._rows = rows or []
        self._idx = -1
        self._filters = {}
        self._limit = None
        self._inserted = []
    def addQuery(self, field, val):
        self._filters[field] = val
    def setLimit(self, n):
        self._limit = n
    def query(self):
        self._idx = -1
    def next(self):
        self._idx += 1
        if self._limit and self._idx >= self._limit:
            return False
        return self._idx < len(self._rows)
    def hasNext(self):
        return (self._idx + 1) < len(self._rows)
    def getValue(self, field):
        if 0 <= self._idx < len(self._rows):
            return str(self._rows[self._idx].get(field, ""))
        return ""
    def getUniqueValue(self):
        if 0 <= self._idx < len(self._rows):
            return self._rows[self._idx].get("sys_id", "mock-id")
        return "mock-id"
    def initialize(self):
        self._current = {}
    def setValue(self, f, v):
        self._current[f] = v
    def insert(self):
        sid = "mock-" + str(len(self._inserted))
        self._current["sys_id"] = sid
        self._inserted.append(self._current)
        return sid
    def get(self, sid):
        for r in self._rows:
            if r.get("sys_id") == sid:
                self._idx = self._rows.index(r)
                return True
        return False
    def update(self):
        pass
    def deleteRecord(self):
        pass
    def getDisplayValue(self, f):
        return self.getValue(f)

class MockGS:
    props = {}
    @staticmethod
    def getProperty(name, default="NOT_SET"):
        return MockGS.props.get(name, default)

_orig_GlideRecord = None
_orig_gs = None
_orig_GlideTableDescriptor = None

def setup_mocks():
    global _orig_GlideRecord, _orig_gs, _orig_GlideTableDescriptor
    import builtins
    # We inject into a fake module namespace since the JS files won't import directly.
    # Instead we'll eval the JS after setting up a JS-like runtime below.
    pass

# --- Build minimal JS runtime for eval ---
JS_RUNTIME = """
var Class = {
  create: function() {
    return function(proto) {
      var cls = function() { this.initialize.apply(this, arguments); };
      for (var k in proto) cls.prototype[k] = proto[k];
      cls.prototype.type = proto.type || "Unknown";
      return cls;
    };
  }
};
function GlideRecord(table) {
  return new MockGR(table);
}
var gs = {
  getProperty: function(n, d) { return MockGS.getProperty(n, d); }
};
function GlideTableDescriptor() {}
GlideTableDescriptor.get = function(t) { return MockTD.tables[t] || null; }
"""

class MockTD:
    tables = {}

# Register tables existence for tests
MockTD.tables["sn_ai_control_tower_config"] = {"valid": True}
MockTD.tables["sn_generative_ai_cfg_provider"] = {"valid": True}

import math

def exec_js(file_path):
    with open(file_path) as f:
        code = f.read()
    # Strip leading /* comment if present so first line isn't comment
    # Simple: replace /* */ block at start
    code = re.sub(r'^/\*.*?\*/', '', code, count=1, flags=re.DOTALL)
    full = JS_RUNTIME + "\n" + code
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(full, local)
    return local

# Pre-load modules
_local_pc = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js")
_local_bv = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLBYOKValidator.js")
_local_rp = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLRoleProvisioner.js")
_local_le = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLLaunchpadEngine.js")
_local_rg = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLReportGenerator.js")

# ============================================================================
# UNIT TESTS
# ============================================================================

def test_plugin_pass_and_fail():
    # Two plugins: one active, one missing
    def make_gr(table):
        if table == "v_plugin":
            return MockGR(table, [
                {"id": "com.snc.ai.agent.studio", "active": "1"},
            ])
        return MockGR(table)
    # Bind make_gr into our mock by patching the global GlideRecord in local scope
    local = exec_js("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js")
    local["GlideRecord"] = make_gr
    local["gs"] = MockGS
    local["GlideTableDescriptor"] = type("G", (), {"get": lambda t: MockTD.tables.get(t)})()
    # Re-exec to bind new GlideRecord
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    exec(JS_RUNTIME.replace("function GlideRecord(table) { return new MockGR(table); }",
                            "function GlideRecord(table) { return make_gr(table); }") + "\n" + code, local)

    # Actually simpler: just test via direct logic in Python
    checker = local["AASLPrerequisiteChecker"]()
    # Because our GlideRecord is hardcoded in JS_RUNTIME, we need to monkey-patch differently.
    # Instead, let's just write the test by manually exercising the logic in Python form.
    pass

def test_plugin_pass_and_fail_v2():
    """
    Direct test: simulate plugin check results from runFullScan
    """
    # We'll create a custom JS env where v_plugin has selective rows
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "v_plugin") {
    var gr = new MockGR(table);
    gr._rows = [
      {id: "com.snc.ai.agent.studio", active: "1"},
      {id: "com.snc.ai.control.tower", active: "0"}
    ];
    return gr;
  }
  if (table === "sys_user_role") {
    var gr = new MockGR(table);
    gr._rows = [{name: "ai_agent_admin", sys_id: "r1"}, {name: "ai_agent_developer", sys_id: "r2"}];
    return gr;
  }
  if (table === "sys_user_has_role") {
    var gr = new MockGR(table);
    gr._rows = [{user: "u1", role: "r1"}];
    return gr;
  }
  if (table === "sn_ai_control_tower_config") {
    var gr = new MockGR(table);
    gr._rows = [{enabled: "1"}];
    return gr;
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    checker = local["AASLPrerequisiteChecker"]()
    results = checker.runFullScan()
    # 6 plugins + 5 roles + 3 properties + 1 AI control tower = 15 checks
    assert len(results) == 15, f"Expected 15 checks, got {len(results)}"
    # Plugin checks
    plugin_results = [r for r in results if r["category"] == "PLUGIN"]
    assert len(plugin_results) == 6
    # First plugin (ai.agent.studio) active → PASS
    assert plugin_results[0]["status"] == "PASS"
    # Second plugin (ai.control.tower) inactive → FAIL
    assert plugin_results[1]["status"] == "FAIL"
    # Remaining plugins missing → FAIL
    assert all(r["status"] == "FAIL" for r in plugin_results[2:])
    print("test_plugin_pass_and_fail_v2 PASSED")

def test_role_warn_unassigned():
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "v_plugin") return new MockGR(table);
  if (table === "sys_user_role") {
    var gr = new MockGR(table);
    gr._rows = [
      {name: "ai_agent_admin", sys_id: "r1"},
      {name: "ai_agent_developer", sys_id: "r2"},
      {name: "ai_control_tower_admin", sys_id: "r3"},
      {name: "now_assist_admin", sys_id: "r4"},
      {name: "workflow_studio_admin", sys_id: "r5"}
    ];
    return gr;
  }
  if (table === "sys_user_has_role") {
    var gr = new MockGR(table); // empty → no assignments
    return gr;
  }
  if (table === "sn_ai_control_tower_config") {
    var gr = new MockGR(table); gr._rows = [{enabled: "1"}]; return gr;
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    checker = local["AASLPrerequisiteChecker"]()
    results = checker.runFullScan()
    role_results = [r for r in results if r["category"] == "ROLE"]
    # ai_agent_admin and ai_agent_developer need assignees → WARN
    assert role_results[0]["status"] == "WARN", f"Expected WARN for ai_agent_admin, got {role_results[0]['status']}"
    assert role_results[1]["status"] == "WARN"
    # others PASS (needsAssignee=false)
    assert role_results[2]["status"] == "PASS"
    print("test_role_warn_unassigned PASSED")

def test_property_mandatory_fail():
    MockGS.props = {"glide.ai.agent.studio.enabled": "false"}
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "sn_ai_control_tower_config") {
    var gr = new MockGR(table); gr._rows = [{enabled: "1"}]; return gr;
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLPrerequisiteChecker.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    checker = local["AASLPrerequisiteChecker"]()
    results = checker.runFullScan()
    prop_results = [r for r in results if r["category"] == "PROPERTY"]
    # glide.ai.agent.studio.enabled = false (mandatory) → FAIL
    assert prop_results[0]["status"] == "FAIL"
    print("test_property_mandatory_fail PASSED")

def test_byok_all_missing():
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "sn_generative_ai_cfg_provider") {
    return new MockGR(table); // empty
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLBYOKValidator.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    validator = local["AASLBYOKValidator"]()
    providers = validator.scanProviders()
    assert len(providers) == 4
    assert all(p["status"] == "FAIL" for p in providers)
    assert all(p["test_result"] == "NOT_CONFIGURED" for p in providers)
    print("test_byok_all_missing PASSED")

def test_byok_one_pass():
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "sn_generative_ai_cfg_provider") {
    var gr = new MockGR(table);
    gr._rows = [
      {provider_name: "azure_openai", endpoint_url: "https://oai.azure.com", model_family: "gpt-4o", test_result: "SUCCESS"}
    ];
    return gr;
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLBYOKValidator.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    validator = local["AASLBYOKValidator"]()
    providers = validator.scanProviders()
    azure = [p for p in providers if p["provider_name"] == "azure_openai"][0]
    assert azure["status"] == "PASS"
    assert azure["is_configured"] == True
    assert all(p["status"] == "FAIL" for p in providers if p["provider_name"] != "azure_openai")
    print("test_byok_one_pass PASSED")

def test_role_provisioner_idempotent():
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "sys_user_role") {
    var gr = new MockGR(table);
    gr._rows = [{name: "ai_agent_admin", sys_id: "r1"}];
    return gr;
  }
  if (table === "sys_user_has_role") {
    var gr = new MockGR(table);
    gr._rows = [{user: "u1", role: "r1"}];
    return gr;
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLRoleProvisioner.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    rp = local["AASLRoleProvisioner"]()
    result = rp.grantRole("u1", "ai_agent_admin")
    assert result["success"] == True
    assert result["alreadyHad"] == True
    print("test_role_provisioner_idempotent PASSED")

def test_role_provisioner_grant_new():
    custom_js = JS_RUNTIME.replace(
        "function GlideRecord(table) { return new MockGR(table); }",
        """
function GlideRecord(table) {
  if (table === "sys_user_role") {
    var gr = new MockGR(table);
    gr._rows = [{name: "ai_agent_admin", sys_id: "r1"}];
    return gr;
  }
  if (table === "sys_user_has_role") {
    return new MockGR(table); // empty
  }
  return new MockGR(table);
}
""")
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLRoleProvisioner.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(custom_js + "\n" + code, local)
    rp = local["AASLRoleProvisioner"]()
    result = rp.grantRole("u1", "ai_agent_admin")
    assert result["success"] == True
    assert result["alreadyHad"] == False
    print("test_role_provisioner_grant_new PASSED")

def test_report_generator_json_structure():
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLReportGenerator.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(JS_RUNTIME + "\n" + code, local)
    gen = local["AASLReportGenerator"]()
    # Mock runGR
    class FakeRun:
        def __init__(self, vals):
            self._vals = vals
        def getValue(self, f):
            return str(self._vals.get(f, ""))
        def getDisplayValue(self, f):
            return self.getValue(f)
    run = FakeRun({"instance_name": "dev362840", "overall_score": 75, "total_checks": 15,
                   "pass_count": 10, "warn_count": 3, "fail_count": 2,
                   "estimated_hours_to_ready": 16, "release_target": "Australia"})
    json_str = gen.generateJSON(run, [], [], [])
    data = json.loads(json_str)
    assert data["score"] == 75
    assert data["instance"] == "dev362840"
    assert data["version"] == "1.0.0"
    print("test_report_generator_json_structure PASSED")

def test_report_generator_csv_escapes():
    with open("/home/crixus/agentic-loop/output/AASL/src/AASLReportGenerator.js") as f:
        code = re.sub(r'^/\*.*?\*/', '', f.read(), count=1, flags=re.DOTALL)
    local = {"MockGR": MockGR, "MockGS": MockGS, "MockTD": MockTD, "math": math}
    exec(JS_RUNTIME + "\n" + code, local)
    gen = local["AASLReportGenerator"]()
    prereqs = [{"category": "PLUGIN", "name": 'Bad"Quote', "expected_state": "ACTIVE", "actual_state": "MISSING",
                "status": "FAIL", "remediation_hint": 'Use "System Plugins"'}]
    csv = gen.generateCSV(prereqs, [])
    assert '""' in csv or '"Use ""System Plugins"""' in csv
    print("test_report_generator_csv_escapes PASSED")

if __name__ == "__main__":
    test_plugin_pass_and_fail_v2()
    test_role_warn_unassigned()
    test_property_mandatory_fail()
    test_byok_all_missing()
    test_byok_one_pass()
    test_role_provisioner_idempotent()
    test_role_provisioner_grant_new()
    test_report_generator_json_structure()
    test_report_generator_csv_escapes()
    print("\nAll 9 unit tests PASSED")
